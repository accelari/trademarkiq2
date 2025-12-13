import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
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

    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(
        and(
          eq(playbooks.id, id),
          eq(playbooks.userId, session.user.id)
        )
      );

    if (!playbook) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(playbook);
  } catch (error) {
    console.error("Error fetching playbook:", error);
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
    const { currentStep, completedItems, status } = await request.json();

    const [playbook] = await db
      .update(playbooks)
      .set({
        currentStep: currentStep ?? undefined,
        completedItems: completedItems ?? undefined,
        status: status ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(playbooks.id, id),
          eq(playbooks.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json(playbook);
  } catch (error) {
    console.error("Error updating playbook:", error);
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
      .delete(playbooks)
      .where(
        and(
          eq(playbooks.id, id),
          eq(playbooks.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting playbook:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
