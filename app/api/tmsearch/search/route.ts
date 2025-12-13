import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";

const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(keyword: string, filters: any): string {
  return `${keyword.toLowerCase()}-${JSON.stringify(filters)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("q") || searchParams.get("keyword") || "";
    const statusFilter = searchParams.get("status") || "active";
    const classesParam = searchParams.get("classes");
    const officeParam = searchParams.get("office");
    const countryParam = searchParams.get("country");
    const minAccuracy = parseInt(searchParams.get("minAccuracy") || "80");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!keyword.trim()) {
      return NextResponse.json({
        total: 0,
        results: [],
        totalPages: 0,
        currentPage: 1,
      });
    }

    const filters = {
      status: statusFilter as "active" | "expired" | "all",
      classes: classesParam ? classesParam.split(",").map(Number).filter(Boolean) : undefined,
      offices: officeParam && officeParam !== "all" ? [officeParam] : undefined,
      countries: countryParam && countryParam !== "all" ? [countryParam] : undefined,
      minAccuracy,
    };

    const cacheKey = getCacheKey(keyword, filters);
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const paginatedResults = cached.data.results.slice(offset, offset + limit);
      return NextResponse.json({
        total: cached.data.total,
        results: paginatedResults,
        totalPages: Math.ceil(cached.data.results.length / limit),
        currentPage: Math.floor(offset / limit) + 1,
        filtered: cached.data.filtered,
        cached: true,
      });
    }

    const client = getTMSearchClient();
    const isTestMode = client.isTestMode();
    const response = await client.searchWithFilters(keyword, filters);

    searchCache.set(cacheKey, { data: response, timestamp: Date.now() });

    if (searchCache.size > 100) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }

    const paginatedResults = response.results.slice(offset, offset + limit);

    return NextResponse.json({
      total: response.total,
      results: paginatedResults,
      totalPages: Math.ceil(response.results.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
      filtered: response.filtered,
      isTestMode,
    });
  } catch (error) {
    console.error("TMSearch API error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Markensuche. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, status = "active", classes, office, country, minAccuracy, limit = 20, offset = 0 } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({
        total: 0,
        results: [],
        totalPages: 0,
        currentPage: 1,
      });
    }

    const filters = {
      status: (status || "active") as "active" | "expired" | "all",
      classes: classes?.length ? classes : undefined,
      offices: office && office !== "all" ? [office] : undefined,
      countries: country && country !== "all" ? [country] : undefined,
      minAccuracy: minAccuracy || 80,
    };

    const client = getTMSearchClient();
    const isTestMode = client.isTestMode();
    const response = await client.searchWithFilters(keyword, filters);

    const paginatedResults = response.results.slice(offset, offset + limit);

    return NextResponse.json({
      total: response.total,
      results: paginatedResults,
      totalPages: Math.ceil(response.results.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
      filtered: response.filtered,
      isTestMode,
    });
  } catch (error) {
    console.error("TMSearch API error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Markensuche. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
