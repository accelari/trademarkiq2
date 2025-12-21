import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { TMSearchClient } from "@/lib/tmsearch/client";
import { calculateSimilarity } from "@/lib/similarity";

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

// Helper function to quick-check a name against the registry
async function quickCheckName(name: string, classes: number[]): Promise<{
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  conflicts: number;
  criticalCount: number;
}> {
  try {
    const client = new TMSearchClient();
    const searchResult = await client.search({ keyword: name });

    let filteredResults = searchResult.results;

    // Filter by Nice classes if provided
    if (classes && classes.length > 0) {
      const classSet = new Set(classes.map((c: number) => Number(c)));
      filteredResults = filteredResults.filter(r => {
        const resultClasses = r.niceClasses || [];
        if (resultClasses.length === 0) return true;
        return resultClasses.some((rc: number) => classSet.has(Number(rc)));
      });
    }

    // Calculate similarity for each result
    const resultsWithSimilarity = filteredResults.map(r => {
      const similarity = calculateSimilarity(name, r.name || "");
      return { ...r, similarity: similarity.combined };
    });

    // Filter and categorize conflicts
    const sortedResults = resultsWithSimilarity
      .filter(r => r.similarity >= 50)
      .sort((a, b) => b.similarity - a.similarity);

    const criticalConflicts = sortedResults.filter(r => r.similarity >= 80);
    const mediumConflicts = sortedResults.filter(r => r.similarity >= 60 && r.similarity < 80);
    const lowConflicts = sortedResults.filter(r => r.similarity >= 50 && r.similarity < 60);

    // Calculate risk score
    let riskScore = 0;
    if (criticalConflicts.length > 0) {
      riskScore = Math.min(100, 70 + (criticalConflicts.length * 10));
    } else if (mediumConflicts.length > 0) {
      riskScore = Math.min(79, 40 + (mediumConflicts.length * 8));
    } else if (lowConflicts.length > 0) {
      riskScore = Math.min(49, 20 + (lowConflicts.length * 5));
    } else if (filteredResults.length > 0) {
      riskScore = Math.min(19, filteredResults.length * 2);
    }

    const riskLevel: "low" | "medium" | "high" = 
      riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

    return {
      riskLevel,
      riskScore,
      conflicts: sortedResults.length,
      criticalCount: criticalConflicts.length,
    };
  } catch (error) {
    console.error("Quick check error for", name, ":", error);
    return { riskLevel: "medium", riskScore: 50, conflicts: 0, criticalCount: 0 };
  }
}

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
      count = 5,
      smartGeneration = true, // New: enable smart generation by default
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

    // For smart generation, generate more candidates to filter
    const generateCount = smartGeneration ? 15 : count;

    const prompt = `Du bist ein Markennamens-Experte mit 20 Jahren Erfahrung in Branding und Markenrecht.

Generiere ${generateCount} alternative Markennamen basierend auf folgenden Angaben:

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
      model: "claude-opus-4-1",
      max_tokens: 3000, // Increased for 15 suggestions
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

      const rawSuggestions = parsed.suggestions.map((s: { name: string; explanation: string }) => ({
        name: String(s.name || "").trim(),
        explanation: String(s.explanation || "").trim(),
      })).filter((s: { name: string }) => s.name.length > 0);

      // Smart Generation: Check each name against the registry
      if (smartGeneration && rawSuggestions.length > 0) {
        console.log(`[Smart Generation] Checking ${rawSuggestions.length} candidates...`);

        // Check all candidates in parallel (max 5 concurrent)
        const checkResults = await Promise.all(
          rawSuggestions.map(async (suggestion: { name: string; explanation: string }) => {
            const checkResult = await quickCheckName(suggestion.name, classes);
            return {
              ...suggestion,
              quickCheckStatus: checkResult.riskLevel,
              quickCheckScore: checkResult.riskScore,
              quickCheckConflicts: checkResult.conflicts,
              criticalCount: checkResult.criticalCount,
            };
          })
        );

        // Sort by risk score (lowest first = safest names)
        const sortedByRisk = checkResults.sort((a, b) => a.quickCheckScore - b.quickCheckScore);

        // Separate by risk level
        const safeSuggestions = sortedByRisk.filter(s => s.quickCheckStatus === "low");
        const mediumSuggestions = sortedByRisk.filter(s => s.quickCheckStatus === "medium");
        const highRiskSuggestions = sortedByRisk.filter(s => s.quickCheckStatus === "high");

        console.log(`[Smart Generation] Results: ${safeSuggestions.length} low, ${mediumSuggestions.length} medium, ${highRiskSuggestions.length} high risk`);

        // Build final list: prioritize safe names, fill with medium if needed
        // NEVER include high-risk names automatically
        let finalSuggestions: typeof checkResults = [];
        const targetCount = count;
        let noSafeNamesFound = false;

        // First: add all safe names (low risk)
        finalSuggestions.push(...safeSuggestions.slice(0, targetCount));

        // If we don't have enough, add medium risk names
        if (finalSuggestions.length < targetCount) {
          const remaining = targetCount - finalSuggestions.length;
          finalSuggestions.push(...mediumSuggestions.slice(0, remaining));
        }

        // If we still have no suggestions at all, show the best high-risk as last resort
        // but flag this clearly to the user
        if (finalSuggestions.length === 0 && highRiskSuggestions.length > 0) {
          noSafeNamesFound = true;
          // Only show top 3 high-risk as examples
          finalSuggestions.push(...highRiskSuggestions.slice(0, 3));
        }

        // Count actual displayed items by risk level
        const displayedLowCount = finalSuggestions.filter(s => s.quickCheckStatus === "low").length;
        const displayedMediumCount = finalSuggestions.filter(s => s.quickCheckStatus === "medium").length;
        const displayedHighCount = finalSuggestions.filter(s => s.quickCheckStatus === "high").length;

        // Determine overall message for user - use DISPLAYED counts, not pool counts
        let smartGenerationMessage = "";
        if (displayedLowCount > 0 && displayedMediumCount === 0) {
          smartGenerationMessage = `${displayedLowCount} konfliktarme Namen gefunden`;
        } else if (displayedLowCount > 0 && displayedMediumCount > 0) {
          smartGenerationMessage = `${displayedLowCount} konfliktarme Namen gefunden, ${displayedMediumCount} weitere mit mittlerem Risiko`;
        } else if (displayedMediumCount > 0) {
          smartGenerationMessage = `Keine konfliktfreien Namen gefunden. Zeige ${displayedMediumCount} Namen mit mittlerem Risiko.`;
        } else if (displayedHighCount > 0) {
          smartGenerationMessage = `Alle ${checkResults.length} geprüften Namen haben hohes Risiko. Zeige ${displayedHighCount} als Beispiele.`;
        } else {
          smartGenerationMessage = `Keine passenden Namen gefunden. Versuche einen anderen Stil.`;
        }

        return NextResponse.json({
          success: true,
          suggestions: finalSuggestions,
          originalBrand,
          style,
          language,
          smartGeneration: true,
          smartGenerationMessage,
          noSafeNamesFound,
          stats: {
            totalChecked: checkResults.length,
            lowRiskCount: safeSuggestions.length,
            mediumRiskCount: mediumSuggestions.length,
            highRiskCount: highRiskSuggestions.length,
          },
        });
      }

      // Non-smart generation: return as-is without checking
      const suggestions = rawSuggestions.map((s: { name: string; explanation: string }) => ({
        ...s,
        quickCheckStatus: "idle",
      }));

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
