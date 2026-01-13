import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, trademarkCases, sessions, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete all user data in order (respecting foreign keys)
    // 1. Delete trademark cases
    await db.delete(trademarkCases).where(eq(trademarkCases.userId, userId));
    
    // 2. Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));
    
    // 3. Delete accounts (OAuth connections)
    await db.delete(accounts).where(eq(accounts.userId, userId));
    
    // 4. Delete user
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/user/delete] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Profils" },
      { status: 500 }
    );
  }
}
