export interface TrademarkResult {
  applicationNumber: string;
  registrationNumber?: string;
  markName: string;
  status: string;
  applicantName?: string;
  filingDate?: string;
  registrationDate?: string;
  office: string;
  niceClasses?: string[];
  imageUrl?: string;
  similarity?: number;
}

export interface SearchResponse {
  total: number;
  trademarks: TrademarkResult[];
  method: string;
  searchTime: number;
  error?: string;
}

export async function searchEUIPO(query: string): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    const url = new URL("https://euipo.europa.eu/copla/api/public/trademark/search");
    url.searchParams.set("text", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("size", "20");
    
    console.log(`[EUIPO API] Searching for: ${query}`);
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "TrademarkIQ/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`EUIPO API error: ${response.status}`);
    }

    const data = await response.json();
    const trademarks: TrademarkResult[] = [];

    if (data.content && Array.isArray(data.content)) {
      for (const tm of data.content) {
        trademarks.push({
          markName: tm.wordElement || tm.denominationSecondLanguage || "",
          applicationNumber: tm.applicationNumber || "",
          registrationNumber: tm.registrationNumber,
          office: "EUIPO",
          status: tm.status || "Unknown",
          applicantName: tm.applicantName,
          filingDate: tm.applicationDate,
          registrationDate: tm.registrationDate,
          niceClasses: tm.niceClasses,
          imageUrl: tm.imageUrl,
        });
      }
    }

    return {
      total: data.totalElements || trademarks.length,
      trademarks,
      method: "euipo-api",
      searchTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[EUIPO API] Error:", error);
    return {
      total: 0,
      trademarks: [],
      method: "euipo-api",
      searchTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function searchDPMA(query: string): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    const url = `https://register.dpma.de/DPMAregister/marke/quickSearch?query=${encodeURIComponent(query)}&format=json`;
    
    console.log(`[DPMA API] Searching for: ${query}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "TrademarkIQ/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`DPMA API error: ${response.status}`);
    }

    const data = await response.json();
    const trademarks: TrademarkResult[] = [];

    if (data.items && Array.isArray(data.items)) {
      for (const tm of data.items) {
        trademarks.push({
          markName: tm.markenform?.wortmarke || tm.bezeichnung || "",
          applicationNumber: tm.aktenzeichen || "",
          registrationNumber: tm.registernummer,
          office: "DPMA",
          status: tm.status || "Unknown",
          applicantName: tm.inhaber?.name,
          filingDate: tm.anmeldetag,
          niceClasses: tm.warenDienstleistungen?.klassen,
        });
      }
    }

    return {
      total: data.totalCount || trademarks.length,
      trademarks,
      method: "dpma-api",
      searchTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[DPMA API] Error:", error);
    return {
      total: 0,
      trademarks: [],
      method: "dpma-api",
      searchTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function searchUSPTO(query: string): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    console.log(`[USPTO API] Searching for: ${query}`);
    
    const response = await fetch(
      `https://tsdrapi.uspto.gov/ts/cd/casestatus/sn/search?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "TrademarkIQ/1.0",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`USPTO API error: ${response.status}`);
    }

    const data = await response.json();
    const trademarks: TrademarkResult[] = [];

    if (data.trademarks && Array.isArray(data.trademarks)) {
      for (const tm of data.trademarks) {
        trademarks.push({
          markName: tm.markName || "",
          applicationNumber: tm.serialNumber || "",
          registrationNumber: tm.registrationNumber,
          office: "USPTO",
          status: tm.status || "Unknown",
          applicantName: tm.ownerName,
          filingDate: tm.filingDate,
          registrationDate: tm.registrationDate,
        });
      }
    }

    return {
      total: trademarks.length,
      trademarks,
      method: "uspto-api",
      searchTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[USPTO API] Error:", error);
    return {
      total: 0,
      trademarks: [],
      method: "uspto-api",
      searchTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function searchAllOffices(
  query: string,
  offices: string[]
): Promise<SearchResponse> {
  const startTime = Date.now();
  const allTrademarks: TrademarkResult[] = [];
  const errors: string[] = [];

  const searches: Promise<SearchResponse>[] = [];

  if (offices.includes("EM") || offices.includes("EU")) {
    searches.push(searchEUIPO(query));
  }
  if (offices.includes("DE")) {
    searches.push(searchDPMA(query));
  }
  if (offices.includes("US")) {
    searches.push(searchUSPTO(query));
  }

  const results = await Promise.allSettled(searches);

  for (const result of results) {
    if (result.status === "fulfilled") {
      allTrademarks.push(...result.value.trademarks);
      if (result.value.error) {
        errors.push(result.value.error);
      }
    } else {
      errors.push(result.reason?.message || "Unknown error");
    }
  }

  return {
    total: allTrademarks.length,
    trademarks: allTrademarks,
    method: "multi-office-api",
    searchTime: Date.now() - startTime,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
