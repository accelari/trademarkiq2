import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseEvents } from "@/db/schema";
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
    const { step, reason } = body;

    if (!step) {
      return NextResponse.json(
        { error: "Step erforderlich" },
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

    const existingStep = await db.query.caseSteps.findFirst({
      where: and(
        eq(caseSteps.caseId, caseId),
        eq(caseSteps.step, step)
      ),
    });

    if (!existingStep) {
      return NextResponse.json({ error: "Step nicht gefunden" }, { status: 404 });
    }

    const [updatedStep] = await db
      .update(caseSteps)
      .set({
        status: "skipped",
        skippedAt: new Date(),
        skipReason: reason || null,
      })
      .where(eq(caseSteps.id, existingStep.id))
      .returning();

    await db.insert(caseEvents).values({
      caseId,
      userId: session.user.id,
      eventType: "step_skipped",
      eventData: { step, reason: reason || null, previousStatus: existingStep.status },
    });

    await db
      .update(trademarkCases)
      .set({ updatedAt: new Date() })
      .where(eq(trademarkCases.id, caseId));

    return NextResponse.json({
      success: true,
      step: updatedStep,
    });
  } catch (error) {
    console.error("Error skipping step:", error);
    return NextResponse.json({ error: "Fehler beim Überspringen des Steps" }, { status: 500 });
  }
}
