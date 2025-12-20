import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { markenname, results, searchTerms } = await request.json();
    
    if (!markenname?.trim()) {
      return NextResponse.json({ error: "Markenname fehlt" }, { status: 400 });
    }

    const relevantResults = (results || []).filter((r: any) => r.included);
    
    const resultsText = relevantResults.slice(0, 15).map((r: any) => 
      `- "${r.trademark}" | Phonetik: ${r.ourPhonetic}% | Visuell: ${r.ourVisual}% | Gesamt: ${r.ourCombined}% | Begründung: ${r.explanation}`
    ).join("\n");

    const prompt = `MARKENRECHTS-ANALYSE für "${markenname}"

Verwendete Suchbegriffe: ${(searchTerms || [markenname]).join(", ")}

GEFUNDENE MARKEN (${relevantResults.length} relevant):
${resultsText || "Keine relevanten Marken gefunden."}

WICHTIG: Ähnlichkeitswerte wurden bereits berechnet:
- Gesamt ≥80%: Hohes Risiko (high)
- Gesamt 60-79%: Mittleres Risiko (medium)  
- Gesamt <60%: Niedriges Risiko (low)

Antworte mit JSON:
{
  "nameAnalysis": "Analyse des Namens",
  "riskAssessment": "Risikobewertung",
  "overallRisk": "high" | "medium" | "low",
  "recommendation": "Empfehlung",
  "conflicts": [
    {
      "name": "Markenname",
      "accuracy": 85,
      "riskLevel": "high" | "medium" | "low",
      "reasoning": "Begründung"
    }
  ]
}`;

    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unerwartete Antwort");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    let parsed = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        parsed = { error: "JSON parsing failed", raw: content.text };
      }
    }

    return NextResponse.json({
      prompt,
      response: parsed,
      rawResponse: content.text,
      finalResult: parsed ? {
        overallRisk: parsed.overallRisk || "medium",
        conflicts: parsed.conflicts || [],
        nameAnalysis: parsed.nameAnalysis,
        riskAssessment: parsed.riskAssessment,
        recommendation: parsed.recommendation,
      } : null
    });
  } catch (error) {
    console.error("Claude analysis error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
