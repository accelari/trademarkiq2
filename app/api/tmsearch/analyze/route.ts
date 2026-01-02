import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const TMSEARCH_SEARCH_URL = "https://tmsearch.ai/api/search/";
const TMSEARCH_INFO_URL = "https://tmsearch.ai/api/info/";
const TAVILY_API_URL = "https://api.tavily.com/search";
const TEST_API_KEY = "TESTAPIKEY";

// Tavily Web Search für länderspezifische Markenamt-Anforderungen
async function searchTrademarkRequirements(country: string, niceClasses: number[]): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    console.log("[Tavily] No API key configured, skipping web search");
    return "";
  }

  const countryNames: Record<string, string> = {
    "US": "USA USPTO",
    "DE": "Germany DPMA",
    "EU": "EUIPO European Union",
    "CA": "Canada CIPO",
    "CH": "Switzerland IGE",
    "UK": "United Kingdom UKIPO",
    "AU": "Australia IP Australia",
    "JP": "Japan JPO",
    "CN": "China CNIPA",
    "WO": "WIPO Madrid Protocol"
  };

  const countryName = countryNames[country] || country;
  const classesStr = niceClasses.slice(0, 3).join(", ");
  const query = `${countryName} trademark registration Nice class ${classesStr} goods services description requirements specification acceptable terms`;

  try {
    console.log(`[Tavily] Searching for: ${query}`);
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tavilyKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: 5
      })
    });

    if (!res.ok) {
      console.error(`[Tavily] API error: ${res.status}`);
      return "";
    }

    const data = await res.json();
    console.log(`[Tavily] Got answer for ${countryName}, credits used: ${data.usage?.credits || "?"}`);
    
    // Kombiniere Antwort und Top-Ergebnisse
    let result = "";
    if (data.answer) {
      result += `AKTUELLE ANFORDERUNGEN FÜR ${countryName.toUpperCase()}:\n${data.answer}\n\n`;
    }
    if (data.results && data.results.length > 0) {
      result += "QUELLEN UND DETAILS:\n";
      data.results.slice(0, 3).forEach((r: { title: string; url: string; content?: string }) => {
        result += `- ${r.title}: ${r.content?.substring(0, 300) || ""}\n`;
      });
    }
    return result;
  } catch (err) {
    console.error("[Tavily] Search error:", err);
    return "";
  }
}

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

// Helper function to extract JSON from Claude's response (handles markdown code blocks)
function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text;
}

