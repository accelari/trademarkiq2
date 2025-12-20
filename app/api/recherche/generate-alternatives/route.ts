import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";
import { NICE_CLASSES } from "@/lib/nice-classes";

const STYLE_DESCRIPTIONS: Record<string, string> = {
  similar: "Behalte Klang oder Bedeutung des Originals, aber verändere es genug für Eigenständigkeit",
  modern: "Tech-fokussiert, kurz, englische Einflüsse, dynamisch klingend",
  creative: "Kunstwörter, ungewöhnliche Kombinationen, einprägsam und einzigartig",
  serious: "Klassisch, seriös, vertrauenswürdig, professionell klingend",
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  de: "Generiere deutsche Markennamen oder eingedeutschte Begriffe",
  en: "Generiere englische Markennamen, die international funktionieren",
  international: "Generiere sprachunabhängige Namen, die weltweit aussprechbar sind (keine sprachspezifischen Laute)",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      originalBrand,
      classes = [],
      style = "similar",
      keywords = [],
      language = "de",
      count = 5
    } = body;

    if (!originalBrand?.trim()) {
      return NextResponse.json({
        error: "Bitte geben Sie einen ursprünglichen Markennamen ein"
      }, { status: 400 });
    }

    // Get class descriptions
    const classDescriptions = classes
      .map((classId: number) => {
        const niceClass = NICE_CLASSES.find(c => c.id === classId);
        return niceClass ? `Klasse ${classId}: ${niceClass.name}` : `Klasse ${classId}`;
      })
      .join(", ");

    const styleDescription = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.similar;
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.de;

    const keywordsText = keywords.length > 0
      ? `\nOptionale Keywords zum Einbeziehen: ${keywords.join(", ")}`
      : "";

    const prompt = `Du bist ein Markennamens-Experte mit 20 Jahren Erfahrung in Branding und Markenrecht.

Generiere ${count} alternative Markennamen basierend auf folgenden Angaben:

URSPRÜNGLICHER NAME: "${originalBrand}"
BRANCHE/KLASSEN: ${classDescriptions || "Allgemein"}
GEWÜNSCHTER STIL: ${styleDescription}
SPRACHE: ${languageInstruction}${keywordsText}

WICHTIGE REGELN:
1. Namen müssen markenrechtlich eintragungsfähig sein:
   - KEINE rein beschreibenden Begriffe (z.B. "Schnell-Service", "Best Quality")
   - KEINE geografischen Bezeichnungen ohne Fantasiezusatz
   - KEINE Gattungsbezeichnungen
2. Namen sollten einprägsam und gut aussprechbar sein
3. Vermeide offensichtliche Ähnlichkeiten zu bekannten Marken (Apple, Nike, Google, etc.)
4. Jeder Name braucht eine kurze Erklärung (max. 80 Zeichen) warum er passend ist
5. Die Namen sollten unterschiedlich genug sein, um Auswahl zu bieten

STIL-SPEZIFISCHE HINWEISE (${style}):
${style === "similar" ? "- Behalte phonetische Elemente oder Bedeutungsanklänge des Originals\n- Variiere durch Präfixe, Suffixe oder Wortteile" : ""}
${style === "modern" ? "- Nutze kurze, prägnante Formen\n- Tech-Suffixe wie -ly, -io, -ify können helfen\n- Verbinde bekannte Konzepte neu" : ""}
${style === "creative" ? "- Erfinde neue Wörter durch Kombination\n- Nutze ungewöhnliche Buchstabenkombinationen\n- Lass dich von abstrakten Konzepten inspirieren" : ""}
${style === "serious" ? "- Nutze klassische Wortformen\n- Lateinische oder griechische Wurzeln wirken seriös\n- Vermeide zu verspielte Elemente" : ""}

Antworte NUR mit diesem JSON-Format:
{
  "suggestions": [
    {
      "name": "Markenname",
      "explanation": "Kurze Begründung warum dieser Name passt"
    }
  ]
}`;

    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
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

      if (!Array.isArray(parsed.suggestions)) {
        throw new Error("Ungültiges Antwortformat");
      }

      const suggestions = parsed.suggestions.map((s: { name: string; explanation: string }) => ({
        name: String(s.name || "").trim(),
        explanation: String(s.explanation || "").trim(),
        quickCheckStatus: "idle",
      })).filter((s: { name: string }) => s.name.length > 0);

      return NextResponse.json({
        success: true,
        suggestions,
        originalBrand,
        style,
        language,
      });
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);

      // Fallback suggestions
      const fallbackSuggestions = [
        { name: `${originalBrand}Plus`, explanation: "Erweiterung des Originals", quickCheckStatus: "idle" },
        { name: `Neo${originalBrand}`, explanation: "Moderne Variante", quickCheckStatus: "idle" },
        { name: `${originalBrand}X`, explanation: "Dynamische Abwandlung", quickCheckStatus: "idle" },
      ];

      return NextResponse.json({
        success: true,
        suggestions: fallbackSuggestions,
        originalBrand,
        style,
        language,
        fallback: true,
      });
    }
  } catch (error: unknown) {
    console.error("Generate alternatives error:", error);

    const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten";

    if (errorMessage.includes("API key") || errorMessage.includes("401")) {
      return NextResponse.json({
        error: "KI-Service nicht verfügbar. Bitte versuchen Sie es später erneut.",
      }, { status: 503 });
    }

    return NextResponse.json({
      error: "Ein Fehler ist bei der Generierung aufgetreten.",
    }, { status: 500 });
  }
}
