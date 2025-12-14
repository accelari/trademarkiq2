import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { NICE_CLASSES } from "@/lib/nice-classes";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

interface SuggestedTerm {
  term: string;
  source: "TMclass" | "DPMA" | "EUIPO" | "Expert";
  confidence: number;
}

interface ClassRecommendation {
  classNumber: number;
  className: string;
  userDescription?: string;
  isCompliant: boolean;
  issues: string[];
  suggestedTerms: SuggestedTerm[];
  amtskonformeFormulierung: string;
}

interface GoodsServicesAnalysis {
  success: boolean;
  classRecommendations: ClassRecommendation[];
  overallCompliance: "compliant" | "needs_improvement" | "non_compliant";
  warnings: string[];
}

const OFFICE_NAMES: Record<string, string> = {
  "DE": "DPMA (Deutsches Patent- und Markenamt)",
  "EU": "EUIPO (Amt der Europäischen Union für geistiges Eigentum)",
  "WO": "WIPO (Weltorganisation für geistiges Eigentum)",
  "US": "USPTO (United States Patent and Trademark Office)",
  "GB": "UKIPO (UK Intellectual Property Office)",
  "CH": "IGE (Eidgenössisches Institut für Geistiges Eigentum)",
  "AT": "ÖPA (Österreichisches Patentamt)",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener DPMA- und EUIPO-Prüfer mit über 20 Jahren Erfahrung in der Beurteilung von Waren- und Dienstleistungsverzeichnissen für Markenanmeldungen.

Deine Expertise umfasst:
- Die Klassifizierung nach der Nizza-Klassifikation (12. Ausgabe)
- TMclass-Datenbank und harmonisierte Begriffe
- DPMA-Prüfungspraxis und typische Beanstandungsgründe
- EUIPO-Richtlinien für die Formulierung von Waren/Dienstleistungen
- USPTO-Anforderungen für US-Markenanmeldungen
- Madrid-System für internationale Registrierungen

Deine Aufgabe ist es, Waren- und Dienstleistungsbeschreibungen auf Amtskonformität zu prüfen und konkrete Verbesserungsvorschläge zu machen.

WICHTIGE PRÜFKRITERIEN:

1. KLARHEIT UND PRÄZISION:
   - Zu vage Begriffe wie "IT-Dienstleistungen", "Beratung", "Marketing" sind NICHT akzeptabel
   - Begriffe müssen den genauen Gegenstand oder die genaue Tätigkeit beschreiben
   - Beispiel: "IT-Dienstleistungen" ❌ → "Softwareentwicklung für mobile Anwendungen" ✓

2. KLASSIFIKATIONSKONFORMITÄT:
   - Begriffe müssen zur jeweiligen Nizza-Klasse passen
   - Keine klassenübergreifenden oder widersprüchlichen Formulierungen

3. TMCLASS-KOMPATIBILITÄT:
   - Bevorzuge harmonisierte Begriffe aus der TMclass-Datenbank
   - Diese werden von allen Ämtern akzeptiert und beschleunigen die Prüfung

4. TYPISCHE BEANSTANDUNGSGRÜNDE:
   - "und dergleichen", "und ähnliches" sind nicht akzeptabel
   - Zu breite Oberbegriffe ohne Spezifizierung
   - Unbestimmte Mengenangaben oder Beschreibungen
   - Beschreibende Zusätze ohne markenrechtliche Relevanz

5. LÄNDERSPEZIFISCHE ANFORDERUNGEN:
   - USPTO (USA): Sehr strenge Anforderungen. Begriffe müssen extrem spezifisch sein. "Goods/services must be stated with particularity." Keine Oberbegriffe ohne Konkretisierung. Immer "in the field of..." oder "for use in..." verwenden.
   - EUIPO (EU): TMclass-konforme Begriffe werden bevorzugt. Harmonisierte Begriffe aus der HDB-Datenbank beschleunigen die Prüfung erheblich.
   - DPMA (DE): Amtsübliche Formulierungen gemäß der deutschen Praxis. Begriffe sollten der deutschen Nizza-Klassifikation entsprechen.
   - WIPO: Madrid-System-konforme Formulierungen. Internationale Begriffe in einer der Amtssprachen (EN/FR/ES).

Du antwortest IMMER auf Deutsch und gibst praxisorientierte, umsetzbare Empfehlungen.`;

function getCountrySpecificHints(targetOffices: string[]): string {
  const hints: string[] = [];
  
  if (targetOffices.includes("US")) {
    hints.push(`
USPTO (USA) - BESONDERS WICHTIG:
- Extrem strenge Anforderungen an die Spezifität
- Begriffe wie "computer software" werden IMMER abgelehnt - muss spezifiziert werden: "computer software for [specific purpose]"
- "Goods/services must be stated with particularity" - keine generischen Oberbegriffe
- Verwende Formulierungen wie "in the field of...", "for use in...", "namely..."
- Konsultiere das USPTO Acceptable Identification of Goods and Services Manual (ID Manual)`);
  }
  
  if (targetOffices.includes("EU")) {
    hints.push(`
EUIPO (EU) - WICHTIG:
- TMclass-konforme Begriffe aus der HDB (Harmonised Database) werden bevorzugt
- Begriffe aus der HDB werden automatisch akzeptiert und beschleunigen die Prüfung
- Bei Nicht-HDB-Begriffen ist eine detaillierte Prüfung erforderlich
- Oberbegriffe der Klassenüberschriften (z.B. "Kleidung") werden seit IP Translator als zu breit angesehen`);
  }
  
  if (targetOffices.includes("DE")) {
    hints.push(`
DPMA (Deutschland) - HINWEISE:
- Deutsche amtsübliche Formulierungen bevorzugen
- Begriffe sollten der deutschen Nizza-Klassifikation entsprechen
- Klare, präzise deutsche Fachbegriffe verwenden
- Anglizismen nur wenn etabliert und eindeutig`);
  }
  
  if (targetOffices.includes("WO")) {
    hints.push(`
WIPO (International) - HINWEISE:
- Madrid-System-konforme Formulierungen erforderlich
- Begriffe in einer Amtssprache (Englisch, Französisch oder Spanisch)
- Beachte dass einzelne Bestimmungsländer zusätzliche Anforderungen haben können`);
  }
  
  return hints.length > 0 
    ? `\n\nLÄNDERSPEZIFISCHE ANFORDERUNGEN:\n${hints.join("\n")}` 
    : "";
}

async function analyzeGoodsServices(
  trademarkName: string,
  selectedClasses: number[],
  goodsServicesDescriptions: string[],
  targetOffices: string[]
): Promise<GoodsServicesAnalysis> {
  const klassenInfo = selectedClasses.map(k => {
    const klass = NICE_CLASSES.find(c => c.id === k);
    return klass 
      ? `Klasse ${k}: ${klass.name}\nBeschreibung: ${klass.description}` 
      : `Klasse ${k}`;
  }).join("\n\n");

  const officesText = targetOffices.map(o => OFFICE_NAMES[o] || o).join(", ");
  
  const countryHints = getCountrySpecificHints(targetOffices);

  let userDescriptionsText: string;
  if (goodsServicesDescriptions.length > 0 && goodsServicesDescriptions.some(d => d.trim())) {
    userDescriptionsText = `\nVom Anmelder vorgeschlagene Beschreibungen:\n${goodsServicesDescriptions.filter(d => d.trim()).map((d, i) => `${i + 1}. "${d}"`).join("\n")}`;
  } else {
    const classDescriptions = selectedClasses.map(k => {
      const klass = NICE_CLASSES.find(c => c.id === k);
      return klass ? `- Klasse ${k} (${klass.name}): ${klass.description}` : `- Klasse ${k}`;
    }).join("\n");
    
    userDescriptionsText = `\nKeine Beschreibungen vom Anmelder angegeben. 

WICHTIG: Nutze die vollständigen Nizza-Klassenbeschreibungen als Grundlage und schlage passende, amtskonforme Formulierungen vor:
${classDescriptions}

Erstelle für jede Klasse eine detaillierte, amtskonforme Formulierung basierend auf der Klassenbeschreibung und dem Markenkontext.`;
  }

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Prüfe das Waren- und Dienstleistungsverzeichnis für folgende Markenanmeldung:

MARKENNAME: "${trademarkName}"

GEWÄHLTE NIZZA-KLASSEN:
${klassenInfo}

ZIELÄMTER: ${officesText}
${userDescriptionsText}
${countryHints}

Erstelle eine detaillierte Analyse für jede gewählte Klasse. Antworte mit einem JSON-Objekt:

{
  "overallCompliance": "compliant" | "needs_improvement" | "non_compliant",
  "warnings": [
    "Allgemeine Warnungen oder wichtige Hinweise für den Anmelder"
  ],
  "classRecommendations": [
    {
      "classNumber": 9,
      "className": "Computer, Software, Elektronik",
      "userDescription": "Die vom User eingegebene Beschreibung (falls vorhanden)",
      "isCompliant": true | false,
      "issues": [
        "Problem 1: Warum diese Formulierung beanstandet werden könnte",
        "Problem 2: Weiteres Problem"
      ],
      "suggestedTerms": [
        {
          "term": "Herunterladbare Software für die Verwaltung von Datenbanken",
          "source": "TMclass",
          "confidence": 0.95
        },
        {
          "term": "Computer-Software für die Erstellung von Grafiken",
          "source": "DPMA",
          "confidence": 0.90
        }
      ],
      "amtskonformeFormulierung": "Vollständige, amtskonforme Formulierung für diese Klasse, die alle relevanten Waren/Dienstleistungen abdeckt und von DPMA/EUIPO akzeptiert wird"
    }
  ]
}

WICHTIGE HINWEISE FÜR DIE ANALYSE:

1. Bei der Bewertung "isCompliant":
   - true: Die Beschreibung ist klar, präzise und amtskonform
   - false: Es gibt Probleme, die zu einer Beanstandung führen könnten

2. Bei "suggestedTerms":
   - Bevorzuge TMclass-Begriffe (höchste Akzeptanz)
   - Füge DPMA/EUIPO-spezifische Alternativen hinzu
   - "Expert" für spezialisierte Formulierungen
   - confidence: 0.0-1.0 (wie wahrscheinlich wird der Begriff akzeptiert)

3. Bei "amtskonformeFormulierung":
   - Erstelle eine vollständige, prüfungssichere Formulierung
   - Berücksichtige den Markenkontext ("${trademarkName}")
   - Kombiniere mehrere relevante Begriffe mit Semikolon

4. Bei "warnings":
   - Warne vor typischen Fallstricken
   - Weise auf besondere Anforderungen der Zielämter hin
   - Empfehle ggf. zusätzliche Klassen

5. Bei "issues":
   - Erkläre WARUM ein Begriff problematisch ist
   - Nenne den konkreten Beanstandungsgrund
   - Verweise auf relevante Richtlinien

Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen.`
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
    
    const classRecommendations: ClassRecommendation[] = (parsed.classRecommendations || []).map((rec: any) => {
      const niceClass = NICE_CLASSES.find(c => c.id === rec.classNumber);
      
      return {
        classNumber: typeof rec.classNumber === "number" ? rec.classNumber : 0,
        className: String(rec.className || niceClass?.name || "Unbekannte Klasse"),
        userDescription: rec.userDescription ? String(rec.userDescription) : undefined,
        isCompliant: Boolean(rec.isCompliant),
        issues: Array.isArray(rec.issues) ? rec.issues.map(String) : [],
        suggestedTerms: Array.isArray(rec.suggestedTerms) 
          ? rec.suggestedTerms.map((term: any) => ({
              term: String(term.term || ""),
              source: ["TMclass", "DPMA", "EUIPO", "Expert"].includes(term.source) 
                ? term.source 
                : "Expert",
              confidence: typeof term.confidence === "number" 
                ? Math.min(1, Math.max(0, term.confidence)) 
                : 0.5,
            }))
          : [],
        amtskonformeFormulierung: String(rec.amtskonformeFormulierung || ""),
      };
    });

    for (const classNum of selectedClasses) {
      if (!classRecommendations.find(r => r.classNumber === classNum)) {
        const niceClass = NICE_CLASSES.find(c => c.id === classNum);
        classRecommendations.push({
          classNumber: classNum,
          className: niceClass?.name || "Unbekannte Klasse",
          isCompliant: false,
          issues: ["Keine Analyse für diese Klasse erhalten"],
          suggestedTerms: [],
          amtskonformeFormulierung: "",
        });
      }
    }

    classRecommendations.sort((a, b) => a.classNumber - b.classNumber);

    const overallCompliance = ["compliant", "needs_improvement", "non_compliant"].includes(parsed.overallCompliance)
      ? parsed.overallCompliance
      : classRecommendations.every(r => r.isCompliant)
        ? "compliant"
        : classRecommendations.some(r => !r.isCompliant && r.issues.length > 2)
          ? "non_compliant"
          : "needs_improvement";

    const warnings = Array.isArray(parsed.warnings) 
      ? parsed.warnings.map(String) 
      : [];

    return {
      success: true,
      classRecommendations,
      overallCompliance,
      warnings,
    };
  } catch (e) {
    console.error("Parse error:", e);
    
    return {
      success: true,
      classRecommendations: selectedClasses.map(classNum => {
        const niceClass = NICE_CLASSES.find(c => c.id === classNum);
        return {
          classNumber: classNum,
          className: niceClass?.name || "Unbekannte Klasse",
          isCompliant: false,
          issues: ["Analyse konnte nicht vollständig durchgeführt werden. Bitte versuchen Sie es erneut."],
          suggestedTerms: [],
          amtskonformeFormulierung: "",
        };
      }),
      overallCompliance: "needs_improvement",
      warnings: ["Die Analyse konnte nicht vollständig durchgeführt werden. Bitte prüfen Sie die Eingaben und versuchen Sie es erneut."],
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
    const { trademarkName, selectedClasses, goodsServicesDescriptions, targetOffices } = body;

    if (!trademarkName?.trim()) {
      return NextResponse.json(
        { error: "Bitte geben Sie einen Markennamen ein" }, 
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedClasses) || selectedClasses.length === 0) {
      return NextResponse.json(
        { error: "Bitte wählen Sie mindestens eine Nizza-Klasse aus" }, 
        { status: 400 }
      );
    }

    const validClasses = selectedClasses.filter(
      c => typeof c === "number" && c >= 1 && c <= 45
    );
    
    if (validClasses.length === 0) {
      return NextResponse.json(
        { error: "Ungültige Nizza-Klassen. Bitte wählen Sie Klassen zwischen 1 und 45." }, 
        { status: 400 }
      );
    }

    const descriptions = Array.isArray(goodsServicesDescriptions) 
      ? goodsServicesDescriptions.filter(d => typeof d === "string" && d.trim())
      : [];

    const offices = Array.isArray(targetOffices) && targetOffices.length > 0
      ? targetOffices.filter(o => typeof o === "string")
      : ["DE", "EU"];

    const analysis = await analyzeGoodsServices(
      trademarkName.trim(),
      validClasses,
      descriptions,
      offices
    );

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Goods/Services Analysis Error:", error);
    return NextResponse.json({
      success: false,
      error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      classRecommendations: [],
      overallCompliance: "non_compliant",
      warnings: ["Systemfehler bei der Analyse"],
    }, { status: 500 });
  }
}
