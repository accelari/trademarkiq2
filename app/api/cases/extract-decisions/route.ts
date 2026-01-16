import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractDecisionsFromSummary } from "@/lib/ai/extract-decisions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI Integrationen sind nicht konfiguriert (Anthropic API Key fehlt)" },
        { status: 501 }
      );
    }

    const body = await request.json();
    const { caseId, consultationId, summary } = body;

    if (!caseId || !consultationId) {
      return NextResponse.json(
        { error: "caseId und consultationId sind erforderlich" },
        { status: 400 }
      );
    }

    const decisions = await extractDecisionsFromSummary(
      summary || "",
      caseId,
      consultationId
    );

    return NextResponse.json({
      success: true,
      decisions,
    });
  } catch (error) {
    console.error("Error extracting decisions:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Extrahieren der Entscheidungen",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
