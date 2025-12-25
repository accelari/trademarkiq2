import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseEvents } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function PATCH(
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
    const { step, status, trademarkName, metadata } = body;

    if (!step || !status) {
      return NextResponse.json(
        { error: "Step und Status erforderlich" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "in_progress", "completed", "skipped"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    if (metadata !== undefined && (metadata === null || typeof metadata !== "object" || Array.isArray(metadata))) {
      return NextResponse.json({ error: "Ungültige Metadata" }, { status: 400 });
    }

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        or(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.caseNumber, caseId)
        ),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingStep = await db.query.caseSteps.findFirst({
      where: and(
        eq(caseSteps.caseId, existingCase.id),
        eq(caseSteps.step, step)
      ),
    });

    const now = new Date();
    const previousStatus = existingStep?.status || "pending";

    let updatedStep;

    if (!existingStep) {
      [updatedStep] = await db
        .insert(caseSteps)
        .values({
          caseId: existingCase.id,
          step,
          status,
          startedAt: status === "in_progress" || status === "completed" ? now : null,
          completedAt: status === "completed" ? now : null,
          skippedAt: status === "skipped" ? now : null,
          skipReason: null,
          metadata: (metadata || {}) as Record<string, any>,
        })
        .returning();
    } else {
      const updateData: Record<string, any> = { status };

      if (metadata !== undefined) {
        updateData.metadata = metadata;
      }

      if (status === "in_progress") {
        updateData.startedAt = existingStep.startedAt || now;
        updateData.completedAt = null;
      }

      if (status === "completed") {
        updateData.startedAt = existingStep.startedAt || now;
        updateData.completedAt = now;
      }

      if (status === "skipped") {
        updateData.startedAt = existingStep.startedAt || now;
        updateData.skippedAt = now;
        updateData.skipReason = null;
      } else {
        updateData.skippedAt = null;
        updateData.skipReason = null;
      }

      [updatedStep] = await db
        .update(caseSteps)
        .set(updateData)
        .where(eq(caseSteps.id, existingStep.id))
        .returning();
    }

    await db.insert(caseEvents).values({
      caseId: existingCase.id,
      userId: session.user.id,
      eventType: "step_status_changed",
      eventData: { step, status, previousStatus },
    });

    const caseUpdateData: Record<string, any> = { updatedAt: new Date() };
    if (trademarkName) {
      caseUpdateData.trademarkName = trademarkName;
    }
    await db
      .update(trademarkCases)
      .set(caseUpdateData)
      .where(eq(trademarkCases.id, existingCase.id));

    return NextResponse.json({
      success: true,
      step: updatedStep,
    });
  } catch (error) {
    console.error("Error updating step:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren des Steps" }, { status: 500 });
  }
}
