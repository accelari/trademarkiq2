import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { buildCaseMemory } from "@/lib/case-memory";

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isCaseNumber(str: string): boolean {
  const caseNumberRegex = /^TM-\d{4,}-\d+$/i;
  return caseNumberRegex.test(str);
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

    let caseData;

    if (isUUID(caseId)) {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    } else if (isCaseNumber(caseId)) {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.caseNumber, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    } else {
      caseData = await db.query.trademarkCases.findFirst({
        where: and(
          or(
            eq(trademarkCases.id, caseId),
            eq(trademarkCases.caseNumber, caseId)
          ),
          eq(trademarkCases.userId, session.user.id)
        ),
      });
    }

    if (!caseData) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const memory = await buildCaseMemory(caseData.id);

    if (!memory) {
      return NextResponse.json({ error: "Fehler beim Laden des Fall-Gedächtnisses" }, { status: 500 });
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("Error fetching case memory:", error);
    return NextResponse.json({ error: "Fehler beim Laden des Fall-Gedächtnisses" }, { status: 500 });
  }
}
