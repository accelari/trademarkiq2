import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseDecisions, caseAnalyses, consultations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId } = await params;

    let trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!trademarkCase) {
      trademarkCase = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    }

    if (!trademarkCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const [consultation, latestDecision, analysis, steps] = await Promise.all([
      db.query.consultations.findFirst({
        where: eq(consultations.caseId, trademarkCase.id),
        orderBy: [desc(consultations.createdAt)],
      }),
      db.query.caseDecisions.findFirst({
        where: eq(caseDecisions.caseId, trademarkCase.id),
        orderBy: [desc(caseDecisions.extractedAt)],
      }),
      db.query.caseAnalyses.findFirst({
        where: eq(caseAnalyses.caseId, trademarkCase.id),
        orderBy: [desc(caseAnalyses.createdAt)],
      }),
      db.select().from(caseSteps).where(eq(caseSteps.caseId, trademarkCase.id)),
    ]);

    const stepMap: Record<string, { status: string; completedAt: Date | null; skippedAt: Date | null }> = {};
    for (const step of steps) {
      stepMap[step.step] = {
        status: step.status || "pending",
        completedAt: step.completedAt,
        skippedAt: step.skippedAt,
      };
    }

    const defaultStep = { status: "pending", completedAt: null, skippedAt: null };

    return NextResponse.json({
      case: {
        id: trademarkCase.id,
        caseNumber: trademarkCase.caseNumber,
        trademarkName: trademarkCase.trademarkName,
        status: trademarkCase.status,
        createdAt: trademarkCase.createdAt,
        updatedAt: trademarkCase.updatedAt,
      },
      consultation: consultation ? {
        id: consultation.id,
        title: consultation.title,
        summary: consultation.summary,
        duration: consultation.duration,
        mode: consultation.mode,
        createdAt: consultation.createdAt,
        messages: consultation.transcript ? (() => {
          try {
            return JSON.parse(consultation.transcript);
          } catch {
            return [];
          }
        })() : [],
      } : null,
      decisions: latestDecision ? {
        trademarkNames: latestDecision.trademarkNames,
        countries: latestDecision.countries,
        niceClasses: latestDecision.niceClasses,
        completenessScore: latestDecision.completenessScore,
      } : null,
      analysis: analysis ? {
        searchQuery: analysis.searchQuery,
        conflicts: analysis.conflicts,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        aiAnalysis: analysis.aiAnalysis,
        alternativeNames: analysis.alternativeNames,
        searchTermsUsed: analysis.searchTermsUsed,
      } : null,
      steps: {
        beratung: stepMap["beratung"] || defaultStep,
        markenname: stepMap["markenname"] || defaultStep,
        recherche: stepMap["recherche"] || defaultStep,
        analyse: stepMap["analyse"] || defaultStep,
        ueberpruefung: stepMap["ueberpruefung"] || defaultStep,
        anmeldung: stepMap["anmeldung"] || defaultStep,
        kommunikation: stepMap["kommunikation"] || defaultStep,
        ueberwachung: stepMap["ueberwachung"] || defaultStep,
        fristen: stepMap["fristen"] || defaultStep,
      },
    });
  } catch (error) {
    console.error("Error fetching full case data:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Falldaten" },
      { status: 500 }
    );
  }
}
