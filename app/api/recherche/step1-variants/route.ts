import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { 
  generateDeterministicVariants, 
  getCacheKey, 
  getCachedStrategy, 
  setCachedStrategy,
  type DeterministicStrategy 
} from "@/lib/search-variants";

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

  const response = await anthropicClient.messages.create({
    model: "claude-opus-4-5-20251101",
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { markenname, klassen, laender, deepSearch } = body;

    if (!markenname?.trim()) {
      return NextResponse.json({ 
        error: "Bitte geben Sie einen Markennamen ein" 
      }, { status: 400 });
    }

    const selectedKlassen = Array.isArray(klassen) && klassen.length > 0 ? klassen : [];
    const selectedLaender = Array.isArray(laender) && laender.length > 0 ? laender : [];
    const useDeepSearch = deepSearch === true;

    console.log("=== STEP 1: VARIANT GENERATION ===");
    console.log(`Markenname: "${markenname}", DeepSearch: ${useDeepSearch}`);
    console.log(`Klassen: ${selectedKlassen.join(", ") || "alle"}`);
    console.log(`Länder: ${selectedLaender.join(", ") || "alle"}`);

    let strategy: { queryTerms: string[]; notes: string; expertStrategy: any };

    if (useDeepSearch) {
      console.log("Generating variants using Claude API (deep search)...");
      strategy = await getExpertSearchStrategy(markenname.trim(), selectedKlassen, selectedLaender);
    } else {
      console.log("Generating deterministic variants...");
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

    console.log(`Generated ${strategy.queryTerms.length} query terms:`, strategy.queryTerms);

    return NextResponse.json({
      queryTerms: strategy.queryTerms,
      expertStrategy: strategy.expertStrategy,
      isDeterministic: !useDeepSearch,
    });
  } catch (error: any) {
    console.error("Step 1 - Variant generation error:", error);
    
    if (error.status === 401 || error.message?.includes("API key")) {
      return NextResponse.json({
        error: "KI-Service nicht verfügbar. Bitte versuchen Sie es später erneut.",
      }, { status: 503 });
    }
    
    return NextResponse.json({
      error: "Ein Fehler ist bei der Variantengenerierung aufgetreten.",
    }, { status: 500 });
  }
}
