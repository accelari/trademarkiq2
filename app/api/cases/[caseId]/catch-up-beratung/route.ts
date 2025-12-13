import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseSteps, trademarkCases, consultations, caseEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
    const { consultationId, summary, extractedData } = body;

    const caseRecord = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    if (consultationId) {
      await db
        .update(consultations)
        .set({
          caseId: caseId,
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, consultationId));
    }

    const existingStep = await db.query.caseSteps.findFirst({
      where: and(
        eq(caseSteps.caseId, caseId),
        eq(caseSteps.step, "beratung")
      ),
    });

    const previousStatus = existingStep?.status || "skipped";

    await db
      .update(caseSteps)
      .set({
        status: "completed",
        completedAt: new Date(),
        startedAt: existingStep?.startedAt || new Date(),
        skippedAt: null,
        skipReason: null,
        metadata: {
          ...((existingStep?.metadata as Record<string, unknown>) || {}),
          catchUpCompleted: true,
          catchUpCompletedAt: new Date().toISOString(),
          consultationId,
          extractedData,
        },
      })
      .where(
        and(
          eq(caseSteps.caseId, caseId),
          eq(caseSteps.step, "beratung")
        )
      );

    // Update the case with the trademark name from the catch-up consultation
    if (extractedData?.trademarkName) {
      await db
        .update(trademarkCases)
        .set({
          trademarkName: extractedData.trademarkName,
          updatedAt: new Date(),
        })
        .where(eq(trademarkCases.id, caseId));
    }

    await db.insert(caseEvents).values({
      caseId,
      userId: session.user.id,
      eventType: "beratung_catch_up_completed",
      eventData: {
        step: "beratung",
        status: "completed",
        previousStatus,
        consultationId,
        catchUpCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Beratung erfolgreich nachgeholt",
      caseNumber: caseRecord.caseNumber,
    });
  } catch (error) {
    console.error("Error completing catch-up beratung:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}
