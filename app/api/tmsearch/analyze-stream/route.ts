import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { getRelevantCountries, getRegisterCountries } from "@/lib/country-mapping";
import { logApiUsage } from "@/lib/api-logger";
import { createSearchCoverageReport, SearchCoverageReport } from "@/lib/tmsearch/types";

const TMSEARCH_SEARCH_URL = "https://tmsearch.ai/api/search/";
const TEST_API_KEY = "TESTAPIKEY";

const EU_COUNTRIES = getRegisterCountries("EU");

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
  // API liefert flache Felder
  dateApplied?: string;
  dateGranted?: string;
  dateExpiration?: string;
  dateRenewal?: string;
  // Für Kompatibilität
  date?: { applied?: string; granted?: string; expiration?: string; renewal?: string };
}

interface ConflictWithDetails extends TMSearchResult {
  owner?: { name?: string; address?: string; country?: string };
  attorney?: { name?: string; address?: string };
  goodsServices?: string[];
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
  reasoning?: string;
  relevantCountries?: string[];
}

// Step-Typen für das Frontend
type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  id: string;
  name: string;
  status: StepStatus;
  payload?: unknown;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

function extractJSON(text: string): string {
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

// Token-Tracking Interface
interface TokenTracker {
  inputTokens: number;
  outputTokens: number;
}

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 500, tracker?: TokenTracker): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514", // Sonnet statt Opus (5x günstiger)
    max_tokens: maxTokens,
    temperature: 0, // Deterministisch für konsistente Risikobewertungen
    system: systemPrompt + "\n\nAntworte IMMER als valides JSON ohne Markdown-Formatierung.",
    messages: [{ role: "user", content: userPrompt }],
  });
  
  // Token-Tracking
  if (tracker) {
    tracker.inputTokens += response.usage?.input_tokens || 0;
    tracker.outputTokens += response.usage?.output_tokens || 0;
  }
  
  const textBlock = response.content.find(block => block.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text : "{}";
  return extractJSON(rawText);
}

function filterResults(results: TMSearchResult[], countries: string[], classes: number[]): TMSearchResult[] {
  let filtered = results.filter((r) => r.status === "LIVE");

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

  if (classes.length > 0) {
    const classStrings = classes.map(c => String(c).padStart(2, "0"));
    filtered = filtered.filter((r) => {
      const resultClasses = (r.class || []).map(c => String(c).padStart(2, "0"));
      return resultClasses.some(c => classStrings.includes(c));
    });
  }

  return filtered;
}


const RISK_ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Markenrechtler mit 40 Jahren Erfahrung in der internationalen Kollisionsanalyse.

RECHTLICHE GRUNDLAGEN:
- EU: Art. 8 UMV (Unionsmarkenverordnung) - Relative Eintragungshindernisse
- DE: § 9 MarkenG - Relative Schutzhindernisse, Verwechslungsgefahr
- CH: Art. 3 MSchG - Ausschlussgründe, Kollisionsprüfung
- International: Pariser Verbandsübereinkunft, Madrider Protokoll

DEINE AUFGABE:
Du erhältst Suchergebnisse einer Markenrecherche als JSON.
Analysiere JEDEN relevanten Treffer auf Kollisionspotential.
Bewerte die Zeichenähnlichkeit SELBST - ignoriere den accuracy-Wert der API.

VERWECHSLUNGSGEFAHR-KRITERIEN (EuGH/BGH-Rechtsprechung):
1. Zeichenähnlichkeit: visuell, phonetisch, begrifflich (Gesamteindruck)
2. Klassenüberschneidung: Gleiche Nizza-Klassen erhöhen das Risiko
3. Territoriale Überschneidung: Gleiche Schutzländer = Kollision möglich
4. Kennzeichnungskraft: beschreibend (schwach) vs. fantasievoll (stark)

RISIKO-EINSTUFUNG:
- HIGH (80-100): Identität/hochgradige Ähnlichkeit + gleiche Klassen = Widerspruch sehr wahrscheinlich
- MEDIUM (50-79): Ähnlichkeit + verwandte Klassen = Widerspruch möglich
- LOW (0-49): Geringe Ähnlichkeit oder verschiedene Klassen = Anmeldung vertretbar

Antworte auf Deutsch und formatiere als JSON.`;

const FULL_ANALYSIS_PROMPT = `MARKENRECHERCHE-ANALYSE

=== NEUE MARKE (Anmeldevorhaben) ===
Name: {keyword}
Zielländer: {countries}
Zielklassen: {classes}

