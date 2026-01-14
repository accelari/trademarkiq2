import { db } from "@/db";
import { apiUsageLogs, users, creditTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// API Provider Typen
export type ApiProvider = "claude" | "openai" | "tmsearch" | "tavily" | "hume" | "resend";

// Preiskonfiguration für alle APIs (Januar 2026)
export const API_PRICING = {
  // Claude Opus 4
  claude: {
    "claude-opus-4-20250514": {
      inputPer1M: 15.0,  // $15 pro 1M Input Tokens
      outputPer1M: 75.0, // $75 pro 1M Output Tokens
    },
    "claude-sonnet-4-20250514": {
      inputPer1M: 3.0,   // $3 pro 1M Input Tokens
      outputPer1M: 15.0, // $15 pro 1M Output Tokens
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
  units?: number; // Für nicht-Token-basierte APIs (Minuten, Suchen, etc.)
  unitType?: "tokens" | "minutes" | "searches" | "emails";
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
