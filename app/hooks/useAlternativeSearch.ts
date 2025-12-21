"use client";

import { useCallback } from "react";
import {
  useAlternativeSearchStore,
  type GeneratorStyle,
  type NameSuggestion,
} from "@/app/stores/alternativeSearchStore";

export function useAlternativeSearch() {
  const store = useAlternativeSearchStore();

  const generateAlternatives = useCallback(
    async (style: GeneratorStyle): Promise<NameSuggestion[]> => {
      store.setIsGenerating(true);
      store.setGeneratorError(null);

      try {
        const response = await fetch("/api/recherche/generate-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalBrand: store.originalBrand,
            classes: store.selectedClasses,
            style: style,
            keywords: [],
            language: "de",
            count: 5,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Generierung fehlgeschlagen");
        }

        const data = await response.json();
        
        const suggestions: NameSuggestion[] = data.suggestions.map((s: {
          name: string;
          explanation: string;
          quickCheckStatus?: string;
          quickCheckScore?: number;
          quickCheckConflicts?: number;
        }) => ({
          name: s.name,
          explanation: s.explanation,
          quickCheckStatus: (s.quickCheckStatus || "idle") as "idle" | "checking" | "low" | "medium" | "high" | "error",
          quickCheckScore: s.quickCheckScore,
          quickCheckConflicts: s.quickCheckConflicts,
        }));

        store.setSuggestions(suggestions);
        return suggestions;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten";
        store.setGeneratorError(message);
        throw error;
      } finally {
        store.setIsGenerating(false);
      }
    },
    [store]
  );

  const quickCheck = useCallback(
    async (name: string): Promise<{ riskLevel: "low" | "medium" | "high"; riskScore: number; conflicts: number }> => {
      store.updateSuggestion(name, { quickCheckStatus: "checking" });

      try {
        const response = await fetch("/api/recherche/quick-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            classes: store.selectedClasses,
            countries: [],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Prüfung fehlgeschlagen");
        }

        const data = await response.json();
        const result = {
          riskLevel: data.riskLevel as "low" | "medium" | "high",
          riskScore: data.riskScore,
          conflicts: data.conflicts,
        };

        store.updateSuggestion(name, {
          quickCheckStatus: result.riskLevel,
          quickCheckScore: result.riskScore,
          quickCheckConflicts: result.conflicts,
        });

        return result;
      } catch (error) {
        store.updateSuggestion(name, { quickCheckStatus: "error" });
        throw error;
      }
    },
    [store]
  );

  const initializeSearch = useCallback(
    (brand: string, classes: number[], riskLevel: "low" | "medium" | "high") => {
      store.setOriginalSearch(brand, classes, riskLevel);
    },
    [store]
  );

  return {
    originalBrand: store.originalBrand,
    selectedClasses: store.selectedClasses,
    originalRiskLevel: store.originalRiskLevel,
    suggestions: store.suggestions,
    isGenerating: store.isGenerating,
    generatorError: store.generatorError,

    initializeSearch,
    generateAlternatives,
    quickCheck,
    clearSuggestions: store.clearSuggestions,
    reset: store.reset,
  };
}

export default useAlternativeSearch;
