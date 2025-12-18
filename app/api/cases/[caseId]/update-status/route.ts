import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseSteps, trademarkCases, consultations, caseEvents } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

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
    const { step, status, metadata } = body;

    // Support both UUID (id) and caseNumber (TM-YYYYMMDD-XXXXXX)
    const caseRecord = await db.query.trademarkCases.findFirst({
      where: and(
        or(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.caseNumber, caseId)
        ),
        eq(trademarkCases.userId, session.user.id)
      ),
      with: {
        consultations: true,
      }
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingStep = await db.query.caseSteps.findFirst({
      where: and(
        eq(caseSteps.caseId, caseRecord.id),
        eq(caseSteps.step, step)
      ),
    });

    const previousStatus = existingStep?.status || "pending";

    const [updatedStep] = await db
      .update(caseSteps)
      .set({
        status: status === "completed" ? "completed" : "in_progress",
        completedAt: status === "completed" ? new Date() : null,
        startedAt: existingStep?.startedAt || new Date(),
        skippedAt: null,
        skipReason: null,
        metadata: metadata || {},
      })
      .where(
        and(
          eq(caseSteps.caseId, caseRecord.id),
          eq(caseSteps.step, step)
        )
      )
      .returning();

    await db.insert(caseEvents).values({
      caseId: caseRecord.id,
      userId: session.user.id,
      eventType: "step_status_changed",
      eventData: { 
        step, 
        status: status === "completed" ? "completed" : "in_progress",
        previousStatus,
        metadata: metadata || {},
      },
    });

    if (step === "recherche" && status === "completed") {
      const consultation = await db.query.consultations.findFirst({
        where: eq(consultations.caseId, caseRecord.id),
      });

      if (consultation) {
        await db
          .update(consultations)
          .set({
            status: "research_completed",
            updatedAt: new Date(),
          })
          .where(eq(consultations.id, consultation.id));
      }
    }

    return NextResponse.json({
      success: true,
      step: updatedStep,
    });
  } catch (error) {
    console.error("Error updating case status:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}
