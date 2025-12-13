import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userPlaybooks = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.userId, session.user.id))
      .orderBy(desc(playbooks.createdAt));

    return NextResponse.json(userPlaybooks);
  } catch (error) {
    console.error("Error fetching playbooks:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { jurisdiction, markName } = await request.json();

    if (!jurisdiction) {
      return NextResponse.json({ error: "Markenamt erforderlich" }, { status: 400 });
    }

    const [playbook] = await db
      .insert(playbooks)
      .values({
        userId: session.user.id,
        jurisdiction,
        markName: markName || null,
        currentStep: 1,
        completedItems: [],
        status: "in_progress",
      })
      .returning();

    return NextResponse.json(playbook);
  } catch (error) {
    console.error("Error creating playbook:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
