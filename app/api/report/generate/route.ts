import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface Conflict {
  name: string;
  office?: string;
  classes: (string | number)[];
  riskLevel?: "high" | "medium" | "low";
  riskScore?: number;
  accuracy?: number;
  reasoning?: string;
  status?: string;
  applicationNumber?: string;
  registrationNumber?: string;
  dates?: {
    applied?: string;
    granted?: string;
  };
  owner?: {
    name?: string;
  };
}

interface ReportRequest {
  trademarkName: string;
  trademarkType: string;
  niceClasses: number[];
  countries: string[];
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  conflicts: Conflict[];
  summary?: string;
  caseNumber?: string;
  clientName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    
    const {
      trademarkName,
      trademarkType,
      niceClasses,
      countries,
      riskScore,
      riskLevel,
      conflicts,
      summary,
      caseNumber,
      clientName,
    } = body;

    const today = new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const conflictsTable = conflicts.slice(0, 10).map((c, i) => 
      `| ${i + 1} | **${c.name}** | ${c.office || "EU"} | ${c.applicationNumber || "-"} | ${c.status === "LIVE" ? "✅ Aktiv" : "❌ Inaktiv"} | ${c.classes.join(", ")} | **${c.accuracy || c.riskScore || 0}%** |`
    ).join("\n");

    const riskLabelDe = riskLevel === "high" ? "HOCH" : riskLevel === "medium" ? "MITTEL" : "NIEDRIG";
    const riskEmoji = riskLevel === "high" ? "🔴" : riskLevel === "medium" ? "🟡" : "🟢";
    const recommendation = riskLevel === "high" 
      ? "❌ **Anmeldung nicht empfohlen**" 
      : riskLevel === "medium" 
        ? "⚠️ **Anmeldung mit Risiken verbunden**" 
        : "✅ **Anmeldung empfohlen**";

    const systemPrompt = `Du bist ein erfahrener deutscher Markenanwalt mit 30+ Jahren Berufserfahrung. Du erstellst professionelle Markengutachten für Mandanten.

WICHTIG:
- Schreibe in professionellem, juristischem Deutsch
- Verwende die korrekte Terminologie (UMV, EUIPO, Verwechslungsgefahr, etc.)
- Zitiere relevante Rechtsgrundlagen (Art. 8 UMV, EuGH-Rechtsprechung)
- Das Gutachten muss vollständig und druckfertig sein
- Formatiere mit HTML (h1, h2, h3, p, table, strong, em, ul, li)
- KEINE Markdown-Syntax, NUR HTML
- Verwende professionelle Sprache, aber verständlich für Laien`;

    const userPrompt = `Erstelle ein vollständiges, professionelles MARKENGUTACHTEN als HTML-Dokument.

DATEN:
- Mandant: ${clientName || "[Mandantenname]"}
- Aktenzeichen: ${caseNumber || `TM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`}
- Datum: ${today}
- Anmeldemarke: "${trademarkName}"
- Markenform: ${trademarkType || "Wortmarke"}
- Nizza-Klassen: ${niceClasses.join(", ")}
- Schutzgebiet: ${countries.join(", ") || "EU"}
- Gesamtrisiko: ${riskScore}% (${riskLabelDe})
- Anzahl Konflikte: ${conflicts.length}

IDENTIFIZIERTE KOLLISIONEN:
${conflicts.slice(0, 10).map((c, i) => `${i + 1}. ${c.name} (${c.office || "EU"}, Kl. ${c.classes.join(",")}, ${c.accuracy || c.riskScore}% Ähnlichkeit)${c.reasoning ? ` - ${c.reasoning}` : ""}`).join("\n")}

${summary ? `KI-ZUSAMMENFASSUNG: ${summary}` : ""}

STRUKTUR DES GUTACHTENS (als HTML):
1. <h1>MARKENGUTACHTEN</h1> mit Untertitel "Kollisionsprüfung zur Markenanmeldung"
2. Kopfzeile mit Mandant, Aktenzeichen, Datum, "STRENG VERTRAULICH"
3. <h2>I. Gegenstand der Beauftragung</h2>
4. <h2>II. Zusammenfassung der Ergebnisse (Executive Summary)</h2> - Tabelle mit Gesamtrisiko, Konflikten, Empfehlung
5. <h2>III. Identifizierte Kollisionsmarken</h2> - Tabelle mit allen Konflikten
6. <h2>IV. Rechtliche Bewertung</h2>
   - Rechtsgrundlage (Art. 8 Abs. 1 lit. b UMV)
   - Prüfung der Verwechslungsgefahr (Zeichenvergleich: visuell, phonetisch, begrifflich)
   - Waren-/Dienstleistungsvergleich
   - Kennzeichnungskraft
   - Wechselwirkung
7. <h2>V. Risikoeinschätzung</h2> - Widerspruchsprognose, Kostenschätzung
8. <h2>VI. Handlungsempfehlungen</h2> - Option A, B, C mit Empfehlung
9. <h2>VII. Weiteres Vorgehen</h2>
10. Abschluss mit "Mit freundlichen Grüßen" und Kanzlei-Platzhalter

Generiere das komplette HTML-Gutachten. Es muss professionell, vollständig und druckfertig sein.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        { role: "user", content: userPrompt }
      ],
      system: systemPrompt,
    });

    const reportText = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ report: reportText });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Bericht-Generierung" },
      { status: 500 }
    );
  }
}
