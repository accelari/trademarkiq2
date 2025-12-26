import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TMSEARCH_SEARCH_URL = "https://tmsearch.ai/api/search/";
const TMSEARCH_INFO_URL = "https://tmsearch.ai/api/info/";
const TEST_API_KEY = "TESTAPIKEY";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

// Helper function to call OpenAI API via fetch
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 500
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

interface TMSearchResult {
  mid?: string | number;
  verbal?: string;
  status?: string;
  submition?: string;
  protection?: string[];
  class?: string[];
  accuracy?: string | number;
  app?: string;
  reg?: string;
  img?: string;
  date?: { applied?: string; granted?: string; expiration?: string };
}

interface ConflictWithDetails extends TMSearchResult {
  owner?: { name?: string; country?: string };
  goodsServices?: string[];
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
  reasoning?: string;
}

interface AnalysisRequest {
  keyword: string;
  countries: string[];
  classes: number[];
  includeRelatedClasses?: boolean;
  relatedClasses?: number[];
  trademarkType?: "word" | "word_image" | "image";
  fetchDetailsTopN?: number;
}

// Professional system prompt for trademark risk analysis
const RISK_ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Markenrechtler mit 40 Jahren Erfahrung in der Kollisionsanalyse. Du analysierst Markenrecherche-Ergebnisse und gibst eine professionelle Risikoeinschätzung.

DEINE AUFGABE:
Analysiere die gefundenen Konflikte und bewerte das Kollisionsrisiko für die neue Marke.

BEWERTUNGSKRITERIEN (in Priorität):
1. STATUS: Nur LIVE-Marken sind relevant (DEAD ignorieren)
2. GEBIET: Schutz im gleichen Land/Region? (US, EU, WIPO-Designationen)
3. KLASSEN: Überschneidung bei Nizza-Klassen? Verwandte Klassen?
4. WORT-ÄHNLICHKEIT:
   - Identisch = sehr hohes Risiko
   - Hohe phonetische Ähnlichkeit = hohes Risiko
   - Ähnlicher Wortanfang/Stamm = mittleres Risiko
   - Begriffliche Nähe = je nach Kontext
5. PRIORITÄT: Ältere Marken haben Vorrang

RISIKO-EINSTUFUNG:
- HIGH (80-100): Hohe Kollisionsgefahr, Anmeldung nicht empfohlen ohne Änderung
- MEDIUM (50-79): Mittleres Risiko, professionelle Prüfung empfohlen
- LOW (0-49): Geringes Risiko, Anmeldung möglich mit Monitoring

WICHTIG:
- Sei präzise und begründe jede Einschätzung
- Nenne konkrete Konflikte mit Aktenzeichen
- Gib praktische Handlungsempfehlungen
- Antworte auf Deutsch
- Formatiere als strukturiertes JSON`;

// Prompt for analyzing individual conflicts
const CONFLICT_ANALYSIS_PROMPT = `Analysiere diesen potenziellen Markenkonflikt:

NEUE MARKE (Anmeldewunsch):
- Name: {keyword}
- Zielländer: {countries}
- Zielklassen: {classes}
- Markenart: {trademarkType}

GEFUNDENER KONFLIKT:
- Name: {conflictName}
- Status: {status}
- Amt/Register: {office}
- Schutzgebiete: {protection}
- Klassen: {conflictClasses}
- Ähnlichkeit: {accuracy}%
- Anmeldedatum: {applied}
- Ablaufdatum: {expiration}
- Inhaber: {owner}
- Waren/Dienstleistungen: {goodsServices}

Bewerte das Kollisionsrisiko (0-100) und begründe kurz (max. 2 Sätze).
Antworte als JSON: {"riskScore": number, "riskLevel": "low"|"medium"|"high", "reasoning": "string"}`;

// Final summary prompt
const SUMMARY_PROMPT = `Erstelle eine professionelle Zusammenfassung der Markenrecherche:

NEUE MARKE:
- Name: {keyword}
- Zielländer: {countries}
- Zielklassen: {classes}

RECHERCHE-ERGEBNISSE:
- Treffer gesamt (LIVE): {totalLive}
- Davon in relevanten Klassen: {relevantCount}
- Top-Konflikte: {topConflicts}

