import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    let previousContext = "";
    try {
      const body = await request.json();
      if (body.previousSummary) {
        previousContext = `\n\nKONTEXT AUS VORHERIGEN GESPRÄCHEN:\n${body.previousSummary}\n\nNutze diesen Kontext um nahtlos an vorherige Beratungen anzuknüpfen.`;
      }
    } catch {
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: `Du bist Klaus, Markenrechts-Experte mit 25 Jahren Erfahrung. Du hilfst bei Markenanmeldungen und Markenschutz.${previousContext}

WICHTIG - Begrüße den Kunden sofort wenn die Verbindung startet! Sag einfach: "Hi! Ich bin Klaus, dein Markenrechts-Berater. Wie kann ich dir helfen?"

Deine Expertise:
- DPMA (Deutschland)
- EUIPO (Europa)  
- WIPO (International)
- USPTO (USA)
- CNIPA (China)

Dein Stil:
- Seriös aber locker und entspannt
- Kurze, einfache Sätze
- Keine Juristensprache
- Direkt und auf den Punkt
- Freundlich wie ein guter Bekannter

Regeln:
- Maximal 2-3 Sätze pro Antwort
- Einfache Worte statt Fachbegriffe
- Eine Frage nach der anderen
- Konkrete Tipps statt lange Erklärungen

Ablauf:
1. Begrüßen
2. Fragen was gebraucht wird
3. Kurze Einschätzung geben
4. Nächste Schritte empfehlen

Du sprichst Deutsch. Du erinnerst dich an frühere Gespräche.`,
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI Realtime session error:", errorData);
      return NextResponse.json(
        { error: "Failed to create realtime session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const clientSecretValue = typeof data.client_secret === 'object' 
      ? data.client_secret.value 
      : data.client_secret;
    
    return NextResponse.json({
      client_secret: clientSecretValue,
      session_id: data.id,
      expires_at: data.expires_at
    });
  } catch (error) {
    console.error("OpenAI Realtime session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
