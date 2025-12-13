import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, session.user.id))
      .orderBy(desc(alerts.createdAt))
      .limit(50);

    return NextResponse.json(userAlerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