Erstelle eine Analyse mit folgender Struktur (als JSON):
{
  "overallRiskScore": number (0-100),
  "overallRiskLevel": "low" | "medium" | "high",
  "decision": "go" | "go_with_changes" | "no_go",
  "executiveSummary": "string (2-3 Sätze Kurzfazit)",
  "nameAnalysis": "string (Bewertung des Namens und seiner Unterscheidungskraft)",
  "riskAssessment": "string (Detaillierte Risikobewertung mit Begründung)",
  "recommendation": "string (Konkrete Handlungsempfehlung)",
  "topConflicts": [
    {
      "name": "string",
      "office": "string",
      "classes": [number],
      "riskScore": number,
      "reasoning": "string"
    }
  ]
}`;

function filterResults(
  results: TMSearchResult[],
  countries: string[],
  classes: number[]
): TMSearchResult[] {
  let filtered = results;

  // Filter LIVE only
  filtered = filtered.filter((r) => r.status === "LIVE");

  // Filter by countries/offices
  if (countries.length > 0) {
    const selectedCountries = countries.map(c => c.toUpperCase());
    const hasEuCountry = selectedCountries.some(c => EU_COUNTRIES.includes(c));

    filtered = filtered.filter((r) => {
      const office = (r.submition || "").toUpperCase();
      const protection = (r.protection || []).map(p => String(p).toUpperCase());

      if (selectedCountries.includes(office)) return true;
      if (hasEuCountry && office === "EU") return true;
      if (protection.some(p => selectedCountries.includes(p))) return true;
      if (office === "WO" && protection.some(p => selectedCountries.includes(p))) return true;
      if (office === "WO" && hasEuCountry && protection.includes("EU")) return true;

      return false;
    });
  }

  // Filter by classes
  if (classes.length > 0) {
    const classStrings = classes.map(c => String(c).padStart(2, "0"));
    filtered = filtered.filter((r) => {
      const resultClasses = (r.class || []).map(c => String(c).padStart(2, "0"));
      return resultClasses.some(c => classStrings.includes(c));
    });
  }

  return filtered;
}

async function fetchTrademarkInfo(mid: number | string, apiKey: string): Promise<ConflictWithDetails | null> {
  try {
    const url = new URL(TMSEARCH_INFO_URL);
    url.searchParams.set("mid", String(mid));
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data) return null;

    const goodsServices: string[] = [];
    if (data.class && Array.isArray(data.class)) {
      data.class.forEach((c: { number?: number; description?: string }) => {
        if (c.description) {
          goodsServices.push(`Klasse ${c.number}: ${c.description}`);
        }
      });
    }

    return {
      ...data,
      owner: data.owner,
      goodsServices,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body: AnalysisRequest = await request.json().catch(() => ({}));
    
    const {
      keyword,
      countries = [],
      classes = [],
      includeRelatedClasses = false,
      relatedClasses = [],
      trademarkType = "word",
      fetchDetailsTopN = 10,
    } = body;

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json({ error: "keyword ist erforderlich" }, { status: 400 });
    }

    const apiKey = process.env.TMSEARCH_API_KEY || TEST_API_KEY;
    const isTestMode = !process.env.TMSEARCH_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json({ error: "OpenAI API Key nicht konfiguriert" }, { status: 500 });
    }

    // Step 1: Search for trademarks
    const searchUrl = new URL(TMSEARCH_SEARCH_URL);
    searchUrl.searchParams.set("keyword", keyword.trim());
    searchUrl.searchParams.set("api_key", apiKey);

    const searchRes = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: "tmsearch.ai Suche fehlgeschlagen", status: searchRes.status },
        { status: searchRes.status }
      );
    }

    let searchData: { total?: number; result?: TMSearchResult[] } | null = null;
    const contentType = searchRes.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      searchData = await searchRes.json().catch(() => null);
    } else {
      const text = await searchRes.text();
      try { searchData = JSON.parse(text); } catch { /* ignore */ }
    }

    const allResults = searchData?.result || [];
    const totalRaw = searchData?.total || allResults.length;

    // Step 2: Filter results
    const effectiveClasses = includeRelatedClasses && relatedClasses.length > 0
      ? [...new Set([...classes, ...relatedClasses])]
      : classes;

    const filteredResults = filterResults(allResults, countries, effectiveClasses);

    // Sort by accuracy (highest first)
    filteredResults.sort((a, b) => Number(b.accuracy || 0) - Number(a.accuracy || 0));

    // Step 3: Fetch details for top N conflicts
    const topConflicts: ConflictWithDetails[] = [];
    const topN = Math.min(fetchDetailsTopN, filteredResults.length);

    for (let i = 0; i < topN; i++) {
      const result = filteredResults[i];
      if (result.mid) {
        const details = await fetchTrademarkInfo(result.mid, apiKey);
        if (details) {
          topConflicts.push({ ...result, ...details });
        } else {
          topConflicts.push(result);
        }
      } else {
        topConflicts.push(result);
      }
    }

    // Step 4: Analyze each conflict with AI
    for (const conflict of topConflicts) {
      const conflictPrompt = CONFLICT_ANALYSIS_PROMPT
        .replace("{keyword}", keyword)
        .replace("{countries}", countries.join(", ") || "nicht spezifiziert")
        .replace("{classes}", classes.join(", ") || "nicht spezifiziert")
        .replace("{trademarkType}", trademarkType)
        .replace("{conflictName}", conflict.verbal || "unbekannt")
        .replace("{status}", conflict.status || "unbekannt")
        .replace("{office}", conflict.submition || "unbekannt")
        .replace("{protection}", (conflict.protection || []).join(", ") || "–")
        .replace("{conflictClasses}", (conflict.class || []).join(", ") || "–")
        .replace("{accuracy}", String(conflict.accuracy || "–"))
        .replace("{applied}", conflict.date?.applied || "–")
        .replace("{expiration}", conflict.date?.expiration || "–")
        .replace("{owner}", conflict.owner?.name || "unbekannt")
        .replace("{goodsServices}", (conflict.goodsServices || []).join("; ") || "nicht verfügbar");

      try {
        const responseText = await callOpenAI(openaiKey, RISK_ANALYSIS_SYSTEM_PROMPT, conflictPrompt, 300);
        const parsed = JSON.parse(responseText);
        
        conflict.riskScore = parsed.riskScore || 0;
        conflict.riskLevel = parsed.riskLevel || "low";
        conflict.reasoning = parsed.reasoning || "";
      } catch (err) {
        console.error("Error analyzing conflict:", err);
        // Fallback: calculate basic score from accuracy
        const acc = Number(conflict.accuracy || 0);
        conflict.riskScore = acc >= 95 ? 85 : acc >= 85 ? 65 : acc >= 70 ? 45 : 25;
        conflict.riskLevel = conflict.riskScore >= 80 ? "high" : conflict.riskScore >= 50 ? "medium" : "low";
        conflict.reasoning = `Automatische Bewertung basierend auf ${acc}% Namensähnlichkeit.`;
      }
    }

    // Step 5: Generate overall summary
    const topConflictsSummary = topConflicts.slice(0, 5).map(c => ({
      name: c.verbal,
      office: c.submition,
      classes: c.class,
      riskScore: c.riskScore,
      reasoning: c.reasoning,
    }));

    const summaryPrompt = SUMMARY_PROMPT
      .replace("{keyword}", keyword)
      .replace("{countries}", countries.join(", ") || "nicht spezifiziert")
      .replace("{classes}", classes.join(", ") || "nicht spezifiziert")
      .replace("{totalLive}", String(filteredResults.length))
      .replace("{relevantCount}", String(topConflicts.length))
      .replace("{topConflicts}", JSON.stringify(topConflictsSummary, null, 2));

    let summary = {
      overallRiskScore: 0,
      overallRiskLevel: "low" as "low" | "medium" | "high",
      decision: "go" as "go" | "go_with_changes" | "no_go",
      executiveSummary: "",
      nameAnalysis: "",
      riskAssessment: "",
      recommendation: "",
      topConflicts: topConflictsSummary,
    };

    try {
      const summaryText = await callOpenAI(openaiKey, RISK_ANALYSIS_SYSTEM_PROMPT, summaryPrompt, 1500);
      summary = { ...summary, ...JSON.parse(summaryText) };
    } catch (err) {
      console.error("Error generating summary:", err);
      // Fallback summary
      const maxRisk = Math.max(...topConflicts.map(c => c.riskScore || 0), 0);
      summary.overallRiskScore = maxRisk;
      summary.overallRiskLevel = maxRisk >= 80 ? "high" : maxRisk >= 50 ? "medium" : "low";
      summary.decision = maxRisk >= 80 ? "no_go" : maxRisk >= 50 ? "go_with_changes" : "go";
      summary.executiveSummary = `${filteredResults.length} relevante LIVE-Marken gefunden. Höchstes Einzelrisiko: ${maxRisk}%.`;
      summary.recommendation = maxRisk >= 80 
        ? "Umbenennung oder deutliche Abgrenzung empfohlen."
        : maxRisk >= 50 
        ? "Professionelle Prüfung vor Anmeldung empfohlen."
        : "Anmeldung möglich, regelmäßiges Monitoring empfohlen.";
    }

    return NextResponse.json({
      success: true,
      isTestMode,
      query: {
        keyword,
        countries,
        classes,
        effectiveClasses,
        trademarkType,
      },
      stats: {
        totalRaw,
        totalLive: allResults.filter(r => r.status === "LIVE").length,
        totalFiltered: filteredResults.length,
        analyzedCount: topConflicts.length,
      },
      analysis: summary,
      conflicts: topConflicts.map(c => ({
        id: c.mid,
        name: c.verbal,
        status: c.status,
        office: c.submition,
        protection: c.protection,
        classes: c.class,
        accuracy: c.accuracy,
        applicationNumber: c.app,
        registrationNumber: c.reg,
        dates: c.date,
        owner: c.owner,
        goodsServices: c.goodsServices,
        imageUrl: c.img ? `https://img.tmsearch.ai/img/210/${c.img}` : null,
        riskScore: c.riskScore,
        riskLevel: c.riskLevel,
        reasoning: c.reasoning,
      })),
    });
  } catch (error) {
    console.error("Error in tmsearch/analyze:", error);
    return NextResponse.json({ error: "Fehler bei der Analyse" }, { status: 500 });
  }
}
