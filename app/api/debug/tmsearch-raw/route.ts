import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";
import { getSearchOfficesForCountry, EU_COUNTRIES, WIPO_MEMBERS, OFFICE_NAMES } from "@/lib/tmsearch/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { keyword, offices, classes } = await request.json();
    
    if (!keyword?.trim()) {
      return NextResponse.json({ error: "Keyword fehlt" }, { status: 400 });
    }

    const selectedCountry = offices?.[0] || "DE";
    const searchStrategy = getSearchOfficesForCountry(selectedCountry);

    const client = getTMSearchClient();
    
    const searchParams: any = {
      status: "active",
      minAccuracy: 60,
    };
    
    if (offices && offices.length > 0) {
      searchParams.offices = offices;
    }
    
    if (classes && classes.length > 0) {
      searchParams.classes = classes;
    }
    
    const { total, results: rawResults } = await client.search({ keyword: keyword.trim() });
    
    const { results: filteredResults } = await client.searchWithFilters(keyword.trim(), searchParams);

    const officeResults: Record<string, { 
      found: number; 
      results: any[];
      type: string;
      reason: string;
    }> = {};

    for (const office of searchStrategy.offices) {
      let matchingResults: any[] = [];

      if (office.type === "national") {
        matchingResults = filteredResults.filter(r => r.office === office.code);
      } else if (office.type === "wipo") {
        matchingResults = filteredResults.filter(r => 
          r.office === "WO" && 
          (r.designationCountries.includes(selectedCountry) || r.designationCountries.includes("EU"))
        );
      } else if (office.type === "euipo") {
        matchingResults = filteredResults.filter(r => r.office === "EU" || r.office === "EM");
      }

      officeResults[office.code] = {
        found: matchingResults.length,
        type: office.type,
        reason: office.reason,
        results: matchingResults.map(r => ({
          name: r.name,
          office: r.office,
          applicationNumber: r.applicationNumber,
          registrationNumber: r.registrationNumber,
          niceClasses: r.niceClasses,
          status: r.status,
          accuracy: r.accuracy,
          designationCountries: r.designationCountries,
          holder: r.holder,
        }))
      };
    }

    const allFilteredResults = Object.values(officeResults).flatMap(o => o.results);
    const uniqueResults = allFilteredResults.filter((r, i, arr) => 
      arr.findIndex(x => x.applicationNumber === r.applicationNumber) === i
    );

    return NextResponse.json({
      keyword,
      selectedCountry,
      searchStrategy: {
        country: searchStrategy.country,
        countryName: searchStrategy.countryName,
        isWipoMember: WIPO_MEMBERS.includes(selectedCountry),
        isEuMember: EU_COUNTRIES.includes(selectedCountry),
        offices: searchStrategy.offices
      },
      apiResponse: {
        total,
        allResultsCount: rawResults.length,
        filteredCount: filteredResults.length,
        uniqueOfficesInData: [...new Set(rawResults.map(r => r.office))],
        filtersApplied: {
          status: "active",
          minAccuracy: 60,
          offices: offices || [],
          classes: classes || []
        }
      },
      officeResults,
      summary: {
        totalUniqueResults: uniqueResults.length,
        rawTotal: rawResults.length,
        afterFilters: filteredResults.length,
        byOffice: Object.entries(officeResults).map(([code, data]) => ({
          office: code,
          name: OFFICE_NAMES[code] || code,
          type: data.type,
          count: data.found,
          reason: data.reason
        }))
      },
      results: uniqueResults
    });
  } catch (error) {
    console.error("TMSearch raw error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
