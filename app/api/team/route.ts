import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers, teamInvitations, users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        status: teamMembers.status,
        createdAt: teamMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        }
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.ownerId, session.user.id))
      .orderBy(desc(teamMembers.createdAt));

    const invitations = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.ownerId, session.user.id))
      .orderBy(desc(teamInvitations.createdAt));

    const [owner] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      owner: { ...owner, role: "admin", status: "active" },
      members,
      invitations,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
    }

    const existingInvitation = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.email, email))
      .limit(1);

    if (existingInvitation.length > 0) {
      return NextResponse.json({ error: "Einladung bereits gesendet" }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invitation] = await db
      .insert(teamInvitations)
      .values({
        email,
        ownerId: session.user.id,
        role: role || "member",
        token,
        status: "pending",
        expiresAt,
      })
      .returning();

    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Fehler beim Einladen" }, { status: 500 });
  }
}
