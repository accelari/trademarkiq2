"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface SearchResult {
  id: string;
  success: boolean;
  searchTerm: string;
  totalResults: number;
  riskLevel: "low" | "medium" | "high";
  topConflicts: Array<{
    name: string;
    similarity: number;
    holder: string;
    office: string;
  }>;
  summary: string;
  timestamp: Date;
}

export interface SearchParams {
  searchTerm: string;
  countries?: string[];
  classes?: number[];
  caseId?: string;
}

export interface AssistantSearchEventDetail {
  result: SearchResult;
  params: SearchParams;
}

export class AssistantToolsError extends Error {
  constructor(
    message: string,
    public code: "RATE_LIMIT" | "NETWORK_ERROR" | "INVALID_RESPONSE" | "UNAUTHORIZED" | "UNKNOWN"
  ) {
    super(message);
    this.name = "AssistantToolsError";
  }
}

const CUSTOM_EVENT_NAME = "assistant-search-result";
const CLEAR_ALL_EVENT_NAME = "assistant-clear-all-results";

export function dispatchSearchResultEvent(detail: AssistantSearchEventDetail) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent(CUSTOM_EVENT_NAME, { detail });
    window.dispatchEvent(event);
  }
}

export function clearAllResults() {
  if (typeof window !== "undefined") {
    const event = new CustomEvent(CLEAR_ALL_EVENT_NAME);
    window.dispatchEvent(event);
  }
}

function generateResultId(searchTerm: string, timestamp: number): string {
  return `${searchTerm}-${timestamp}`;
}

export function useSearchResultListener(
  onResult: (result: SearchResult) => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(onResult);

  useEffect(() => {
    callbackRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const handler = (event: CustomEvent<AssistantSearchEventDetail>) => {
      callbackRef.current(event.detail.result);
    };

    window.addEventListener(CUSTOM_EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(CUSTOM_EVENT_NAME, handler as EventListener);
  }, deps);
}

export function useAssistantTools() {
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const [remainingSearches, setRemainingSearches] = useState<number>(5);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClearAll = () => {
      setSearchHistory([]);
      setLastSearchResult(null);
    };

    window.addEventListener(CLEAR_ALL_EVENT_NAME, handleClearAll);
    return () => window.removeEventListener(CLEAR_ALL_EVENT_NAME, handleClearAll);
  }, []);

  const performSearch = useCallback(
    async (params: SearchParams): Promise<SearchResult> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setIsSearching(true);

      try {
        const response = await fetch("/api/assistant-tools/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchTerm: params.searchTerm,
            countries: params.countries,
            classes: params.classes,
            caseId: params.caseId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (response.status === 401) {
          throw new AssistantToolsError(
            "Sie müssen angemeldet sein, um Suchen durchzuführen.",
            "UNAUTHORIZED"
          );
        }

        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new AssistantToolsError(
            errorData.error || "Suchlimit erreicht. Maximal 5 Suchen pro Stunde erlaubt.",
            "RATE_LIMIT"
          );
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AssistantToolsError(
            errorData.error || `HTTP Fehler: ${response.status}`,
            "NETWORK_ERROR"
          );
        }

        const data = await response.json();

        if (!data || typeof data.success !== "boolean") {
          throw new AssistantToolsError(
            "Ungültige Antwort vom Server",
            "INVALID_RESPONSE"
          );
        }

        if (!data.success) {
          throw new AssistantToolsError(
            data.error || "Suche fehlgeschlagen",
            "UNKNOWN"
          );
        }

        const timestamp = Date.now();
        const searchResult: SearchResult = {
          id: generateResultId(params.searchTerm, timestamp),
          success: data.success,
          searchTerm: data.searchTerm || params.searchTerm,
          totalResults: data.totalResults || 0,
          riskLevel: data.riskLevel || "low",
          topConflicts: data.topConflicts || [],
          summary: data.summary || "",
          timestamp: new Date(timestamp),
        };

        if (typeof data.remainingSearches === "number") {
          setRemainingSearches(data.remainingSearches);
        }

        setLastSearchResult(searchResult);
        setSearchHistory((prev) => {
          const exists = prev.some((r) => r.id === searchResult.id);
          if (exists) {
            return prev;
          }
          return [...prev, searchResult];
        });

        dispatchSearchResultEvent({ result: searchResult, params });

        return searchResult;
      } catch (error) {
        if (error instanceof AssistantToolsError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new AssistantToolsError("Suche wurde abgebrochen", "UNKNOWN");
          }

          if (
            error.message.includes("fetch") ||
            error.message.includes("network") ||
            error.message.includes("Failed to fetch")
          ) {
            throw new AssistantToolsError(
              "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.",
              "NETWORK_ERROR"
            );
          }
        }

        throw new AssistantToolsError(
          "Ein unerwarteter Fehler ist aufgetreten",
          "UNKNOWN"
        );
      } finally {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    setLastSearchResult(null);
  }, []);

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSearching(false);
    }
  }, []);

  return {
    performSearch,
    isSearching,
    lastSearchResult,
    remainingSearches,
    searchHistory,
    clearHistory,
    cancelSearch,
  };
}
