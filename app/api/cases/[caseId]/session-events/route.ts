import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consultations, trademarkCases } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface SessionEvent {
  id: string;
  timestamp: string;
  type: string;
  icon: string;
  description: string;
  details?: string;
}

function parseEvents(sessionProtocol: string | null): SessionEvent[] {
  if (!sessionProtocol) return [];
  
  try {
    const parsed = JSON.parse(sessionProtocol);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If not valid JSON, return empty array
  }
  return [];
}

// POST - Event hinzufügen
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
    const { id, timestamp, type, icon, description, details } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "Type und Description sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob Case existiert und User berechtigt ist
    const caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    // Consultation finden oder erstellen
    let consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.caseId, caseId),
        eq(consultations.userId, session.user.id)
      ),
      orderBy: (consultations, { desc }) => [desc(consultations.createdAt)],
    });

    const newEvent: SessionEvent = {
      id: id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp || new Date().toISOString(),
      type,
      icon,
      description,
      details,
    };

    if (consultation) {
      // Events zum bestehenden sessionProtocol hinzufügen
      const existingEvents = parseEvents(consultation.sessionProtocol);
      const updatedEvents = [...existingEvents, newEvent];

      await db
        .update(consultations)
        .set({
          sessionProtocol: JSON.stringify(updatedEvents),
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, consultation.id));
    } else {
      // Neue Consultation erstellen
      await db
        .insert(consultations)
        .values({
          userId: session.user.id,
          caseId,
          title: caseData.trademarkName 
            ? `Beratung: ${caseData.trademarkName}` 
            : "Markenberatung",
          summary: "",
          sessionProtocol: JSON.stringify([newEvent]),
          mode: "text",
          status: "draft",
          extractedData: {},
        });
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
    });
  } catch (error) {
    console.error("Error adding session event:", error);
    return NextResponse.json({ error: "Fehler beim Hinzufügen des Events" }, { status: 500 });
  }
}

// GET - Alle Events laden
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

    // Prüfen ob Case existiert und User berechtigt ist
    const caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.caseId, caseId),
        eq(consultations.userId, session.user.id)
      ),
      orderBy: (consultations, { desc }) => [desc(consultations.createdAt)],
    });

    if (!consultation) {
      return NextResponse.json({ events: [] });
    }

    const events = parseEvents(consultation.sessionProtocol);

    return NextResponse.json({
      events,
      consultationId: consultation.id,
    });
  } catch (error) {
    console.error("Error fetching session events:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Events" }, { status: 500 });
  }
}