// Helper function to call Claude API
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 500
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt + "\n\nAntworte IMMER als valides JSON ohne Markdown-Formatierung.",
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(block => block.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text : "{}";
  
  // Extract JSON from response (handles markdown code blocks)
  return extractJSON(rawText);
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
const CONFLICT_ANALYSIS_PROMPT = `Analysiere diesen potenziellen Markenkonflikt als erfahrener Markenanwalt:

NEUE MARKE (Anmeldewunsch):
- Name: {keyword}
- Zielländer: {countries}
- Zielklassen (Basis): {classes}
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
- Waren/Dienstleistungen des Konflikts: {goodsServices}

BEWERTUNGSREGELN (WICHTIG!):
1. IDENTISCHE KLASSE = Basis 70-90% Risiko
2. VERWANDTE KLASSE (nicht identisch!) = Basis 25-50% Risiko - viel niedriger!
3. Namensähnlichkeit: +0-20% Aufschlag
4. Gleiche Waren/DL-Beschreibung: +10-20% Aufschlag
5. Unterschiedliche Waren/DL trotz gleicher Klasse: -10-20% Abzug

PRÜFE GENAU:
- Überschneiden sich die KONKRETEN Waren/Dienstleistungen wirklich?
- Oder sind es nur "verwandte" Klassen ohne echte Warenüberschneidung?

Antworte als JSON:
{
  "riskScore": number (0-100),
  "riskLevel": "low"|"medium"|"high",
  "reasoning": "string (2-3 Sätze, erkläre WARUM dieses Risiko)",
  "classOverlap": "identical"|"related"|"none",
  "goodsOverlap": "high"|"medium"|"low"|"none",
  "differentiation": "string (Abgrenzungsvorschlag: wie kann die neue Marke sich abgrenzen?)"
}`;

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

{webSearchResults}

Erstelle eine Analyse mit folgender Struktur (als JSON):
{
  "overallRiskScore": number (0-100),
  "overallRiskLevel": "low" | "medium" | "high",
  "decision": "go" | "go_with_changes" | "no_go",
  "executiveSummary": "string (2-3 Sätze Kurzfazit)",
  "nameAnalysis": "string (Bewertung des Namens und seiner Unterscheidungskraft)",
  "riskAssessment": "string (Detaillierte Risikobewertung mit Begründung)",
  "recommendation": "string (Konkrete Handlungsempfehlung)",
  "suggestedClassDescription": "string (WICHTIG: Formuliere eine konkrete, kopierfertige Klassenbeschreibung für die gewünschten Klassen, die sich von den Konflikt-Marken abgrenzt und den Anforderungen des Zielamtes entspricht. Auf Deutsch.)",
  "avoidTerms": ["string (Begriffe die vermieden werden sollten wegen Konflikten)"],
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

    console.log(`[Info-API] Fetching details for mid: ${mid}`);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.log(`[Info-API] Failed for mid ${mid}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      console.log(`[Info-API] No data for mid ${mid}`);
      return null;
    }

    console.log(`[Info-API] Response for mid ${mid}:`, JSON.stringify(data).substring(0, 500));

    const goodsServices: string[] = [];
    if (data.class && Array.isArray(data.class)) {
      console.log(`[Info-API] Classes for mid ${mid}:`, data.class.length, "classes found");
      data.class.forEach((c: { number?: number; description?: string }) => {
        if (c.description) {
          goodsServices.push(`Klasse ${c.number}: ${c.description}`);
        }
      });
      console.log(`[Info-API] GoodsServices extracted: ${goodsServices.length} items`);
    } else {
      console.log(`[Info-API] No class array in response for mid ${mid}`);
    }

    return {
      ...data,
      owner: data.owner,
      goodsServices,
    };
  } catch (err) {
    console.error(`[Info-API] Error for mid ${mid}:`, err);
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API Key nicht konfiguriert" }, { status: 500 });
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
        console.log(`[Claude] Analyzing conflict: ${conflict.verbal}, goodsServices: ${(conflict.goodsServices || []).length} items`);
        const responseText = await callClaude(RISK_ANALYSIS_SYSTEM_PROMPT, conflictPrompt, 500);
        console.log(`[Claude] Raw response for ${conflict.verbal}:`, responseText.substring(0, 300));
        const parsed = JSON.parse(responseText);
        console.log(`[Claude] Parsed successfully for ${conflict.verbal}:`, parsed);
        
        conflict.riskScore = parsed.riskScore || 0;
        conflict.riskLevel = parsed.riskLevel || "low";
        conflict.reasoning = parsed.reasoning || "";
        // Neue Felder für bessere Analyse
        (conflict as ConflictWithDetails & { classOverlap?: string; goodsOverlap?: string; differentiation?: string }).classOverlap = parsed.classOverlap || "unknown";
        (conflict as ConflictWithDetails & { classOverlap?: string; goodsOverlap?: string; differentiation?: string }).goodsOverlap = parsed.goodsOverlap || "unknown";
        (conflict as ConflictWithDetails & { classOverlap?: string; goodsOverlap?: string; differentiation?: string }).differentiation = parsed.differentiation || "";
      } catch (err) {
        console.error("[Claude] Error analyzing conflict:", conflict.verbal, "Error:", err);
        // Fallback: calculate basic score from accuracy - aber niedriger für verwandte Klassen
        const acc = Number(conflict.accuracy || 0);
        const conflictClasses = (conflict.class || []).map(c => String(c).padStart(2, "0"));
        const targetClasses = classes.map(c => String(c).padStart(2, "0"));
        const hasIdenticalClass = conflictClasses.some(c => targetClasses.includes(c));
        
        // Niedrigere Scores für verwandte Klassen
        if (hasIdenticalClass) {
          conflict.riskScore = acc >= 95 ? 85 : acc >= 85 ? 70 : acc >= 70 ? 55 : 40;
        } else {
          // Nur verwandte Klasse - viel niedriger!
          conflict.riskScore = acc >= 95 ? 45 : acc >= 85 ? 35 : acc >= 70 ? 25 : 15;
        }
        conflict.riskLevel = conflict.riskScore >= 70 ? "high" : conflict.riskScore >= 40 ? "medium" : "low";
        conflict.reasoning = hasIdenticalClass 
          ? `Identische Klasse gefunden. ${acc}% Namensähnlichkeit.`
          : `Nur verwandte Klassen (keine identische). ${acc}% Namensähnlichkeit - geringeres Risiko.`;
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

    // Step 6: Generate summary (Tavily Web Search moved to separate /api/web-search endpoint)
    const summaryPrompt = SUMMARY_PROMPT
      .replace("{keyword}", keyword)
      .replace("{countries}", countries.join(", ") || "nicht spezifiziert")
      .replace("{classes}", classes.join(", ") || "nicht spezifiziert")
      .replace("{totalLive}", String(filteredResults.length))
      .replace("{relevantCount}", String(topConflicts.length))
      .replace("{topConflicts}", JSON.stringify(topConflictsSummary, null, 2))
      .replace("{webSearchResults}", "");

    let summary = {
      overallRiskScore: 0,
      overallRiskLevel: "low" as "low" | "medium" | "high",
      decision: "go" as "go" | "go_with_changes" | "no_go",
      executiveSummary: "",
      nameAnalysis: "",
      riskAssessment: "",
      recommendation: "",
      suggestedClassDescription: "",
      avoidTerms: [] as string[],
      topConflicts: topConflictsSummary,
    };

    try {
      const summaryText = await callClaude(RISK_ANALYSIS_SYSTEM_PROMPT, summaryPrompt, 1500);
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
      // TAB 1: Request - Was wir gesendet haben
      debug_request: {
        endpoint: TMSEARCH_SEARCH_URL,
        params: {
          keyword: keyword.trim(),
          api_key: "***hidden***",
        },
        body: {
          keyword,
          countries,
          classes,
          includeRelatedClasses,
          relatedClasses,
          trademarkType,
          fetchDetailsTopN,
        },
      },
      // TAB 2: Response - Was wir bekommen haben (roh)
      debug_response: {
        totalFromApi: totalRaw,
        allResultsCount: allResults.length,
        sampleResults: allResults.slice(0, 20).map(r => ({
          mid: r.mid,
          name: r.verbal,
          status: r.status,
          office: r.submition,
          protection: r.protection,
          classes: r.class,
          accuracy: r.accuracy,
        })),
      },
      // TAB 3: Filterung - Wie gefiltert wurde
      debug_filter: {
        filterCriteria: {
          statusFilter: "Nur LIVE (keine DEAD)",
          countryFilter: countries.length > 0 ? `Nur Marken in: ${countries.join(", ")}` : "Kein Länderfilter",
          classFilter: classes.length > 0 ? `Nur Klassen: ${effectiveClasses.join(", ")}` : "Kein Klassenfilter",
          includeRelatedClasses: includeRelatedClasses,
          relatedClassesUsed: relatedClasses,
        },
        beforeFilter: {
          total: allResults.length,
          liveCount: allResults.filter(r => r.status === "LIVE").length,
          deadCount: allResults.filter(r => r.status === "DEAD").length,
        },
        afterFilter: {
          total: filteredResults.length,
          removedByStatus: allResults.length - allResults.filter(r => r.status === "LIVE").length,
          removedByCountryOrClass: allResults.filter(r => r.status === "LIVE").length - filteredResults.length,
        },
        filteredResults: filteredResults.slice(0, 30).map(r => ({
          mid: r.mid,
          name: r.verbal,
          office: r.submition,
          classes: r.class,
          accuracy: r.accuracy,
        })),
      },
      // TAB 4: Analyse - Claudes Überlegungen
      debug_analysis: {
        analyzedCount: topConflicts.length,
        modelUsed: "claude-opus-4-20250514",
        systemPromptSummary: "Markenrechtler mit 40 Jahren Erfahrung, bewertet Kollisionsrisiko 0-100",
        perConflictAnalysis: topConflicts.map(c => ({
          name: c.verbal,
          office: c.submition,
          accuracy: c.accuracy,
          riskScore: c.riskScore,
          riskLevel: c.riskLevel,
          reasoning: c.reasoning,
          // Neue Felder für bessere Analyse
          classOverlap: (c as ConflictWithDetails & { classOverlap?: string }).classOverlap || "unknown",
          goodsOverlap: (c as ConflictWithDetails & { goodsOverlap?: string }).goodsOverlap || "unknown",
          differentiation: (c as ConflictWithDetails & { differentiation?: string }).differentiation || "",
          // Waren/Dienstleistungen des Konflikts
          goodsServices: c.goodsServices || [],
          inputToAI: {
            conflictName: c.verbal,
            conflictClasses: c.class,
            conflictProtection: c.protection,
            owner: c.owner?.name,
            goodsServices: c.goodsServices || [],
          },
        })),
        overallSummary: summary,
      },
      // Klassenbeschreibung wird jetzt vom Chat-Claude mit Web-Suche generiert
      classDescriptionSuggestion: {
        suggestedText: summary.suggestedClassDescription || "",
        avoidTerms: summary.avoidTerms || [],
        targetCountry: countries[0] || "DE",
        targetClasses: classes,
        hint: "Für länderspezifische Anforderungen nutzen Sie die Web-Suche im Chat.",
      },
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
