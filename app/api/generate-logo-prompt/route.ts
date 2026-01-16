import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      chatMessages = [] as Message[], 
      referenceImageBase64, 
      brandName = "Marke",
      trademarkType = "wort-bildmarke"
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API Key nicht konfiguriert" }, { status: 500 });
    }

    // Extrahiere relevante Chat-Nachrichten (Logo, Design, Stil, Farben)
    const relevantKeywords = ["logo", "design", "stil", "farbe", "farben", "form", "modern", "minimalist", "klassisch", "elegant", "bunt", "schlicht"];
    const relevantMessages = chatMessages.filter((m: Message) => 
      relevantKeywords.some(kw => m.content?.toLowerCase().includes(kw))
    );
    
    const chatContext = relevantMessages.length > 0 
      ? relevantMessages.map((m: Message) => `${m.role === "user" ? "Kunde" : "Berater"}: ${m.content}`).join("\n")
      : "";

    // System-Prompt für Prompt-Generierung
    const systemPrompt = `Du bist ein Logo-Design-Experte. Deine Aufgabe ist es, einen detaillierten DALL-E 3 Prompt zu erstellen.

MARKENNAME: ${brandName}
MARKENART: ${trademarkType === "bildmarke" ? "Reine Bildmarke (KEIN Text im Logo)" : trademarkType === "wortmarke" ? "Wortmarke (nur stilisierter Text)" : "Wort-Bildmarke (Text + Grafik)"}

REGELN für den Prompt:
1. Auf Englisch schreiben (DALL-E versteht Englisch besser)
2. Beschreibe: Stil, Farben, Formen, Komposition
3. Für Markenregistrierung geeignet: clean, vector-style, hoher Kontrast
4. Keine fotorealistischen Elemente
5. Weißer oder transparenter Hintergrund
6. Bei Bildmarke: KEINE Buchstaben oder Text
7. Bei Wort-Bildmarke: Text "${brandName}" integrieren
8. Maximal 200 Wörter

Antworte NUR mit dem DALL-E Prompt, keine Erklärungen.`;

    // Baue die Nachrichten für GPT-4o-mini
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];

    // Füge Chat-Kontext hinzu
    if (chatContext) {
      messages.push({
        role: "user",
        content: `KONVERSATION MIT DEM KUNDEN:\n${chatContext}\n\nBasierend auf dieser Konversation, was für ein Logo möchte der Kunde?`
      });
    }

    // Füge Referenzbild hinzu (falls vorhanden)
    if (referenceImageBase64) {
      messages.push({
        role: "user",
        content: [
          { 
            type: "text", 
            text: chatContext 
              ? "Der Kunde hat außerdem dieses Referenzbild hochgeladen. Analysiere den Stil und integriere ihn in den Prompt:"
              : "Der Kunde hat dieses Referenzbild als Stilvorlage hochgeladen. Analysiere es und erstelle einen DALL-E Prompt mit ähnlichem Stil:"
          },
          { 
            type: "image_url", 
            image_url: { 
              url: referenceImageBase64.startsWith("data:") 
                ? referenceImageBase64 
                : `data:image/jpeg;base64,${referenceImageBase64}` 
            } 
          }
        ]
      });
    }

    // Falls weder Chat noch Referenzbild
    if (!chatContext && !referenceImageBase64) {
      messages.push({
        role: "user",
        content: `Erstelle einen generischen, professionellen DALL-E Prompt für ein ${trademarkType === "bildmarke" ? "abstraktes Symbol-Logo ohne Text" : trademarkType === "wortmarke" ? "typografisches Logo mit dem Text '" + brandName + "'" : "Logo mit dem Text '" + brandName + "' und einem passenden Symbol"}.`
      });
    }

    // Finaler Request für den Prompt
    messages.push({
      role: "user",
      content: "Erstelle jetzt den finalen DALL-E 3 Prompt auf Englisch:"
    });

    console.log("Generating logo prompt with GPT-4o-mini...", {
      hasChatContext: !!chatContext,
      hasReferenceImage: !!referenceImageBase64,
      brandName,
      trademarkType
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedPrompt = response.choices[0]?.message?.content?.trim() || "";

    if (!generatedPrompt) {
      return NextResponse.json({ error: "Kein Prompt generiert" }, { status: 500 });
    }

    console.log("Generated DALL-E prompt:", generatedPrompt.substring(0, 100) + "...");

    return NextResponse.json({ 
      prompt: generatedPrompt,
      hasReferenceImage: !!referenceImageBase64,
      hasChatContext: !!chatContext
    });

  } catch (error: unknown) {
    console.error("Logo prompt generation error:", error);
    const message = error instanceof Error ? error.message : "Prompt-Generierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
