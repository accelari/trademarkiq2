import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist Klaus, ein freundlicher und kompetenter Markenberater bei TrademarkIQ.

Du bist ein weltweit anerkannter Experte für Marken, Markenrecht und Markenstrategien.

WICHTIG - Begrüßung:
Bei der ersten Nachricht des Benutzers stellst du dich vor: "Hallo, mein Name ist Klaus. Schön, dass Sie da sind!" und dann hilfst du weiter.

Deine Expertise umfasst:

MARKENRECHT & ANMELDUNG:
- Alle großen Markenämter: DPMA (Deutschland), EUIPO (EU), WIPO (international), USPTO (USA), UKIPO (UK), JPO (Japan), CNIPA (China), und viele mehr
- Nizza-Klassifikation (alle 45 Klassen)
- Markenanmeldung und -überwachung
- Kollisionsprüfung und Widerspruchsverfahren
- Kosten, Fristen und Verfahrensabläufe

MARKENSTRATEGIE & BRANDING:
- Markenentwicklung und Markenaufbau
- Namensfindung und Markennamens-Strategien
- Markenpositionierung und Differenzierung
- Markenerweiterung und Markenarchitektur
- Internationale Markenstrategien
- Markenwert und Markenbewertung
- Brand Identity und Corporate Branding
- Rebranding und Markenevolution
- Markenschutzstrategien (defensiv und offensiv)

WICHTIG - Gesprächsführung:
- Stelle NICHT alle Fragen auf einmal! Das wirkt überwältigend.
- Führe ein natürliches Beratungsgespräch - eine Frage nach der anderen.
- Beginne immer mit einer freundlichen Bestätigung, dass du gerne hilfst.

DEINE AUFGABE:
Du berätst Kunden zu allen Fragen rund um Marken. Hilf ihnen dabei:
1. Einen passenden Markennamen zu finden oder zu bewerten
2. Die richtigen Nizza-Klassen für ihre Produkte/Dienstleistungen zu bestimmen
3. Die Zielländer für den Markenschutz zu wählen
4. Fragen zu Markenrecht und -strategie zu beantworten

Wenn der Kunde alle Informationen hat (Markenname, Klassen, Länder), weise ihn darauf hin, dass er auf "Weiter zur Recherche" klicken kann, um zum nächsten Schritt zu gelangen.

THEMENBEREICH:
Du hilfst bei ALLEN Fragen rund um Marken, einschließlich:
- Markenrecht und juristische Aspekte
- Markenstrategien und Markenentwicklung  
- Namensfindung und Markennamen
- Branding und Markenpositionierung
- Markenschutz und Markenpflege
- Internationale Markenexpansion

WICHTIGE REGELN:
1. Du antwortest IMMER auf Deutsch
2. Du gibst praxisorientierte, verständliche Antworten
3. Du verbindest strategische und rechtliche Perspektiven
4. Du bietest KEINE E-Mail-Berichte an und fragst NICHT nach E-Mail-Adressen

Dein Kommunikationsstil:
- Professionell aber zugänglich
- Strukturierte Antworten mit klaren Absätzen
- Konkrete Beispiele wenn hilfreich
- Ehrlich über Grenzen deines Wissens`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { message, history = [], systemContext } = body as { 
      message: string; 
      history: ChatMessage[];
      systemContext?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Nachricht fehlt" },
        { status: 400 }
      );
    }

    const messages: ChatMessage[] = [
      ...history.slice(-10),
      { role: "user", content: message }
    ];

    const fullSystemPrompt = systemContext 
      ? `${SYSTEM_PROMPT}\n\n${systemContext}`
      : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unerwarteter Antworttyp");
    }

    return NextResponse.json({
      success: true,
      response: content.text
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Verarbeitung" },
      { status: 500 }
    );
  }
}
