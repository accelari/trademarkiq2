import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { anthropicClient } from "@/lib/anthropic";
import { NICE_CLASSES } from "@/lib/nice-classes";
import { getTMSearchClient } from "@/lib/tmsearch/client";

function createConcurrencyLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  
  return async function<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        running++;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          running--;
          if (queue.length > 0) {
            queue.shift()!();
          }
        }
      };
      
      if (running < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

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

interface ConflictFromRecherche {
  id?: string;
  mid?: number | string;
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

  const response = await anthropicClient.messages.create({
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

  const response = await anthropicClient.messages.create({
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

async function handleStreamRequest(caseId: string, userId: string): Promise<Response> {
  const existingCase = await db.query.trademarkCases.findFirst({
    where: and(
      or(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.caseNumber, caseId)
      ),
      eq(trademarkCases.userId, userId)
    ),
    with: {
      steps: true,
      decisions: true,
    },
  });

  if (!existingCase) {
    return new Response(JSON.stringify({ error: "Fall nicht gefunden" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rechercheStep = existingCase.steps?.find(s => s.step === "recherche");
  
  if (!rechercheStep) {
    return new Response(JSON.stringify({ 
      error: "Recherche-Schritt nicht gefunden. Bitte führen Sie zuerst eine Recherche durch." 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metadata = rechercheStep.metadata as Record<string, any> | null;
  let conflicts: ConflictFromRecherche[] = metadata?.conflicts || [];

  const conflictsNeedingHolder = conflicts.filter(c => c.mid && (!c.holder || c.holder === "" || c.holder === "Unbekannt"));
  if (conflictsNeedingHolder.length > 0) {
    try {
      const tmsearchClient = getTMSearchClient();
      const holderPromises = conflictsNeedingHolder.map(async (conflict) => {
        try {
          const midNum = typeof conflict.mid === "string" ? parseInt(conflict.mid, 10) : conflict.mid!;
          const info = await tmsearchClient.getInfo({ mid: midNum });
          const ownerName = (info as any)?.owner?.name || null;
          return { mid: String(conflict.mid), holder: ownerName };
        } catch {
          return { mid: String(conflict.mid), holder: null };
        }
      });
      
      const holderResults = await Promise.all(holderPromises);
      const holderMap = new Map(holderResults.map(h => [h.mid, h.holder]));
      
      conflicts = conflicts.map(c => {
        if (c.mid && holderMap.has(String(c.mid))) {
          const holder = holderMap.get(String(c.mid));
          if (holder) {
            return { ...c, holder };
          }
        }
        return c;
      });
    } catch (e) {
      console.error("Error fetching holder info:", e);
    }
  }

  const decision = existingCase.decisions?.[0];
  const targetClasses: number[] = decision?.niceClasses || [];
  const trademarkName = existingCase.trademarkName || decision?.trademarkNames?.[0] || "Unbekannt";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent({ type: "status", message: "Analyse wird gestartet..." });

        if (conflicts.length === 0) {
          sendEvent({ 
            type: "summary", 
            data: {
              trademarkName,
              overallRisk: "low",
              conflictAnalyses: [],
              bestOverallSolution: null,
              summary: "Keine Konflikte gefunden. Die Marke scheint frei von relevanten Kollisionen zu sein.",
            }
          });
          sendEvent({ type: "done" });
          controller.close();
          return;
        }

        const topConflicts = conflicts
          .sort((a, b) => (b.similarity || b.accuracy || 0) - (a.similarity || a.accuracy || 0))
          .slice(0, 5);

        const total = topConflicts.length;
        const limit = createConcurrencyLimiter(2);
        let completed = 0;
        let firstConflictSent = false;

        const analysisPromises = topConflicts.map((conflict, index) => 
          limit(async () => {
            try {
              const analysis = await analyzeConflictWithExpert(trademarkName, targetClasses, conflict);
              completed++;
              
              sendEvent({ type: "progress", current: completed, total });
              
              sendEvent({ type: "conflict_ready", index, data: analysis });
              
              if (!firstConflictSent) {
                firstConflictSent = true;
                sendEvent({ 
                  type: "voice_bootstrap", 
                  data: {
                    trademarkName,
                    firstConflict: analysis,
                    totalConflicts: total
                  }
                });
              }
              
              return analysis;
            } catch (error) {
              console.error(`Error analyzing conflict ${conflict.name}:`, error);
              completed++;
              sendEvent({ type: "progress", current: completed, total });
              return null;
            }
          })
        );

        const results = await Promise.all(analysisPromises);
        const conflictAnalyses = results.filter((r): r is ExpertConflictAnalysis => r !== null);

        if (conflictAnalyses.length === 0) {
          sendEvent({ 
            type: "error", 
            message: "Keine Konflikte konnten analysiert werden." 
          });
          sendEvent({ type: "done" });
          controller.close();
          return;
        }

        sendEvent({ type: "status", message: "Erstelle Gesamtzusammenfassung..." });

        const { overallRisk, summary, bestSolution } = await generateOverallSummary(
          trademarkName,
          conflictAnalyses
        );

        sendEvent({ 
          type: "summary", 
          data: {
            trademarkName,
            overallRisk,
            conflictAnalyses,
            bestOverallSolution: bestSolution,
            summary,
          }
        });

        sendEvent({ type: "done" });
        controller.close();
      } catch (error: any) {
        console.error("Stream error:", error);
        sendEvent({ type: "error", message: error.message || "Ein Fehler ist aufgetreten." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId");

  if (!caseId) {
    return new Response(JSON.stringify({ error: "caseId ist erforderlich" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return handleStreamRequest(caseId, session.user.id);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { caseId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ungültige Anfrage" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { caseId } = body;

  if (!caseId) {
    return new Response(JSON.stringify({ error: "caseId ist erforderlich" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return handleStreamRequest(caseId, session.user.id);
}
