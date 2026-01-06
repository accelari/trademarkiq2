import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseDecisions, trademarkCases } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET: Besuchte Akkordeons laden
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

    const decision = await db.query.caseDecisions.findFirst({
      where: eq(caseDecisions.caseId, caseId),
      orderBy: [desc(caseDecisions.extractedAt)],
    });

    return NextResponse.json({
      visitedAccordions: decision?.visitedAccordions || [],
    });
  } catch (error) {
    console.error("Error loading visited accordions:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

// POST: Akkordeon als besucht markieren
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
    const { accordion } = body;

    if (!accordion) {
      return NextResponse.json({ error: "accordion ist erforderlich" }, { status: 400 });
    }

    // Prüfen ob Fall existiert
    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    // Bestehende Entscheidung laden oder neue erstellen
    const existingDecision = await db.query.caseDecisions.findFirst({
      where: eq(caseDecisions.caseId, caseId),
      orderBy: [desc(caseDecisions.extractedAt)],
    });

    let visitedAccordions: string[] = [];

    if (existingDecision) {
      // Akkordeon hinzufügen (wenn noch nicht vorhanden)
      visitedAccordions = existingDecision.visitedAccordions || [];
      if (!visitedAccordions.includes(accordion)) {
        visitedAccordions = [...visitedAccordions, accordion];
      }

      await db
        .update(caseDecisions)
        .set({ visitedAccordions })
        .where(eq(caseDecisions.id, existingDecision.id));
    } else {
      // Neue Entscheidung erstellen
      visitedAccordions = [accordion];
      await db.insert(caseDecisions).values({
        caseId,
        visitedAccordions,
      });
    }

    return NextResponse.json({
      success: true,
      visitedAccordions,
    });
  } catch (error) {
    console.error("Error saving visited accordion:", error);
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
