import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

type RiskLevel = "low" | "medium" | "high";

function evaluateName(input: {
  name: string;
  classes: number[];
  countries: string[];
}): {
  riskLevel: RiskLevel;
  riskScore: number;
  conflicts: number;
  criticalCount: number;
} {
  const name = input.name.trim();
  const classes = (input.classes || []).filter((c) => Number.isFinite(c));
  const countries = (input.countries || []).filter((c) => typeof c === "string" && c.trim().length > 0);

  const seed = stableHash(`${name.toLowerCase()}|${classes.join(",")}|${countries.join(",")}`);
  const riskScore = 35 + (seed % 61);
  const conflicts = seed % 6;
  const riskLevel: RiskLevel = riskScore >= 80 ? "high" : riskScore >= 65 ? "medium" : "low";
  const criticalCount = riskLevel === "high" ? Math.max(1, Math.min(conflicts, 2)) : 0;

  return { riskLevel, riskScore, conflicts, criticalCount };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name : "";
    const classes = Array.isArray(body?.classes) ? body.classes : [];
    const countries = Array.isArray(body?.countries) ? body.countries : [];

    if (!name.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const result = evaluateName({ name, classes, countries });

    return NextResponse.json({
      success: true,
      name: name.trim(),
      ...result,
    });
  } catch (error) {
    console.error("Error in quick-check:", error);
    return NextResponse.json({ error: "Fehler beim Quick-Check" }, { status: 500 });
  }
}
