import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { getTMSearchClient } from "@/lib/tmsearch/client";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { calculateSimilarity, isLikelyConflict } from "@/lib/similarity";
import { 
  generateDeterministicVariants, 
  getCacheKey, 
  getCachedStrategy, 
  setCachedStrategy,
  type DeterministicStrategy 
} from "@/lib/search-variants";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

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

interface SearchVariant {
  term: string;
  type: "exact" | "phonetic" | "visual" | "conceptual" | "root" | "misspelling";
  rationale: string;
}

interface ExpertStrategy {
  variants: SearchVariant[];
  strategyNarrative: string;
  classRisks: { classId: number; className: string; typicalConflicts: string; riskFocus: string }[];
  countryNotes: string;
}

interface AdvisorResponse {
  success: boolean;
  analysis: {
    nameAnalysis: string;
    searchStrategy: string;
    riskAssessment: string;
    overallRisk: "high" | "medium" | "low";
    recommendation: string;
  };
  conflicts: ConflictingMark[];
  searchTermsUsed: string[];
  totalResultsAnalyzed: number;
  expertStrategy?: ExpertStrategy;
}

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

async function getExpertSearchStrategy(
  markenname: string, 
  klassen: number[], 
  laender: string[]
): Promise<{
  queryTerms: string[];
  notes: string;
  expertStrategy: ExpertStrategy;
}> {
  const klassenDetails = klassen.length > 0 
    ? klassen.map(k => {
        const klass = NICE_CLASSES.find(c => c.id === k);
        return klass ? { id: k, name: klass.name, description: klass.description } : { id: k, name: `Klasse ${k}`, description: "" };
      })
    : NICE_CLASSES.slice(0, 5).map(k => ({ id: k.id, name: k.name, description: k.description }));
  
  const klassenText = klassenDetails.map(k => `Klasse ${k.id} (${k.name}): ${k.description}`).join("\n");
  const laenderText = laender.length > 0 ? laender.join(", ") : "Alle Register (DPMA, EUIPO, WIPO, etc.)";
  const allClassesMode = klassen.length === 0;

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 3000,
    system: `Du bist ein weltweit führender Markenrechts-Experte mit Zulassung bei USPTO, EUIPO, DPMA, WIPO, JPO, CNIPA und KIPO.

DEINE KERNKOMPETENZEN:

1. MULTILINGUALE PHONETIK-EXPERTISE:
   - Englisch: th→s/z, w→v, silent letters, vowel reduction (color/colour)
   - Deutsch: ch/sch, ä→ae, ü→ue, ö→oe, ß→ss, ei/ai/ey
   - Französisch: nasale Vokale, stummes h/e, -tion/-sion
   - Spanisch: b/v, ll/y, j→h-Laut, ñ→n
   - Italienisch: gli/li, gn/n, doppelte Konsonanten
   - Chinesisch: Pinyin-Varianten, Wade-Giles vs. Pinyin
   - Japanisch: Katakana-Phonetik, r/l, し/si/shi
   - Koreanisch: Romanisierung-Varianten
   - Arabisch: Transliterations-Varianten, Vokalauslassungen

2. BEKANNTE MARKEN-DATENBANK (im Gedächtnis):
   Top 500 weltbekannte Marken mit erweitertem Schutz: Apple, Google, Amazon, Microsoft, Samsung, Toyota, Mercedes-Benz, BMW, Nike, Adidas, Coca-Cola, Pepsi, McDonald's, Starbucks, Louis Vuitton, Gucci, Chanel, etc.

3. JURISDIKTIONS-WISSEN:
   - USA (USPTO): Intent-to-use, Benutzungszwang, 8/15-Erklärungen, Common Law
   - EU (EUIPO): Gemeinschaftsmarke, Seniorität, relative/absolute Gründe
   - China (CNIPA): First-to-file, Subclasses, Bad-faith-Anmeldungen
   - Japan (JPO): Strikte Ähnlichkeitsprüfung, Katakana obligatorisch
   - International (WIPO): Madrid-Protokoll, Zentralangriff-Risiko

Du denkst wie ein Partner einer internationalen Großkanzlei, der Mandanten vor Millionen-Streitigkeiten schützt.`,
    messages: [
      {
        role: "user",
        content: `Als weltweit führender Markenrechts-Experte, entwickle eine UMFASSENDE internationale Suchstrategie für "${markenname}".

KONTEXT:
- Gewünschter Markenname: "${markenname}"
- Zielmärkte/Register: ${laenderText}
- Nizza-Klassen: ${allClassesMode ? "ALLE KLASSEN (breite Suche)" : klassenText}

DEINE AUFGABE - ENTWICKLE EINE WELTKLASSE-SUCHSTRATEGIE:

1. PHONETISCHE ANALYSE (sprachübergreifend):
   - Wie klingt "${markenname}" auf Englisch, Deutsch, Französisch, Spanisch, Chinesisch, Japanisch?
   - Welche Laute werden in verschiedenen Sprachen verwechselt?
   - Berücksichtige: th/s, ph/f, c/k/ck, ei/ai/ey, w/v, b/p, d/t, g/k

2. VISUELLE ANALYSE:
   - Buchstabenverwechslungen: l/I/1, O/0, rn/m, cl/d, vv/w
   - Groß-/Kleinschreibung: iPhone vs IPHONE
   - Bindestriche/Leerzeichen: Trade-Mark vs TradeMark vs Trade Mark

3. KONZEPTUELLE ANALYSE:
   - Bedeutung des Wortes in verschiedenen Sprachen
   - Übersetzungen (z.B. "Apple" → "Apfel", "Pomme", "Manzana", "苹果")
   - Synonyme und assoziierte Begriffe
   - Branchenspezifische Konnotationen

4. BEKANNTE MARKEN-CHECK:
   - Ist "${markenname}" ähnlich zu einer weltbekannten Marke?
   - Verwässerungsrisiko bei berühmten Marken (auch klassenübergreifend!)

5. WORTSTAMM-ANALYSE:
   - Präfixe: e-, i-, my-, smart-, eco-, bio-, cyber-, digi-
   - Suffixe: -ify, -ly, -ware, -tech, -soft, -cloud, -AI
   - Erkennbare Morpheme im Namen

6. TIPPFEHLER & VARIANTEN:
   - Häufige Tastatur-Tippfehler (QWERTY-Layout)
   - Auslassungen/Hinzufügungen von Buchstaben
   - Verdopplungen

Antworte NUR mit diesem JSON:
{
  "variants": [
    {"term": "exakter Begriff", "type": "exact", "rationale": "Exakte Übereinstimmung prüfen"},
    {"term": "englische phonetische Variante", "type": "phonetic", "rationale": "Englische Aussprache-Verwechslung"},
    {"term": "deutsche phonetische Variante", "type": "phonetic", "rationale": "Deutsche Aussprache"},
    {"term": "visuelle Variante", "type": "visual", "rationale": "Buchstaben-Verwechslung"},
    {"term": "Übersetzung/Synonym", "type": "conceptual", "rationale": "Bedeutungsähnlichkeit"},
    {"term": "Wortstamm", "type": "root", "rationale": "Gemeinsamer Wortstamm"},
    {"term": "bekannte Marke ähnlich", "type": "conceptual", "rationale": "Nähe zu berühmter Marke XYZ"},
    {"term": "Tippfehler", "type": "misspelling", "rationale": "Häufiger Eingabefehler"}
  ],
  "strategyNarrative": "Detaillierte Erklärung der internationalen Suchstrategie (3-4 Sätze, erwähne sprachspezifische Risiken)",
  "classRisks": [
    {"classId": 9, "className": "Software/Elektronik", "typicalConflicts": "Internationale Tech-Marken, App-Namen", "riskFocus": "Silicon Valley-Marken, chinesische Tech-Riesen"}
  ],
  "countryNotes": "Spezifische Hinweise für gewählte Jurisdiktionen (Rechtssystem-Unterschiede, lokale Besonderheiten)",
  "famousMarksWarning": "Warnung falls Ähnlichkeit zu bekannter Marke besteht (oder 'keine' wenn nicht zutreffend)"
}

Generiere 8-12 relevante Suchvarianten für eine WELTWEITE Clearance. Qualität vor Quantität!`
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp von Claude");
  }

  const defaultStrategy: ExpertStrategy = {
    variants: [{ term: markenname, type: "exact", rationale: "Exakte Übereinstimmung" }],
    strategyNarrative: `Standardsuche nach "${markenname}" durchgeführt.`,
    classRisks: [],
    countryNotes: "Allgemeine Suche in allen Registern."
  };

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { 
        queryTerms: [markenname], 
        notes: "Fallback auf exakte Suche",
        expertStrategy: defaultStrategy
      };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    
    const validTypes = ["exact", "phonetic", "visual", "conceptual", "root", "misspelling"];
    const variants: SearchVariant[] = Array.isArray(parsed.variants) 
      ? parsed.variants
          .filter((v: any) => v && typeof v.term === "string" && v.term.trim())
          .map((v: any) => ({
            term: v.term.trim(),
            type: validTypes.includes(v.type) ? v.type : "exact",
            rationale: typeof v.rationale === "string" ? v.rationale : ""
          }))
      : [{ term: markenname, type: "exact" as const, rationale: "Exakte Suche" }];
    
    if (!variants.some(v => v.term.toLowerCase() === markenname.toLowerCase())) {
      variants.unshift({ term: markenname, type: "exact", rationale: "Exakte Übereinstimmung prüfen" });
    }

    const classRisks = Array.isArray(parsed.classRisks)
      ? parsed.classRisks
          .filter((c: any) => c && typeof c.classId === "number")
          .map((c: any) => ({
            classId: c.classId,
            className: String(c.className || ""),
            typicalConflicts: String(c.typicalConflicts || ""),
            riskFocus: String(c.riskFocus || "")
          }))
      : [];

    const expertStrategy: ExpertStrategy = {
      variants: variants.slice(0, 8),
      strategyNarrative: typeof parsed.strategyNarrative === "string" 
        ? parsed.strategyNarrative 
        : `Experten-Analyse für "${markenname}" durchgeführt.`,
      classRisks,
      countryNotes: typeof parsed.countryNotes === "string" 
        ? parsed.countryNotes 
        : "Suche in den gewählten Registern."
    };

    return {
      queryTerms: expertStrategy.variants.map(v => v.term),
      notes: expertStrategy.strategyNarrative,
      expertStrategy
    };
  } catch (e) {
    console.error("Fehler beim Parsen der Experten-Strategie:", e);
    return { 
      queryTerms: [markenname], 
      notes: "Fallback auf exakte Suche",
      expertStrategy: defaultStrategy
    };
  }
}