=== SUCHERGEBNISSE ({count} relevante Treffer) ===
{searchResults}

=== DEINE ANALYSE ===

WICHTIG: Analysiere die Konflikte PRO ZIELLAND separat!

Für JEDEN Treffer bewerte:

1. ZEICHENÄHNLICHKEIT (SELBST bewerten, NICHT den accuracy-Wert nutzen!)
   - Visuell: Buchstabenfolge, Länge, Schriftbild
   - Phonetisch: Aussprache in Deutsch und Englisch
   - Begrifflich: Hat der Name eine Bedeutung?

2. KLASSENÜBERSCHNEIDUNG
   - Gleiche Nizza-Klassen = höheres Risiko

3. TERRITORIALE ÜBERSCHNEIDUNG
   - Ordne jeden Konflikt dem relevanten Zielland zu
   - WO-Marke mit Schutz in Zielland = relevant für dieses Land

4. KENNZEICHNUNGSKRAFT
   - Beschreibend/generisch = schwacher Schutz
   - Fantasiewort = starker Schutz

=== AUSGABEFORMAT (JSON) ===
{
  "overallRiskScore": number (0-100, gewichteter Durchschnitt aller Länder),
  "overallRiskLevel": "low" | "medium" | "high",
  "decision": "go" | "go_with_changes" | "no_go",
  
  "byCountry": {
    "LÄNDERCODE": {
      "riskScore": number (0-100),
      "riskLevel": "low" | "medium" | "high",
      "conflictCount": number,
      "recommendation": "Kurze Empfehlung für dieses Land"
    }
  },
  
  "conflicts": [
    {
      "name": "Markenname",
      "register": "WO/EU/DE/...",
      "relevantCountries": ["EG", "DE"],
      "riskScore": number (0-100),
      "riskLevel": "low" | "medium" | "high",
      "reasoning": "Kurze juristische Begründung (2-3 Sätze)",
      "similarity": {
        "visual": "hoch" | "mittel" | "gering",
        "phonetic": "hoch" | "mittel" | "gering",
        "conceptual": "hoch" | "mittel" | "gering" | "keine"
      }
    }
  ],
  
  "executiveSummary": "2-3 Sätze Kernaussage für Entscheider",
  "recommendation": "Konkrete Handlungsempfehlung",
  "riskMitigation": ["Maßnahme 1", "Maßnahme 2"] (optional),
  "alternatives": ["Alternative 1", "Alternative 2"] (nur bei hohem Risiko)
}`;


export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { keyword, countries = [], classes = [], includeRelatedClasses = false, relatedClasses = [], trademarkType = "word", fetchDetailsTopN = 10 } = body;

  if (!keyword?.trim()) {
    return new Response(JSON.stringify({ error: "keyword ist erforderlich" }), { status: 400 });
  }

  const apiKey = process.env.TMSEARCH_API_KEY || TEST_API_KEY;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendStep = (step: Step) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "step", step })}\n\n`));
      };

      const sendResult = (result: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", result })}\n\n`));
      };

      try {
        // STEP 1: TMSearch API Request
        sendStep({ id: "search", name: "TMSearch API", status: "running", payload: { keyword, endpoint: TMSEARCH_SEARCH_URL }, startTime: Date.now() });

        const searchUrl = new URL(TMSEARCH_SEARCH_URL);
        searchUrl.searchParams.set("keyword", keyword.trim());
        searchUrl.searchParams.set("api_key", apiKey);

        const searchRes = await fetch(searchUrl.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!searchRes.ok) {
          sendStep({ id: "search", name: "TMSearch API", status: "error", error: `HTTP ${searchRes.status}`, endTime: Date.now() });
          controller.close();
          return;
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
        
        // Statistiken berechnen
        const liveCount = allResults.filter((r: TMSearchResult) => r.status === "LIVE").length;
        const deadCount = allResults.filter((r: TMSearchResult) => r.status === "DEAD").length;
        
        // ALLE Treffer ungefiltert für Admin-Ansicht (mit allen API-Feldern)
        const allResultsMapped = allResults.map((r: TMSearchResult) => ({
          mid: r.mid,
          name: r.verbal,
          image: r.img,
          status: r.status,
          accuracy: r.accuracy,
          register: r.submition,
          countries: r.protection || [],
          classes: r.class || [],
          applicationNumber: r.app,
          registrationNumber: r.reg,
          dateApplied: r.dateApplied || r.date?.applied,
          dateGranted: r.dateGranted || r.date?.granted,
          dateExpiration: r.dateExpiration || r.date?.expiration
        }));
        
        // Top 20 GEFILTERT nach Suchkriterien (Länder, Klassen, nur LIVE)
        // Response enthält Original-Daten von TMSearch API, Filterung nur für Auswahl
        const filteredForDisplay = filterResults(allResults, countries, classes)
          .filter((r: TMSearchResult) => r.status === "LIVE")
          .slice(0, 20)
          .map((r: TMSearchResult) => ({
            mid: r.mid,
            name: r.verbal,
            image: r.img,
            status: r.status,
            accuracy: r.accuracy,
            register: r.submition,
            countries: r.protection || [], // Original-Länder aus API
            classes: r.class || [],
            applicationNumber: r.app,
            registrationNumber: r.reg,
            dateApplied: r.date?.applied,
            dateGranted: r.date?.granted,
            dateExpiration: r.date?.expiration
          }));
        
        const topResults = filteredForDisplay;
        
        sendStep({ 
          id: "search", 
          name: "TMSearch API", 
          status: "done", 
          payload: { keyword, searchedCountries: countries }, // Gesuchte Länder für UI-Filterung
          result: { 
            total: allResults.length,
            liveCount,
            deadCount,
            topResults,
            allResults: allResultsMapped // ALLE Treffer ungefiltert
          }, 
          endTime: Date.now() 
        });

        // STEP 2: Filter
        sendStep({ id: "filter", name: "Filter anwenden", status: "running", payload: { countries, classes, onlyLive: true }, startTime: Date.now() });

        const effectiveClasses = includeRelatedClasses && relatedClasses.length > 0
          ? [...new Set([...classes, ...relatedClasses])]
          : classes;

        const filteredResults = filterResults(allResults, countries, effectiveClasses);
        filteredResults.sort((a, b) => Number(b.accuracy || 0) - Number(a.accuracy || 0));

        sendStep({ id: "filter", name: "Filter anwenden", status: "done", result: { before: allResults.length, after: filteredResults.length }, endTime: Date.now() });

        // STEP 3: Top-Konflikte vorbereiten (Daten aus Schritt 1 verwenden)
        const topN = Math.min(fetchDetailsTopN, filteredResults.length);
        const topConflicts: ConflictWithDetails[] = filteredResults.slice(0, topN);
        
        sendStep({ 
          id: "details", 
          name: `Top ${topN} Konflikte`, 
          status: "done", 
          result: { 
            loaded: topConflicts.length,
            details: topConflicts.map(c => ({
              name: c.verbal,
              mid: c.mid,
              status: c.status,
              register: c.submition,
              registrationNumber: c.reg,
              applicationNumber: c.app,
              classes: c.class || [],
              countries: c.protection || [],
              dates: {
                applied: c.dateApplied || c.date?.applied,
                granted: c.dateGranted || c.date?.granted,
                expiration: c.dateExpiration || c.date?.expiration,
                renewal: c.dateRenewal || c.date?.renewal
              }
            }))
          }, 
          endTime: Date.now() 
        });

        // STEP 4: AI Analysis - EIN Claude-Call für ALLE Konflikte
        sendStep({ id: "ai-analysis", name: `AI Analyse (${topConflicts.length})`, status: "running", payload: { count: topConflicts.length }, startTime: Date.now() });

        // Bereite Suchergebnisse für Claude vor
        const searchClasses = classes.map((c: number | string) => String(c).padStart(2, "0"));
        const searchResultsForAI = topConflicts.map(conflict => {
          const conflictCountries = conflict.protection || [];
          const conflictClasses = (conflict.class || []).map(String);
          
          return {
            name: conflict.verbal,
            register: conflict.submition,
            status: conflict.status,
            countries: conflictCountries,
            classes: conflictClasses,
            registrationNumber: conflict.reg,
            applicationNumber: conflict.app,
            dateApplied: conflict.dateApplied || conflict.date?.applied,
            dateGranted: conflict.dateGranted || conflict.date?.granted,
            overlap: {
              commonCountries: countries.filter((c: string) => 
                conflictCountries.map((cc: string) => cc.toUpperCase()).includes(c.toUpperCase())
              ),
              commonClasses: searchClasses.filter((c: string) => conflictClasses.includes(c))
            }
          };
        });

        // Ein einziger Claude-Call
        const analysisPrompt = FULL_ANALYSIS_PROMPT
          .replace("{keyword}", keyword)
          .replace("{countries}", countries.join(", ") || "–")
          .replace("{classes}", searchClasses.join(", ") || "–")
          .replace("{count}", String(topConflicts.length))
          .replace("{searchResults}", JSON.stringify(searchResultsForAI, null, 2));

        let analysisResult = {
          overallRiskScore: 0,
          overallRiskLevel: "low" as "low" | "medium" | "high",
          decision: "go" as "go" | "go_with_changes" | "no_go",
          byCountry: {} as Record<string, { riskScore: number; riskLevel: "low" | "medium" | "high"; conflictCount: number; recommendation: string }>,
          conflicts: [] as { name: string; register: string; relevantCountries?: string[]; riskScore: number; riskLevel: string; reasoning: string; similarity?: { visual: string; phonetic: string; conceptual: string } }[],
          executiveSummary: "",
          recommendation: "",
          riskMitigation: [] as string[],
          alternatives: [] as string[]
        };

        try {
          const responseText = await callClaude(RISK_ANALYSIS_SYSTEM_PROMPT, analysisPrompt, 2000);
          const parsed = JSON.parse(responseText);
          analysisResult = { ...analysisResult, ...parsed };
          
          // Übertrage Ergebnisse auf topConflicts für spätere Verwendung
          for (const conflict of topConflicts) {
            const match = analysisResult.conflicts.find(c => c.name === conflict.verbal);
            if (match) {
              conflict.riskScore = match.riskScore || 0;
              conflict.riskLevel = (match.riskLevel as "low" | "medium" | "high") || "low";
              conflict.reasoning = match.reasoning || "";
              conflict.relevantCountries = match.relevantCountries || [];
            } else {
              const acc = Number(conflict.accuracy || 0);
              conflict.riskScore = acc >= 95 ? 75 : acc >= 85 ? 60 : acc >= 70 ? 45 : 30;
              conflict.riskLevel = conflict.riskScore >= 70 ? "high" : conflict.riskScore >= 40 ? "medium" : "low";
              conflict.reasoning = `${acc}% Namensähnlichkeit.`;
            }
            
            // IMMER relevantCountries neu berechnen mit korrekter Logik
            conflict.relevantCountries = getRelevantCountries(
              conflict.submition || "",
              conflict.protection || [],
              countries
            );
          }
          
          // byCountry IMMER neu berechnen für konsistente riskLevels
          analysisResult.byCountry = {};
          for (const country of countries) {
            const countryConflicts = topConflicts.filter(c => 
              (c.relevantCountries || []).includes(country)
            );
            const maxRisk = countryConflicts.length > 0 
              ? Math.max(...countryConflicts.map(c => c.riskScore || 0))
              : 0;
            analysisResult.byCountry[country] = {
              riskScore: maxRisk,
              riskLevel: maxRisk >= 70 ? "high" : maxRisk >= 40 ? "medium" : "low",
              conflictCount: countryConflicts.length,
              recommendation: countryConflicts.length === 0 
                ? "Keine Konflikte gefunden" 
                : maxRisk >= 70 
                  ? "Anmeldung nicht empfohlen" 
                  : maxRisk >= 40 
                    ? "Anmeldung mit Vorsicht möglich" 
                    : "Anmeldung empfohlen"
            };
          }
        } catch {
          // Fallback: Lokale Berechnung
          for (const conflict of topConflicts) {
            const acc = Number(conflict.accuracy || 0);
            conflict.riskScore = acc >= 95 ? 75 : acc >= 85 ? 60 : acc >= 70 ? 45 : 30;
            conflict.riskLevel = conflict.riskScore >= 70 ? "high" : conflict.riskScore >= 40 ? "medium" : "low";
            conflict.reasoning = `${acc}% Namensähnlichkeit.`;
            // relevantCountries mit korrekter Logik berechnen
            conflict.relevantCountries = getRelevantCountries(
              conflict.submition || "",
              conflict.protection || [],
              countries
            );
          }
          const maxRisk = Math.max(...topConflicts.map(c => c.riskScore || 0), 0);
          analysisResult.overallRiskScore = maxRisk;
          analysisResult.overallRiskLevel = maxRisk >= 80 ? "high" : maxRisk >= 50 ? "medium" : "low";
          analysisResult.decision = maxRisk >= 80 ? "no_go" : maxRisk >= 50 ? "go_with_changes" : "go";
          analysisResult.executiveSummary = `${filteredResults.length} relevante Marken gefunden. Höchstes Risiko: ${maxRisk}%.`;
          
          // Fallback: byCountry berechnen
          analysisResult.byCountry = {};
          for (const country of countries) {
            const countryConflicts = topConflicts.filter(c => 
              (c.relevantCountries || []).includes(country)
            );
            const countryMaxRisk = countryConflicts.length > 0 
              ? Math.max(...countryConflicts.map(c => c.riskScore || 0))
              : 0;
            analysisResult.byCountry[country] = {
              riskScore: countryMaxRisk,
              riskLevel: countryMaxRisk >= 70 ? "high" : countryMaxRisk >= 40 ? "medium" : "low",
              conflictCount: countryConflicts.length,
              recommendation: countryConflicts.length === 0 
                ? "Keine Konflikte gefunden" 
                : countryMaxRisk >= 70 
                  ? "Anmeldung nicht empfohlen" 
                  : countryMaxRisk >= 40 
                    ? "Anmeldung mit Vorsicht möglich" 
                    : "Anmeldung empfohlen"
            };
          }
        }

        sendStep({ 
          id: "ai-analysis", 
          name: `AI Analyse (${topConflicts.length})`, 
          status: "done", 
          result: { 
            analyzed: topConflicts.length,
            input: { newTrademark: { name: keyword, countries, classes: searchClasses }, searchResults: searchResultsForAI },
            output: analysisResult
          }, 
          endTime: Date.now() 
        });

        // STEP 5: Summary (visuell, Daten kommen aus Schritt 4)
        sendStep({ id: "summary", name: "Zusammenfassung", status: "running", startTime: Date.now() });

        // Kurze Pause für visuellen Effekt
        await new Promise(resolve => setTimeout(resolve, 300));

        const summary = {
          overallRiskScore: analysisResult.overallRiskScore,
          overallRiskLevel: analysisResult.overallRiskLevel,
          decision: analysisResult.decision,
          byCountry: analysisResult.byCountry,
          executiveSummary: analysisResult.executiveSummary,
          recommendation: analysisResult.recommendation,
          riskMitigation: analysisResult.riskMitigation,
          alternatives: analysisResult.alternatives
        };

        sendStep({ id: "summary", name: "Zusammenfassung", status: "done", result: summary, endTime: Date.now() });

        // Konflikte pro Land zählen für SearchCoverageReport
        const conflictsPerCountry: Record<string, number> = {};
        for (const country of countries) {
          const countryCode = country.toUpperCase();
          // Zähle Konflikte die für dieses Land relevant sind
          const countryConflictCount = topConflicts.filter(c => {
            const relevantCountries = c.relevantCountries || [];
            const protection = c.protection || [];
            const office = (c.submition || "").toUpperCase();
            
            // Direkte Übereinstimmung
            if (relevantCountries.includes(countryCode)) return true;
            if (protection.map(p => p.toUpperCase()).includes(countryCode)) return true;
            if (office === countryCode) return true;
            
            // EUIPO gilt für alle EU-Länder
            if (office === "EU" && EU_COUNTRIES.includes(countryCode)) return true;
            
            // WIPO mit Designation
            if (office === "WO") {
              if (protection.map(p => p.toUpperCase()).includes(countryCode)) return true;
              if (protection.includes("EU") && EU_COUNTRIES.includes(countryCode)) return true;
            }
            
            return false;
          }).length;
          
          conflictsPerCountry[countryCode] = countryConflictCount;
        }
        
        // SearchCoverageReport erstellen
        const searchCoverageReport = createSearchCoverageReport(countries, conflictsPerCountry);

        // Final Result
        sendResult({
          success: true,
          query: { keyword, countries, classes, effectiveClasses, trademarkType },
          stats: { totalRaw: allResults.length, totalFiltered: filteredResults.length, analyzedCount: topConflicts.length },
          analysis: summary,
          searchCoverage: searchCoverageReport,
          conflicts: topConflicts.map(c => ({
            id: c.mid, 
            name: c.verbal, 
            status: c.status, 
            office: c.submition,
            protection: c.protection,
            relevantCountries: c.relevantCountries || [],
            classes: c.class, 
            accuracy: c.accuracy, 
            owner: c.owner,
            goodsServices: c.goodsServices, 
            riskScore: c.riskScore, 
            riskLevel: c.riskLevel, 
            reasoning: c.reasoning,
            applicationNumber: c.app,
            registrationNumber: c.reg,
            dates: c.date,
            image: c.img,
          })),
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Unbekannter Fehler" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
