import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkSearches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const searches = await db
      .select()
      .from(trademarkSearches)
      .where(eq(trademarkSearches.userId, session.user.id))
      .orderBy(desc(trademarkSearches.createdAt));

    return NextResponse.json(searches);
  } catch (error) {
    console.error("Error fetching searches:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      classes, 
      countries,
      riskScore: providedRiskScore, 
      riskLevel: providedRiskLevel, 
      conflicts: providedConflicts, 
      similarMarks: providedSimilarMarks, 
      recommendation: providedRecommendation, 
      riskCompleted,
      aiAnalysis,
      streamedConflicts,
      expertAnalysis,
      nameShortlist,
      caseId,
      caseNumber,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
    }

    const riskScore = providedRiskScore ?? Math.floor(Math.random() * 100);
    const riskLevel = providedRiskLevel ?? (riskScore < 30 ? "low" : riskScore < 60 ? "medium" : "high");
    const conflicts = providedConflicts ?? (riskLevel === "high" ? Math.floor(Math.random() * 5) + 1 : riskLevel === "medium" ? Math.floor(Math.random() * 3) : 0);
    const similarMarks = providedSimilarMarks ?? Math.floor(Math.random() * 10);

    const recommendations: Record<string, string> = {
      low: "Anmeldung empfohlen",
      medium: "Weitere Prüfung empfohlen",
      high: "Hohe Kollisionsgefahr",
    };

    const [search] = await db
      .insert(trademarkSearches)
      .values({
        userId: session.user.id,
        name,
        classes: classes || [],
        countries: countries || [],
        riskScore,
        riskLevel,
        conflicts,
        similarMarks,
        recommendation: providedRecommendation ?? recommendations[riskLevel],
        status: "completed",
        riskCompleted: riskCompleted ?? false,
        aiAnalysis: aiAnalysis || null,
        streamedConflicts: streamedConflicts || [],
        expertAnalysis: expertAnalysis || null,
        nameShortlist: nameShortlist || [],
        caseId: caseId || null,
        caseNumber: caseNumber || null,
      })
      .returning();

    return NextResponse.json(search);
  } catch (error) {
    console.error("Error creating search:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