const OFFICE_CODE_TO_NAME: Record<string, string> = {
  WO: "WIPO", EU: "EUIPO", EM: "EUIPO", DE: "DPMA", US: "USPTO",
  GB: "UKIPO", UK: "UKIPO", FR: "INPI", ES: "OEPM", IT: "UIBM", CH: "IGE",
  AT: "ÖPA", CN: "CNIPA", JP: "JPO", KR: "KIPO", AU: "IP Australia",
  CA: "CIPO", BR: "INPI-BR", IN: "CGPDTM", TR: "TÜRKPATENT", RU: "ROSPATENT"
};

const NAME_TO_OFFICE_CODES: Record<string, string[]> = {
  "WIPO": ["WO"], 
  "WO": ["WO"],
  "WIPO INTERNATIONAL": ["WO"],
  "WIPO (INTERNATIONAL)": ["WO"],
  "EUIPO": ["EU", "EM"],
  "EU": ["EU", "EM"],
  "EM": ["EU", "EM"],
  "EUIPO (EU)": ["EU", "EM"],
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
  "INPI-BR": ["BR"], 
  "BR": ["BR"],
  "CGPDTM": ["IN"], 
  "IN": ["IN"],
  "TÜRKPATENT": ["TR"],
  "TURKPATENT": ["TR"], 
  "TR": ["TR"],
  "ROSPATENT": ["RU"],
  "RU": ["RU"]
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

async function analyzeResults(
  markenname: string,
  klassen: number[],
  searchResults: any[],
  searchTermsUsed: string[]
): Promise<{
  analysis: AdvisorResponse["analysis"];
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
- Nizza-Klassen: ${klassenText}
- Verwendete Suchbegriffe: ${searchTermsUsed.join(", ")}

GEFUNDENE BESTEHENDE MARKEN (${relevantResults.length} relevante von ${searchResults.length} Treffern):
${resultsText || "Keine relevanten Marken gefunden."}

WICHTIG: Die Ähnlichkeitswerte (Phonetik, Visuell, Gesamt) wurden bereits durch unseren Algorithmus berechnet. 
Nutze diese Werte für deine Bewertung:
- Gesamt ≥80%: Hohes Risiko (🔴 high)
- Gesamt 60-79%: Mittleres Risiko (🟡 medium)  
- Gesamt <60%: Niedriges Risiko (🟢 low)

Analysiere KRITISCH: Nur echte Verwechslungsgefahren sind relevant!
- "DR. ACÉL & PARTNER AG" vs "accelari" = KEIN Konflikt (völlig anderer Name, "Acél" = ungarisch für Stahl)
- Nur wenn Kernwörter phonetisch/visuell tatsächlich ähnlich sind, liegt ein Risiko vor.

ERSTELLE EINE WELTKLASSE-ANALYSE nach folgenden Kriterien:

1. NAMENSANALYSE (nameAnalysis):
   - Unterscheidungskraft: Ist der Name beschreibend, suggestiv, willkürlich oder phantasievoll?
   - Phonetische Eigenschaften in verschiedenen Sprachen (EN, DE, FR, ES, ZH, JP)
   - Visuelle Eigenschaften: Schreibweise, Logo-Potential
   - Konzeptuelle Bedeutung: Was assoziiert man mit dem Namen?
   - Negativkonnotationen: Hat der Name in irgendeiner Sprache eine negative Bedeutung?

2. SUCHSTRATEGIE (searchStrategy):
   - Welche Varianten wurden gesucht und warum?
   - Abdeckung der phonetischen, visuellen, konzeptuellen Dimensionen
   - Welche internationalen Märkte wurden berücksichtigt?

3. RISIKOBEWERTUNG (riskAssessment):
   - Quantitative Analyse: Wie viele Konflikte mit >80%, >60%, >40% Ähnlichkeit?
   - Qualitative Analyse: Welche Konflikte sind tatsächlich gefährlich?
   - Jurisdiktionsspezifische Risiken:
     * USA: Likelihood of Confusion nach DuPont-Faktoren
     * EU: Verwechslungsgefahr nach EuGH-Rechtsprechung (Sabel, Canon, Lloyd)
     * China: First-to-file Risiken, Squatting-Gefahr
   - Bekannte Marken: Gibt es Konflikte mit weltberühmten Marken (Verwässerungsschutz)?
   - Klassenüberschneidung: Gleiche/ähnliche Waren und Dienstleistungen?

4. GESAMTRISIKO (overallRisk):
   - "high": ≥80% Ähnlichkeit UND gleiche Klassen ODER Konflikt mit bekannter Marke
   - "medium": 60-79% Ähnlichkeit ODER ähnliche Klassen ODER viele Treffer
   - "low": <60% Ähnlichkeit UND unterschiedliche Klassen UND wenige Treffer

5. EMPFEHLUNG (recommendation):
   - Klare Handlungsempfehlung (Fortfahren / Mit Vorsicht / Abraten)
   - Nächste Schritte
   - Welche Jurisdiktionen sind am riskantesten?
   - Alternative Namensvorschläge falls hohes Risiko

6. KONFLIKTE (conflicts):
   - Liste die TOP 5-10 kritischsten Konflikte
   - Begründe JEDE Risikoeinstufung detailliert

Antworte mit diesem JSON-Format:
{
  "nameAnalysis": "Detaillierte multilinguale Namensanalyse (3-5 Sätze)",
  "searchStrategy": "Zusammenfassung der internationalen Suchstrategie",
  "riskAssessment": "Umfassende Risikobewertung mit jurisdiktionsspezifischen Hinweisen (5-8 Sätze)",
  "overallRisk": "high" | "medium" | "low",
  "recommendation": "Klare Handlungsempfehlung mit konkreten nächsten Schritten",
  "conflicts": [
    {
      "id": "Registernummer",
      "name": "Markenname",
      "register": "USPTO/DPMA/EUIPO/WIPO/etc.",
      "holder": "Inhaber (falls bekannt)",
      "classes": [9, 35],
      "accuracy": 95,
      "riskLevel": "high" | "medium" | "low",
      "reasoning": "Detaillierte juristische Begründung: phonetische Ähnlichkeit, Klassenüberschneidung, bekannte Marke, jurisdiktionsspezifisches Risiko"
    }
  ]
}

WICHTIG: Die "reasoning" bei jedem Konflikt muss wie ein Anwaltsgutachten formuliert sein!
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
        
        return {
          id: conflictId,
          name: String(c.name || ""),
          register: registerName,
          holder: matchedResult?.holder || (c.holder && c.holder !== "Unbekannt" && c.holder !== "unbekannt" ? String(c.holder) : ""),
          classes: Array.isArray(c.classes) ? c.classes.filter((cls: any) => typeof cls === "number") : [],
          accuracy: finalAccuracy,
          riskLevel: calculatedRiskLevel as "high" | "medium" | "low",
          reasoning: String(c.reasoning || ""),
        };
      })
      .filter((c: any) => c.accuracy >= 50);
    
    return {
      analysis: {
        nameAnalysis: String(parsed.nameAnalysis || "Analyse nicht verfügbar"),
        searchStrategy: String(parsed.searchStrategy || "Standardsuche durchgeführt"),
        riskAssessment: String(parsed.riskAssessment || "Risikobewertung nicht verfügbar"),
        overallRisk: overallRisk as "high" | "medium" | "low",
        recommendation: String(parsed.recommendation || "Bitte konsultieren Sie einen Experten"),
      },
      conflicts,
    };
  } catch (e) {
    const fallbackConflicts = relevantResults.slice(0, 10).map((r: any) => ({
      id: r.applicationNumber || r.id || "",
      name: r.name || "",
      register: OFFICE_CODE_TO_NAME[r.office] || r.office || "Unbekannt",
      holder: r.holder || "",
      classes: r.niceClasses || [],
      accuracy: r.ourCombined || 0,
      riskLevel: (r.ourCombined || 0) >= 80 ? "high" : (r.ourCombined || 0) >= 60 ? "medium" : "low" as "high" | "medium" | "low",
      reasoning: r.ourExplanation || `${r.ourCombined || 0}% Ähnlichkeit`,
    }));
    
    const highRiskCount = fallbackConflicts.filter((c: any) => c.riskLevel === "high").length;
    
    return {
      analysis: {
        nameAnalysis: "Die Marke konnte analysiert werden.",
        searchStrategy: `Suche nach "${markenname}" in den gewählten Klassen.`,
        riskAssessment: relevantResults.length > 0 
          ? `${relevantResults.length} ähnliche Marken gefunden. Manuelle Prüfung empfohlen.`
          : "Keine direkt ähnlichen Marken gefunden.",
        overallRisk: highRiskCount > 0 ? "high" : relevantResults.length > 3 ? "medium" : "low",
        recommendation: "Bitte lassen Sie die Ergebnisse von einem Markenrechts-Experten prüfen.",
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
    const { markenname, klassen, laender, stream, deepSearch } = body;

    if (!markenname?.trim()) {
      return NextResponse.json({ 
        error: "Bitte geben Sie einen Markennamen ein" 
      }, { status: 400 });
    }

    const selectedKlassen = Array.isArray(klassen) && klassen.length > 0 ? klassen : [];
    const selectedLaender = Array.isArray(laender) && laender.length > 0 ? laender : [];
    const useDeepSearch = deepSearch === true;

    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (step: number, status: "started" | "completed", data?: any) => {
            const event = JSON.stringify({ step, status, data, timestamp: Date.now() });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          };
          
          const sendProgress = (message: string, details?: any) => {
            const event = JSON.stringify({ type: "progress", message, details, timestamp: Date.now() });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          };
          
          const sendHeartbeat = (phase: string) => {
            const event = JSON.stringify({ type: "heartbeat", phase, timestamp: Date.now() });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          };

          try {
            sendEvent(1, "started");
            
            let strategy: { queryTerms: string[]; notes: string; expertStrategy: any };
            let heartbeatInterval: NodeJS.Timeout | null = null;
            
            if (useDeepSearch) {
              sendProgress("KI analysiert Markenname (Tiefenrecherche)...");
              heartbeatInterval = setInterval(() => sendHeartbeat("strategy"), 8000);
              strategy = await getExpertSearchStrategy(markenname.trim(), selectedKlassen, selectedLaender);
              clearInterval(heartbeatInterval);
            } else {
              sendProgress("Generiere Suchvarianten...");
              const cacheKey = getCacheKey(markenname.trim(), selectedKlassen, selectedLaender, "deterministic");
              let cachedStrategy = getCachedStrategy(cacheKey);
              
              if (!cachedStrategy) {
                cachedStrategy = generateDeterministicVariants(markenname.trim(), 8);
                setCachedStrategy(cacheKey, cachedStrategy);
              }
              
              strategy = {
                queryTerms: cachedStrategy.variants.map(v => v.term),
                notes: cachedStrategy.strategyNarrative,
                expertStrategy: cachedStrategy,
              };
            }
            
            sendEvent(1, "completed", { 
              queryTerms: strategy.queryTerms,
              expertStrategy: strategy.expertStrategy,
              isDeterministic: !useDeepSearch,
            });

            sendEvent(2, "started");
            sendProgress(`${strategy.queryTerms.length} Suchvarianten generiert`);
            await new Promise(resolve => setTimeout(resolve, 100));
            sendEvent(2, "completed", { 
              strategy: strategy.notes,
              variants: strategy.expertStrategy.variants,
              classRisks: strategy.expertStrategy.classRisks,
              countryNotes: strategy.expertStrategy.countryNotes
            });

            sendEvent(3, "started");
            const tmsearchClient = getTMSearchClient();
            let allResults: any[] = [];
            const searchTerms = strategy.queryTerms.slice(0, 8);
            const totalTerms = searchTerms.length;
            
            console.log("=== TRADEMARK SEARCH DEBUG ===");
            console.log("Selected offices filter:", selectedLaender);
            
            heartbeatInterval = setInterval(() => sendHeartbeat("search"), 8000);
            
            for (let i = 0; i < searchTerms.length; i++) {
              const term = searchTerms[i];
              sendProgress(`Suche "${term}" (${i + 1}/${totalTerms})...`, { 
                currentTerm: term, 
                termIndex: i + 1, 
                totalTerms,
                resultsFound: allResults.length 
              });
              
              try {
                const searchParams: any = {
                  status: "active",
                  classes: selectedKlassen.length > 0 ? selectedKlassen : undefined,
                  minAccuracy: 60,
                };
                
                if (selectedLaender.length > 0) {
                  searchParams.offices = selectedLaender;
                }
                
                const searchResult = await tmsearchClient.searchWithFilters(term, searchParams);
                
                console.log(`Search "${term}": ${searchResult.results?.length || 0} results after filter`);
                if (searchResult.results?.length > 0) {
                  const officesFound = [...new Set(searchResult.results.map(r => r.office))];
                  console.log(`  Offices in results: ${officesFound.join(", ")}`);
                }
                
                if (searchResult.results) {
                  const newResults = searchResult.results.filter(
                    r => !allResults.some(existing => existing.id === r.id)
                  );
                  allResults = [...allResults, ...newResults];
                  
                  if (newResults.length > 0) {
                    sendProgress(`"${term}": ${newResults.length} neue Treffer`, {
                      currentTerm: term,
                      termIndex: i + 1,
                      totalTerms,
                      newResults: newResults.length,
                      resultsFound: allResults.length
                    });
                  }
                }
              } catch (searchError) {
                console.error(`Suchfehler für "${term}":`, searchError);
                sendProgress(`Suche für "${term}" übersprungen`, { error: true });
              }
            }
            
            clearInterval(heartbeatInterval);
            
            console.log(`Total results after all searches: ${allResults.length}`);

            allResults.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
            allResults = allResults.slice(0, 50);
            sendEvent(3, "completed", { resultsCount: allResults.length });

            sendEvent(4, "started");
            sendProgress(`Analysiere ${allResults.length} Marken mit KI...`);
            
            heartbeatInterval = setInterval(() => sendHeartbeat("analysis"), 8000);
            
            const { analysis, conflicts } = await analyzeResults(
              markenname.trim(),
              selectedKlassen,
              allResults,
              strategy.queryTerms
            );
            
            clearInterval(heartbeatInterval);
            sendEvent(4, "completed");

            const response: AdvisorResponse = {
              success: true,
              analysis,
              conflicts,
              searchTermsUsed: strategy.queryTerms,
              totalResultsAnalyzed: allResults.length,
              expertStrategy: strategy.expertStrategy,
            };

            const finalEvent = JSON.stringify({ type: "complete", data: response });
            controller.enqueue(encoder.encode(`data: ${finalEvent}\n\n`));
            controller.close();
          } catch (error: any) {
            const errorEvent = JSON.stringify({ type: "error", error: error.message || "Ein Fehler ist aufgetreten" });
            controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const strategy = await getExpertSearchStrategy(markenname.trim(), selectedKlassen, selectedLaender);
    
    const tmsearchClient = getTMSearchClient();
    let allResults: any[] = [];
    
    for (const term of strategy.queryTerms.slice(0, 8)) {
      try {
        const searchParams: any = {
          status: "active",
          classes: selectedKlassen.length > 0 ? selectedKlassen : undefined,
          minAccuracy: 60,
        };
        
        if (selectedLaender.length > 0) {
          searchParams.offices = selectedLaender;
        }
        
        const searchResult = await tmsearchClient.searchWithFilters(term, searchParams);
        
        if (searchResult.results) {
          const newResults = searchResult.results.filter(
            r => !allResults.some(existing => existing.id === r.id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (searchError) {
        console.error(`Suchfehler für "${term}":`, searchError);
      }
    }

    allResults.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    allResults = allResults.slice(0, 50);

    const { analysis, conflicts } = await analyzeResults(
      markenname.trim(),
      selectedKlassen,
      allResults,
      strategy.queryTerms
    );

    const response: AdvisorResponse = {
      success: true,
      analysis,
      conflicts,
      searchTermsUsed: strategy.queryTerms,
      totalResultsAnalyzed: allResults.length,
      expertStrategy: strategy.expertStrategy,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("KI-Berater Fehler:", error);
    
    if (error.status === 401 || error.message?.includes("API key")) {
      return NextResponse.json({
        error: "KI-Service nicht verfügbar. Bitte versuchen Sie es später erneut.",
      }, { status: 503 });
    }
    
    return NextResponse.json({
      error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    }, { status: 500 });
  }
}
