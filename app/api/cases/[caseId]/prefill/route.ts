import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseDecisions } from "@/db/schema";
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

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const decisions = await db
      .select()
      .from(caseDecisions)
      .where(eq(caseDecisions.caseId, caseId))
      .orderBy(desc(caseDecisions.extractedAt));

    const latestDecision = decisions[0];

    const prefillData = {
      trademarkName: existingCase.trademarkName,
      trademarkNames: latestDecision?.trademarkNames || [],
      countries: latestDecision?.countries || [],
      niceClasses: latestDecision?.niceClasses || [],
      completenessScore: latestDecision?.completenessScore || 0,
      confidenceScore: latestDecision?.confidenceScore || 0,
      needsConfirmation: latestDecision?.needsConfirmation || false,
      confirmedAt: latestDecision?.confirmedAt || null,
    };

    return NextResponse.json({
      success: true,
      prefill: prefillData,
      decisions,
    });
  } catch (error) {
    console.error("Error fetching prefill data:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Prefill-Daten" }, { status: 500 });
  }
}
