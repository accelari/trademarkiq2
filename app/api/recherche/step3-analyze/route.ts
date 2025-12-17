import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { calculateSimilarity } from "@/lib/similarity";
import { getTMSearchClient } from "@/lib/tmsearch/client";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein weltweit anerkannter Markenrechts-Experte mit 25+ Jahren Erfahrung in internationaler Markenpraxis.

DEINE QUALIFIKATIONEN:
- Zugelassen bei: USPTO (USA), EUIPO (EU), DPMA (DE), UKIPO (UK), WIPO, JPO (Japan), CNIPA (China), KIPO (Korea)
- Spezialist für internationale Markenanmeldungen nach dem Madrider Protokoll
- Expertise in 50+ Jurisdiktionen weltweit
- Ehemaliger Prüfer bei EUIPO und USPTO

DEINE EXPERTISE UMFASST:

1. SPRACHSPEZIFISCHE PHONETIK:
   - Englisch: th/s/z, w/v, r-dropping, vowel shifts
   - Deutsch: ch/sch, ä/ae, ü/ue, ö/oe, ß/ss, ei/ai
   - Französisch: nasale Vokale, stummes h/e, liaison
   - Spanisch: b/v, ll/y, h-stumm, ñ
   - Chinesisch: Pinyin-Transliteration, Tonunterschiede ignoriert bei Marken
   - Japanisch: Katakana-Phonetik, r/l-Verwechslung
   - Arabisch: transliterierte Varianten, Vokalauslassungen

2. BEKANNTE MARKEN (erweiterter Schutz):
   - Erkenne berühmte Marken: Apple, Nike, Google, Mercedes, BMW, Samsung, Toyota, Coca-Cola, etc.
   - Diese haben klassenübergreifenden Schutz (Verwässerungsschutz)
   - Auch phonetische/konzeptuelle Ähnlichkeit ist riskant

3. JURISDIKTIONSSPEZIFISCHE UNTERSCHIEDE:
   - USA: "Likelihood of Confusion" Test, Benutzungszwang, Common Law Rechte
   - EU: "Verwechslungsgefahr" nach EuGH-Rechtsprechung, keine Benutzungsprüfung vor Eintragung
   - China: "First-to-file" System, Suche nach chinesischen Zeichen-Äquivalenten
   - Japan: Strenge phonetische Prüfung, Katakana-Varianten wichtig

4. WAREN-/DIENSTLEISTUNGSÄHNLICHKEIT:
   - Nicht alle Waren in einer Klasse sind ähnlich
   - Klasse 9: Software ≠ Brillen ≠ Feuerlöscher
   - Klasse 35: Werbung ≠ Büroarbeiten ≠ Einzelhandel

