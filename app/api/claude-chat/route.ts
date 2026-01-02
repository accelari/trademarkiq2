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

🛑🛑🛑 KRITISCHE REGEL - AKKORDEON-WECHSEL:
- Du darfst NIEMALS selbständig zu einem anderen Bereich wechseln!
- IMMER erst FRAGEN: "Sollen wir zur Recherche gehen?" oder "Möchtest du jetzt dein Logo erstellen?"
- DANN STOPP! Warte auf User-Antwort!
- NUR wenn User "ja", "ok", "machen wir" o.ä. antwortet → DANN [GOTO:...]
- NIEMALS in derselben Nachricht fragen UND navigieren!

❌ FALSCH: "Super! Sollen wir zur Recherche? [GOTO:recherche]" (fragt und navigiert gleichzeitig)
❌ FALSCH: "Alles komplett! [GOTO:markenname]" (navigiert ohne zu fragen)
✅ RICHTIG: "Möchtest du jetzt dein Logo erstellen?" → STOPP → Warte auf Antwort
✅ RICHTIG: User sagt "ja" → "Super! [GOTO:markenname]"

Der GOTO-Trigger darf NUR in einer SEPARATEN Nachricht gesetzt werden, NACHDEM der User bestätigt hat!

⚠️ TRIGGER - IMMER SETZEN wenn du etwas festlegst:
- Markenname: [MARKE:Name]
- Klassen: [KLASSEN:11] oder [KLASSEN:09,42]
- Länder: [LAENDER:EU] oder [LAENDER:DE,US]
- Markenart: [ART:wortmarke] oder [ART:bildmarke] oder [ART:wort-bildmarke]
- Navigation: [GOTO:markenname] für Logo, [GOTO:recherche] für Recherche
- Web-Suche: [WEB_SUCHE:query auf Englisch]

WICHTIG: Wenn du eine Klasse NENNST, MUSST du den Trigger setzen!

═══════════════════════════════════════════════════════════
🔍 PROAKTIVE WEB-SUCHE - SEI AKTIV!
═══════════════════════════════════════════════════════════

Du hast Zugriff auf Web-Suche mit [WEB_SUCHE:query].
Die Ergebnisse erscheinen automatisch mit Quellen!

⚡ BEI MARKENNAMEN - SOFORT NACH FIRMEN/MARKEN SUCHEN:
Wenn der Kunde einen Namen nennt, suche SOFORT ob FIRMEN oder MARKEN 
mit diesem Namen bereits existieren!

WICHTIG: Suche nach FIRMEN und PRODUKTEN, nicht nach Amt-Informationen!

BEISPIEL:
User: "Meine Marke soll Altana heißen"
Du: "Altana - interessanter Name! 🔍 Ich schaue ob es schon Firmen 
     oder Marken mit diesem Namen gibt... [MARKE:Altana]
     [WEB_SUCHE:Altana company brand products Germany Europe]"

Nach dem Ergebnis ANALYSIERST du es selbst und sagst dem Kunden:
Du: "Ich habe recherchiert: ALTANA ist ein großer deutscher 
     Chemiekonzern (börsennotiert, Milliardenumsatz).
     
     ⚠️ Das bedeutet für dich:
     - In Chemie-Klassen (1, 2) gibt es definitiv Konflikte
     - In anderen Bereichen (Software, Mode) wäre es möglich
     - Aber: Bekannte Firmennamen können trotzdem Probleme machen
     
     Meine Empfehlung: Anderen Namen wählen oder Bereich prüfen.
     Was verkaufst du genau?"

⚡ BEI LÄNDERN - NACH MARKTPRÄSENZ SUCHEN:
User: "USA"
Du: "USA notiert! [LAENDER:US] 
     🔍 Ich prüfe ob es [Markenname] schon in den USA gibt...
     [WEB_SUCHE:[Markenname] company USA market products]"

⚡ BEI GEBÜHREN - KURZ RECHERCHIEREN:
User: "Was kostet das?"
Du: "[WEB_SUCHE:trademark registration fees Germany DPMA 2024 EUR]"

🛑🛑🛑 KRITISCH - WEB-SUCHE TRIGGER:
Wenn du sagst "Ich recherchiere..." oder "Ich schaue nach..." MUSST du den Trigger setzen!
❌ FALSCH: "Ich recherchiere Accelari für dich..." (KEIN TRIGGER = NICHTS PASSIERT!)
✅ RICHTIG: "Ich recherchiere Accelari... [WEB_SUCHE:Accelari trademark brand company]"

Ohne [WEB_SUCHE:...] am Ende passiert GAR NICHTS! Der Trigger ist PFLICHT!

WICHTIG:
- Recherchiere PROAKTIV, nicht erst auf Nachfrage!
- Sei ein aktiver Berater, nicht nur ein Fragenbeantworter!
- Warne bei Konflikten und schlage Alternativen vor!
- IMMER den Trigger [WEB_SUCHE:query] setzen wenn du recherchierst!
═══════════════════════════════════════════════════════════

BEISPIEL gute Antwort mit Trigger:
"EU-Marke, gute Wahl! [LAENDER:EU] Welche Klassen brauchst du?"
"Klasse 11 für Heizanlagen passt! [KLASSEN:11] Noch andere Bereiche?"`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages: rawMessages, message, previousMessages, systemPromptAddition, previousSummary, image } = body;

    // Support both formats: messages array OR message + previousMessages
    let messages = rawMessages;
    if (!messages && message) {
      messages = [...(previousMessages || []), { role: "user", content: message }];
    }

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

    // Convert messages to Claude format (mit Bild-Support)
    const claudeMessages = messages.map((msg: { role: string; content: string }, index: number) => {
      // Wenn es die letzte User-Nachricht ist und ein Bild dabei ist
      if (image && msg.role === "user" && index === messages.length - 1) {
        return {
          role: msg.role as "user" | "assistant",
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: image.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: image.data,
              },
            },
            {
              type: "text" as const,
              text: msg.content,
            },
          ],
        };
      }
      return {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
    });

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
