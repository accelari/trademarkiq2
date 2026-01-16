import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseAnalyses, caseDecisions, caseSteps, trademarkCases } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

type RiskLevel = "high" | "medium" | "low";

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function uniqStrings(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
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

    let trademarkCase = await db.query.trademarkCases.findFirst({
      where: and(eq(trademarkCases.id, caseId), eq(trademarkCases.userId, session.user.id)),
    });

    if (!trademarkCase) {
      trademarkCase = await db.query.trademarkCases.findFirst({
        where: and(eq(trademarkCases.caseNumber, caseId), eq(trademarkCases.userId, session.user.id)),
      });
    }

    if (!trademarkCase) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const latestDecision = await db.query.caseDecisions.findFirst({
      where: eq(caseDecisions.caseId, trademarkCase.id),
      orderBy: [desc(caseDecisions.extractedAt)],
    });

    const trademarkName =
      latestDecision?.trademarkNames?.[0] || trademarkCase.trademarkName || "Neue Marke";
    const countries = latestDecision?.countries?.length ? latestDecision.countries : ["DE"]; 
    const niceClasses = latestDecision?.niceClasses?.length ? latestDecision.niceClasses : [35];

    const base = trademarkName.trim();
    const seed = stableHash(`${base}|${countries.join(",")}|${niceClasses.join(",")}`);

    const suffixes = ["PRO", "PLUS", "ONE", "GO", "LAB", "IQ", "X", "24", "360"]; 
    const altSuffixes = ["NOVA", "NEX", "FLOW", "MINT", "SPARK", "NIMBLE", "AURA"]; 

    const normalized = base.replace(/\s+/g, " ");
    const compact = base.replace(/\s+/g, "");

    const searchTermsUsed = uniqStrings([
      normalized,
      compact,
      `${compact} ${pick(suffixes, seed)}`,
      `${compact}${pick(suffixes, seed + 1)}`,
      `${compact}-${pick(suffixes, seed + 2)}`,
    ]);

    const registers = ["DPMA", "EUIPO", "WIPO"]; 
    const statuses = ["registered", "application", "opposed"]; 

    const conflictCount = (seed % 3) + 1;
    const conflicts = Array.from({ length: conflictCount }).map((_, i) => {
      const accuracy = 55 + ((seed + i * 17) % 41); // 55-95
      const riskLevel: RiskLevel = accuracy >= 80 ? "high" : accuracy >= 65 ? "medium" : "low";
      const suffix = pick(suffixes, seed + i + 3);
      const conflictName = i === 0 ? `${compact}${suffix}` : `${compact}${suffix}${(seed + i) % 9}`;
      const applicationNumber = `A${(seed + i * 991) % 10000000}`.padEnd(8, "0");
      const registrationNumber = `R${(seed + i * 577) % 10000000}`.padEnd(8, "0");

      return {
        id: `${seed}-${i}`,
        name: conflictName,
        register: pick(registers, seed + i),
        holder: `Holder ${String.fromCharCode(65 + ((seed + i) % 26))} GmbH`,
        classes: niceClasses,
        accuracy,
        riskLevel,
        reasoning: `Ähnlichkeit basiert auf Schreibweise/Phonetik (${accuracy}%).`,
        status: pick(statuses, seed + i),
        applicationNumber,
        applicationDate: null,
        registrationNumber,
        registrationDate: null,
        isFamousMark: accuracy >= 90,
      };
    });

    const maxAccuracy = Math.max(...conflicts.map((c) => c.accuracy));
    const riskScore = maxAccuracy;
    const riskLevel: RiskLevel = riskScore >= 80 ? "high" : riskScore >= 65 ? "medium" : "low";

    const alternativeNames = Array.from({ length: 5 }).map((_, i) => {
      const name = `${compact}${pick(altSuffixes, seed + i)}${(seed + i) % 7}`;
      const altRiskScore = Math.max(15, riskScore - (20 + ((seed + i * 13) % 20)));
      const altRiskLevel: RiskLevel = altRiskScore >= 80 ? "high" : altRiskScore >= 65 ? "medium" : "low";
      return {
        name,
        riskScore: altRiskScore,
        riskLevel: altRiskLevel,
        conflictCount: altRiskScore >= 65 ? 1 : 0,
        explanation: "Mock: geringere Ähnlichkeit durch zusätzliche Silben/Abwandlung.",
      };
    });

    const famousMarkNames = conflicts.filter((c) => c.isFamousMark).map((c) => c.name);

    const analysisData = {
      caseId: trademarkCase.id,
      userId: session.user.id,
      searchQuery: {
        trademarkName,
        countries,
        niceClasses,
      },
      searchTermsUsed,
      conflicts,
      aiAnalysis: {
        nameAnalysis: `Mock-Analyse: "${trademarkName}" wirkt unterscheidungskräftig, jedoch bestehen Ähnlichkeiten zu bestehenden Marken.`,
        searchStrategy: `Mock-Strategie: Varianten (Spacing/Suffix) in ${countries.join(", ")} und Klassen ${niceClasses.join(", ")}.`,
        riskAssessment: `Mock-Risiko: Max. Ähnlichkeit ${riskScore}%.`,
        overallRisk: riskLevel,
        recommendation:
          riskLevel === "high"
            ? "Mock-Empfehlung: Alternativen prüfen oder Klassen/Länder anpassen."
            : riskLevel === "medium"
            ? "Mock-Empfehlung: Detailprüfung der Konflikte durchführen."
            : "Mock-Empfehlung: Risiko gering, trotzdem juristisch final prüfen.",
        famousMarkDetected: famousMarkNames.length > 0,
        famousMarkNames,
      },
      riskScore,
      riskLevel,
      totalResultsAnalyzed: conflicts.length,
      alternativeNames,
      updatedAt: new Date(),
    };

    const [analysis] = await db.insert(caseAnalyses).values(analysisData).returning();

    const stepsToComplete = ["recherche", "analyse"] as const;
    const existingSteps = await db
      .select()
      .from(caseSteps)
      .where(and(eq(caseSteps.caseId, trademarkCase.id), inArray(caseSteps.step, [...stepsToComplete])));

    const now = new Date();
    for (const s of existingSteps) {
      await db
        .update(caseSteps)
        .set({
          status: "completed",
          startedAt: s.startedAt || now,
          completedAt: now,
        })
        .where(eq(caseSteps.id, s.id));
    }

    await db
      .update(trademarkCases)
      .set({ updatedAt: now })
      .where(eq(trademarkCases.id, trademarkCase.id));

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error running recherche+analyse:", error);
    return NextResponse.json({ error: "Fehler beim Ausführen der Recherche/Analyse" }, { status: 500 });
  }
}
