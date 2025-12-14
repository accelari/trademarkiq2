import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface Solution {
  type: "name_modification" | "class_change" | "mark_type" | "geographic" | "coexistence";
  title: string;
  description: string;
  suggestedValue: string;
  successProbability: number;
  effort: "low" | "medium" | "high";
  reasoning: string;
}

interface ExpertConflictAnalysis {
  conflictId: string;
  conflictName: string;
  conflictHolder: string;
  conflictClasses: number[];
  conflictOffice: string;
  similarity: number;
  legalAssessment: string;
  oppositionRisk: number;
  consequences: string;
  solutions: Solution[];
}

interface ExpertAnalysisResponse {
  success: boolean;
  trademarkName: string;
  overallRisk: "high" | "medium" | "low";
  conflictAnalyses: ExpertConflictAnalysis[];
  bestOverallSolution: Solution | null;
  summary: string;
}

const OFFICE_NAMES: Record<string, string> = {
  "DE": "DPMA (Deutschland)",
  "EU": "EUIPO (EU)",
  "WO": "WIPO (International)",
  "US": "USPTO (USA)",
  "GB": "UKIPO (UK)",
  "CH": "IGE (Schweiz)",
  "AT": "ÖPA (Österreich)",
};

const RISK_LABELS: Record<string, string> = {
  "high": "HOCH",
  "medium": "MITTEL",
  "low": "NIEDRIG",
};

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForFilename(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function calculateOverallRiskScore(conflictAnalyses: ExpertConflictAnalysis[]): number {
  if (conflictAnalyses.length === 0) return 0;
  const avgRisk = conflictAnalyses.reduce((sum, c) => sum + c.oppositionRisk, 0) / conflictAnalyses.length;
  return Math.round(avgRisk);
}

function generateReport(analysisData: ExpertAnalysisResponse): string {
  const riskScore = calculateOverallRiskScore(analysisData.conflictAnalyses);
  const riskLabel = RISK_LABELS[analysisData.overallRisk] || analysisData.overallRisk.toUpperCase();
  
  let report = `═══════════════════════════════════════════════════════════════
                    MARKENRECHTS-EXPERTENBERICHT
                          Dr. Klaus Weinberg
                   Spezialist für deutsches Markenrecht
═══════════════════════════════════════════════════════════════

MARKE: ${analysisData.trademarkName}
DATUM: ${formatDate()}
GESAMTRISIKO: ${riskLabel} (${riskScore}%)

`;

  if (analysisData.conflictAnalyses.length > 0) {
    report += `───────────────────────────────────────────────────────────────
                       KONFLIKTANALYSE
───────────────────────────────────────────────────────────────

`;

    analysisData.conflictAnalyses.forEach((conflict, index) => {
      const officeName = OFFICE_NAMES[conflict.conflictOffice] || conflict.conflictOffice;
      
      report += `Konflikt ${index + 1}: ${conflict.conflictName}
├── Inhaber: ${conflict.conflictHolder}
├── Register: ${officeName}
├── Klassen: ${conflict.conflictClasses.length > 0 ? conflict.conflictClasses.join(", ") : "Nicht angegeben"}
├── Ähnlichkeit: ${conflict.similarity}%
├── Widerspruchsrisiko: ${conflict.oppositionRisk}%
│
├── Rechtliche Einschätzung:
│   ${conflict.legalAssessment.split("\n").join("\n│   ")}
│
├── Konsequenzen:
│   ${conflict.consequences.split("\n").join("\n│   ")}
│
`;

      if (conflict.solutions.length > 0) {
        report += `└── Lösungsvorschläge:
`;
        conflict.solutions.forEach((solution, sIdx) => {
          const effortLabel = solution.effort === "low" ? "Gering" : solution.effort === "medium" ? "Mittel" : "Hoch";
          report += `    ${sIdx + 1}. ${solution.title}
       ${solution.suggestedValue}
       Erfolgswahrscheinlichkeit: ${solution.successProbability}% | Aufwand: ${effortLabel}
`;
        });
      } else {
        report += `└── Keine Lösungsvorschläge verfügbar
`;
      }

      report += `
`;
    });
  } else {
    report += `───────────────────────────────────────────────────────────────
                       KONFLIKTANALYSE
───────────────────────────────────────────────────────────────

Keine Konflikte gefunden. Die Marke scheint frei von relevanten 
Kollisionen zu sein.

`;
  }

  report += `───────────────────────────────────────────────────────────────
                         EMPFEHLUNG
───────────────────────────────────────────────────────────────

${analysisData.summary}

`;

  if (analysisData.bestOverallSolution) {
    const best = analysisData.bestOverallSolution;
    const effortLabel = best.effort === "low" ? "Gering" : best.effort === "medium" ? "Mittel" : "Hoch";
    report += `BESTE GESAMTLÖSUNG: ${best.title}
${best.description}
Vorschlag: ${best.suggestedValue}
Erfolgswahrscheinlichkeit: ${best.successProbability}% | Aufwand: ${effortLabel}
Begründung: ${best.reasoning}

`;
  }

  report += `═══════════════════════════════════════════════════════════════
                    Erstellt von TrademarkIQ | ACCELARI
═══════════════════════════════════════════════════════════════
`;

  return report;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { analysisData } = body as { caseId?: string; analysisData: ExpertAnalysisResponse };

    if (!analysisData) {
      return NextResponse.json({ error: "analysisData ist erforderlich" }, { status: 400 });
    }

    if (!analysisData.trademarkName) {
      return NextResponse.json({ error: "Markenname fehlt in den Analysedaten" }, { status: 400 });
    }

    const report = generateReport(analysisData);
    const filename = `Markenrechts-Expertenbericht_${formatDateForFilename()}.txt`;

    return new NextResponse(report, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Export Error:", error);
    return NextResponse.json({
      error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    }, { status: 500 });
  }
}
