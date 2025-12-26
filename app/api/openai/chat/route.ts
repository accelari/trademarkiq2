import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, temperature = 0.7, max_tokens = 500, model = "gpt-4o-mini" } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages sind erforderlich" }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API Key nicht konfiguriert" }, { status: 500 });
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI Chat API error:", errorData);
      
      if (response.status === 401) {
        return NextResponse.json({ error: "OpenAI API Key ungültig" }, { status: 401 });
      }
      if (response.status === 429) {
        return NextResponse.json({ error: "Rate Limit erreicht" }, { status: 429 });
      }
      
      return NextResponse.json(
        { error: errorData?.error?.message || `API Fehler: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return NextResponse.json({
        content: data.choices[0].message.content,
        usage: data.usage,
      });
    }

    return NextResponse.json({ error: "Keine Antwort von OpenAI" }, { status: 500 });

  } catch (error: unknown) {
    console.error("OpenAI Chat error:", error);
    const message = error instanceof Error ? error.message : "Chat-Anfrage fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
