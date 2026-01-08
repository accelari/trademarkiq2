import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const TMSEARCH_SEARCH_URL = "https://tmsearch.ai/api/search/";
const TMSEARCH_INFO_URL = "https://tmsearch.ai/api/info/";
const TEST_API_KEY = "TESTAPIKEY";

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

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

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 500): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt + "\n\nAntworte IMMER als valides JSON ohne Markdown-Formatierung.",
    messages: [{ role: "user", content: userPrompt }],
  });
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
        if (c.description) goodsServices.push(`Klasse ${c.number}: ${c.description}`);
      });
    }

    return { ...data, owner: data.owner, goodsServices };
  } catch {
    return null;
  }
}

const RISK_ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Markenrechtler mit 40 Jahren Erfahrung in der internationalen Kollisionsanalyse.

RECHTLICHE GRUNDLAGEN:
- EU: Art. 8 UMV (Unionsmarkenverordnung) - Relative Eintragungshindernisse
- DE: § 9 MarkenG - Relative Schutzhindernisse, Verwechslungsgefahr
- CH: Art. 3 MSchG - Ausschlussgründe, Kollisionsprüfung
- International: Pariser Verbandsübereinkunft, Madrider Protokoll

VERWECHSLUNGSGEFAHR-KRITERIEN (EuGH/BGH-Rechtsprechung):
1. Zeichenähnlichkeit: visuell, phonetisch, begrifflich (Gesamteindruck)
2. Waren-/Dienstleistungsähnlichkeit: nicht nur Klasse, sondern tatsächliche Verwendung
3. Kennzeichnungskraft der älteren Marke: schwach (beschreibend) bis stark (bekannte Marke)
4. Aufmerksamkeit des Durchschnittsverbrauchers: höher bei teuren/speziellen Waren
5. Wechselwirkung: hohe Zeichenähnlichkeit kann geringe Warenähnlichkeit ausgleichen

RISIKO-EINSTUFUNG:
- HIGH (80-100): Identität/hochgradige Ähnlichkeit + gleiche/ähnliche Waren = Widerspruch sehr wahrscheinlich
- MEDIUM (50-79): Ähnlichkeit + verwandte Waren = Widerspruch möglich, Koexistenz prüfen
- LOW (0-49): Geringe Ähnlichkeit oder verschiedene Branchen = Anmeldung vertretbar

Antworte auf Deutsch und formatiere als JSON.`;

const CONFLICT_ANALYSIS_PROMPT = `Analysiere diesen Markenkonflikt nach markenrechtlichen Kriterien:

NEUE MARKE: {keyword}
Zielländer: {countries} | Zielklassen: {classes}

ÄLTERE MARKE (potentieller Konflikt):
- Name: {conflictName} | Status: {status} | Amt: {office}
- Klassen: {conflictClasses} | Namensähnlichkeit: {accuracy}%
- Inhaber: {owner}
- Waren/Dienstleistungen: {goodsServices}

PRÜFE SYSTEMATISCH:
1. ZEICHENÄHNLICHKEIT:
   - Visuell: Schriftbild, Länge, Buchstabenfolge
   - Phonetisch: Aussprache, Silbenstruktur, Betonung
   - Begrifflich: Bedeutung, Assoziationen
   
2. WAREN-/DL-ÄHNLICHKEIT:
   - Gleiche Klasse = nicht automatisch gleiche Waren
   - Prüfe: Verwendungszweck, Vertriebswege, Zielgruppe
   
3. KENNZEICHNUNGSKRAFT:
   - Ist die ältere Marke beschreibend (schwach) oder fantasievoll (stark)?
   - Bekannte Marken haben erweiterten Schutzumfang

4. GESAMTABWÄGUNG:
   - Wechselwirkung der Faktoren berücksichtigen

Antworte als JSON:
{"riskScore": number (0-100), "riskLevel": "low"|"medium"|"high", "reasoning": "Kurze juristische Begründung mit Bezug auf die Prüfkriterien"}`;

const SUMMARY_PROMPT = `Erstelle eine professionelle Zusammenfassung der Markenrecherche mit strategischer Handlungsempfehlung:

NEUE MARKE: {keyword}
Zielländer: {countries} | Zielklassen: {classes}
LIVE-Treffer (nach Filter): {totalLive} | Detailliert analysiert: {relevantCount}

ANALYSIERTE KONFLIKTE:
{topConflicts}

ERSTELLE EINE GESAMTBEWERTUNG:
1. Gewichte die einzelnen Konflikte nach Schwere
2. Berücksichtige kumulative Risiken bei mehreren ähnlichen Marken
3. Beachte geografische Unterschiede (EU vs. nationale Marken)

