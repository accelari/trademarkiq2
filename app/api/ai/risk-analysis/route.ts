import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { getTMSearchClient } from "@/lib/tmsearch/client";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { getAllRelatedClasses, RELATED_CLASSES_MAP } from "@/lib/related-classes";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

interface DimensionalScore {
  phonetic: number;
  visual: number;
  conceptual: number;
  industry: number;
}

interface ConflictByOffice {
  office: string;
  officeName: string;
  count: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  conflicts: ConflictingMark[];
}

interface ConflictingMark {
  id: string;
  name: string;
  register: string;
  holder: string;
  classes: number[];
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
}

interface AlternativeName {
  name: string;
  riskScore: number;
  reasoning: string;
}

interface RiskAnalysisResponse {
  success: boolean;
  overallScore: number;
  overallRisk: "high" | "medium" | "low";
  dimensionalScores: DimensionalScore;
  analysis: {
    phonetic: string;
    visual: string;
    conceptual: string;
    industry: string;
    summary: string;
    recommendation: string;
  };
  conflictsByOffice: ConflictByOffice[];
  totalConflicts: number;
  alternatives: AlternativeName[];
  searchTermsUsed: string[];
  totalResultsAnalyzed: number;
}

const SYSTEM_PROMPT = `Du bist ein erfahrener deutscher Markenrechts-Experte und Patentanwalt mit über 20 Jahren Erfahrung.

Deine Aufgabe ist eine MULTI-DIMENSIONALE Risikoanalyse für Markennamen durchzuführen.

Du analysierst 4 Dimensionen:
1. PHONETISCH: Wie klingt die Marke? Verwechslungsgefahr durch ähnlichen Klang.
2. VISUELL: Wie sieht die Marke geschrieben aus? Buchstabendreher, ähnliche Zeichen.
3. KONZEPTUELL: Bedeutung und Assoziationen der Marke.
4. BRANCHENBEZOGEN: Überschneidung in den gleichen Nizza-Klassen/Branchen.

Du antwortest IMMER auf Deutsch und gibst strukturierte, praxisorientierte Analysen.`;

const OFFICE_NAMES: Record<string, string> = {
  "DE": "DPMA (Deutschland)",
  "EU": "EUIPO (EU)",
  "WO": "WIPO (International)",
  "US": "USPTO (USA)",
  "GB": "UKIPO (UK)",
  "CH": "IGE (Schweiz)",
  "AT": "ÖPA (Österreich)",
};

