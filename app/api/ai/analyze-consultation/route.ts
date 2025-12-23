import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient, CLAUDE_SONNET } from "@/lib/anthropic";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, trademarkName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Keine Nachrichten zum Analysieren" },
        { status: 400 }
      );
    }

    const transcript = messages
      .map((m: Message) => `${m.role === "user" ? "Kunde" : "Berater"}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `Du bist ein Experte für Markenrecht und analysierst Beratungsgespräche.
Extrahiere aus dem folgenden Gespräch die wichtigsten Informationen für eine Markenanmeldung.

Erstelle eine strukturierte Zusammenfassung mit:
1. Zusammenfassung des Gesprächs (2-3 Sätze)
2. Gewünschter Markenname (falls erwähnt)
3. Geplante Länder/Regionen für die Anmeldung
4. Relevante Nizza-Klassen basierend auf den besprochenen Waren/Dienstleistungen
5. Wichtige Hinweise oder Bedenken

Antworte im JSON-Format:
{
  "summary": "Zusammenfassung des Gesprächs",
  "trademarkName": "Name oder null",
  "countries": ["DE", "EU", etc.] oder [],
  "niceClasses": [1, 9, 42, etc.] oder [],
  "notes": "Wichtige Hinweise",
  "isComplete": true/false (true wenn Name, mindestens 1 Land und 1 Klasse vorhanden)
}`;

    const response = await anthropicClient.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analysiere dieses Beratungsgespräch:\n\n${transcript}${trademarkName ? `\n\nDer Markenname ist bereits bekannt: ${trademarkName}` : ""}`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "Keine Antwort von der KI" },
        { status: 500 }
      );
    }

    let analysis;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      analysis = {
        summary: textContent.text,
        trademarkName: trademarkName || null,
        countries: [],
        niceClasses: [],
        notes: "",
        isComplete: false,
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analyze consultation error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Analyse" },
      { status: 500 }
    );
  }
}
