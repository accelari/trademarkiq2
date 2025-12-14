import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { NICE_CLASSES } from "@/lib/nice-classes";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

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

interface ConflictFromRecherche {
  id?: string;
  name: string;
  holder?: string;
  classes?: number[];
  niceClasses?: number[];
  office?: string;
  register?: string;
  similarity?: number;
  accuracy?: number;
  riskLevel?: string;
}

const EXPERT_SYSTEM_PROMPT = `Du bist Dr. Klaus Weinberg, ein führender deutscher Markenrechtsanwalt mit über 25 Jahren Erfahrung beim DPMA, EUIPO und in der Markenstreitvertretung.

Du bist bekannt für:
- Präzise rechtliche Analysen nach deutschem und EU-Markenrecht
- Praktische, umsetzbare Lösungsstrategien
- Erfolgreiche Verteidigung gegen Widerspruchsverfahren
- Kreative Namensmodifikationen, die Konflikte vermeiden

Deine Analyse basiert auf:
- § 9 MarkenG (Verwechslungsgefahr)
- § 14 MarkenG (Ausschließlichkeitsrecht)
- Art. 8 EUTMR (Relative Eintragungshindernisse)
- Aktuelle BGH- und EuGH-Rechtsprechung zur Markenähnlichkeit

Du antwortest immer auf Deutsch und gibst konkrete, handlungsorientierte Empfehlungen.`;

const OFFICE_NAMES: Record<string, string> = {
  "DE": "DPMA (Deutschland)",
  "EU": "EUIPO (EU)",
  "WO": "WIPO (International)",
  "US": "USPTO (USA)",
  "GB": "UKIPO (UK)",
  "CH": "IGE (Schweiz)",
  "AT": "ÖPA (Österreich)",
};

