import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseDecisions, trademarkCases, caseEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId, selectedName, riskScore, conflictCount, criticalCount } = await req.json();

    if (!caseId || !selectedName) {
      return NextResponse.json(
        { error: "Case-ID und ausgewählter Name erforderlich" },
        { status: 400 }
      );
    }

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    const caseByNumber = !existingCase 
      ? await db.query.trademarkCases.findFirst({
          where: and(
            eq(trademarkCases.caseNumber, caseId),
            eq(trademarkCases.userId, session.user.id)
          ),
        })
      : null;
      
    if (!existingCase && !caseByNumber) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const actualCaseId = existingCase?.id || caseByNumber?.id;

    if (!actualCaseId) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingDecision = await db.query.caseDecisions.findFirst({
      where: eq(caseDecisions.caseId, actualCaseId),
    });

    if (existingDecision) {
      const currentNames = existingDecision.trademarkNames || [];
      const updatedNames = currentNames.includes(selectedName) 
        ? currentNames 
        : [selectedName, ...currentNames];

      await db.update(caseDecisions)
        .set({
          trademarkNames: updatedNames,
          extractedAt: new Date(),
        })
        .where(eq(caseDecisions.id, existingDecision.id));
    } else {
      await db.insert(caseDecisions).values({
        caseId: actualCaseId,
        trademarkNames: [selectedName],
        countries: [],
        niceClasses: [],
        completenessScore: 50,
        confidenceScore: 80,
      });
    }

    await db.update(trademarkCases)
      .set({ 
        trademarkName: selectedName,
        updatedAt: new Date() 
      })
      .where(eq(trademarkCases.id, actualCaseId));

    await db.insert(caseEvents).values({
      caseId: actualCaseId,
      userId: session.user.id,
      eventType: "alternative_selected",
      eventData: {
        selectedName,
        riskScore,
        conflictCount,
        criticalCount,
      },
    });

    return NextResponse.json({ 
      success: true, 
      selectedName,
      message: "Alternative wurde als neuer Markenname gespeichert"
    });
  } catch (error) {
    console.error("Error saving alternative selection:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Auswahl" },
      { status: 500 }
    );
  }
}
