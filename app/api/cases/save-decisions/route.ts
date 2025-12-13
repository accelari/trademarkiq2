import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseDecisions, trademarkCases } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, consultationId, trademarkName, countries, niceClasses } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId ist erforderlich" },
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

    const [decision] = await db
      .insert(caseDecisions)
      .values({
        caseId,
        consultationId: consultationId || null,
        trademarkNames: trademarkName ? [trademarkName] : [],
        countries: countries || [],
        niceClasses: niceClasses || [],
        completenessScore: 100,
        confidenceScore: 100,
        needsConfirmation: false,
        confirmedAt: new Date(),
        confirmedBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error) {
    console.error("Error saving decisions:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Entscheidungen" },
      { status: 500 }
    );
  }
}