async function analyzeConflictWithExpert(
  trademarkName: string,
  targetClasses: number[],
  conflict: ConflictFromRecherche
): Promise<ExpertConflictAnalysis> {
  const conflictClasses = conflict.classes || conflict.niceClasses || [];
  const conflictOffice = conflict.office || conflict.register || "?";
  const similarity = conflict.similarity || conflict.accuracy || 0;

  const targetClassesText = targetClasses.map(k => {
    const klass = NICE_CLASSES.find(c => c.id === k);
    return klass ? `Klasse ${k}: ${klass.name}` : `Klasse ${k}`;
  }).join(", ");

  const conflictClassesText = conflictClasses.map(k => {
    const klass = NICE_CLASSES.find(c => c.id === k);
    return klass ? `Klasse ${k}: ${klass.name}` : `Klasse ${k}`;
  }).join(", ");

  const prompt = `Analysiere als erfahrener Markenanwalt diesen spezifischen Markenkonflikt:

ANGEMELDETE MARKE: "${trademarkName}"
Ziel-Nizza-Klassen: ${targetClassesText || "Nicht spezifiziert"}

KONFLIKTMARKE:
- Name: "${conflict.name}"
- Inhaber: ${conflict.holder || "Unbekannt"}
- Register: ${OFFICE_NAMES[conflictOffice] || conflictOffice}
- Klassen: ${conflictClassesText || "Nicht angegeben"}
- Berechnete Ähnlichkeit: ${similarity}%

Erstelle eine detaillierte Experten-Analyse. Antworte mit einem JSON-Objekt:

{
  "legalAssessment": "Ausführliche rechtliche Einschätzung (2-4 Sätze): Warum genau besteht hier ein Risiko? Welche Ähnlichkeitsdimensionen (phonetisch, visuell, konzeptuell) sind betroffen? Welche Rechtsprechung ist relevant?",
  
  "oppositionRisk": 0-100,
  
  "consequences": "Was passiert konkret bei einer Kollision? (Widerspruch, Abmahnung, Unterlassungsanspruch, Schadensersatz etc.)",
  
  "solutions": [
    {
      "type": "name_modification",
      "title": "Namensmodifikation",
      "description": "Konkrete Beschreibung der Änderung",
      "suggestedValue": "Neuer Markenname (z.B. 'TekFlow' statt 'TechFlow')",
      "successProbability": 0-100,
      "effort": "low" | "medium" | "high",
      "reasoning": "Warum funktioniert diese Lösung? Welche Verwechslungsgefahr wird vermieden?"
    },
    {
      "type": "class_change",
      "title": "Klassenausweichung",
      "description": "Registrierung in nicht-kollidierenden Klassen",
      "suggestedValue": "Klassen X, Y, Z statt ursprünglicher Klassen",
      "successProbability": 0-100,
      "effort": "low" | "medium" | "high",
      "reasoning": "Welche Klassen sind konfliktfrei und warum?"
    },
    {
      "type": "mark_type",
      "title": "Markenart-Wechsel",
      "description": "Wechsel von Wortmarke zu Wort-/Bildmarke",
      "suggestedValue": "Wort-/Bildmarke mit charakteristischem Logo-Element",
      "successProbability": 0-100,
      "effort": "medium",
      "reasoning": "Wie erhöht ein grafisches Element die Unterscheidungskraft?"
    },
    {
      "type": "geographic",
      "title": "Geografische Strategie",
      "description": "Schrittweise regionale Anmeldung",
      "suggestedValue": "Erst DE, dann EU (oder umgekehrt)",
      "successProbability": 0-100,
      "effort": "low" | "medium" | "high",
      "reasoning": "Welche geografische Strategie minimiert das Risiko?"
    },
    {
      "type": "coexistence",
      "title": "Koexistenz-Vereinbarung",
      "description": "Vertragliche Regelung mit dem Markeninhaber",
      "suggestedValue": "Koexistenzvereinbarung mit Nutzungsabgrenzung",
      "successProbability": 0-100,
      "effort": "high",
      "reasoning": "Unter welchen Umständen wäre eine Koexistenz möglich?"
    }
  ]
}

Generiere 3-5 realistische Lösungen. Nicht alle Typen müssen verwendet werden - wähle die relevantesten für diesen spezifischen Konflikt.

Für die Erfolgswahrscheinlichkeit berücksichtige:
- Stärke der Konfliktmarke (bekannte Marke = niedrigere Erfolgswahrscheinlichkeit)
- Grad der Ähnlichkeit
- Überschneidung der Waren/Dienstleistungen
- Praktikabilität der Lösung

Antworte NUR mit dem JSON, keine zusätzlichen Erklärungen.`;

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 4000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Keine JSON-Antwort");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const solutions: Solution[] = (parsed.solutions || []).map((s: any) => ({
      type: s.type || "name_modification",
      title: String(s.title || ""),
      description: String(s.description || ""),
      suggestedValue: String(s.suggestedValue || ""),
      successProbability: typeof s.successProbability === "number" ? s.successProbability : 50,
      effort: ["low", "medium", "high"].includes(s.effort) ? s.effort : "medium",
      reasoning: String(s.reasoning || ""),
    }));

    return {
      conflictId: conflict.id || `conflict-${Date.now()}`,
      conflictName: conflict.name,
      conflictHolder: conflict.holder || "Unbekannt",
      conflictClasses,
      conflictOffice,
      similarity,
      legalAssessment: String(parsed.legalAssessment || "Analyse nicht verfügbar"),
      oppositionRisk: typeof parsed.oppositionRisk === "number" ? parsed.oppositionRisk : 50,
      consequences: String(parsed.consequences || "Mögliche rechtliche Konsequenzen"),
      solutions,
    };
  } catch (e) {
    console.error("Parse error for conflict analysis:", e);
    return {
      conflictId: conflict.id || `conflict-${Date.now()}`,
      conflictName: conflict.name,
      conflictHolder: conflict.holder || "Unbekannt",
      conflictClasses,
      conflictOffice,
      similarity,
      legalAssessment: "Analyse konnte nicht erstellt werden.",
      oppositionRisk: similarity > 70 ? 70 : similarity > 50 ? 50 : 30,
      consequences: "Bei hoher Ähnlichkeit drohen Widerspruch und Unterlassungsansprüche.",
      solutions: [],
    };
  }
}

