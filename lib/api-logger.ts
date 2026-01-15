import { db } from "@/db";
import { apiUsageLogs, users, creditTransactions, apiPricing } from "@/db/schema";
import { eq, and, isNull, lte, or, gte, sql } from "drizzle-orm";

// API Provider Typen
export type ApiProvider = "claude" | "openai" | "tmsearch" | "tavily" | "hume" | "resend" | "ideogram" | "bfl";

// Preiskonfiguration für alle APIs (Januar 2026)
// Quelle: https://www.anthropic.com/news/claude-opus-4-5
export const API_PRICING = {
  // Claude Modelle (aktualisiert Januar 2026)
  claude: {
    // Claude Opus 4.5 (November 2025) - Flagship
    "claude-opus-4-5-20251101": {
      inputPer1M: 5.0,   // $5 pro 1M Input Tokens
      outputPer1M: 25.0, // $25 pro 1M Output Tokens
    },
    // Claude Opus 4 (Legacy - Mai 2025)
    "claude-opus-4-20250514": {
      inputPer1M: 15.0,  // $15 pro 1M Input Tokens
      outputPer1M: 75.0, // $75 pro 1M Output Tokens
    },
    // Claude Sonnet 4.5 - Balanced (empfohlen für Chat)
    "claude-sonnet-4-5-20251022": {
      inputPer1M: 3.0,   // $3 pro 1M Input Tokens
      outputPer1M: 15.0, // $15 pro 1M Output Tokens
    },
    // Claude Sonnet 4 (Legacy)
    "claude-sonnet-4-20250514": {
      inputPer1M: 3.0,   // $3 pro 1M Input Tokens
      outputPer1M: 15.0, // $15 pro 1M Output Tokens
    },
    // Claude Haiku 4.5 - Fast & Cheap
    "claude-haiku-4-5-20251022": {
      inputPer1M: 1.0,   // $1 pro 1M Input Tokens
      outputPer1M: 5.0,  // $5 pro 1M Output Tokens
    },
  },
  // OpenAI
  openai: {
    "gpt-4o": {
      inputPer1M: 2.50,  // $2.50 pro 1M Input Tokens
      outputPer1M: 10.0, // $10 pro 1M Output Tokens
    },
    "gpt-4o-realtime-preview-2024-12-17": {
      inputPer1M: 5.0,   // $5 pro 1M Input Tokens (Audio)
      outputPer1M: 20.0, // $20 pro 1M Output Tokens (Audio)
    },
    "whisper-1": {
      perMinute: 0.006,  // $0.006 pro Minute
    },
  },
  // tmsearch.ai - Geschätzte Kosten pro Suche
  tmsearch: {
    perSearch: 0.05, // $0.05 pro Suche (geschätzt)
  },
  // Tavily Web Search
  tavily: {
    perSearch: 0.01, // $0.01 pro Suche (geschätzt)
  },
  // Hume AI Voice
  hume: {
    perMinute: 0.02, // $0.02 pro Minute (geschätzt)
  },
  // Resend E-Mail
  resend: {
    perEmail: 0.001, // $0.001 pro E-Mail
  },
  // Ideogram Image Generation (Januar 2026)
  // Quelle: https://about.ideogram.ai/api-pricing
  ideogram: {
    // Ideogram 3.0
    "V_3_FLASH": { perImage: 0.03 },
    "V_3_TURBO": { perImage: 0.03 },
    "V_3": { perImage: 0.06 },
    "V_3_QUALITY": { perImage: 0.09 },
    // Ideogram 2.0
    "V_2_TURBO": { perImage: 0.05 },
    "V_2": { perImage: 0.08 },
    // Ideogram 2a
    "V_2A_TURBO": { perImage: 0.025 },
    "V_2A": { perImage: 0.04 },
    // Ideogram 1.0
    "V_1_TURBO": { perImage: 0.02 },
    "V_1": { perImage: 0.06 },
  },
  // Black Forest Labs (BFL) - FLUX Kontext (Januar 2026)
  // Quelle: https://docs.bfl.ai/ und Fireworks AI ($0.04/image)
  bfl: {
    // FLUX.1 Kontext Pro - Image Editing
    "flux-kontext-pro": { perImage: 0.04 },
    // FLUX.1 Kontext Max - Higher Quality
    "flux-kontext-max": { perImage: 0.08 },
    // FLUX.2 Pro - Generation + Editing
    "flux-2-pro": { perImage: 0.03 },
    // FLUX.2 Flex - Budget Option
    "flux-2-flex": { perImage: 0.015 },
    // FLUX 1.1 Pro
    "flux-1.1-pro": { perImage: 0.04 },
    // FLUX 1.1 Pro Ultra
    "flux-1.1-pro-ultra": { perImage: 0.06 },
  },
} as const;

