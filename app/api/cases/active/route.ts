import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const activeCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.userId, session.user.id),
        eq(trademarkCases.status, "active")
      ),
      with: {
        steps: true,
      },
      orderBy: [desc(trademarkCases.createdAt)],
    });

    if (!activeCase) {
      return NextResponse.json({ activeCase: null });
    }

    return NextResponse.json({
      activeCase: {
        id: activeCase.id,
        caseNumber: activeCase.caseNumber,
        trademarkName: activeCase.trademarkName,
        status: activeCase.status,
        steps: activeCase.steps.map((s) => ({
          step: s.step,
          status: s.status,
        })),
        createdAt: activeCase.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching active case:", error);
    return NextResponse.json({ error: "Fehler beim Laden des aktiven Falls" }, { status: 500 });
  }
}
