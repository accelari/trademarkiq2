import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logApiUsage } from "@/lib/api-logger";

const TMSEARCH_SEARCH_URL = "https://tmsearch.ai/api/search/";
const TEST_API_KEY = "TESTAPIKEY";

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

interface TMSearchResult {
  mid?: string | number;
  verbal?: string;
  status?: string;
  submition?: string;
  protection?: string[];
  class?: string[];
  accuracy?: string | number;
  app?: string;
  reg?: string;
  img?: string;
  date?: { applied?: string; granted?: string; expiration?: string };
}

function sanitizeKeyword(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0590-\u05FF\s]/g, "")
    .trim();
}

function filterResults(
  results: TMSearchResult[],
  filters: {
    countries?: string[];
    liveOnly?: boolean;
    classes?: number[];
    includeRelatedClasses?: boolean;
    minAccuracy?: number;
  }
): { filtered: TMSearchResult[]; excluded: number } {
  let filtered = results;
  const originalCount = results.length;

  // Filter by countries/offices (including WIPO designations and EUIPO for EU countries)
  if (filters.countries && filters.countries.length > 0) {
    const selectedCountries = filters.countries.map(c => c.toUpperCase());
    const hasEuCountry = selectedCountries.some(c => EU_COUNTRIES.includes(c));
    const includeEuipo = hasEuCountry && !selectedCountries.includes("EU");

    filtered = filtered.filter((r) => {
      const office = (r.submition || "").toUpperCase();
      const protection = (r.protection || []).map(p => String(p).toUpperCase());

      // Direct office match
      if (selectedCountries.includes(office)) return true;

      // EUIPO marks apply to all EU member countries
      if (includeEuipo && office === "EU") return true;

      // Protection array match (for direct country marks)
      if (protection.some(p => selectedCountries.includes(p))) return true;

      // WIPO marks with matching designation
      if (office === "WO" && protection.length > 0) {
        if (protection.some(p => selectedCountries.includes(p))) return true;
        // WIPO marks designating EU also apply to EU countries
        if (hasEuCountry && protection.includes("EU")) return true;
      }

      return false;
    });
  }

  // Filter by status (LIVE only)
  if (filters.liveOnly) {
    filtered = filtered.filter((r) => r.status === "LIVE");
  }

  // Filter by Nizza classes
  if (filters.classes && filters.classes.length > 0) {
    const classStrings = filters.classes.map(c => String(c).padStart(2, "0"));
    filtered = filtered.filter((r) => {
      const resultClasses = (r.class || []).map(c => String(c).padStart(2, "0"));
      return resultClasses.some(c => classStrings.includes(c));
    });
  }

  // Filter by minimum accuracy
  if (filters.minAccuracy && filters.minAccuracy > 0) {
    filtered = filtered.filter((r) => Number(r.accuracy || 0) >= filters.minAccuracy!);
  }

  return {
    filtered,
    excluded: originalCount - filtered.length,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    
    const userId = session.user.id;

    const body = await request.json().catch(() => null);
    const keywordRaw = typeof body?.keyword === "string" ? body.keyword : "";
    const keyword = sanitizeKeyword(keywordRaw);

    // Optional filter parameters
    const countries: string[] = Array.isArray(body?.countries) ? body.countries : [];
    const liveOnly: boolean = body?.liveOnly === true;
    const classes: number[] = Array.isArray(body?.classes) ? body.classes.map(Number).filter((n: number) => !isNaN(n)) : [];
    const minAccuracy: number = typeof body?.minAccuracy === "number" ? body.minAccuracy : 0;
    const applyFilters: boolean = body?.applyFilters === true;

    if (!keyword) {
      return NextResponse.json({ error: "keyword ist erforderlich" }, { status: 400 });
    }

    const apiKey = process.env.TMSEARCH_API_KEY || TEST_API_KEY;
    const isTestMode = !process.env.TMSEARCH_API_KEY;

    const url = new URL(TMSEARCH_SEARCH_URL);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    let rawData: { total?: number; result?: TMSearchResult[]; timestamp?: string } | string | null = null;

    if (contentType.includes("application/json")) {
      rawData = await res.json().catch(() => null);
    } else {
      const textData = await res.text().catch(() => "");
      // Try to parse as JSON anyway (tmsearch sometimes returns text/json)
      try {
        rawData = JSON.parse(textData);
      } catch {
        rawData = textData;
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "tmsearch.ai Anfrage fehlgeschlagen",
          status: res.status,
          statusText: res.statusText,
          keyword,
          raw: rawData,
        },
        { status: res.status }
      );
    }

    // Parse results
    let results: TMSearchResult[] = [];
    let total = 0;

    if (rawData && typeof rawData === "object" && "result" in rawData) {
      results = rawData.result || [];
      total = rawData.total || results.length;
    }

    // Apply filters if requested
    let filtered: TMSearchResult[] = results;
    let excludedCount = 0;

    if (applyFilters && (countries.length > 0 || liveOnly || classes.length > 0 || minAccuracy > 0)) {
      const filterResult = filterResults(results, {
        countries,
        liveOnly,
        classes,
        minAccuracy,
      });
      filtered = filterResult.filtered;
      excludedCount = filterResult.excluded;
    }

    const durationMs = Date.now() - startTime;
    
    // API-Nutzung loggen und Credits abziehen
    await logApiUsage({
      userId,
      apiProvider: "tmsearch",
      apiEndpoint: "/api/tmsearch/search",
      units: 1, // 1 Suche
      unitType: "searches",
      durationMs,
      statusCode: 200,
      metadata: {
        keyword,
        totalResults: total,
        filteredResults: filtered.length,
        isTestMode,
      },
    });

    return NextResponse.json({
      success: true,
      keyword,
      isTestMode,
      total,
      totalFiltered: filtered.length,
      excluded: excludedCount,
      filters: applyFilters ? { countries, liveOnly, classes, minAccuracy } : null,
      results: filtered,
      raw: rawData,
    });
  } catch (error) {
    console.error("Error in tmsearch/search:", error);
    return NextResponse.json({ error: "Fehler bei tmsearch Anfrage" }, { status: 500 });
  }
}
