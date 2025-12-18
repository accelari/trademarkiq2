import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";
import { getOfficeName } from "@/lib/tmsearch/types";

const searchCountMap = new Map<string, { count: number; resetAt: number }>();

const MAX_SEARCHES_PER_SESSION = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(sessionId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = searchCountMap.get(sessionId);

  if (!record || now > record.resetAt) {
    searchCountMap.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_SEARCHES_PER_SESSION - 1 };
  }

  if (record.count >= MAX_SEARCHES_PER_SESSION) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_SEARCHES_PER_SESSION - record.count };
}

function calculateRiskLevel(results: Array<{ accuracy: number }>): "low" | "medium" | "high" {
  if (results.length === 0) return "low";

  const highSimilarity = results.filter(r => r.accuracy >= 85).length;
  const mediumSimilarity = results.filter(r => r.accuracy >= 70 && r.accuracy < 85).length;

  if (highSimilarity >= 1) return "high";
  if (mediumSimilarity >= 2 || results.length >= 5) return "medium";
  return "low";
}

function generateSummary(
  searchTerm: string,
  totalResults: number,
  riskLevel: "low" | "medium" | "high",
  topConflicts: Array<{ name: string; similarity: number }>
): string {
  if (totalResults === 0) {
    return `Für "${searchTerm}" wurden keine ähnlichen Marken gefunden. Das Risiko erscheint gering.`;
  }

  const riskText = {
    low: "gering",
    medium: "mittel",
    high: "hoch"
  };

  const topMatch = topConflicts[0];
  let summary = `Für "${searchTerm}" wurden ${totalResults} ähnliche Marken gefunden. Das Kollisionsrisiko ist ${riskText[riskLevel]}.`;

  if (topMatch && topMatch.similarity >= 70) {
    summary += ` Die höchste Ähnlichkeit (${topMatch.similarity}%) besteht zu "${topMatch.name}".`;
  }

  if (riskLevel === "high") {
    summary += " Eine detaillierte Prüfung wird empfohlen.";
  }

  return summary;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[assistant-tools/search] Unauthorized request");
      return NextResponse.json(
        { success: false, error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const sessionId = session.user.id;
    const { allowed, remaining } = checkRateLimit(sessionId);

    if (!allowed) {
      console.log(`[assistant-tools/search] Rate limit exceeded for user ${sessionId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Suchlimit erreicht. Maximal 5 Suchen pro Stunde erlaubt.",
          rateLimitExceeded: true
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { searchTerm, countries, classes, caseId } = body;

    if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Suchbegriff (searchTerm) ist erforderlich" },
        { status: 400 }
      );
    }

    const cleanSearchTerm = searchTerm.trim();
    const selectedCountries = Array.isArray(countries) && countries.length > 0 ? countries : ["DE"];
    const selectedClasses = Array.isArray(classes) ? classes.filter(c => typeof c === "number") : [];

    console.log("=== ASSISTANT-TOOLS: SEARCH ===");
    console.log(`User: ${sessionId}`);
    console.log(`Search term: "${cleanSearchTerm}"`);
    console.log(`Countries: ${selectedCountries.join(", ")}`);
    console.log(`Classes: ${selectedClasses.length > 0 ? selectedClasses.join(", ") : "all"}`);
    console.log(`Case ID: ${caseId || "none"}`);
    console.log(`Remaining searches: ${remaining}`);

    const tmsearchClient = getTMSearchClient();

    const searchParams: {
      status: "active";
      offices?: string[];
      classes?: number[];
      minAccuracy: number;
    } = {
      status: "active",
      minAccuracy: 60,
    };

    if (selectedCountries.length > 0) {
      searchParams.offices = selectedCountries;
    }

    if (selectedClasses.length > 0) {
      searchParams.classes = selectedClasses;
    }

    const searchResult = await tmsearchClient.searchWithFilters(cleanSearchTerm, searchParams);

    const limitedResults = searchResult.results.slice(0, 20);

    const riskLevel = calculateRiskLevel(limitedResults);

    const topConflicts = limitedResults.slice(0, 5).map(r => ({
      name: r.name,
      similarity: r.accuracy,
      holder: r.holder || "Unbekannt",
      office: getOfficeName(r.office)
    }));

    const summary = generateSummary(cleanSearchTerm, limitedResults.length, riskLevel, topConflicts);

    const duration = Date.now() - startTime;
    console.log(`[assistant-tools/search] Completed in ${duration}ms - ${limitedResults.length} results, risk: ${riskLevel}`);

    return NextResponse.json({
      success: true,
      searchTerm: cleanSearchTerm,
      totalResults: limitedResults.length,
      riskLevel,
      topConflicts,
      summary,
      remainingSearches: remaining
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[assistant-tools/search] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Ein Fehler ist bei der Suche aufgetreten.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
