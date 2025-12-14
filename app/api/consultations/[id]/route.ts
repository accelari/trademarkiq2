import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consultations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.id, id),
        eq(consultations.userId, session.user.id)
      ),
    });

    if (!consultation) {
      return NextResponse.json({ error: "Beratung nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ consultation });
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      extractedData, 
      researchData,
      title,
      summary,
      transcript,
      sessionProtocol,
      duration,
      mode 
    } = body;

    const existing = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.id, id),
        eq(consultations.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Beratung nicht gefunden" }, { status: 404 });
    }

    const currentExtractedData = (existing.extractedData as any) || {};
    const updatedExtractedData = {
      ...currentExtractedData,
      ...extractedData,
    };

    if (extractedData) {
      updatedExtractedData.isComplete = 
        updatedExtractedData.trademarkName && 
        updatedExtractedData.countries?.length > 0 && 
        updatedExtractedData.niceClasses?.length > 0;
    }

    const newStatus = status || 
      (updatedExtractedData.isComplete ? "ready_for_research" : "draft");

    const updateData: Record<string, any> = {
      status: newStatus,
      extractedData: updatedExtractedData,
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (transcript !== undefined) updateData.transcript = transcript;
    if (sessionProtocol !== undefined) updateData.sessionProtocol = sessionProtocol;
    if (duration !== undefined) updateData.duration = duration;
    if (mode !== undefined) updateData.mode = mode;

    const [updated] = await db
      .update(consultations)
      .set(updateData)
      .where(
        and(
          eq(consultations.id, id),
          eq(consultations.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json({ 
      success: true, 
      consultation: updated 
    });
  } catch (error) {
    console.error("Error updating consultation:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(consultations)
      .where(
        and(
          eq(consultations.id, id),
          eq(consultations.userId, session.user.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Beratung nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting consultation:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
