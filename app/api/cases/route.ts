import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseEvents, consultations } from "@/db/schema";
import { desc, eq, sql, and, or, ilike } from "drizzle-orm";

const CASE_STEPS = ["beratung", "recherche", "risikoanalyse", "anmeldung", "watchlist"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";

    const conditions = [eq(trademarkCases.userId, session.user.id)];

    if (status && status !== "alle") {
      conditions.push(eq(trademarkCases.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(trademarkCases.trademarkName, `%${search}%`),
          ilike(trademarkCases.caseNumber, `%${search}%`)
        )!
      );
    }

    const cases = await db.query.trademarkCases.findMany({
      where: and(...conditions),
      with: {
        steps: true,
        decisions: true,
      },
      orderBy: [desc(trademarkCases.createdAt)],
    });

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Fälle" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { trademarkName, consultationId, skipBeratung, completeRecherche, searchData } = body;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const caseNumber = `TM-${year}${month}${day}-${hours}${minutes}${seconds}`;

    const [newCase] = await db
      .insert(trademarkCases)
      .values({
        caseNumber,
        userId: session.user.id,
        trademarkName: trademarkName || null,
        status: "active",
      })
      .returning();

    const stepInserts = CASE_STEPS.map((step) => {
      const nowDate = new Date();
      if (step === "beratung") {
        if (consultationId) {
          return { caseId: newCase.id, step, status: "completed" as const, startedAt: nowDate, completedAt: nowDate, skippedAt: null };
        } else if (skipBeratung) {
          return { caseId: newCase.id, step, status: "skipped", startedAt: null, completedAt: null, skippedAt: nowDate };
        }
      }
      if (step === "recherche" && completeRecherche) {
        const rechercheMetadata = searchData ? {
          searchQuery: searchData.query,
          resultsCount: searchData.totalAnalyzed || 0,
          conflictsCount: searchData.conflictsCount || 0,
          countries: searchData.countries || [],
          classes: searchData.classes || [],
          searchedAt: nowDate.toISOString(),
          searchTermsUsed: searchData.searchTermsUsed || [],
          totalResultsAnalyzed: searchData.totalAnalyzed || 0,
          conflicts: searchData.conflicts || [],
          aiAnalysis: searchData.aiAnalysis || null,
        } : null;
        return { 
          caseId: newCase.id, 
          step, 
          status: "completed" as const, 
          startedAt: nowDate, 
          completedAt: nowDate, 
          skippedAt: null,
          metadata: rechercheMetadata,
        };
      }
      return { caseId: newCase.id, step, status: "pending" as const, startedAt: null, completedAt: null, skippedAt: null };
    });

    await db.insert(caseSteps).values(stepInserts);

    if (consultationId) {
      await db
        .update(consultations)
        .set({ caseId: newCase.id })
        .where(eq(consultations.id, consultationId));
    }

    await db.insert(caseEvents).values({
      caseId: newCase.id,
      userId: session.user.id,
      eventType: "created",
      eventData: { 
        trademarkName: trademarkName || null, 
        consultationId: consultationId || null,
        skippedBeratung: skipBeratung || false,
        searchData: searchData || null,
      },
    });

    const caseWithDetails = await db.query.trademarkCases.findFirst({
      where: eq(trademarkCases.id, newCase.id),
      with: {
        steps: true,
        decisions: true,
        events: true,
      },
    });

    return NextResponse.json({
      success: true,
      case: caseWithDetails,
    });
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen des Falls" }, { status: 500 });
  }
}