Antworte als JSON:
{
  "overallRiskScore": number (0-100, gewichteter Durchschnitt der Top-Konflikte),
  "overallRiskLevel": "low"|"medium"|"high",
  "decision": "go"|"go_with_changes"|"no_go",
  "executiveSummary": "2-3 Sätze Kernaussage für Entscheider",
  "recommendation": "Konkrete Handlungsempfehlung",
  "riskMitigation": ["Maßnahme 1 zur Risikominderung", "Maßnahme 2", ...],
  "alternatives": ["Alternative Schreibweise 1", "Alternative 2", ...] (nur bei hohem Risiko),
  "criticalConflicts": ["Name der kritischsten Marke(n)"] (nur bei Risiko > 50)
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
        
        // Top 20 Treffer mit mehr Details für die Anzeige
        const topResults = allResults.slice(0, 20).map((r: TMSearchResult) => ({
          name: r.verbal,
          status: r.status,
          accuracy: r.accuracy,
          register: r.submition, // Register/Amt (WO, EU, US, DE, etc.)
          countries: r.protection || [],
          classes: r.class || []
        }));
        
        sendStep({ 
          id: "search", 
          name: "TMSearch API", 
          status: "done", 
          result: { 
            total: allResults.length,
            liveCount,
            deadCount,
            topResults
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

        // STEP 3: Fetch Details
        const topN = Math.min(fetchDetailsTopN, filteredResults.length);
        sendStep({ id: "details", name: `Details laden (${topN})`, status: "running", payload: { count: topN }, startTime: Date.now() });

        const topConflicts: ConflictWithDetails[] = [];
        for (let i = 0; i < topN; i++) {
          const result = filteredResults[i];
          if (result.mid) {
            const details = await fetchTrademarkInfo(result.mid, apiKey);
            topConflicts.push(details ? { ...result, ...details } : result);
          } else {
            topConflicts.push(result);
          }
        }

        sendStep({ id: "details", name: `Details laden (${topN})`, status: "done", result: { loaded: topConflicts.length }, endTime: Date.now() });

        // STEP 4: AI Analysis per Conflict
        sendStep({ id: "ai-analysis", name: `AI Analyse (${topConflicts.length})`, status: "running", payload: { count: topConflicts.length }, startTime: Date.now() });

        for (const conflict of topConflicts) {
          const conflictPrompt = CONFLICT_ANALYSIS_PROMPT
            .replace("{keyword}", keyword)
            .replace("{countries}", countries.join(", ") || "–")
            .replace("{classes}", classes.join(", ") || "–")
            .replace("{conflictName}", conflict.verbal || "–")
            .replace("{status}", conflict.status || "–")
            .replace("{office}", conflict.submition || "–")
            .replace("{conflictClasses}", (conflict.class || []).join(", ") || "–")
            .replace("{accuracy}", String(conflict.accuracy || "–"))
            .replace("{owner}", conflict.owner?.name || "–")
            .replace("{goodsServices}", (conflict.goodsServices || []).slice(0, 3).join("; ") || "–");

          try {
            const responseText = await callClaude(RISK_ANALYSIS_SYSTEM_PROMPT, conflictPrompt, 300);
            const parsed = JSON.parse(responseText);
            conflict.riskScore = parsed.riskScore || 0;
            conflict.riskLevel = parsed.riskLevel || "low";
            conflict.reasoning = parsed.reasoning || "";
          } catch {
            const acc = Number(conflict.accuracy || 0);
            conflict.riskScore = acc >= 95 ? 75 : acc >= 85 ? 60 : acc >= 70 ? 45 : 30;
            conflict.riskLevel = conflict.riskScore >= 70 ? "high" : conflict.riskScore >= 40 ? "medium" : "low";
            conflict.reasoning = `${acc}% Namensähnlichkeit.`;
          }
        }

        sendStep({ id: "ai-analysis", name: `AI Analyse (${topConflicts.length})`, status: "done", result: { analyzed: topConflicts.length }, endTime: Date.now() });

        // STEP 5: Summary
        sendStep({ id: "summary", name: "Zusammenfassung", status: "running", startTime: Date.now() });

        const topConflictsSummary = topConflicts.slice(0, 5).map(c => ({
          name: c.verbal, office: c.submition, classes: c.class, riskScore: c.riskScore, reasoning: c.reasoning,
        }));

        const summaryPrompt = SUMMARY_PROMPT
          .replace("{keyword}", keyword)
          .replace("{countries}", countries.join(", ") || "–")
          .replace("{classes}", classes.join(", ") || "–")
          .replace("{totalLive}", String(filteredResults.length))
          .replace("{relevantCount}", String(topConflicts.length))
          .replace("{topConflicts}", JSON.stringify(topConflictsSummary, null, 2));

        let summary = {
          overallRiskScore: 0,
          overallRiskLevel: "low" as "low" | "medium" | "high",
          decision: "go" as "go" | "go_with_changes" | "no_go",
          executiveSummary: "",
          recommendation: "",
        };

        try {
          const summaryText = await callClaude(RISK_ANALYSIS_SYSTEM_PROMPT, summaryPrompt, 800);
          summary = { ...summary, ...JSON.parse(summaryText) };
        } catch {
          const maxRisk = Math.max(...topConflicts.map(c => c.riskScore || 0), 0);
          summary.overallRiskScore = maxRisk;
          summary.overallRiskLevel = maxRisk >= 80 ? "high" : maxRisk >= 50 ? "medium" : "low";
          summary.decision = maxRisk >= 80 ? "no_go" : maxRisk >= 50 ? "go_with_changes" : "go";
          summary.executiveSummary = `${filteredResults.length} relevante Marken gefunden. Höchstes Risiko: ${maxRisk}%.`;
        }

        sendStep({ id: "summary", name: "Zusammenfassung", status: "done", result: summary, endTime: Date.now() });

        // Final Result
        sendResult({
          success: true,
          query: { keyword, countries, classes, effectiveClasses, trademarkType },
          stats: { totalRaw: allResults.length, totalFiltered: filteredResults.length, analyzedCount: topConflicts.length },
          analysis: summary,
          conflicts: topConflicts.map(c => ({
            id: c.mid, 
            name: c.verbal, 
            status: c.status, 
            office: c.submition,
            protection: c.protection, // Schutzländer (z.B. ["US", "EU"] bei WO-Marke)
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
