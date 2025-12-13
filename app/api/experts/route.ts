import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { experts, Expert } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCached, setCache } from "@/lib/cache";
import { handleAPIError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const location = searchParams.get("location");

    const cacheKey = `experts:${search || ''}:${location || ''}`;
    const cached = getCached<Expert[]>(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached);
    }

    const query = db.select().from(experts).orderBy(desc(experts.rating));

    const allExperts = await query;

    let filtered = allExperts;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.specialties?.some((s: string) => s.toLowerCase().includes(searchLower))
      );
    }

    if (location && location !== "all") {
      filtered = filtered.filter((e) => e.location === location);
    }

    setCache(cacheKey, filtered, 600);

    return NextResponse.json(filtered);
  } catch (error) {
    return handleAPIError(error);
  }
}
