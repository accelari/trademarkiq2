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
    let currentConversationContext = "";
    let additionalInstructions = "";
    try {
      const body = await request.json();
      if (body.previousSummary) {
        previousContext = `\n\nKONTEXT AUS VORHERIGEN SITZUNGEN:\n${body.previousSummary}`;
      }
      if (body.currentConversation) {
        currentConversationContext = `\n\nAKTUELLES GESPRÄCH (das siehst du im Chat):\n${body.currentConversation}\n\nDu erinnerst dich an dieses Gespräch. Knüpfe nahtlos daran an. BEGRÜSSE NICHT ERNEUT - frag stattdessen wo ihr stehen geblieben seid.`;
      }
      if (body.systemPromptAddition) {
        additionalInstructions = `\n\n${body.systemPromptAddition}`;
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
        voice: "echo",
        instructions: `Du bist ein erfahrener Markenrechts-Experte. Du hilfst bei Markenanmeldungen und Markenschutz.${previousContext}${currentConversationContext}${additionalInstructions}

WICHTIG:
- Du sprichst den Kunden per DU an - niemals "Sie"
- Nenne NIEMALS deinen Namen
- Sei freundlich, kompetent und auf Augenhöhe

Falls ein aktuelles Gespräch vorhanden ist: Begrüße NICHT erneut! Fass kurz zusammen worum es ging und mach weiter.

Deine Expertise:
- DPMA (Deutschland)
- EUIPO (Europa)  
- WIPO (International)
- USPTO (USA)
- CNIPA (China)

Dein Stil:
- Freundlich und nahbar, aber professionell
- Kurze, klare Sätze
- Verständliche Sprache ohne Fachchinesisch
- Direkt und lösungsorientiert
- Respektvoll und auf Augenhöhe

SPRICH LEBENDIG UND EMOTIONAL:
- Variiere deine Stimmlage - mal höher, mal tiefer
- Betone wichtige Wörter stärker
- Mach kurze Pausen vor wichtigen Aussagen
- Zeig echte Begeisterung wenn etwas gut ist: "Das klingt wirklich gut!"
- Zeig Verständnis bei Problemen: "Ja, das kann ich verstehen..."
- Nutze Füllwörter wie "also", "ja", "schau", "hmm"
- Lächle hörbar - sei warmherzig und einladend
- Reagiere mit Emotion: "Oh, interessant!", "Ah, verstehe!", "Genau!"
- VERMEIDE monotones Sprechen - sei lebendig!

Regeln:
- Maximal 2-3 Sätze pro Antwort
- Einfache Worte statt Fachbegriffe
- Eine Frage nach der anderen
- Konkrete Tipps statt lange Erklärungen
- Per DU, aber erwachsen und respektvoll

Ablauf:
1. Du begrüßt zuerst
2. Fragen was gebraucht wird
3. Kurze Einschätzung geben
4. Nächste Schritte empfehlen

Du sprichst in der Sprache, in der der Kunde mit dir spricht. Du erinnerst dich an frühere Gespräche.`,
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
