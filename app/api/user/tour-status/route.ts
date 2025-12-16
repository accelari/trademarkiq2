import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({ tourCompleted: users.tourCompleted })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({ tourCompleted: user?.tourCompleted ?? false });
  } catch (error) {
    console.error("Error fetching tour status:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tourCompleted } = await request.json();

    await db
      .update(users)
      .set({ 
        tourCompleted: tourCompleted === true,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tour status:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
