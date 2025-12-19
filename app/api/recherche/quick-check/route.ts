import { NextRequest, NextResponse } from "next/server";
import { TMSearchClient } from "@/lib/tmsearch/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, classes, countries } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = new TMSearchClient();
    const searchResult = await client.search({ keyword: name });

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
      const classSet = new Set(classes.map((c: number) => String(c).padStart(2, "0")));
      filteredResults = filteredResults.filter(r => {
        const resultClasses = r.niceClasses || [];
        return resultClasses.some((rc: number) => classSet.has(String(rc).padStart(2, "0")));
      });
    }

    // Check for exact or very similar matches
    const nameLower = name.toLowerCase();
    const conflicts = filteredResults.filter(r => {
      const resultName = (r.name || "").toLowerCase();
      // Exact match or very high similarity
      return resultName === nameLower || 
             resultName.includes(nameLower) || 
             nameLower.includes(resultName);
    });

    return NextResponse.json({
      conflictsFound: conflicts.length,
      totalResults: filteredResults.length,
      topConflicts: conflicts.slice(0, 3).map(c => ({
        name: c.name,
        office: c.office,
        classes: c.niceClasses
      }))
    });
  } catch (error) {
    console.error("Quick check error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
