import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consultations, trademarkCases, caseSteps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

function parseMessages(transcript: string | null): Message[] {
  if (!transcript) return [];
  
  try {
    const parsed = JSON.parse(transcript);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If not valid JSON, return empty array
  }
  return [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId } = await params;
    const body = await request.json();
    const { role, content, id, timestamp } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Rolle und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    if (!["user", "assistant", "system"].includes(role)) {
      return NextResponse.json(
        { error: "Ungültige Rolle. Erlaubt: user, assistant, system" },
        { status: 400 }
      );
    }

    const caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    let consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.caseId, caseId),
        eq(consultations.userId, session.user.id)
      ),
      orderBy: (consultations, { desc }) => [desc(consultations.createdAt)],
    });

    const newMessage: Message = {
      id: id || crypto.randomUUID(),
      role,
      content,
      timestamp: timestamp || new Date().toISOString(),
    };

    if (consultation) {
      const existingMessages = parseMessages(consultation.transcript);
      const updatedMessages = [...existingMessages, newMessage];

      const [updated] = await db
        .update(consultations)
        .set({
          transcript: JSON.stringify(updatedMessages),
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, consultation.id))
        .returning();
      consultation = updated;
    } else {
      const [created] = await db
        .insert(consultations)
        .values({
          userId: session.user.id,
          caseId,
          title: caseData.trademarkName 
            ? `Beratung: ${caseData.trademarkName}` 
            : "Markenberatung",
          summary: "",
          transcript: JSON.stringify([newMessage]),
          mode: "text",
          status: "draft",
          extractedData: {},
        })
        .returning();
      consultation = created;

      const existingStep = await db.query.caseSteps.findFirst({
        where: and(
          eq(caseSteps.caseId, caseId),
          eq(caseSteps.step, "beratung")
        ),
      });

      if (!existingStep) {
        await db.insert(caseSteps).values({
          caseId,
          step: "beratung",
          status: "in_progress",
          startedAt: new Date(),
          metadata: {
            startedViaMessageAPI: true,
          },
        });
      } else if (existingStep.status === "pending") {
        await db
          .update(caseSteps)
          .set({
            status: "in_progress",
            startedAt: new Date(),
          })
          .where(eq(caseSteps.id, existingStep.id));
      }
    }

    const allMessages = parseMessages(consultation.transcript);

    return NextResponse.json({
      success: true,
      message: newMessage,
      messages: allMessages,
      consultationId: consultation.id,
    });
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json({ error: "Fehler beim Hinzufügen der Nachricht" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { caseId } = await params;

    const caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.caseId, caseId),
        eq(consultations.userId, session.user.id)
      ),
      orderBy: (consultations, { desc }) => [desc(consultations.createdAt)],
    });

    if (!consultation) {
      return NextResponse.json({ messages: [] });
    }

    const messages = parseMessages(consultation.transcript);

    return NextResponse.json({
      messages,
      consultationId: consultation.id,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Nachrichten" }, { status: 500 });
  }
}
