import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseEvents, consultations } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isCaseNumber(str: string): boolean {
  const caseNumberRegex = /^TM-\d{4,}-\d+$/i;
  return caseNumberRegex.test(str);
}

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

    let caseData;
    
    const queryOptions = {
      with: {
        steps: true,
        decisions: true,
        events: {
          orderBy: (events: any, { desc }: any) => [desc(events.createdAt)],
        },
        consultations: {
          orderBy: (consultations: any, { asc }: any) => [asc(consultations.createdAt)],
        },
      },
    };

    if (isUUID(caseId)) {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
        ...queryOptions,
      });
    } else if (isCaseNumber(caseId)) {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
        ...queryOptions,
      });
    } else {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          or(
            eq(trademarkCases.id, caseId),
            eq(trademarkCases.caseNumber, caseId)
          ),
          eq(trademarkCases.userId, session.user.id)
        ),
        ...queryOptions,
      });
    }

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ case: caseData });
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json({ error: "Fehler beim Laden des Falls" }, { status: 500 });
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
    const { status, trademarkName } = body;

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }
    if (trademarkName !== undefined) {
      updateData.trademarkName = trademarkName;
    }

    const [updatedCase] = await db
      .update(trademarkCases)
      .set(updateData)
      .where(eq(trademarkCases.id, caseId))
      .returning();

    await db.insert(caseEvents).values({
      caseId,
      userId: session.user.id,
      eventType: "updated",
      eventData: { status, trademarkName },
    });

    const caseWithDetails = await db.query.trademarkCases.findFirst({
      where: eq(trademarkCases.id, caseId),
      with: {
        steps: true,
        decisions: true,
        events: {
          orderBy: (events, { desc }) => [desc(events.createdAt)],
        },
      },
    });

    return NextResponse.json({
      success: true,
      case: caseWithDetails,
    });
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren des Falls" }, { status: 500 });
  }
}

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

    const existingCase = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    await db
      .update(consultations)
      .set({ caseId: null })
      .where(eq(consultations.caseId, caseId));

    await db
      .delete(trademarkCases)
      .where(
        and(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting case:", error);
    return NextResponse.json({ error: "Fehler beim Löschen des Falls" }, { status: 500 });
  }
}