// Konstanten
const USD_TO_EUR = 0.92;
const MARKUP_FACTOR = 3; // ×3 Markup für Kundenpreis
const CREDIT_VALUE = 0.03; // 1 Credit = 0,03€

// Interface für API-Logging
export interface LogApiUsageParams {
  userId?: string | null;
  apiProvider: ApiProvider;
  apiEndpoint: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  units?: number; // Für nicht-Token-basierte APIs (Minuten, Suchen, Bilder, etc.)
  unitType?: "tokens" | "minutes" | "searches" | "emails" | "images";
  durationMs?: number;
  statusCode?: number;
  errorMessage?: string;
  caseId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Kosten berechnen basierend auf API-Typ
export function calculateApiCost(params: {
  apiProvider: ApiProvider;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  units?: number;
  unitType?: string;
}): { costUsd: number; costEur: number; creditsCharged: number } {
  const { apiProvider, model, inputTokens = 0, outputTokens = 0, units = 0, unitType } = params;
  
  let costUsd = 0;

  switch (apiProvider) {
    case "claude": {
      const modelKey = model as keyof typeof API_PRICING.claude;
      const pricing = API_PRICING.claude[modelKey] || API_PRICING.claude["claude-opus-4-20250514"];
      costUsd = (inputTokens / 1_000_000) * pricing.inputPer1M + 
                (outputTokens / 1_000_000) * pricing.outputPer1M;
      break;
    }
    case "openai": {
      if (model === "whisper-1" && unitType === "minutes") {
        costUsd = units * API_PRICING.openai["whisper-1"].perMinute;
      } else {
        const modelKey = model as keyof typeof API_PRICING.openai;
        const pricing = API_PRICING.openai[modelKey] || API_PRICING.openai["gpt-4o"];
        if ("inputPer1M" in pricing) {
          costUsd = (inputTokens / 1_000_000) * pricing.inputPer1M + 
                    (outputTokens / 1_000_000) * pricing.outputPer1M;
        }
      }
      break;
    }
    case "tmsearch": {
      costUsd = units * API_PRICING.tmsearch.perSearch;
      break;
    }
    case "tavily": {
      costUsd = units * API_PRICING.tavily.perSearch;
      break;
    }
    case "hume": {
      costUsd = units * API_PRICING.hume.perMinute;
      break;
    }
      case "resend": {
        costUsd = units * API_PRICING.resend.perEmail;
        break;
      }
      case "ideogram": {
        // Bildgenerierung - Kosten pro Bild basierend auf Modell
        const modelKey = model as keyof typeof API_PRICING.ideogram;
        const pricing = API_PRICING.ideogram[modelKey] || API_PRICING.ideogram["V_2_TURBO"];
        costUsd = units * pricing.perImage;
        break;
      }
      case "bfl": {
        // BFL FLUX Kontext - Bildbearbeitung/Generierung pro Bild
        const bflModelKey = model as keyof typeof API_PRICING.bfl;
        const bflPricing = API_PRICING.bfl[bflModelKey] || API_PRICING.bfl["flux-kontext-pro"];
        costUsd = units * bflPricing.perImage;
        break;
      }
    }

    const costEur = costUsd * USD_TO_EUR;
  const finalCost = costEur * MARKUP_FACTOR;
  const creditsCharged = Math.ceil(finalCost / CREDIT_VALUE);

  return {
    costUsd,
    costEur,
    creditsCharged: creditsCharged > 0 ? creditsCharged : 0,
  };
}

// Hauptfunktion: API-Nutzung loggen und Credits abziehen
export async function logApiUsage(params: LogApiUsageParams): Promise<{
  success: boolean;
  logId?: string;
  costs?: { costUsd: number; costEur: number; creditsCharged: number };
  error?: string;
  insufficientCredits?: boolean;
}> {
  const {
    userId,
    apiProvider,
    apiEndpoint,
    model,
    inputTokens = 0,
    outputTokens = 0,
    units,
    unitType = "tokens",
    durationMs,
    statusCode,
    errorMessage,
    caseId,
    sessionId,
    metadata,
  } = params;

  try {
    // Kosten berechnen
    const costs = calculateApiCost({
      apiProvider,
      model,
      inputTokens,
      outputTokens,
      units,
      unitType,
    });

    const totalTokens = inputTokens + outputTokens;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // API-Nutzung loggen
    const [logEntry] = await db.insert(apiUsageLogs).values({
      userId: userId || null,
      apiProvider,
      apiEndpoint,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      units: units?.toString(),
      unitType,
      costUsd: costs.costUsd.toFixed(6),
      costEur: costs.costEur.toFixed(6),
      creditsCharged: costs.creditsCharged.toFixed(2),
      requestId,
      durationMs,
      statusCode,
      errorMessage,
      caseId,
      sessionId,
      metadata,
    }).returning({ id: apiUsageLogs.id });

    // Credits vom User abziehen (nur wenn User eingeloggt und Credits > 0)
    if (userId && costs.creditsCharged > 0) {
      await deductCredits(userId, costs.creditsCharged, `${apiProvider} API: ${apiEndpoint}`, logEntry.id);
    }

    return {
      success: true,
      logId: logEntry.id,
      costs,
    };
  } catch (error) {
    console.error("[logApiUsage] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Credits vom User-Konto abziehen
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  apiUsageLogId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Aktuellen Stand abrufen
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = parseFloat(user.credits || "0");
    const newBalance = Math.max(0, currentBalance - amount);

    // Credits aktualisieren
    await db
      .update(users)
      .set({ 
        credits: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Transaktion loggen
    await db.insert(creditTransactions).values({
      userId,
      type: "usage",
      amount: (-amount).toFixed(2),
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description,
      apiUsageLogId,
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error("[deductCredits] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Credits zum User-Konto hinzufügen (für Käufe, Boni, etc.)
export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  options?: {
    type?: "purchase" | "bonus" | "refund" | "adjustment";
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    createdBy?: string;
  }
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // Aktuellen Stand abrufen
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = parseFloat(user.credits || "0");
    const newBalance = currentBalance + amount;

    // Credits aktualisieren
    await db
      .update(users)
      .set({ 
        credits: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Transaktion loggen
    await db.insert(creditTransactions).values({
      userId,
      type: options?.type || "purchase",
      amount: amount.toFixed(2),
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description,
      stripePaymentIntentId: options?.stripePaymentIntentId,
      stripeCheckoutSessionId: options?.stripeCheckoutSessionId,
      createdBy: options?.createdBy,
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error("[addCredits] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Credit-Stand eines Users abrufen
export async function getCredits(userId: string): Promise<{
  credits: number;
  warningThreshold: number;
  isLow: boolean;
}> {
  const [user] = await db
    .select({ 
      credits: users.credits,
      warningThreshold: users.creditWarningThreshold,
    })
    .from(users)
    .where(eq(users.id, userId));

  const credits = parseFloat(user?.credits || "0");
  const warningThreshold = user?.warningThreshold || 10;

  return {
    credits,
    warningThreshold,
    isLow: credits <= warningThreshold,
  };
}

// Prüfen ob User genug Credits hat
export async function checkCredits(
  userId: string,
  requiredCredits: number
): Promise<{ hasEnough: boolean; currentCredits: number; missing: number }> {
  const { credits } = await getCredits(userId);
  const missing = Math.max(0, requiredCredits - credits);

  return {
    hasEnough: credits >= requiredCredits,
    currentCredits: credits,
    missing,
  };
}

// Geschätzte Credits für eine Anfrage berechnen (vor dem API-Call)
export function estimateCredits(params: {
  apiProvider: ApiProvider;
  model?: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedUnits?: number;
  unitType?: string;
}): number {
  const costs = calculateApiCost({
    apiProvider: params.apiProvider,
    model: params.model,
    inputTokens: params.estimatedInputTokens || 0,
    outputTokens: params.estimatedOutputTokens || 0,
    units: params.estimatedUnits || 0,
    unitType: params.unitType,
  });

  return costs.creditsCharged;
}

// Cache für DB-Preise (5 Minuten TTL)
let pricingCache: { data: Map<string, { inputPer1M?: number; outputPer1M?: number; perUnit?: number }>; timestamp: number } | null = null;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

// Preise aus der Datenbank laden (mit Cache)
export async function loadPricingFromDb(): Promise<Map<string, { inputPer1M?: number; outputPer1M?: number; perUnit?: number }>> {
  const now = Date.now();
  
  // Cache prüfen
  if (pricingCache && (now - pricingCache.timestamp) < PRICING_CACHE_TTL) {
    return pricingCache.data;
  }
  
  try {
    const dbPricing = await db
      .select()
      .from(apiPricing)
      .where(
        and(
          eq(apiPricing.isActive, true),
          lte(apiPricing.validFrom, new Date()),
          or(
            isNull(apiPricing.validUntil),
            gte(apiPricing.validUntil, new Date())
          )
        )
      );
    
    const priceMap = new Map<string, { inputPer1M?: number; outputPer1M?: number; perUnit?: number }>();
    
    for (const price of dbPricing) {
      const key = `${price.provider}:${price.model}`;
      priceMap.set(key, {
        inputPer1M: price.inputPer1M ? parseFloat(price.inputPer1M) : undefined,
        outputPer1M: price.outputPer1M ? parseFloat(price.outputPer1M) : undefined,
        perUnit: price.perUnit ? parseFloat(price.perUnit) : undefined,
      });
    }
    
    // Cache aktualisieren
    pricingCache = { data: priceMap, timestamp: now };
    
    return priceMap;
  } catch (error) {
    console.warn("[loadPricingFromDb] Fehler beim Laden der Preise aus DB, verwende Fallback:", error);
    return new Map();
  }
}

// Preis für ein bestimmtes Modell abrufen (DB mit Fallback auf hardcoded)
export async function getPricing(provider: ApiProvider, model: string): Promise<{
  inputPer1M?: number;
  outputPer1M?: number;
  perUnit?: number;
} | null> {
  const dbPricing = await loadPricingFromDb();
  const key = `${provider}:${model}`;
  
  if (dbPricing.has(key)) {
    return dbPricing.get(key)!;
  }
  
  // Fallback auf hardcoded Preise
  return null;
}

// Alle Preise aus der Datenbank abrufen (für Admin-Seite)
export async function getAllPricing(): Promise<Array<{
  id: string;
  provider: string;
  model: string;
  pricingType: string;
  inputPer1M: number | null;
  outputPer1M: number | null;
  perUnit: number | null;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
  notes: string | null;
}>> {
  const dbPricing = await db
    .select()
    .from(apiPricing)
    .orderBy(apiPricing.provider, apiPricing.model);
  
  return dbPricing.map(p => ({
    id: p.id,
    provider: p.provider,
    model: p.model,
    pricingType: p.pricingType,
    inputPer1M: p.inputPer1M ? parseFloat(p.inputPer1M) : null,
    outputPer1M: p.outputPer1M ? parseFloat(p.outputPer1M) : null,
    perUnit: p.perUnit ? parseFloat(p.perUnit) : null,
    isActive: p.isActive,
    validFrom: p.validFrom,
    validUntil: p.validUntil,
    notes: p.notes,
  }));
}

// Preis in der Datenbank aktualisieren oder erstellen
export async function upsertPricing(params: {
  provider: string;
  model: string;
  pricingType: string;
  inputPer1M?: number;
  outputPer1M?: number;
  perUnit?: number;
  notes?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Prüfen ob Eintrag existiert
    const existing = await db
      .select()
      .from(apiPricing)
      .where(
        and(
          eq(apiPricing.provider, params.provider),
          eq(apiPricing.model, params.model)
        )
      );
    
    if (existing.length > 0) {
      // Update
      await db
        .update(apiPricing)
        .set({
          pricingType: params.pricingType,
          inputPer1M: params.inputPer1M?.toFixed(6),
          outputPer1M: params.outputPer1M?.toFixed(6),
          perUnit: params.perUnit?.toFixed(6),
          notes: params.notes,
          updatedAt: new Date(),
        })
        .where(eq(apiPricing.id, existing[0].id));
      
      // Cache invalidieren
      pricingCache = null;
      
      return { success: true, id: existing[0].id };
    } else {
      // Insert
      const [newEntry] = await db
        .insert(apiPricing)
        .values({
          provider: params.provider,
          model: params.model,
          pricingType: params.pricingType,
          inputPer1M: params.inputPer1M?.toFixed(6),
          outputPer1M: params.outputPer1M?.toFixed(6),
          perUnit: params.perUnit?.toFixed(6),
          notes: params.notes,
        })
        .returning({ id: apiPricing.id });
      
      // Cache invalidieren
      pricingCache = null;
      
      return { success: true, id: newEntry.id };
    }
  } catch (error) {
    console.error("[upsertPricing] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Seed-Funktion: Hardcoded Preise in die Datenbank übertragen
export async function seedPricingFromHardcoded(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    
    // Claude Modelle
    for (const [model, pricing] of Object.entries(API_PRICING.claude)) {
      await upsertPricing({
        provider: "claude",
        model,
        pricingType: "token",
        inputPer1M: pricing.inputPer1M,
        outputPer1M: pricing.outputPer1M,
        notes: "Quelle: https://www.anthropic.com/news/claude-opus-4-5",
      });
      count++;
    }
    
    // OpenAI Modelle
    for (const [model, pricing] of Object.entries(API_PRICING.openai)) {
      if ("inputPer1M" in pricing) {
        await upsertPricing({
          provider: "openai",
          model,
          pricingType: "token",
          inputPer1M: pricing.inputPer1M,
          outputPer1M: pricing.outputPer1M,
        });
      } else if ("perMinute" in pricing) {
        await upsertPricing({
          provider: "openai",
          model,
          pricingType: "minute",
          perUnit: pricing.perMinute,
        });
      }
      count++;
    }
    
    // tmsearch
    await upsertPricing({
      provider: "tmsearch",
      model: "default",
      pricingType: "search",
      perUnit: API_PRICING.tmsearch.perSearch,
    });
    count++;
    
    // Tavily
    await upsertPricing({
      provider: "tavily",
      model: "default",
      pricingType: "search",
      perUnit: API_PRICING.tavily.perSearch,
    });
    count++;
    
    // Hume
    await upsertPricing({
      provider: "hume",
      model: "default",
      pricingType: "minute",
      perUnit: API_PRICING.hume.perMinute,
    });
    count++;
    
    // Resend
    await upsertPricing({
      provider: "resend",
      model: "default",
      pricingType: "email",
      perUnit: API_PRICING.resend.perEmail,
    });
    count++;
    
    // Ideogram Modelle
    for (const [model, pricing] of Object.entries(API_PRICING.ideogram)) {
      await upsertPricing({
        provider: "ideogram",
        model,
        pricingType: "image",
        perUnit: pricing.perImage,
        notes: "Quelle: https://about.ideogram.ai/api-pricing",
      });
      count++;
    }
    
    // BFL Modelle
    for (const [model, pricing] of Object.entries(API_PRICING.bfl)) {
      await upsertPricing({
        provider: "bfl",
        model,
        pricingType: "image",
        perUnit: pricing.perImage,
        notes: "Quelle: https://docs.bfl.ai/",
      });
      count++;
    }
    
    return { success: true, count };
  } catch (error) {
    console.error("[seedPricingFromHardcoded] Error:", error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
