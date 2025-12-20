import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TMSearchClient } from "@/lib/tmsearch/client";
import { calculateSimilarity } from "@/lib/similarity";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { name, classes = [], countries = [] } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const brandName = name.trim();
    const client = new TMSearchClient();
    const searchResult = await client.search({ keyword: brandName });

    // Filter by selected countries if provided
    let filteredResults = searchResult.results;
    if (countries && countries.length > 0) {
      const countrySet = new Set(countries.map((c: string) => c.toUpperCase()));
      filteredResults = filteredResults.filter(r =>
        countrySet.has(r.office?.toUpperCase() || "") ||
        r.office?.toUpperCase() === "WO" // Include WIPO marks
      );
    }

    // Filter by Nice classes if provided
    if (classes && classes.length > 0) {
      const classSet = new Set(classes.map((c: number) => Number(c)));
      filteredResults = filteredResults.filter(r => {
        const resultClasses = r.niceClasses || [];
        if (resultClasses.length === 0) return true; // Include if no class info
        return resultClasses.some((rc: number) => classSet.has(Number(rc)));
      });
    }

    // Calculate similarity for each result
    const resultsWithSimilarity = filteredResults.map(r => {
      const similarity = calculateSimilarity(brandName, r.name || "");
      return {
        ...r,
        similarity: similarity.combined,
        phoneticSimilarity: similarity.phonetic,
        visualSimilarity: similarity.visual,
      };
    });

    // Sort by similarity and get top conflicts
    const sortedResults = resultsWithSimilarity
      .filter(r => r.similarity >= 50) // Only consider 50%+ as conflicts
      .sort((a, b) => b.similarity - a.similarity);

    const criticalConflicts = sortedResults.filter(r => r.similarity >= 80);
    const mediumConflicts = sortedResults.filter(r => r.similarity >= 60 && r.similarity < 80);
    const lowConflicts = sortedResults.filter(r => r.similarity >= 50 && r.similarity < 60);

    // Calculate overall risk score (0-100)
    // Higher score = higher risk
    let riskScore = 0;

    if (criticalConflicts.length > 0) {
      // Critical conflicts have the most weight
      riskScore = Math.min(100, 70 + (criticalConflicts.length * 10));
    } else if (mediumConflicts.length > 0) {
      riskScore = Math.min(79, 40 + (mediumConflicts.length * 8));
    } else if (lowConflicts.length > 0) {
      riskScore = Math.min(49, 20 + (lowConflicts.length * 5));
    } else if (filteredResults.length > 0) {
      // Some results but no real conflicts
      riskScore = Math.min(19, filteredResults.length * 2);
    }

    // Determine risk level
    let riskLevel: "low" | "medium" | "high";
    if (riskScore >= 70) {
      riskLevel = "high";
    } else if (riskScore >= 40) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }

    // Top conflicts for display
    const topConflicts = sortedResults.slice(0, 5).map(c => ({
      name: c.name,
      office: c.office,
      classes: c.niceClasses || [],
      similarity: c.similarity,
      status: c.status || "active",
    }));

    return NextResponse.json({
      success: true,
      brandName,
      riskScore,
      riskLevel,
      conflicts: sortedResults.length,
      criticalCount: criticalConflicts.length,
      mediumCount: mediumConflicts.length,
      lowCount: lowConflicts.length,
      totalSearched: filteredResults.length,
      topConflicts,
    });
  } catch (error) {
    console.error("Quick check error:", error);
    return NextResponse.json({
      error: "Die Registerprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut."
    }, { status: 500 });
  }
}
