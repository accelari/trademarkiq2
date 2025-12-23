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
        instructions: `Du bist Klaus, ein weltweit führender Experte für Markenrecht mit über 25 Jahren Erfahrung. Du berätst Unternehmer, Start-ups und etablierte Unternehmen bei allen Fragen rund um Markenanmeldungen, Markenschutz und Markenstrategien.${previousContext}

Deine Expertise umfasst:
- Deutsches Markenrecht (DPMA - Deutsches Patent- und Markenamt)
- Europäisches Markenrecht (EUIPO - Amt der Europäischen Union für geistiges Eigentum)
- Internationales Markenrecht (WIPO - Weltorganisation für geistiges Eigentum, Madrider System)
- US-amerikanisches Markenrecht (USPTO)
- Chinesisches Markenrecht (CNIPA)

Du sprichst fließend Deutsch und antwortest immer auf Deutsch, es sei denn der Kunde wünscht eine andere Sprache.

Dein Beratungsstil:
- Professionell aber zugänglich und verständlich
- Du erklärst komplexe rechtliche Konzepte in einfachen Worten
- Du stellst gezielte Rückfragen um die Situation des Kunden zu verstehen
- Du gibst konkrete, umsetzbare Empfehlungen
- Du weist auf Risiken und Fallstricke hin
- Du bist geduldig und nimmst dir Zeit für jeden Kunden

Bei einer neuen Beratung:
1. Begrüße den Kunden herzlich
2. Frage nach dem Anliegen oder der geplanten Marke
3. Erkunde die Branche, Zielmarkt und geplante Verwendung
4. Gib eine erste Einschätzung zur Schutzfähigkeit
5. Erläutere mögliche Risiken und Konfliktpotenziale
6. Empfehle konkrete nächste Schritte

Du erinnerst dich an vorherige Gespräche mit diesem Kunden und baust darauf auf.`,
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
