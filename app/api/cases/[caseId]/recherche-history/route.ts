import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { rechercheHistory, trademarkCases } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// GET: Liste aller Recherchen für einen Case
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

    // Case finden (by ID oder caseNumber)
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

    const history = await db.query.rechercheHistory.findMany({
      where: eq(rechercheHistory.caseId, trademarkCase.id),
      orderBy: [desc(rechercheHistory.createdAt)],
    });

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        keyword: h.keyword,
        trademarkType: h.trademarkType,
        countries: h.countries || [],
        niceClasses: h.niceClasses || [],
        riskScore: h.riskScore || 0,
        riskLevel: (h.riskLevel || "low") as "low" | "medium" | "high",
        decision: h.decision,
        result: h.result,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error loading recherche history:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Recherche-Historie" }, { status: 500 });
  }
}

// POST: Neue Recherche zur Historie hinzufügen
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

    // Case finden
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

    const { keyword, trademarkType, countries, niceClasses, riskScore, riskLevel, decision, result } = body;

    if (!keyword) {
      return NextResponse.json({ error: "Keyword fehlt" }, { status: 400 });
    }

    const [newEntry] = await db.insert(rechercheHistory).values({
      caseId: trademarkCase.id,
      userId: session.user.id,
      keyword,
      trademarkType: trademarkType || null,
      countries: countries || [],
      niceClasses: niceClasses || [],
      riskScore: riskScore || 0,
      riskLevel: riskLevel || "low",
      decision: decision || null,
      result: result || null,
    }).returning();

    return NextResponse.json({
      success: true,
      entry: {
        id: newEntry.id,
        keyword: newEntry.keyword,
        trademarkType: newEntry.trademarkType,
        countries: newEntry.countries,
        niceClasses: newEntry.niceClasses,
        riskScore: newEntry.riskScore,
        riskLevel: newEntry.riskLevel,
        decision: newEntry.decision,
        result: newEntry.result,
        createdAt: newEntry.createdAt,
      },
    });
  } catch (error) {
    console.error("Error saving recherche history:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der Recherche" }, { status: 500 });
  }
}

// DELETE: Recherche aus Historie löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId } = await params;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("id");

    if (!entryId) {
      return NextResponse.json({ error: "Entry ID fehlt" }, { status: 400 });
    }

    // Case finden
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

    // Prüfen ob Entry existiert und zum Case gehört
    const entry = await db.query.rechercheHistory.findFirst({
      where: and(
        eq(rechercheHistory.id, entryId),
        eq(rechercheHistory.caseId, trademarkCase.id)
      ),
    });

    if (!entry) {
      return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
    }

    await db.delete(rechercheHistory).where(eq(rechercheHistory.id, entryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recherche history:", error);
    return NextResponse.json({ error: "Fehler beim Löschen der Recherche" }, { status: 500 });
  }
}
