import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseAnalyses, trademarkCases, caseSteps } from "@/db/schema";
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

    const trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!trademarkCase) {
      const caseByNumber = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });

      if (!caseByNumber) {
        return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
      }

      const analysis = await db.query.caseAnalyses.findFirst({
        where: eq(caseAnalyses.caseId, caseByNumber.id),
        orderBy: [desc(caseAnalyses.createdAt)],
      });

      return NextResponse.json({
        analysis: analysis || null,
        case: caseByNumber,
      });
    }

    const analysis = await db.query.caseAnalyses.findFirst({
      where: eq(caseAnalyses.caseId, trademarkCase.id),
      orderBy: [desc(caseAnalyses.createdAt)],
    });

    return NextResponse.json({
      analysis: analysis || null,
      case: trademarkCase,
    });
  } catch (error) {
    console.error("Error fetching case analysis:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Analyse" },
      { status: 500 }
    );
  }
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

    let trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!trademarkCase) {
      trademarkCase = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    }

    if (!trademarkCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingAnalysis = await db.query.caseAnalyses.findFirst({
      where: eq(caseAnalyses.caseId, trademarkCase.id),
      orderBy: [desc(caseAnalyses.createdAt)],
    });

    const analysisData = {
      caseId: trademarkCase.id,
      userId: session.user.id,
      searchQuery: body.searchQuery,
      searchTermsUsed: body.searchTermsUsed || [],
      conflicts: body.conflicts || [],
      aiAnalysis: body.aiAnalysis || null,
      riskScore: body.riskScore || 0,
      riskLevel: body.riskLevel || "low",
      totalResultsAnalyzed: body.totalResultsAnalyzed || 0,
      alternativeNames: body.alternativeNames || [],
      expertStrategy: body.expertStrategy || null,
      updatedAt: new Date(),
    };

    let analysis;
    if (existingAnalysis) {
      [analysis] = await db
        .update(caseAnalyses)
        .set(analysisData)
        .where(eq(caseAnalyses.id, existingAnalysis.id))
        .returning();
    } else {
      [analysis] = await db
        .insert(caseAnalyses)
        .values(analysisData)
        .returning();
    }

    const recherchStep = await db.query.caseSteps.findFirst({
      where: and(
        eq(caseSteps.caseId, trademarkCase.id),
        eq(caseSteps.step, "recherche")
      ),
    });

    if (recherchStep && recherchStep.status !== "completed") {
      await db
        .update(caseSteps)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(caseSteps.id, recherchStep.id));
    }

    await db
      .update(trademarkCases)
      .set({ updatedAt: new Date() })
      .where(eq(trademarkCases.id, trademarkCase.id));

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error saving case analysis:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Analyse" },
      { status: 500 }
    );
  }
}

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

    let trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!trademarkCase) {
      trademarkCase = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    }

    if (!trademarkCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingAnalysis = await db.query.caseAnalyses.findFirst({
      where: eq(caseAnalyses.caseId, trademarkCase.id),
      orderBy: [desc(caseAnalyses.createdAt)],
    });

    if (!existingAnalysis) {
      return NextResponse.json({ error: "Keine Analyse gefunden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (body.alternativeNames !== undefined) {
      updateData.alternativeNames = body.alternativeNames;
    }
    if (body.conflicts !== undefined) {
      updateData.conflicts = body.conflicts;
    }
    if (body.aiAnalysis !== undefined) {
      updateData.aiAnalysis = body.aiAnalysis;
    }
    if (body.riskScore !== undefined) {
      updateData.riskScore = body.riskScore;
    }
    if (body.riskLevel !== undefined) {
      updateData.riskLevel = body.riskLevel;
    }

    const [analysis] = await db
      .update(caseAnalyses)
      .set(updateData)
      .where(eq(caseAnalyses.id, existingAnalysis.id))
      .returning();

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error updating case analysis:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Analyse" },
      { status: 500 }
    );
  }
}
