import { NextRequest, NextResponse } from "next/server";
import { getTMSearchClient } from "@/lib/tmsearch/client";

interface TMViewSearchParams {
  query: string;
  offices: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: TMViewSearchParams = await request.json();
    const { query, offices } = body;

    if (!query || !offices || offices.length === 0) {
      return NextResponse.json(
        { error: "Suchbegriff und mindestens ein Amt erforderlich" },
        { status: 400 }
      );
    }

    console.log(`[TMView API] Searching for: ${query} in offices: ${offices.join(", ")}`);

    const client = getTMSearchClient();
    const result = await client.searchWithFilters(query, {
      offices: offices,
    });

    console.log(`[TMView API] Found ${result.results.length} results`);

    const trademarks = result.results.map(tm => ({
      markName: tm.name || "",
      applicationNumber: tm.applicationNumber || "",
      registrationNumber: tm.registrationNumber,
      office: tm.office,
      status: tm.status === "active" ? "Registered" : tm.status,
      applicantName: tm.holder,
      filingDate: tm.applicationDate,
      registrationDate: tm.registrationDate,
      niceClasses: tm.niceClasses?.map(String),
      imageUrl: tm.imageUrl,
      accuracy: tm.accuracy,
    }));

    return NextResponse.json({
      total: result.total,
      trademarks,
      method: client.isTestMode() ? "tmsearch-test" : "tmsearch-api",
      searchTime: Date.now() - startTime,
      steps: [
        "Suche gestartet...",
        `tmsearch.ai API abgefragt`,
        `${offices.length} Ämter gefiltert`,
        `${trademarks.length} Marken gefunden`,
      ],
      isTestMode: client.isTestMode(),
    });
  } catch (error) {
    console.error("[TMView API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Suche fehlgeschlagen",
        total: 0,
        trademarks: [],
        method: "error",
        searchTime: Date.now() - startTime,
        steps: ["Fehler bei der Suche"],
      },
      { status: 500 }
    );
  }
}
