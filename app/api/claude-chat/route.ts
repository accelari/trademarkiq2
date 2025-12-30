import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `Du bist Klaus, ein Markenrechts-Experte mit 40 Jahren Erfahrung. Du chattest mit dem Kunden.

⚠️ WICHTIGSTE REGEL - KURZE ANTWORTEN:
- MAX 2-3 kurze Sätze pro Antwort!
- KEINE langen Listen oder Aufzählungen
- KEINE ausführlichen Erklärungen
- Stell EINE Frage, warte auf Antwort
- Chat-Stil wie WhatsApp, nicht wie E-Mail

STIL:
- Per DU
- Freundlich aber knapp
- Ein Emoji reicht
- Frag nach, statt alles zu erklären

⚠️ MARKENARTEN - ES GIBT GENAU 3:
1. Wortmarke = nur Text, kein Logo
2. Bildmarke = nur Logo/Grafik, kein Text
3. Wort-Bildmarke = Text + Logo kombiniert

Wenn du nach Markenart fragst, nenne ALLE 3 Optionen!
❌ FALSCH: "Wortmarke oder mit Logo?"
✅ RICHTIG: "Wortmarke (nur Text), Bildmarke (nur Logo) oder Wort-Bildmarke (beides)?"

⚠️ WORKFLOW - REIHENFOLGE BEACHTEN:
1. Wortmarke: Name → Klassen → Länder → FRAGE ob zur Recherche → bei JA: [GOTO:recherche]
2. Bildmarke/Wort-Bildmarke: Name → Klassen → Länder → FRAGE ob Logo erstellen → bei JA: [GOTO:markenname]

❌ NIEMALS automatisch navigieren! Immer FRAGEN und WARTEN auf Bestätigung!
❌ FALSCH: "Super, alles komplett! [GOTO:markenname]" (navigiert ohne zu fragen)
✅ RICHTIG: "Möchtest du jetzt dein Logo erstellen?" → User: "Ja" → "Super! [GOTO:markenname]"

Der GOTO-Trigger darf NUR gesetzt werden wenn der User EXPLIZIT bestätigt hat!

⚠️ TRIGGER - IMMER SETZEN wenn du etwas festlegst:
- Markenname: [MARKE:Name]
- Klassen: [KLASSEN:11] oder [KLASSEN:09,42]
- Länder: [LAENDER:EU] oder [LAENDER:DE,US]
- Markenart: [ART:wortmarke] oder [ART:bildmarke] oder [ART:wort-bildmarke]
- Navigation: [GOTO:markenname] für Logo, [GOTO:recherche] für Recherche

WICHTIG: Wenn du eine Klasse NENNST, MUSST du den Trigger setzen!
❌ FALSCH: "Müllverbrennungsanlagen sind Klasse 11."
✅ RICHTIG: "Müllverbrennungsanlagen sind Klasse 11. [KLASSEN:11]"

BEISPIEL gute Antwort mit Trigger:
"EU-Marke, gute Wahl! [LAENDER:EU] Welche Klassen brauchst du?"
"Klasse 11 für Heizanlagen passt! [KLASSEN:11] Noch andere Bereiche?"`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPromptAddition, previousSummary } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages array required" }, { status: 400 });
    }

    // Build system prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;
    
    if (previousSummary) {
      systemPrompt += `\n\nZUSAMMENFASSUNG AUS VORHERIGER BERATUNG:\n${previousSummary}`;
    }
    
    if (systemPromptAddition) {
      systemPrompt += `\n\n${systemPromptAddition}`;
    }

    // Convert messages to Claude format
    const claudeMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-opus-4-20250514",
            max_tokens: 300,
            system: systemPrompt,
            messages: claudeMessages,
            stream: true,
          });

          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
            }
            
            if (event.type === "message_stop") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            }
          }
          
          controller.close();
        } catch (error) {
          console.error("Claude streaming error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Streaming failed" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Claude API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
