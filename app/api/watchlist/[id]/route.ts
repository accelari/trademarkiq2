import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlistItems, alerts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

    const [item] = await db
      .select()
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.id, id),
          eq(watchlistItems.userId, session.user.id)
        )
      );

    if (!item) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const itemAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.watchlistItemId, id))
      .orderBy(desc(alerts.createdAt));

    return NextResponse.json({ ...item, alerts: itemAlerts });
  } catch (error) {
    console.error("Error fetching watchlist item:", error);
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

    const [existingItem] = await db
      .select()
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.id, id),
          eq(watchlistItems.userId, session.user.id)
        )
      );

    if (!existingItem) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.registrationNumber !== undefined) updateData.registrationNumber = body.registrationNumber;
    if (body.jurisdiction !== undefined) updateData.jurisdiction = body.jurisdiction;
    if (body.classes !== undefined) updateData.classes = body.classes;
    if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notificationSettings !== undefined) updateData.notificationSettings = body.notificationSettings;

    const [updatedItem] = await db
      .update(watchlistItems)
      .set(updateData)
      .where(
        and(
          eq(watchlistItems.id, id),
          eq(watchlistItems.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating watchlist item:", error);
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
      .delete(watchlistItems)
      .where(
        and(
          eq(watchlistItems.id, id),
          eq(watchlistItems.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting watchlist item:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
