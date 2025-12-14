import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { chatMessages, consultations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

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

    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.id, id),
        eq(consultations.userId, session.user.id)
      ),
    });

    if (!consultation) {
      return NextResponse.json({ error: "Beratung nicht gefunden" }, { status: 404 });
    }

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.consultationId, id),
      orderBy: [asc(chatMessages.createdAt)],
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Nachrichten" }, { status: 500 });
  }
}

export async function POST(
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
    const { role, content, messageType, emotionData } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Rolle und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    if (!["user", "assistant"].includes(role)) {
      return NextResponse.json(
        { error: "Ungültige Rolle. Erlaubt: 'user' oder 'assistant'" },
        { status: 400 }
      );
    }

    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.id, id),
        eq(consultations.userId, session.user.id)
      ),
    });

    if (!consultation) {
      return NextResponse.json({ error: "Beratung nicht gefunden" }, { status: 404 });
    }

    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        consultationId: id,
        userId: session.user.id,
        role,
        content,
        messageType: messageType || "text",
        emotionData: emotionData || null,
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der Nachricht" }, { status: 500 });
  }
}
