import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseEvents } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const RESETTABLE_STEPS: Record<string, string[]> = {
  beratung: ["beratung", "markenname", "recherche", "analyse", "anmeldung", "kommunikation", "ueberwachung", "fristen"],
  markenname: ["markenname", "recherche", "analyse", "anmeldung", "kommunikation", "ueberwachung", "fristen"],
  recherche: ["recherche", "analyse", "anmeldung", "kommunikation", "ueberwachung", "fristen"],
};

function getStepsToReset(fromStep: string): string[] {
  return RESETTABLE_STEPS[fromStep] || [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId } = await params;
    const body = await request.json();
    const { fromStep } = body;

    if (!fromStep || !RESETTABLE_STEPS[fromStep]) {
      return NextResponse.json(
        { error: "Gültiger Step erforderlich (beratung, markenname oder recherche)" },
        { status: 400 }
      );
    }

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const stepsToReset = getStepsToReset(fromStep);

    const existingSteps = await db.query.caseSteps.findMany({
      where: and(
        eq(caseSteps.caseId, caseId),
        inArray(caseSteps.step, stepsToReset)
      ),
    });

    const previousStates = existingSteps.map(s => ({ step: s.step, status: s.status }));

    for (const step of existingSteps) {
      await db
        .update(caseSteps)
        .set({
          status: "pending",
          completedAt: null,
          skippedAt: null,
          skipReason: null,
          metadata: null,
        })
        .where(eq(caseSteps.id, step.id));
    }

    await db.insert(caseEvents).values({
      caseId,
      userId: session.user.id,
      eventType: "steps_reset",
      eventData: { 
        fromStep, 
        resetSteps: stepsToReset,
        previousStates,
      },
    });

    await db
      .update(trademarkCases)
      .set({ updatedAt: new Date() })
      .where(eq(trademarkCases.id, caseId));

    return NextResponse.json({
      success: true,
      resetSteps: stepsToReset,
      message: `Schritte ab "${fromStep}" wurden zurückgesetzt`,
    });
  } catch (error) {
    console.error("Error resetting steps:", error);
    return NextResponse.json({ error: "Fehler beim Zurücksetzen der Schritte" }, { status: 500 });
  }
}
