import {
  TMSearchResponse,
  TMInfoResponse,
  NormalizedTrademark,
  normalizeResult,
  normalizeInfoResult,
  EU_COUNTRIES,
} from "./types";

const TMSEARCH_BASE_URL = "https://tmsearch.ai/api";

const TEST_API_KEY = "TESTAPIKEY";

interface SearchOptions {
  keyword: string;
  apiKey?: string;
}

interface InfoOptions {
  mid?: number;
  number?: string;
  type?: "APP" | "REG";
  office?: string;
  apiKey?: string;
}

class TMSearchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "TMSearchError";
  }
}

export class TMSearchClient {
  private apiKey: string;
  private baseUrl: string;
  private isTestKey: boolean;

  constructor(apiKey?: string) {
    const providedKey = apiKey || process.env.TMSEARCH_API_KEY;
    this.apiKey = providedKey || TEST_API_KEY;
    this.isTestKey = !providedKey;
    this.baseUrl = TMSEARCH_BASE_URL;

    if (this.isTestKey) {
      console.log("Using tmsearch.ai test API key (limited: max 390 results)");
    }
  }

  private async fetchApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}/`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    if (this.apiKey) {
      url.searchParams.set("api_key", this.apiKey);
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new TMSearchError(
          `API request failed: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof TMSearchError) {
        throw error;
      }
      throw new TMSearchError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  isTestMode(): boolean {
    return this.isTestKey;
  }

  async search(options: SearchOptions): Promise<{
    total: number;
    results: NormalizedTrademark[];
    isTestMode?: boolean;
  }> {
    const { keyword } = options;

    if (!keyword || keyword.trim().length === 0) {
      return { total: 0, results: [] };
    }

    const cleanKeyword = keyword.replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0590-\u05FF\s]/g, "").trim();

    if (!cleanKeyword) {
      return { total: 0, results: [] };
    }

    const response = await this.fetchApi<TMSearchResponse>("search", {
      keyword: cleanKeyword,
    });

    const results = (response.result || []).map(normalizeResult);

    return {
      total: response.total || 0,
      results,
      isTestMode: this.isTestKey,
    };
  }

  async getInfo(options: InfoOptions): Promise<NormalizedTrademark | null> {
    const { mid, number, type = "APP", office } = options;

    if (mid) {
      const response = await this.fetchApi<TMInfoResponse>("info", {
        mid: String(mid),
      });
      return normalizeInfoResult(response);
    }

    if (number && office) {
      const response = await this.fetchApi<TMInfoResponse>("info", {
        number,
        type,
        office,
      });
      return normalizeInfoResult(response);
    }

    throw new TMSearchError("Either mid or (number + office) is required");
  }

  async searchWithFilters(
    keyword: string,
    filters?: {
      status?: "active" | "expired" | "all";
      classes?: number[];
      offices?: string[];
      countries?: string[];
      minAccuracy?: number;
    }
  ): Promise<{
    total: number;
    results: NormalizedTrademark[];
    filtered: number;
  }> {
    const { total, results } = await this.search({ keyword });

    let filtered = results;
    const originalCount = results.length;
    
    if (results.length > 0 && filters?.offices) {
      const uniqueOffices = [...new Set(results.map(r => r.office))];
      console.log(`  [tmsearch] Raw results offices: ${uniqueOffices.join(", ")}`);
      console.log(`  [tmsearch] Filtering for offices: ${filters.offices.join(", ")}`);
    }

    if (filters) {
      if (filters.status && filters.status !== "all") {
        filtered = filtered.filter((tm) => tm.status === filters.status);
      }

      if (filters.classes && filters.classes.length > 0) {
        filtered = filtered.filter((tm) =>
          tm.niceClasses.some((cls) => filters.classes!.includes(cls))
        );
      }

      if (filters.offices && filters.offices.length > 0) {
        const selectedOffices = filters.offices;
        
        // Use EU_COUNTRIES from types
        const hasEuCountry = selectedOffices.some(o => EU_COUNTRIES.includes(o));
        const includeEuipo = hasEuCountry && !selectedOffices.includes("EU");
        
        if (includeEuipo) {
          console.log(`  [tmsearch] EU country detected - also including EUIPO marks`);
        }
        
        filtered = filtered.filter((tm) => {
          // Direct office match
          if (selectedOffices.includes(tm.office)) {
            return true;
          }
          
          // EUIPO marks apply to all EU member countries
          if (includeEuipo && tm.office === "EU") {
            return true;
          }
          
          // WIPO marks with matching designation country
          if (tm.office === "WO" && tm.designationCountries.length > 0) {
            const matchesDesignation = tm.designationCountries.some(
              (country) => selectedOffices.includes(country)
            );
            if (matchesDesignation) {
              return true;
            }
            // WIPO marks designating EU also apply to EU countries
            if (hasEuCountry && tm.designationCountries.includes("EU")) {
              return true;
            }
          }
          
          return false;
        });
        
        if (selectedOffices.some(o => o !== "WO")) {
          const nonWipoOffices = selectedOffices.filter(o => o !== "WO");
          console.log(`  [tmsearch] Enhanced filter: Also including WIPO marks designating: ${nonWipoOffices.join(", ")}`);
        }
      }

      if (filters.countries && filters.countries.length > 0) {
        filtered = filtered.filter((tm) =>
          tm.designationCountries.some((country) =>
            filters.countries!.includes(country)
          )
        );
      }

      if (filters.minAccuracy) {
        filtered = filtered.filter((tm) => tm.accuracy >= filters.minAccuracy!);
      }
    }

    return {
      total,
      results: filtered,
      filtered: originalCount - filtered.length,
    };
  }
}

let clientInstance: TMSearchClient | null = null;

export function getTMSearchClient(): TMSearchClient {
  if (!clientInstance) {
    clientInstance = new TMSearchClient();
  }
  return clientInstance;
}

export { TMSearchError };
