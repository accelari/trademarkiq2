import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseDecisions, trademarkCases } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, trademarkName, countries, niceClasses } = body;

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

    // Check if there's an existing decision for this case
    const existingDecision = await db.query.caseDecisions.findFirst({
      where: eq(caseDecisions.caseId, caseId),
      orderBy: [desc(caseDecisions.extractedAt)],
    });

    let decision;
    
    if (existingDecision) {
      // Update existing decision - merge new data with existing data
      const updatedTrademarkNames = trademarkName 
        ? [trademarkName] 
        : existingDecision.trademarkNames || [];
      
      const updatedCountries = (countries && countries.length > 0)
        ? countries 
        : existingDecision.countries || [];
      
      const updatedNiceClasses = (niceClasses && niceClasses.length > 0)
        ? niceClasses 
        : existingDecision.niceClasses || [];

      [decision] = await db
        .update(caseDecisions)
        .set({
          trademarkNames: updatedTrademarkNames,
          countries: updatedCountries,
          niceClasses: updatedNiceClasses,
          completenessScore: 100,
          confidenceScore: 100,
          needsConfirmation: false,
          confirmedAt: new Date(),
          confirmedBy: session.user.id,
          extractedAt: new Date(),
        })
        .where(eq(caseDecisions.id, existingDecision.id))
        .returning();
    } else {
      // Create new decision
      [decision] = await db
        .insert(caseDecisions)
        .values({
          caseId,
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
    }

    // Also update the trademarkCase updatedAt timestamp
    await db
      .update(trademarkCases)
      .set({ updatedAt: new Date() })
      .where(eq(trademarkCases.id, caseId));

    return NextResponse.json({
      success: true,
      decision,
      updated: !!existingDecision,
    });
  } catch (error) {
    console.error("Error saving decisions:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Entscheidungen" },
      { status: 500 }
    );
  }
}
