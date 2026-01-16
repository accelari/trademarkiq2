import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseAnalyses, trademarkCases } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

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

    let trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(eq(trademarkCases.id, caseId), eq(trademarkCases.userId, session.user.id)),
    });

    if (!trademarkCase) {
      trademarkCase = await db.query.trademarkCases.findFirst({
        where: and(eq(trademarkCases.caseNumber, caseId), eq(trademarkCases.userId, session.user.id)),
      });
    }

    if (!trademarkCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const analyses = await db.query.caseAnalyses.findMany({
      where: and(eq(caseAnalyses.caseId, trademarkCase.id), eq(caseAnalyses.userId, session.user.id)),
      orderBy: [desc(caseAnalyses.createdAt)],
    });

    return NextResponse.json({
      analyses: analyses.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        trademarkName: a.searchQuery?.trademarkName || "",
        riskLevel: (a.riskLevel || "low") as "low" | "medium" | "high",
        riskScore: a.riskScore || 0,
      })),
    });
  } catch (error) {
    console.error("Error listing case analyses:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Analysen" }, { status: 500 });
  }
}