Du antwortest IMMER auf Deutsch und gibst strukturierte, praxisorientierte weltweite Analysen.`;

const FAMOUS_MARKS = [
  "ADIDAS", "NIKE", "APPLE", "GOOGLE", "MICROSOFT", "AMAZON", "FACEBOOK", "META",
  "COCA-COLA", "COCA COLA", "PEPSI", "MCDONALD'S", "MCDONALDS", "STARBUCKS",
  "MERCEDES", "MERCEDES-BENZ", "BMW", "AUDI", "PORSCHE", "VOLKSWAGEN", "VW",
  "SAMSUNG", "SONY", "LG", "HUAWEI", "XIAOMI",
  "LOUIS VUITTON", "GUCCI", "PRADA", "CHANEL", "HERMES", "ROLEX",
  "DISNEY", "WARNER", "NETFLIX", "SPOTIFY",
  "VISA", "MASTERCARD", "PAYPAL",
  "INTEL", "AMD", "NVIDIA",
  "TOYOTA", "HONDA", "FORD", "TESLA",
  "IKEA", "ZARA", "H&M"
];

const OFFICE_CODE_TO_NAME: Record<string, string> = {
  WO: "WIPO", EU: "EUIPO", EM: "EUIPO", DE: "DPMA", US: "USPTO",
  GB: "UKIPO", UK: "UKIPO", FR: "INPI", ES: "OEPM", IT: "UIBM", CH: "IGE",
  AT: "ÖPA", CN: "CNIPA", JP: "JPO", KR: "KIPO", AU: "IP Australia",
  CA: "CIPO", BR: "INPI-BR", IN: "CGPDTM", TR: "TÜRKPATENT", RU: "ROSPATENT"
};

const NAME_TO_OFFICE_CODES: Record<string, string[]> = {
  "WIPO": ["WO"], 
  "WO": ["WO"],
  "EUIPO": ["EU", "EM"],
  "EU": ["EU", "EM"],
  "EM": ["EU", "EM"],
  "DPMA": ["DE"], 
  "DE": ["DE"],
  "USPTO": ["US"],
  "US": ["US"],
  "UKIPO": ["GB", "UK"], 
  "GB": ["GB", "UK"],
  "UK": ["GB", "UK"],
  "INPI": ["FR"], 
  "FR": ["FR"],
  "OEPM": ["ES"], 
  "ES": ["ES"],
  "UIBM": ["IT"], 
  "IT": ["IT"],
  "IGE": ["CH"],
  "CH": ["CH"],
  "ÖPA": ["AT"], 
  "OPA": ["AT"],
  "AT": ["AT"],
  "CNIPA": ["CN"], 
  "CN": ["CN"],
  "JPO": ["JP"], 
  "JP": ["JP"],
  "KIPO": ["KR"], 
  "KR": ["KR"],
  "IP AUSTRALIA": ["AU"],
  "AU": ["AU"],
  "CIPO": ["CA"], 
  "CA": ["CA"],
};

function normalizeRegisterName(register: string): string {
  return register
    .toUpperCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getOfficeCodes(register: string): string[] {
  const normalized = normalizeRegisterName(register);
  if (NAME_TO_OFFICE_CODES[normalized]) {
    return NAME_TO_OFFICE_CODES[normalized];
  }
  for (const [key, codes] of Object.entries(NAME_TO_OFFICE_CODES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return codes;
    }
  }
  return [register.toUpperCase()];
}

function isFamousMark(name: string): boolean {
  const upperName = name.toUpperCase();
  const cleanedName = upperName.replace(/[^A-Z]/g, '');
  for (const famous of FAMOUS_MARKS) {
    if (upperName.includes(famous) || famous.includes(cleanedName)) {
      return true;
    }
  }
  return false;
}

function detectFamousMarks(conflicts: ConflictingMark[]): { detected: boolean; names: string[] } {
  const foundFamous = new Set<string>();
  for (const conflict of conflicts) {
    const upperName = conflict.name.toUpperCase();
    for (const famous of FAMOUS_MARKS) {
      if (upperName.includes(famous) || famous.includes(upperName.replace(/[^A-Z]/g, ''))) {
        foundFamous.add(famous);
      }
    }
  }
  return { detected: foundFamous.size > 0, names: Array.from(foundFamous) };
}

interface ConflictingMark {
  id: string;
  mid?: number;
  name: string;
  register: string;
  holder: string;
  classes: number[];
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
  status: string;
  applicationNumber: string;
  applicationDate: string | null;
  registrationNumber: string;
  registrationDate: string | null;
  isFamousMark: boolean;
}

interface AnalysisResult {
  nameAnalysis: string;
  searchStrategy: string;
  riskAssessment: string;
  overallRisk: "high" | "medium" | "low";
  recommendation: string;
  famousMarkDetected: boolean;
  famousMarkNames: string[];
}

async function analyzeResults(
  markenname: string,
  klassen: number[],
  searchResults: any[],
  searchTermsUsed: string[]
): Promise<{
  analysis: AnalysisResult;
  conflicts: ConflictingMark[];
}> {
  const klassenText = klassen.map(k => {
    const klass = NICE_CLASSES.find(c => c.id === k);
    return klass ? `Klasse ${k}: ${klass.name}` : `Klasse ${k}`;
  }).join(", ");

  const OFFICE_DISPLAY: Record<string, string> = {
    WO: "WIPO", EU: "EUIPO", EM: "EUIPO", DE: "DPMA", US: "USPTO",
    GB: "UKIPO", FR: "INPI", ES: "OEPM", IT: "UIBM", CH: "IGE",
    AT: "ÖPA", CN: "CNIPA", JP: "JPO", KR: "KIPO", AU: "IP Australia",
    CA: "CIPO", BR: "INPI-BR", IN: "CGPDTM"
  };
  
  const resultsWithSimilarity = searchResults.map(r => {
    const similarity = calculateSimilarity(markenname, r.name || "");
    return {
      ...r,
      ourPhonetic: similarity.phonetic,
      ourVisual: similarity.visual,
      ourCombined: similarity.combined,
      ourExplanation: similarity.explanation,
      isLikelyConflict: similarity.combined >= 50 || similarity.coreWordMatch,
    };
  });
  
  const relevantResults = resultsWithSimilarity
    .filter(r => {
      if (r.ourCombined >= 50) return true;
      if (r.isLikelyConflict) return true;
      if (r.accuracy >= 85 && r.ourCombined < 30) {
        console.log(`  [similarity] Dropping high-API false positive: "${r.name}" (API=${r.accuracy}%, Our=${r.ourCombined}%)`);
        return false;
      }
      return false;
    })
    .sort((a, b) => b.ourCombined - a.ourCombined)
    .slice(0, 20);
  
  console.log(`  [similarity] Filtered ${searchResults.length} → ${relevantResults.length} relevant results`);
  relevantResults.slice(0, 5).forEach(r => {
    console.log(`    "${r.name}": API=${r.accuracy}% | Our: Ph=${r.ourPhonetic}% Vi=${r.ourVisual}% Comb=${r.ourCombined}%`);
  });

  if (relevantResults.length <= 3) {
    const fallbackConflicts = relevantResults.map((r: any) => ({
      id: r.applicationNumber || r.id || "",
      mid: r.mid || undefined,
      name: r.name || "",
      register: OFFICE_CODE_TO_NAME[r.office] || r.office || "Unbekannt",
      holder: r.holder || "",
      classes: r.niceClasses || [],
      accuracy: r.ourCombined || 0,
      riskLevel: (r.ourCombined || 0) >= 80 ? "high" : (r.ourCombined || 0) >= 60 ? "medium" : "low" as "high" | "medium" | "low",
      reasoning: r.ourExplanation || `${r.ourCombined || 0}% Ähnlichkeit`,
      status: r.status || "active",
      applicationNumber: r.applicationNumber || "",
      applicationDate: r.applicationDate || null,
      registrationNumber: r.registrationNumber || "",
      registrationDate: r.registrationDate || null,
      isFamousMark: isFamousMark(r.name || ""),
    }));
    
    const highRiskCount = fallbackConflicts.filter((c: any) => c.riskLevel === "high").length;
    const famousMarkInfo = detectFamousMarks(fallbackConflicts);
    
    return {
      analysis: {
        nameAnalysis: `Die Marke "${markenname}" wurde analysiert.`,
        searchStrategy: `Suche nach "${markenname}" in den gewählten Klassen.`,
        riskAssessment: relevantResults.length > 0 
          ? `${relevantResults.length} ähnliche Marken gefunden. Manuelle Prüfung empfohlen.`
          : "Keine direkt ähnlichen Marken gefunden.",
        overallRisk: highRiskCount > 0 ? "high" : relevantResults.length > 0 ? "medium" : "low",
        recommendation: relevantResults.length > 0 
          ? "Bitte lassen Sie die Ergebnisse von einem Markenrechts-Experten prüfen."
          : "Die Marke erscheint verfügbar. Eine professionelle Prüfung wird dennoch empfohlen.",
        famousMarkDetected: famousMarkInfo.detected,
        famousMarkNames: famousMarkInfo.names,
      },
      conflicts: fallbackConflicts,
    };
  }
  
  const resultsText = relevantResults.map(r => {
    const classes = r.niceClasses?.join(", ") || "keine";
    const officeName = OFFICE_DISPLAY[r.office] || r.office || "unbekannt";
    return `- "${r.name}" (${r.applicationNumber || r.id}) | Register: ${officeName} | Klassen: ${classes} | Phonetik: ${r.ourPhonetic}% | Visuell: ${r.ourVisual}% | Gesamt: ${r.ourCombined}% | Begründung: ${r.ourExplanation}`;
  }).join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `INTERNATIONALE MARKENRECHTS-ANALYSE für "${markenname}"

