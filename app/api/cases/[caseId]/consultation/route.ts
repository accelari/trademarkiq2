import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { consultations, trademarkCases, caseSteps } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
      return NextResponse.json({
        consultation: null,
        messages: [],
        summary: null,
        extractedData: null,
      });
    }

    const messages = parseMessages(consultation.transcript);

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        title: consultation.title,
        status: consultation.status,
        mode: consultation.mode,
        duration: consultation.duration,
        createdAt: consultation.createdAt,
        updatedAt: consultation.updatedAt,
      },
      messages,
      summary: consultation.summary,
      extractedData: consultation.extractedData,
    });
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Beratung" }, { status: 500 });
  }
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
    const { messages, mode = "voice" } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Keine Nachrichten vorhanden" }, { status: 400 });
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

    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "Kunde" : "Klaus"}: ${m.content}`)
      .join("\n\n");

    let summary = "";
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            messages: [{
              role: "system",
              content: "Du fasst Beratungsgespräche über Markenrecht zusammen. Sei SEHR KURZ und PRÄZISE. Maximal 3-4 Stichpunkte. Keine langen Sätze."
            }, {
              role: "user",
              content: `Fasse dieses Gespräch KURZ zusammen (max. 4 Stichpunkte):
- Marke/Thema
- Kernaussage  
- Empfehlung
- Nächster Schritt

Gespräch:
${conversationText}`
            }]
          })
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          summary = summaryData.choices?.[0]?.message?.content || "";
        }
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      summary = `Beratungsgespräch mit ${messages.length} Nachrichten.`;
    }

    if (!summary) {
      summary = `Beratungsgespräch vom ${new Date().toLocaleDateString("de-DE")} mit ${messages.length} Nachrichten.`;
    }

    const existingConsultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.caseId, caseId),
        eq(consultations.userId, session.user.id)
      ),
      orderBy: (consultations, { desc }) => [desc(consultations.createdAt)],
    });

    let consultation;
    const transcript = JSON.stringify(messages);
    const duration = messages.length * 15;

    if (existingConsultation) {
      const [updated] = await db
        .update(consultations)
        .set({
          transcript: JSON.stringify(messages),
          summary,
          duration: messages.length * 15,
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, existingConsultation.id))
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
          summary,
          transcript,
          mode,
          duration,
          status: "in_progress",
        })
        .returning();
      consultation = created;
    }

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
      });
    }

    return NextResponse.json({
      success: true,
      summary,
      consultationId: consultation.id,
    });
  } catch (error) {
    console.error("Error saving consultation:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der Beratung" }, { status: 500 });
  }
}

export async function PUT(
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
    const { summary, extractedData, markComplete } = body;

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

    const isComplete = extractedData?.trademarkName && 
                       extractedData?.countries?.length > 0 && 
                       extractedData?.niceClasses?.length > 0;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (extractedData !== undefined) {
      updateData.extractedData = {
        ...extractedData,
        isComplete,
      };
    }

    if (isComplete || markComplete) {
      updateData.status = "ready_for_research";
    }

    if (consultation) {
      const [updated] = await db
        .update(consultations)
        .set(updateData)
        .where(eq(consultations.id, consultation.id))
        .returning();
      consultation = updated;
    } else {
      const [created] = await db
        .insert(consultations)
        .values({
          userId: session.user.id,
          caseId,
          title: extractedData?.trademarkName 
            ? `Beratung: ${extractedData.trademarkName}` 
            : "Markenberatung",
          summary: summary || "",
          transcript: "[]",
          mode: "text",
          status: isComplete ? "ready_for_research" : "draft",
          extractedData: {
            ...extractedData,
            isComplete,
          },
        })
        .returning();
      consultation = created;
    }

    if (extractedData?.trademarkName) {
      await db
        .update(trademarkCases)
        .set({
          trademarkName: extractedData.trademarkName,
          updatedAt: new Date(),
        })
        .where(eq(trademarkCases.id, caseId));
    }

    if (markComplete || isComplete) {
      const existingStep = await db.query.caseSteps.findFirst({
        where: and(
          eq(caseSteps.caseId, caseId),
          eq(caseSteps.step, "beratung")
        ),
      });

      if (existingStep) {
        await db
          .update(caseSteps)
          .set({
            status: "completed",
            completedAt: new Date(),
            metadata: {
              ...(existingStep.metadata as object || {}),
              completedViaAPI: true,
              hasCompleteData: isComplete,
            },
          })
          .where(eq(caseSteps.id, existingStep.id));
      } else {
        await db.insert(caseSteps).values({
          caseId,
          step: "beratung",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
          metadata: {
            completedViaAPI: true,
            hasCompleteData: isComplete,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      consultation: {
        id: consultation.id,
        summary: consultation.summary,
        extractedData: consultation.extractedData,
        status: consultation.status,
      },
    });
  } catch (error) {
    console.error("Error updating consultation:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren der Beratung" }, { status: 500 });
  }
}
