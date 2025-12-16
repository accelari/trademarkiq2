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
    const { step, status } = body;

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

    if (!existingStep) {
      return NextResponse.json({ error: "Step nicht gefunden" }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      status,
    };

    if (status === "in_progress" && !existingStep.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updatedStep] = await db
      .update(caseSteps)
      .set(updateData)
      .where(eq(caseSteps.id, existingStep.id))
      .returning();

    await db.insert(caseEvents).values({
      caseId: existingCase.id,
      userId: session.user.id,
      eventType: "step_status_changed",
      eventData: { step, status, previousStatus: existingStep.status },
    });

    await db
      .update(trademarkCases)
      .set({ updatedAt: new Date() })
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