async function generateOverallSummary(
  trademarkName: string,
  conflictAnalyses: ExpertConflictAnalysis[]
): Promise<{ overallRisk: "high" | "medium" | "low"; summary: string; bestSolution: Solution | null }> {
  const conflictsText = conflictAnalyses.map((c, i) => 
    `${i + 1}. "${c.conflictName}" - Widerspruchsrisiko: ${c.oppositionRisk}%, ${c.solutions.length} Lösungen`
  ).join("\n");

  const allSolutions = conflictAnalyses.flatMap(c => c.solutions);
  const solutionsText = allSolutions.map(s => 
    `- ${s.title}: ${s.suggestedValue} (${s.successProbability}% Erfolg, Aufwand: ${s.effort})`
  ).join("\n");

  const prompt = `Als Markenrechtsexperte, erstelle eine Gesamtbewertung für die Marke "${trademarkName}":

ANALYSIERTE KONFLIKTE:
${conflictsText}

VORGESCHLAGENE LÖSUNGEN:
${solutionsText}

Antworte mit einem JSON-Objekt:
{
  "overallRisk": "high" | "medium" | "low",
  "summary": "Zusammenfassung in 3-4 Sätzen: Gesamtrisiko, wichtigste Bedrohungen, empfohlene Strategie",
  "bestSolution": {
    "type": "name_modification" | "class_change" | "mark_type" | "geographic" | "coexistence",
    "title": "Titel der besten Gesamtlösung",
    "description": "Beschreibung",
    "suggestedValue": "Konkreter Vorschlag",
    "successProbability": 0-100,
    "effort": "low" | "medium" | "high",
    "reasoning": "Warum ist dies die beste Gesamtstrategie?"
  }
}

Wähle die beste Lösung basierend auf dem Verhältnis von Erfolgswahrscheinlichkeit zu Aufwand.
Antworte NUR mit dem JSON.`;

  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 2000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unerwarteter Antworttyp");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Keine JSON-Antwort");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    let bestSolution: Solution | null = null;
    if (parsed.bestSolution) {
      bestSolution = {
        type: parsed.bestSolution.type || "name_modification",
        title: String(parsed.bestSolution.title || ""),
        description: String(parsed.bestSolution.description || ""),
        suggestedValue: String(parsed.bestSolution.suggestedValue || ""),
        successProbability: typeof parsed.bestSolution.successProbability === "number" 
          ? parsed.bestSolution.successProbability : 50,
        effort: ["low", "medium", "high"].includes(parsed.bestSolution.effort) 
          ? parsed.bestSolution.effort : "medium",
        reasoning: String(parsed.bestSolution.reasoning || ""),
      };
    }

    return {
      overallRisk: ["high", "medium", "low"].includes(parsed.overallRisk) 
        ? parsed.overallRisk : "medium",
      summary: String(parsed.summary || "Zusammenfassung nicht verfügbar"),
      bestSolution,
    };
  } catch (e) {
    console.error("Parse error for summary:", e);
    const avgRisk = conflictAnalyses.reduce((sum, c) => sum + c.oppositionRisk, 0) / conflictAnalyses.length;
    return {
      overallRisk: avgRisk > 70 ? "high" : avgRisk > 40 ? "medium" : "low",
      summary: `${conflictAnalyses.length} Konflikte wurden analysiert. Durchschnittliches Widerspruchsrisiko: ${Math.round(avgRisk)}%.`,
      bestSolution: allSolutions.length > 0 
        ? allSolutions.sort((a, b) => b.successProbability - a.successProbability)[0] 
        : null,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { caseId } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId ist erforderlich" }, { status: 400 });
    }

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
      with: {
        steps: true,
        decisions: true,
      },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const rechercheStep = existingCase.steps?.find(s => s.step === "recherche");
    
    if (!rechercheStep) {
      return NextResponse.json({ 
        error: "Recherche-Schritt nicht gefunden. Bitte führen Sie zuerst eine Recherche durch." 
      }, { status: 400 });
    }

    const metadata = rechercheStep.metadata as Record<string, any> | null;
    const conflicts: ConflictFromRecherche[] = metadata?.conflicts || [];

    if (conflicts.length === 0) {
      return NextResponse.json({
        success: true,
        trademarkName: existingCase.trademarkName || "Unbekannt",
        overallRisk: "low",
        conflictAnalyses: [],
        bestOverallSolution: null,
        summary: "Keine Konflikte gefunden. Die Marke scheint frei von relevanten Kollisionen zu sein.",
      } as ExpertAnalysisResponse);
    }

    const decision = existingCase.decisions?.[0];
    const targetClasses: number[] = decision?.niceClasses || [];
    const trademarkName = existingCase.trademarkName || decision?.trademarkNames?.[0] || "Unbekannt";

    const topConflicts = conflicts
      .sort((a, b) => (b.similarity || b.accuracy || 0) - (a.similarity || a.accuracy || 0))
      .slice(0, 10);

    const conflictAnalyses: ExpertConflictAnalysis[] = [];
    
    for (const conflict of topConflicts) {
      try {
        const analysis = await analyzeConflictWithExpert(trademarkName, targetClasses, conflict);
        conflictAnalyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing conflict ${conflict.name}:`, error);
      }
    }

    if (conflictAnalyses.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Keine Konflikte konnten analysiert werden.",
      }, { status: 500 });
    }

    const { overallRisk, summary, bestSolution } = await generateOverallSummary(
      trademarkName,
      conflictAnalyses
    );

    const response: ExpertAnalysisResponse = {
      success: true,
      trademarkName,
      overallRisk,
      conflictAnalyses,
      bestOverallSolution: bestSolution,
      summary,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Expert Risk Analysis Error:", error);
    return NextResponse.json({
      success: false,
      error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    }, { status: 500 });
  }
}
