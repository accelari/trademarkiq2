import { fetchAccessToken } from "hume";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkCases } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import CaseWorkspace from "@/app/components/case/CaseWorkspace";

export const dynamic = "force-dynamic";

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isCaseNumber(str: string): boolean {
  const caseNumberRegex = /^TM-\d{4,}-\d+$/i;
  return caseNumberRegex.test(str);
}

async function getAccessToken(): Promise<string> {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error("Missing HUME_API_KEY or HUME_SECRET_KEY");
    }

    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      throw new Error("Failed to fetch access token");
    }

    return accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
}

async function getCaseData(caseId: string, userId: string) {
  const queryOptions = {
    with: {
      steps: {},
      decisions: {},
      events: {
        orderBy: (events: any, { desc }: any) => [desc(events.createdAt)],
      },
      consultations: {
        orderBy: (consultations: any, { asc }: any) => [asc(consultations.createdAt)],
      },
    },
  };

  let caseData;

  if (isUUID(caseId)) {
    caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, userId)
      ),
      ...queryOptions,
    });
  } else if (isCaseNumber(caseId)) {
    caseData = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.caseNumber, caseId),
        eq(trademarkCases.userId, userId)
      ),
      ...queryOptions,
    });
  } else {
    caseData = await db.query.trademarkCases.findFirst({
      where: and(
        or(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.caseNumber, caseId)
        ),
        eq(trademarkCases.userId, userId)
      ),
      ...queryOptions,
    });
  }

  return caseData;
}

export default async function CaseWorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { caseId } = await params;

  const caseData = await getCaseData(caseId, session.user.id);

  if (!caseData) {
    redirect("/dashboard");
  }

  let accessToken: string = "";
  let hasVoiceAssistant = true;

  try {
    accessToken = await getAccessToken();
  } catch (err) {
    hasVoiceAssistant = false;
  }

  const serializedCaseData = {
    id: caseData.id,
    caseNumber: caseData.caseNumber,
    trademarkName: caseData.trademarkName,
    status: caseData.status,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
    steps: caseData.steps || [],
    decisions: caseData.decisions || [],
    consultations: (caseData.consultations || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      duration: c.duration,
      mode: c.mode,
      createdAt: c.createdAt?.toISOString?.() || c.createdAt,
      extractedData: c.extractedData,
    })),
  };

  return (
    <CaseWorkspace
      caseData={serializedCaseData}
      accessToken={accessToken}
      hasVoiceAssistant={hasVoiceAssistant}
    />
  );
}
