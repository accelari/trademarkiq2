import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";

interface AnalysisResult {
  trademarkName: string | null;
  niceClasses: string[];
  targetCountries: string[];
  suggestedCountries: string[];
  missingFields: string[];
  confidence: {
    trademarkName: number;
    niceClasses: number;
    targetCountries: number;
  };
}

const SYSTEM_PROMPT = `Du bist ein Experte für Markenrecht und analysierst Beratungsgespräche.

Deine Aufgabe ist es, aus dem Gesprächsprotokoll folgende Informationen zu extrahieren:

1. MARKENNAME: Der Name der Marke, die angemeldet werden soll
2. NIZZA-KLASSEN: Die relevanten Nizza-Klassifikationen (Nummern 1-45)
3. ZIELLÄNDER: Die Länder/Regionen für die Markenanmeldung

WICHTIG FÜR NIZZA-KLASSEN:
- Wenn der Kunde "alle Klassen", "allen Klassen", "sämtliche Klassen", "jede Klasse" oder "in allen Bereichen" sagt, gib ALLE 45 Klassen zurück: ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45"]
- Achte genau auf diese Formulierungen im Gespräch!

WICHTIG - UNTERSCHEIDE ZWISCHEN:
- "confirmedCountries": Länder die der KUNDE explizit genannt/bestätigt hat (z.B. "Ich möchte in Deutschland anmelden")
- "suggestedCountries": Länder die der BERATER vorgeschlagen hat, aber vom Kunden NICHT bestätigt wurden

Beispiele:
- Kunde: "Ich möchte in Deutschland und der EU anmelden" → confirmedCountries: ["Deutschland", "Europäische Union"]
- Berater: "Deutschland wäre ein guter Start" + Kunde sagt NICHTS dazu → suggestedCountries: ["Deutschland"]
- Berater: "Deutschland wäre gut" + Kunde: "Ja, Deutschland passt" → confirmedCountries: ["Deutschland"]

WICHTIG ZU ZIELLÄNDERN:
- WIPO ist KEIN Land! WIPO ist ein System für internationale Markenanmeldungen.
- Extrahiere nur KONKRETE Länder wie: Deutschland, Frankreich, Italien, etc.
- "Europäische Union" (EU/EUIPO) ist eine gültige Region

Gültige Zielländer/Regionen:
- Deutschland (DPMA)
- Europäische Union (EUIPO)
- Einzelne EU-Länder: Frankreich, Italien, Spanien, Österreich, etc.
- Internationale Länder: USA, Großbritannien, Schweiz, China, Japan, etc.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "trademarkName": "Markenname" oder null wenn nicht gefunden,
  "niceClasses": ["9", "35", "42"] Array von Klassennummern als Strings,
  "confirmedCountries": ["Deutschland"] Array von Ländern die der Kunde bestätigt hat,
  "suggestedCountries": ["Europäische Union", "USA"] Array von Ländern die nur vorgeschlagen wurden,
  "missingFields": ["trademarkName", "niceClasses", "targetCountries"] Array der fehlenden Felder,
  "confidence": {
    "trademarkName": 0-100,
    "niceClasses": 0-100,
    "targetCountries": 0-100
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { meetingNotes } = body;

    if (!meetingNotes || typeof meetingNotes !== "string" || meetingNotes.trim().length < 50) {
      return NextResponse.json(
        { error: "Beratungsgespräch ist zu kurz für eine Analyse" },
        { status: 400 }
      );
    }

    const response = await anthropicClient.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analysiere dieses Beratungsgespräch und extrahiere die Informationen für eine Markenrecherche:\n\n${meetingNotes}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unerwarteter Antworttyp");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: true,
        result: {
          trademarkName: null,
          niceClasses: [],
          targetCountries: [],
          suggestedCountries: [],
          missingFields: ["trademarkName", "niceClasses", "targetCountries"],
          confidence: { trademarkName: 0, niceClasses: 0, targetCountries: 0 }
        }
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const filterCountries = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((c: any) => typeof c === "string" && c.trim())
        .map((c: any) => c.trim())
        .filter((c: string) => !c.toLowerCase().includes("wipo"));
    };

    const confirmedCountries = filterCountries(parsed.confirmedCountries);
    const suggestedCountries = filterCountries(parsed.suggestedCountries)
      .filter(c => !confirmedCountries.includes(c));

    const result: AnalysisResult = {
      trademarkName: typeof parsed.trademarkName === "string" && parsed.trademarkName.trim() 
        ? parsed.trademarkName.trim() 
        : null,
      niceClasses: Array.isArray(parsed.niceClasses) 
        ? parsed.niceClasses.filter((c: any) => {
            const num = parseInt(String(c));
            return !isNaN(num) && num >= 1 && num <= 45;
          }).map((c: any) => String(c))
        : [],
      targetCountries: confirmedCountries,
      suggestedCountries: suggestedCountries,
      missingFields: [],
      confidence: {
        trademarkName: typeof parsed.confidence?.trademarkName === "number" ? parsed.confidence.trademarkName : 0,
        niceClasses: typeof parsed.confidence?.niceClasses === "number" ? parsed.confidence.niceClasses : 0,
        targetCountries: typeof parsed.confidence?.targetCountries === "number" ? parsed.confidence.targetCountries : 0
      }
    };

    if (!result.trademarkName) {
      result.missingFields.push("trademarkName");
    }
    if (result.niceClasses.length === 0) {
      result.missingFields.push("niceClasses");
    }
    if (result.targetCountries.length === 0 && result.suggestedCountries.length === 0) {
      result.missingFields.push("targetCountries");
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error("Analyze Consultation API Error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Analyse" },
      { status: 500 }
    );
  }
}
