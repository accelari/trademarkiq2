import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { NICE_CLASSES } from "@/lib/nice-classes";

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

    const { markenname, klassen, laender } = await request.json();
    
    if (!markenname?.trim()) {
      return NextResponse.json({ error: "Markenname fehlt" }, { status: 400 });
    }

    const klassenDetails = (klassen || []).length > 0 
      ? klassen.map((k: number) => {
          const klass = NICE_CLASSES.find(c => c.id === k);
          return klass ? { id: k, name: klass.name } : { id: k, name: `Klasse ${k}` };
        })
      : [];
    
    const klassenText = klassenDetails.length > 0 
      ? klassenDetails.map((k: any) => `Klasse ${k.id} (${k.name})`).join(", ")
      : "Alle Klassen";
    const laenderText = (laender || []).length > 0 ? laender.join(", ") : "Alle Register";

    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Generiere Suchvarianten für die Marke "${markenname}".

Zielmärkte: ${laenderText}
Nizza-Klassen: ${klassenText}

Erstelle phonetische, visuelle und konzeptuelle Varianten. Antworte NUR mit JSON:
{
  "variants": [
    {"term": "variante", "type": "exact|phonetic|visual|conceptual|root|misspelling", "rationale": "Begründung"}
  ],
  "strategyNarrative": "Kurze Erklärung der Suchstrategie"
}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unerwartete Antwort");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        queryTerms: [markenname],
        expertStrategy: { variants: [{ term: markenname, type: "exact", rationale: "Exakte Suche" }] }
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const queryTerms = parsed.variants?.map((v: any) => v.term) || [markenname];

    return NextResponse.json({
      queryTerms,
      expertStrategy: parsed,
      rawResponse: content.text
    });
  } catch (error) {
    console.error("Search strategy error:", error);
    return NextResponse.json({
      queryTerms: [request.body ? "fallback" : "error"],
      error: String(error)
    }, { status: 500 });
  }
}
