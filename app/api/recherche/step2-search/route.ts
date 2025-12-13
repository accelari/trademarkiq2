import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { queryTerms, klassen, laender } = body;

    if (!Array.isArray(queryTerms) || queryTerms.length === 0) {
      return NextResponse.json({ 
        error: "Bitte geben Sie mindestens einen Suchbegriff an" 
      }, { status: 400 });
    }

    const selectedKlassen = Array.isArray(klassen) && klassen.length > 0 ? klassen : [];
    const selectedLaender = Array.isArray(laender) && laender.length > 0 ? laender : [];

    console.log("=== STEP 2: TRADEMARK SEARCH ===");
    console.log("Selected offices filter:", selectedLaender);
    console.log("Query terms:", queryTerms);

    const tmsearchClient = getTMSearchClient();
    let allResults: any[] = [];
    const searchTerms = queryTerms.slice(0, 8);
    const searchTermsUsed: string[] = [];

    for (let i = 0; i < searchTerms.length; i++) {
      const term = searchTerms[i];
      console.log(`Searching "${term}" (${i + 1}/${searchTerms.length})...`);
      
      try {
        const searchParams: any = {
          status: "active",
          classes: selectedKlassen.length > 0 ? selectedKlassen : undefined,
          minAccuracy: 60,
        };
        
        if (selectedLaender.length > 0) {
          searchParams.offices = selectedLaender;
        }
        
        const searchResult = await tmsearchClient.searchWithFilters(term, searchParams);
        
        console.log(`Search "${term}": ${searchResult.results?.length || 0} results after filter`);
        if (searchResult.results?.length > 0) {
          const officesFound = [...new Set(searchResult.results.map(r => r.office))];
          console.log(`  Offices in results: ${officesFound.join(", ")}`);
        }
        
        if (searchResult.results) {
          const newResults = searchResult.results.filter(
            r => !allResults.some(existing => existing.id === r.id)
          );
          allResults = [...allResults, ...newResults];
          searchTermsUsed.push(term);
          
          if (newResults.length > 0) {
            console.log(`  "${term}": ${newResults.length} new results (total: ${allResults.length})`);
          }
        }
      } catch (searchError) {
        console.error(`Suchfehler für "${term}":`, searchError);
      }
    }

    console.log(`Total results after all searches: ${allResults.length}`);

    allResults.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    allResults = allResults.slice(0, 50);

    return NextResponse.json({
      results: allResults,
      totalResults: allResults.length,
      searchTermsUsed,
    });
  } catch (error: any) {
    console.error("Step 2 - Search error:", error);
    
    return NextResponse.json({
      error: "Ein Fehler ist bei der Markensuche aufgetreten.",
    }, { status: 500 });
  }
}
