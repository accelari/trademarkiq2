import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases, caseSteps, caseEvents } from "@/db/schema";

const CASE_STEPS = ["beratung", "markenname", "recherche", "analyse", "ueberpruefung", "anmeldung", "kommunikation", "ueberwachung", "fristen"];

function generateCaseNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `TM-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { source = "beratung", trademarkName = null } = body;

    const caseNumber = generateCaseNumber();

    const [newCase] = await db
      .insert(trademarkCases)
      .values({
        caseNumber,
        userId: session.user.id,
        trademarkName,
        status: "draft",
      })
      .returning();

    const stepInserts = CASE_STEPS.map((step) => {
      if (step === "beratung" && source === "beratung") {
        return { 
          caseId: newCase.id, 
          step, 
          status: "in_progress" as const, 
          startedAt: new Date(), 
          completedAt: null, 
          skippedAt: null 
        };
      }
      if (step === "beratung" && source === "recherche") {
        return { 
          caseId: newCase.id, 
          step, 
          status: "skipped" as const, 
          startedAt: null, 
          completedAt: null, 
          skippedAt: new Date() 
        };
      }
      if (step === "recherche" && source === "recherche") {
        return { 
          caseId: newCase.id, 
          step, 
          status: "in_progress" as const, 
          startedAt: new Date(), 
          completedAt: null, 
          skippedAt: null 
        };
      }
      return { 
        caseId: newCase.id, 
        step, 
        status: "pending" as const, 
        startedAt: null, 
        completedAt: null, 
        skippedAt: null 
      };
    });

    await db.insert(caseSteps).values(stepInserts);

    await db.insert(caseEvents).values({
      caseId: newCase.id,
      userId: session.user.id,
      eventType: "created",
      eventData: { 
        source,
        trademarkName,
        status: "draft",
      },
    });

    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      caseNumber: newCase.caseNumber,
    });
  } catch (error) {
    console.error("Error starting case:", error);
    return NextResponse.json({ error: "Fehler beim Starten des Falls" }, { status: 500 });
  }
}
