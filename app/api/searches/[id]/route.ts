import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkSearches } from "@/db/schema";
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

    const [search] = await db
      .select()
      .from(trademarkSearches)
      .where(
        and(
          eq(trademarkSearches.id, id),
          eq(trademarkSearches.userId, session.user.id)
        )
      );

    if (!search) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(search);
  } catch (error) {
    console.error("Error fetching search:", error);
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

    const [existingSearch] = await db
      .select()
      .from(trademarkSearches)
      .where(
        and(
          eq(trademarkSearches.id, id),
          eq(trademarkSearches.userId, session.user.id)
        )
      );

    if (!existingSearch) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (typeof body.riskCompleted === "boolean") {
      updateData.riskCompleted = body.riskCompleted;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Keine gültigen Felder zum Aktualisieren" }, { status: 400 });
    }

    const [updatedSearch] = await db
      .update(trademarkSearches)
      .set(updateData)
      .where(
        and(
          eq(trademarkSearches.id, id),
          eq(trademarkSearches.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json(updatedSearch);
  } catch (error) {
    console.error("Error updating search:", error);
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

    await db
      .delete(trademarkSearches)
      .where(
        and(
          eq(trademarkSearches.id, id),
          eq(trademarkSearches.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting search:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