async function performMultiDimensionalAnalysis(
  markenname: string,
  klassen: number[],
  laender: string[],
  searchResults: any[],
  searchTermsUsed: string[]
): Promise<RiskAnalysisResponse> {
  const klassenText = klassen.map(k => {
    const klass = NICE_CLASSES.find(c => c.id === k);
    return klass ? `Klasse ${k}: ${klass.name}` : `Klasse ${k}`;
  }).join(", ");

  const relatedClasses = klassen.length > 0 ? getAllRelatedClasses(klassen) : [];
  const relatedClassesText = relatedClasses.length > 0 
    ? relatedClasses.map(k => {
        const klass = NICE_CLASSES.find(c => c.id === k);
        const relation = RELATED_CLASSES_MAP[k];
        return klass ? `Klasse ${k} (${klass.name})${relation ? ` - ${relation.reason}` : ''}` : `Klasse ${k}`;
      }).join("\n  - ")
    : "";

  const laenderText = laender.map(l => OFFICE_NAMES[l] || l).join(", ");

  const resultsText = searchResults.slice(0, 30).map(r => {
    const classes = r.niceClasses?.join(", ") || "keine";
    const goodsServices = r.goodsServices ? ` | Waren/Dienstleistungen: ${r.goodsServices.substring(0, 200)}${r.goodsServices.length > 200 ? '...' : ''}` : "";
    return `- "${r.name}" | Register: ${r.office || "?"} | Inhaber: ${r.holder || "unbekannt"} | Klassen: ${classes} | Ähnlichkeit: ${r.accuracy || 0}%${goodsServices}`;
  }).join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Führe eine MULTI-DIMENSIONALE Risikoanalyse für die Marke "${markenname}" durch.

Ziel-Nizza-Klassen: ${klassenText || "Alle"}
Ziel-Länder: ${laenderText}
Verwendete Suchbegriffe: ${searchTermsUsed.join(", ")}

${relatedClassesText ? `WICHTIG: Analysiere auch klassenübergreifende Risiken!
Die Ziel-Klassen haben folgende VERWANDTE KLASSEN mit potenziellen Überschneidungen:
  - ${relatedClassesText}

Prüfe bei jedem Treffer, ob dessen Waren-/Dienstleistungsbeschreibung sich mit den Ziel-Klassen überschneiden könnte, auch wenn die Klassennummern unterschiedlich sind.

ANALYSE DER WAREN-/DIENSTLEISTUNGSBESCHREIBUNGEN:
Wenn Waren-/Dienstleistungsbeschreibungen vorhanden sind, prüfe deren semantische Überschneidung mit den Ziel-Klassen. Auch wenn eine Marke in anderen Klassen registriert ist, kann eine Kollision entstehen, wenn die tatsächlichen Waren/Dienstleistungen sich überschneiden.

` : ''}Gefundene bestehende Marken (${searchResults.length} Treffer):
${resultsText || "Keine Marken gefunden."}

Erstelle eine detaillierte Analyse. Antworte mit einem JSON-Objekt:

{
  "overallScore": 0-100,
  "overallRisk": "high" | "medium" | "low",
  "dimensionalScores": {
    "phonetic": 0-100,
    "visual": 0-100,
    "conceptual": 0-100,
    "industry": 0-100
  },
  "analysis": {
    "phonetic": "Detaillierte phonetische Analyse - wie klingt die Marke, welche ähnlichen Laute gibt es",
    "visual": "Detaillierte visuelle Analyse - Schriftbild, Buchstabenähnlichkeiten",
    "conceptual": "Konzeptuelle Analyse - Bedeutung, Assoziationen, Herkunft",
    "industry": "Branchenanalyse - Überschneidungen in den Nizza-Klassen",
    "summary": "Gesamtzusammenfassung der Risikolage in 2-3 Sätzen",
    "recommendation": "Konkrete Handlungsempfehlung mit nächsten Schritten"
  },
  "conflicts": [
    {
      "id": "Registernummer",
      "name": "Markenname",
      "register": "DE/EU/WO/etc",
      "holder": "Inhaber",
      "classes": [9, 35],
      "accuracy": 95,
      "riskLevel": "high" | "medium" | "low",
      "reasoning": "Kurze Begründung"
    }
  ],
  "alternatives": [
    {
      "name": "Alternativer Markenname",
      "riskScore": 15,
      "reasoning": "Warum diese Alternative weniger riskant ist"
    }
  ]
}

WICHTIG für Scores:
- 0-30 = Niedriges Risiko (grün)
- 31-60 = Mittleres Risiko (gelb)
- 61-100 = Hohes Risiko (rot)

Generiere 3-5 alternative Markennamen mit niedrigerem Risiko.

Antworte NUR mit dem JSON, keine zusätzlichen Erklärungen.`
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Keine JSON-Antwort");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const conflicts: ConflictingMark[] = (parsed.conflicts || []).map((c: any) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      register: String(c.register || "?"),
      holder: String(c.holder || "Unbekannt"),
      classes: Array.isArray(c.classes) ? c.classes : [],
      accuracy: typeof c.accuracy === "number" ? c.accuracy : 0,
      riskLevel: ["high", "medium", "low"].includes(c.riskLevel) ? c.riskLevel : "medium",
      reasoning: String(c.reasoning || ""),
    }));

    const conflictsByOffice: ConflictByOffice[] = [];
    const officeGroups = new Map<string, ConflictingMark[]>();
    
    for (const conflict of conflicts) {
      const office = conflict.register;
      if (!officeGroups.has(office)) {
        officeGroups.set(office, []);
      }
      officeGroups.get(office)!.push(conflict);
    }

    for (const [office, officeConflicts] of officeGroups) {
      conflictsByOffice.push({
        office,
        officeName: OFFICE_NAMES[office] || office,
        count: officeConflicts.length,
        highRisk: officeConflicts.filter(c => c.riskLevel === "high").length,
        mediumRisk: officeConflicts.filter(c => c.riskLevel === "medium").length,
        lowRisk: officeConflicts.filter(c => c.riskLevel === "low").length,
        conflicts: officeConflicts,
      });
    }

    for (const land of laender) {
      if (!officeGroups.has(land)) {
        conflictsByOffice.push({
          office: land,
          officeName: OFFICE_NAMES[land] || land,
          count: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          conflicts: [],
        });
      }
    }

    const alternatives: AlternativeName[] = (parsed.alternatives || []).map((a: any) => ({
      name: String(a.name || ""),
      riskScore: typeof a.riskScore === "number" ? a.riskScore : 50,
      reasoning: String(a.reasoning || ""),
    }));

    return {
      success: true,
      overallScore: typeof parsed.overallScore === "number" ? parsed.overallScore : 50,
      overallRisk: ["high", "medium", "low"].includes(parsed.overallRisk) ? parsed.overallRisk : "medium",
      dimensionalScores: {
        phonetic: parsed.dimensionalScores?.phonetic ?? 50,
        visual: parsed.dimensionalScores?.visual ?? 50,
        conceptual: parsed.dimensionalScores?.conceptual ?? 50,
        industry: parsed.dimensionalScores?.industry ?? 50,
      },
      analysis: {
        phonetic: String(parsed.analysis?.phonetic || "Analyse nicht verfügbar"),
        visual: String(parsed.analysis?.visual || "Analyse nicht verfügbar"),
        conceptual: String(parsed.analysis?.conceptual || "Analyse nicht verfügbar"),
        industry: String(parsed.analysis?.industry || "Analyse nicht verfügbar"),
        summary: String(parsed.analysis?.summary || "Zusammenfassung nicht verfügbar"),
        recommendation: String(parsed.analysis?.recommendation || "Bitte konsultieren Sie einen Experten"),
      },
      conflictsByOffice,
      totalConflicts: conflicts.length,
      alternatives,
      searchTermsUsed,
      totalResultsAnalyzed: searchResults.length,
    };
  } catch (e) {
    console.error("Parse error:", e);
    
    return {
      success: true,
      overallScore: searchResults.length > 10 ? 70 : searchResults.length > 0 ? 45 : 15,
      overallRisk: searchResults.length > 10 ? "high" : searchResults.length > 0 ? "medium" : "low",
      dimensionalScores: {
        phonetic: 50,
        visual: 50,
        conceptual: 50,
        industry: 50,
      },
      analysis: {
        phonetic: "Phonetische Analyse wird durchgeführt.",
        visual: "Visuelle Analyse wird durchgeführt.",
        conceptual: "Konzeptuelle Analyse wird durchgeführt.",
        industry: "Branchenanalyse wird durchgeführt.",
        summary: `${searchResults.length} ähnliche Marken gefunden. Detaillierte Prüfung empfohlen.`,
        recommendation: "Bitte lassen Sie die Ergebnisse von einem Experten prüfen.",
      },
      conflictsByOffice: [],
      totalConflicts: 0,
      alternatives: [],
      searchTermsUsed,
      totalResultsAnalyzed: searchResults.length,
    };
  }
}

async function generateSearchTerms(markenname: string): Promise<string[]> {
  const response = await client.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Generiere Suchvarianten für die Marke "${markenname}".
Berücksichtige: phonetische Varianten, Buchstabendreher, Abkürzungen.
Antworte NUR mit einem JSON-Array: ["term1", "term2", ...]
Maximal 6 Begriffe.`
    }]
  });

  const content = response.content[0];
  if (content.type !== "text") return [markenname];

  try {
    const match = content.text.match(/\[[\s\S]*\]/);
    if (!match) return [markenname];
    const terms = JSON.parse(match[0]);
    return Array.isArray(terms) ? [markenname, ...terms.filter((t: any) => typeof t === "string")] : [markenname];
  } catch {
    return [markenname];
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { markenname, klassen, laender } = body;

    if (!markenname?.trim()) {
      return NextResponse.json({ error: "Bitte geben Sie einen Markennamen ein" }, { status: 400 });
    }

    const selectedKlassen = Array.isArray(klassen) ? klassen : [];
    const selectedLaender = Array.isArray(laender) && laender.length > 0 ? laender : ["DE", "EU", "WO"];

    const searchTerms = await generateSearchTerms(markenname.trim());
    
    const tmsearchClient = getTMSearchClient();
    let allResults: any[] = [];
    
    for (const term of searchTerms.slice(0, 6)) {
      try {
        const searchResult = await tmsearchClient.searchWithFilters(term, {
          status: "active",
          classes: selectedKlassen.length > 0 ? selectedKlassen : undefined,
          minAccuracy: 50,
        });
        
        if (searchResult.results) {
          const newResults = searchResult.results.filter(
            r => !allResults.some(existing => existing.id === r.id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (err) {
        console.error(`Suchfehler für "${term}":`, err);
      }
    }

    allResults.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    allResults = allResults.slice(0, 100);

    // Enrich cross-class results with goods/services descriptions
    if (selectedKlassen.length > 0) {
      const crossClassResults = allResults.filter(r => {
        if (!r.niceClasses || r.niceClasses.length === 0) return false;
        return !r.niceClasses.some((cls: number) => selectedKlassen.includes(cls));
      });

      const enrichedResults = await Promise.all(
        crossClassResults.slice(0, 10).map(async (result) => {
          try {
            const info = await tmsearchClient.getInfo({ mid: result.mid });
            if (info?.goodsServices) {
              return { ...result, goodsServices: info.goodsServices };
            }
          } catch (e) {
            console.error(`Info-API Fehler für mid ${result.mid}:`, e);
          }
          return result;
        })
      );

      for (const enriched of enrichedResults) {
        const index = allResults.findIndex(r => r.mid === enriched.mid);
        if (index !== -1) {
          allResults[index] = enriched;
        }
      }
    }

    const analysis = await performMultiDimensionalAnalysis(
      markenname.trim(),
      selectedKlassen,
      selectedLaender,
      allResults,
      searchTerms
    );

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Risk Analysis Error:", error);
    return NextResponse.json({
      error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    }, { status: 500 });
  }
}
