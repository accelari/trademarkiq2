import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseAnalyses } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const analyses = await db.select().from(caseAnalyses).where(
      and(
        eq(caseAnalyses.userId, session.user.id),
        or(
          eq(caseAnalyses.riskScore, 0),
          isNull(caseAnalyses.riskScore)
        )
      )
    );

    let updated = 0;
    for (const analysis of analyses) {
      const conflicts = analysis.conflicts as any[] || [];
      if (conflicts.length === 0) continue;

      const maxAccuracy = Math.max(...conflicts.map((c: any) => c.accuracy || 0));
      if (maxAccuracy === 0) continue;

      const riskLevel = maxAccuracy >= 80 ? "high" : maxAccuracy >= 60 ? "medium" : "low";

      await db.update(caseAnalyses)
        .set({
          riskScore: maxAccuracy,
          riskLevel,
          updatedAt: new Date(),
        })
        .where(eq(caseAnalyses.id, analysis.id));

      updated++;
    }

    return NextResponse.json({
      success: true,
      message: `${updated} Analysen aktualisiert`,
      total: analyses.length,
      updated,
    });
  } catch (error) {
    console.error("Error backfilling risk scores:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}
