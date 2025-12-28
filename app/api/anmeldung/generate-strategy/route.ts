import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StrategyStep {
  country: string;
  office: string;
  selfRegister: boolean;
  cost: number;
  icon: string;
}

interface Strategy {
  route: string;
  steps: StrategyStep[];
  totalCost: number;
  hints: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Keine Nachrichten vorhanden" },
        { status: 400 }
      );
    }

    // Erstelle Konversations-String aus Nachrichten
    const conversationText = messages
      .map((m: { role: string; content: string }) => 
        `${m.role === "user" ? "Kunde" : "Klaus"}: ${m.content}`
      )
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Du bist ein Experte für Markenanmeldungen. Analysiere das folgende Gespräch zwischen einem Kunden und dem Berater Klaus und extrahiere die empfohlene Anmeldestrategie.

KONTEXT:
- Markenname: ${context?.trademarkName || "unbekannt"}
- Markentyp: ${context?.trademarkType || "unbekannt"}
- Nizza-Klassen: ${context?.niceClasses?.join(", ") || "unbekannt"}
- Gewünschte Länder: ${context?.selectedCountries?.join(", ") || "unbekannt"}

Du musst ein JSON-Objekt zurückgeben mit dieser exakten Struktur:
{
  "route": "Kurze Beschreibung der empfohlenen Route (z.B. 'WIPO Madrid + DE Basismarke' oder 'EUIPO EU-Marke' oder 'Nationale Anmeldungen')",
  "steps": [
    {
      "country": "Land/Region Name",
      "office": "Amt-Name (z.B. DPMA, EUIPO, WIPO)",
      "selfRegister": true/false,
      "cost": Geschätzte Kosten in Euro als Zahl,
      "icon": "Emoji-Flagge oder Symbol"
    }
  ],
  "totalCost": Gesamtkosten als Zahl,
  "hints": ["Wichtiger Hinweis 1", "Wichtiger Hinweis 2"]
}

WICHTIGE REGELN:
- Wenn keine klare Strategie im Gespräch erkennbar ist, gib eine sinnvolle Standardempfehlung basierend auf den gewünschten Ländern
- Kosten sollten realistische Schätzungen sein (DPMA ~290€, EUIPO ~850€, WIPO Basis ~653€ + Ländergebühren)
- selfRegister ist true für: DPMA, EUIPO, WIPO, Schweiz, UK, Australien, Kanada, Norwegen
- selfRegister ist false für: USA (Ausländer), China, Russland, Indien, etc.
- Gib IMMER mindestens einen Hinweis zur Klassifizierung

Antworte NUR mit dem JSON-Objekt, ohne Markdown-Formatierung.`
        },
        {
          role: "user",
          content: `Hier ist das Gespräch:\n\n${conversationText}`
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    // Parse JSON aus der Antwort
    let strategy: Strategy;
    try {
      // Entferne mögliche Markdown-Code-Blöcke
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      strategy = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse strategy JSON:", responseText);
      // Fallback-Strategie
      strategy = {
        route: "Nationale Anmeldung empfohlen",
        steps: [
          {
            country: "Deutschland",
            office: "DPMA",
            selfRegister: true,
            cost: 290,
            icon: "🇩🇪"
          }
        ],
        totalCost: 290,
        hints: ["Bitte führen Sie ein ausführlicheres Gespräch mit dem Berater für eine detaillierte Strategie."]
      };
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Strategy generation error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Strategie-Generierung" },
      { status: 500 }
    );
  }
}
