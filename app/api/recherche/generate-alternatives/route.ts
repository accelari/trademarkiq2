import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type GeneratorStyle = "similar" | "modern" | "creative" | "serious";
type GeneratorLanguage = "de" | "en" | "international";
type RiskLevel = "low" | "medium" | "high";

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
  const riskScore = 30 + (seed % 66);
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

    const originalBrand = typeof body?.originalBrand === "string" ? body.originalBrand.trim() : "";
    const classes = Array.isArray(body?.classes) ? body.classes : [];
    const style = (body?.style as GeneratorStyle) || "similar";
    const keywords = Array.isArray(body?.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string") : [];
    const language = (body?.language as GeneratorLanguage) || "de";
    const count = typeof body?.count === "number" && body.count > 0 ? Math.min(10, body.count) : 5;

    if (!originalBrand) {
      return NextResponse.json({ error: "originalBrand ist erforderlich" }, { status: 400 });
    }

    const seed = stableHash(`${originalBrand.toLowerCase()}|${style}|${language}|${keywords.join(",")}|${classes.join(",")}`);

    const suffixesByStyle: Record<GeneratorStyle, string[]> = {
      similar: ["PRO", "PLUS", "ONE", "IQ", "LAB", "GO"],
      modern: ["NOVA", "NEX", "FLOW", "MINT", "AURA", "HUB"],
      creative: ["SPARK", "BLOOM", "WAVE", "FABLE", "PIXEL", "ZEST"],
      serious: ["CONSULT", "LEGAL", "TRUST", "CORE", "GROUP", "PARTNER"],
    };

    const glue = language === "de" ? "" : "";

    const base = originalBrand.replace(/\s+/g, "");
    const primaryKeyword = (keywords[0] || "").replace(/\s+/g, "");

    const suggestions = Array.from({ length: count }).map((_, i) => {
      const suffix = pick(suffixesByStyle[style], seed + i);
      const number = (seed + i * 13) % 9;
      const name = primaryKeyword
        ? `${base}${glue}${primaryKeyword}${suffix}${number}`
        : `${base}${suffix}${number}`;

      const qc = evaluateName({ name, classes, countries: [] });

      return {
        name,
        explanation:
          style === "similar"
            ? "Vorschlag nah am Original (Suffix/Variation)."
            : style === "modern"
            ? "Moderner Vorschlag mit zeitgemäßem Klang."
            : style === "creative"
            ? "Kreativer Vorschlag mit hoher Unterscheidungskraft."
            : "Seriöser Vorschlag mit professioneller Anmutung.",
        quickCheckStatus: qc.riskLevel,
        quickCheckScore: qc.riskScore,
        quickCheckConflicts: qc.conflicts,
        quickCheckCriticalCount: qc.criticalCount,
      };
    });

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error("Error generating alternatives:", error);
    return NextResponse.json({ error: "Fehler bei der Generierung" }, { status: 500 });
  }
}
