import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";

interface Conflict {
  name: string;
  holder?: string;
  office?: string;
  classes?: number[];
  similarity?: number;
}

interface GenerateNameRequest {
  originalName: string;
  conflicts: Conflict[];
  niceClasses: number[];
  targetOffices: string[];
  existingShortlist?: string[];
}

const TRADEMARK_NAME_GENERATION_PROMPT = `Du bist Dr. Klaus Weinberg, ein führender deutscher Markenrechtsanwalt mit über 40 Jahren Berufserfahrung bei DPMA, EUIPO und WIPO.

Du bist Experte für die Entwicklung von Markennamen, die:
1. UNTERSCHEIDUNGSKRAFT haben - nicht beschreibend für die Waren/Dienstleistungen
2. NICHT BESCHREIBEND sind - keine Angabe über Art, Beschaffenheit, Menge etc.
3. NICHT FREIHALTEBEDÜRFTIG sind - keine allgemein gebräuchlichen Begriffe
4. PHONETISCH UNTERSCHIEDLICH zu Konfliktmarken sind - andere Silbenstruktur, Betonung, Klangbild
5. VISUELL UNTERSCHIEDLICH zu Konfliktmarken sind - andere Buchstabenfolge, Länge, Schriftbild
6. KONZEPTUELL UNTERSCHIEDLICH sind - andere semantische Bedeutung oder Assoziationen

RECHTSGRUNDLAGEN NACH ZIELAMT:
- DE/DPMA: § 8 MarkenG (Unterscheidungskraft, absolute Schutzhindernisse), § 9 MarkenG (Verwechslungsgefahr mit älteren Marken)
- EU/EUIPO: Art. 7 EUTMR (absolute Eintragungshindernisse), Art. 8 EUTMR (relative Eintragungshindernisse/Widerspruchsgründe)
- US/USPTO: Lanham Act Section 2(d) – Likelihood of Confusion (Verwechslungsgefahr)
- WO/WIPO: Prüfung erfolgt durch die designierten nationalen Ämter nach deren jeweiligem Recht
- CH/IGE: Schweizer Markenschutzgesetz (MSchG), Art. 2 (absolute Ausschlussgründe), Art. 3 (relative Ausschlussgründe)
- AT/ÖPA: Österreichisches Markenschutzgesetz (MSchG), § 4 (absolute Schutzhindernisse), § 10 (Verwechslungsgefahr)
- GB/UKIPO: UK Trade Marks Act 1994, Section 3 (absolute grounds), Section 5 (relative grounds)

DEINE AUFGABE:
Analysiere die Konfliktmarken und entwickle einen neuen Markennamen, der:
- Die Essenz des Originalnamens bewahrt (Branchenbezug, Positionierung)
- Maximale phonetische/visuelle Distanz zu den Konfliktmarken hat
- Vom Amt nicht als beschreibend oder verwechselbar abgelehnt wird
- Rechtlich besser durchsetzbar ist

WICHTIG: Nenne in deiner Begründung die relevanten Gesetzesreferenzen für die angegebenen Zielämter.

Antworte IMMER im folgenden JSON-Format:
{
  "suggestedName": "NEUER_NAME",
  "reasoning": "Kurze Begründung (max 2 Sätze) mit Verweis auf relevante Rechtsgrundlagen der Zielämter",
  "phoneticAnalysis": "Wie unterscheidet sich der Klang vom Original und den Konflikten",
  "distinctiveness": "Warum hat dieser Name Unterscheidungskraft gemäß den anwendbaren Vorschriften",
  "riskReduction": "Prozentuale Einschätzung der Risikoreduzierung (z.B. '70% geringeres Konfliktrisiko')"
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body: GenerateNameRequest = await request.json();
    const { originalName, conflicts, niceClasses, targetOffices, existingShortlist = [] } = body;

    if (!originalName) {
      return NextResponse.json({ error: "Markenname erforderlich" }, { status: 400 });
    }

    const conflictSummary = conflicts.slice(0, 10).map(c => 
      `- "${c.name}" (${c.holder || "Unbekannt"}, ${c.office || "Unbekannt"}, Ähnlichkeit: ${c.similarity || 0}%)`
    ).join("\n");

    const niceClassesList = niceClasses.length > 0 
      ? niceClasses.join(", ") 
      : "Nicht spezifiziert";

    const officesList = targetOffices.length > 0 
      ? targetOffices.join(", ") 
      : "DPMA";

    const existingNames = existingShortlist.length > 0
      ? `\n\nBEREITS VORGESCHLAGENE NAMEN (NICHT WIEDERHOLEN):\n${existingShortlist.join(", ")}`
      : "";

    const getLegalReferences = (offices: string[]) => {
      const refs: string[] = [];
      if (offices.includes("DE")) refs.push("DE: § 8 und § 9 MarkenG");
      if (offices.includes("EU")) refs.push("EU: Art. 7 und Art. 8 EUTMR");
      if (offices.includes("US")) refs.push("US: Lanham Act Section 2(d)");
      if (offices.includes("WO")) refs.push("WO: Prüfung nach nationalem Recht der designierten Länder");
      if (offices.includes("CH")) refs.push("CH: Art. 2 und Art. 3 MSchG (Schweiz)");
      if (offices.includes("AT")) refs.push("AT: § 4 und § 10 MSchG (Österreich)");
      if (offices.includes("GB")) refs.push("GB: UK Trade Marks Act 1994, Section 3 und 5");
      return refs.length > 0 ? refs.join("; ") : "DE: § 8 und § 9 MarkenG";
    };

    const legalRefs = getLegalReferences(targetOffices);

    const userPrompt = `ORIGINALMARKE: "${originalName}"

ZIELÄMTER: ${officesList}
ANWENDBARE RECHTSGRUNDLAGEN: ${legalRefs}
NIZZA-KLASSEN: ${niceClassesList}

GEFUNDENE KONFLIKTE (${conflicts.length} Treffer):
${conflictSummary || "Keine Konflikte gefunden"}
${existingNames}

Entwickle einen neuen Markennamen, der sich deutlich von den Konfliktmarken unterscheidet und bei den genannten Ämtern (${officesList}) nicht an Unterscheidungskraft scheitert.

Beziehe dich in deiner Begründung auf die relevanten Gesetzesvorschriften der Zielämter.

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`;

    const response = await anthropicClient.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ],
      system: TRADEMARK_NAME_GENERATION_PROMPT
    });

    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort von Claude" }, { status: 500 });
    }

    let parsed;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Kein JSON gefunden");
      }
    } catch {
      return NextResponse.json({ 
        suggestedName: originalName + "Nova",
        reasoning: "Fallback-Vorschlag: 'Nova' suggeriert Neuheit und ist phonetisch distinkt.",
        phoneticAnalysis: "Nova hat andere Vokale und Betonung als typische Konfliktmarken.",
        distinctiveness: "Fantasiebegriff mit hoher Unterscheidungskraft.",
        riskReduction: "Geschätzte 40% Risikoreduzierung"
      });
    }

    return NextResponse.json({
      suggestedName: parsed.suggestedName || originalName + "X",
      reasoning: parsed.reasoning || "KI-generierter Vorschlag",
      phoneticAnalysis: parsed.phoneticAnalysis || "",
      distinctiveness: parsed.distinctiveness || "",
      riskReduction: parsed.riskReduction || "Unbekannt"
    });

  } catch (error) {
    console.error("Fehler bei Namensgenerierung:", error);
    return NextResponse.json(
      { error: "Fehler bei der Namensgenerierung" },
      { status: 500 }
    );
  }
}