KONTEXT:
- Gewünschte Marke: "${markenname}"
- Nizza-Klassen: ${klassenText || "alle"}
- Verwendete Suchbegriffe: ${searchTermsUsed.join(", ")}

GEFUNDENE BESTEHENDE MARKEN (${relevantResults.length} relevante von ${searchResults.length} Treffern):
${resultsText || "Keine relevanten Marken gefunden."}

WICHTIG: Die Ähnlichkeitswerte (Phonetik, Visuell, Gesamt) wurden bereits durch unseren Algorithmus berechnet. 
Nutze diese Werte für deine Bewertung:
- Gesamt ≥80%: Hohes Risiko (🔴 high)
- Gesamt 60-79%: Mittleres Risiko (🟡 medium)  
- Gesamt <60%: Niedriges Risiko (🟢 low)

Analysiere KRITISCH: Nur echte Verwechslungsgefahren sind relevant!
- Nur wenn Kernwörter phonetisch/visuell tatsächlich ähnlich sind, liegt ein Risiko vor.

ERSTELLE EINE WELTKLASSE-ANALYSE:

1. NAMENSANALYSE (nameAnalysis):
   - Unterscheidungskraft: Ist der Name beschreibend, suggestiv, willkürlich oder phantasievoll?
   - Phonetische Eigenschaften in verschiedenen Sprachen
   - Visuelle Eigenschaften: Schreibweise, Logo-Potential

