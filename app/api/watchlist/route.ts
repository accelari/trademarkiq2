import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlistItems, alerts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const items = await db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, session.user.id))
      .orderBy(desc(watchlistItems.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { name, registrationNumber, jurisdiction, classes, expiryDate } = await request.json();

    if (!name || !jurisdiction) {
      return NextResponse.json({ error: "Name und Markenamt erforderlich" }, { status: 400 });
    }

    const [item] = await db
      .insert(watchlistItems)
      .values({
        userId: session.user.id,
        name,
        registrationNumber: registrationNumber || null,
        jurisdiction,
        classes: classes || [],
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: "active",
        alertCount: 0,
        lastChecked: new Date(),
      })
      .returning();

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating watchlist item:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