2. SUCHSTRATEGIE (searchStrategy):
   - Welche Varianten wurden gesucht und warum?

3. RISIKOBEWERTUNG (riskAssessment):
   - Quantitative Analyse: Wie viele Konflikte mit >80%, >60%, >40% Ähnlichkeit?
   - Qualitative Analyse: Welche Konflikte sind tatsächlich gefährlich?

4. GESAMTRISIKO (overallRisk):
   - "high": ≥80% Ähnlichkeit UND gleiche Klassen ODER Konflikt mit bekannter Marke
   - "medium": 60-79% Ähnlichkeit ODER ähnliche Klassen ODER viele Treffer
   - "low": <60% Ähnlichkeit UND unterschiedliche Klassen UND wenige Treffer

5. EMPFEHLUNG (recommendation):
   - Klare Handlungsempfehlung

6. KONFLIKTE (conflicts):
   - Liste die TOP 5-10 kritischsten Konflikte

Antworte mit diesem JSON-Format:
{
  "nameAnalysis": "Detaillierte Namensanalyse (3-5 Sätze)",
  "searchStrategy": "Zusammenfassung der Suchstrategie",
  "riskAssessment": "Umfassende Risikobewertung (5-8 Sätze)",
  "overallRisk": "high" | "medium" | "low",
  "recommendation": "Klare Handlungsempfehlung",
  "conflicts": [
    {
      "id": "Registernummer",
      "name": "Markenname",
      "register": "USPTO/DPMA/EUIPO/WIPO/etc.",
      "holder": "Inhaber (falls bekannt)",
      "classes": [9, 35],
      "accuracy": 95,
      "riskLevel": "high" | "medium" | "low",
      "reasoning": "Detaillierte Begründung"
    }
  ]
}

Antworte NUR mit dem JSON.`
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp von Claude");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Keine JSON-Antwort gefunden");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    
    const validRiskLevels = ["high", "medium", "low"];
    const overallRisk = validRiskLevels.includes(parsed.overallRisk) 
      ? parsed.overallRisk 
      : "medium";
    
    const rawConflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts : [];
    const conflicts = rawConflicts
      .filter((c: any) => c && typeof c === "object")
      .map((c: any) => {
        const conflictId = String(c.id || "");
        const conflictName = String(c.name || "").toLowerCase();
        const claudeRegister = String(c.register || "").trim();
        const claudeOfficeCodes = getOfficeCodes(claudeRegister);
        
        let matchedResult = relevantResults.find((r: any) => 
          r.applicationNumber === conflictId || r.registrationNumber === conflictId || r.id === conflictId
        );
        
        if (!matchedResult && claudeOfficeCodes.length > 0) {
          matchedResult = relevantResults.find((r: any) => 
            r.name && r.name.toLowerCase() === conflictName && 
            claudeOfficeCodes.includes(r.office)
          );
        }
        
        if (!matchedResult) {
          matchedResult = relevantResults.find((r: any) => 
            r.name && r.name.toLowerCase() === conflictName
          );
        }
        
        const actualOffice = matchedResult?.office || claudeOfficeCodes[0] || "";
        const registerName = OFFICE_CODE_TO_NAME[actualOffice] || actualOffice || claudeRegister || "Unbekannt";
        
        const ourCombined = matchedResult?.ourCombined || 0;
        const finalAccuracy = ourCombined > 0 ? ourCombined : (typeof c.accuracy === "number" ? c.accuracy : 0);
        const calculatedRiskLevel = finalAccuracy >= 80 ? "high" : finalAccuracy >= 60 ? "medium" : "low";
        
        const markName = String(c.name || "");
        return {
          id: conflictId,
          mid: matchedResult?.mid || undefined,
          name: markName,
          register: registerName,
          holder: matchedResult?.holder || (c.holder && c.holder !== "Unbekannt" && c.holder !== "unbekannt" ? String(c.holder) : ""),
          classes: Array.isArray(c.classes) ? c.classes.filter((cls: any) => typeof cls === "number") : [],
          accuracy: finalAccuracy,
          riskLevel: calculatedRiskLevel as "high" | "medium" | "low",
          reasoning: String(c.reasoning || ""),
          status: matchedResult?.status || "active",
          applicationNumber: matchedResult?.applicationNumber || "",
          applicationDate: matchedResult?.applicationDate || null,
          registrationNumber: matchedResult?.registrationNumber || "",
          registrationDate: matchedResult?.registrationDate || null,
          isFamousMark: isFamousMark(markName),
        };
      })
      .filter((c: any) => c.accuracy >= 50);
    
    const famousMarkInfo = detectFamousMarks(conflicts);
    
    return {
      analysis: {
        nameAnalysis: String(parsed.nameAnalysis || "Analyse nicht verfügbar"),
        searchStrategy: String(parsed.searchStrategy || "Standardsuche durchgeführt"),
        riskAssessment: String(parsed.riskAssessment || "Risikobewertung nicht verfügbar"),
        overallRisk: overallRisk as "high" | "medium" | "low",
        recommendation: String(parsed.recommendation || "Bitte konsultieren Sie einen Experten"),
        famousMarkDetected: famousMarkInfo.detected,
        famousMarkNames: famousMarkInfo.names,
      },
      conflicts,
    };
  } catch (e) {
    console.error("Error parsing Claude analysis:", e);
    
    const fallbackConflicts = relevantResults.slice(0, 10).map((r: any) => ({
      id: r.applicationNumber || r.id || "",
      mid: r.mid || undefined,
      name: r.name || "",
      register: OFFICE_CODE_TO_NAME[r.office] || r.office || "Unbekannt",
      holder: r.holder || "",
      classes: r.niceClasses || [],
      accuracy: r.ourCombined || 0,
      riskLevel: (r.ourCombined || 0) >= 80 ? "high" : (r.ourCombined || 0) >= 60 ? "medium" : "low" as "high" | "medium" | "low",
      reasoning: r.ourExplanation || `${r.ourCombined || 0}% Ähnlichkeit`,
      status: r.status || "active",
      applicationNumber: r.applicationNumber || "",
      applicationDate: r.applicationDate || null,
      registrationNumber: r.registrationNumber || "",
      registrationDate: r.registrationDate || null,
      isFamousMark: isFamousMark(r.name || ""),
    }));
    
    const highRiskCount = fallbackConflicts.filter((c: any) => c.riskLevel === "high").length;
    const famousMarkInfo = detectFamousMarks(fallbackConflicts);
    
    return {
      analysis: {
        nameAnalysis: "Die Marke konnte analysiert werden.",
        searchStrategy: `Suche nach "${markenname}" in den gewählten Klassen.`,
        riskAssessment: relevantResults.length > 0 
          ? `${relevantResults.length} ähnliche Marken gefunden. Manuelle Prüfung empfohlen.`
          : "Keine direkt ähnlichen Marken gefunden.",
        overallRisk: highRiskCount > 0 ? "high" : relevantResults.length > 3 ? "medium" : "low",
        recommendation: "Bitte lassen Sie die Ergebnisse von einem Markenrechts-Experten prüfen.",
        famousMarkDetected: famousMarkInfo.detected,
        famousMarkNames: famousMarkInfo.names,
      },
      conflicts: fallbackConflicts,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { markenname, results, klassen, laender, expertStrategy, extendedClassSearch = false } = body;
    const relatedClasses: number[] = Array.isArray(body.relatedClasses) ? body.relatedClasses : [];

    if (!markenname?.trim()) {
      return NextResponse.json({ 
        error: "Bitte geben Sie einen Markennamen ein" 
      }, { status: 400 });
    }

    if (!Array.isArray(results)) {
      return NextResponse.json({ 
        error: "Keine Suchergebnisse zum Analysieren vorhanden" 
      }, { status: 400 });
    }

    const selectedKlassen = Array.isArray(klassen) && klassen.length > 0 ? klassen : [];
    const selectedLaender = Array.isArray(laender) && laender.length > 0 ? laender : [];
    const allClasses = [...new Set([...selectedKlassen, ...relatedClasses])];

    console.log("=== STEP 3: ANALYSIS ===");
    console.log(`Analyzing ${results.length} results for "${markenname}"`);
    console.log(`Klassen: ${selectedKlassen.join(", ") || "alle"}`);
    console.log(`Related Klassen: ${relatedClasses.join(", ") || "keine"}`);
    console.log(`Extended Class Search: ${extendedClassSearch}`);
    console.log(`Länder: ${selectedLaender.join(", ") || "alle"}`);

    let filteredResults = results;
    const totalFoundResults = results.length;
    
    const resultsWithNoClasses = results.filter((r: any) => !r.niceClasses || r.niceClasses.length === 0);
    console.log(`Results with empty/missing niceClasses: ${resultsWithNoClasses.length} of ${results.length}`);
    if (resultsWithNoClasses.length > 0 && resultsWithNoClasses.length <= 10) {
      console.log(`  Names without classes: ${resultsWithNoClasses.map((r: any) => r.name).join(", ")}`);
    }
    
    if (!extendedClassSearch && selectedKlassen.length > 0) {
      filteredResults = results.filter((r: any) => {
        if (!r.niceClasses || r.niceClasses.length === 0) return true;
        return r.niceClasses.some((cls: number) => allClasses.includes(cls));
      });
      console.log(`Filtered results: ${filteredResults.length} of ${results.length} (Standard mode)`);
    } else {
      console.log(`Showing all ${results.length} results (Extended mode)`);
    }

    filteredResults = filteredResults.map((r: any) => ({
      ...r,
      isDirectClass: r.niceClasses?.some((cls: number) => selectedKlassen.includes(cls)) || false,
      isRelatedClass: r.niceClasses?.some((cls: number) => relatedClasses.includes(cls) && !selectedKlassen.includes(cls)) || false,
    }));

    const searchTermsUsed = expertStrategy?.variants?.map((v: any) => v.term) || [markenname];

    const { analysis, conflicts } = await analyzeResults(
      markenname.trim(),
      selectedKlassen,
      filteredResults,
      searchTermsUsed
    );

    console.log(`Analysis complete: ${conflicts.length} conflicts, risk level: ${analysis.overallRisk}`);

    const conflictsNeedingHolderInfo = conflicts.filter(c => c.mid && (!c.holder || c.holder === ""));
    if (conflictsNeedingHolderInfo.length > 0) {
      console.log(`Fetching holder info for ${conflictsNeedingHolderInfo.length} conflicts...`);
      
      const tmsearchClient = getTMSearchClient();
      const holderPromises = conflictsNeedingHolderInfo.map(async (conflict) => {
        try {
          const info = await tmsearchClient.getInfo({ mid: conflict.mid });
          const ownerName = (info as any)?.owner?.name || null;
          return { mid: conflict.mid, holder: ownerName };
        } catch (error) {
          console.error(`Failed to fetch holder for mid ${conflict.mid}:`, error);
          return { mid: conflict.mid, holder: null };
        }
      });
      
      const holderResults = await Promise.all(holderPromises);
      const holderMap = new Map(holderResults.map(h => [h.mid, h.holder]));
      
      for (const conflict of conflicts) {
        if (conflict.mid && holderMap.has(conflict.mid)) {
          const holder = holderMap.get(conflict.mid);
          if (holder) {
            conflict.holder = holder;
          }
        }
      }
      
      console.log(`Holder info fetched for ${holderResults.filter(h => h.holder).length} conflicts`);
    }

    const markedConflicts = conflicts.map((c: ConflictingMark) => ({
      ...c,
      isDirectClass: c.classes?.some((cls: number) => selectedKlassen.includes(cls)) || false,
      isRelatedClass: c.classes?.some((cls: number) => relatedClasses.includes(cls) && !selectedKlassen.includes(cls)) || false,
    }));

    return NextResponse.json({
      success: true,
      analysis,
      conflicts: markedConflicts,
      searchTermsUsed,
      totalResultsAnalyzed: filteredResults.length,
      totalFoundResults,
      expertStrategy,
    });
  } catch (error: any) {
    console.error("Step 3 - Analysis error:", error);
    
    if (error.status === 401 || error.message?.includes("API key")) {
      return NextResponse.json({
        error: "KI-Service nicht verfügbar. Bitte versuchen Sie es später erneut.",
      }, { status: 503 });
    }
    
    return NextResponse.json({
      error: "Ein Fehler ist bei der Analyse aufgetreten.",
    }, { status: 500 });
  }
}
