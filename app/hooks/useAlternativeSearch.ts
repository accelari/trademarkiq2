"use client";

import { useCallback } from "react";
import {
  useAlternativeSearchStore,
  type GeneratorSettings,
  type ShortlistItem,
  type NameSuggestion,
} from "@/app/stores/alternativeSearchStore";

export function useAlternativeSearch() {
  const store = useAlternativeSearchStore();

  // Generate alternatives via API
  const generateAlternatives = useCallback(
    async (settings: GeneratorSettings): Promise<NameSuggestion[]> => {
      store.setIsGenerating(true);
      store.setGeneratorError(null);

      try {
        const response = await fetch("/api/recherche/generate-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalBrand: store.originalBrand,
            classes: store.selectedClasses,
            style: settings.style,
            keywords: settings.keywords,
            language: settings.language,
            count: 5,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Generierung fehlgeschlagen");
        }

        const data = await response.json();
        
        // Handle smart generation response (names already checked)
        const suggestions: NameSuggestion[] = data.suggestions.map((s: {
          name: string;
          explanation: string;
          quickCheckStatus?: string;
          quickCheckScore?: number;
          quickCheckConflicts?: number;
          quickCheckCriticalCount?: number;
        }) => ({
          name: s.name,
          explanation: s.explanation,
          quickCheckStatus: (s.quickCheckStatus || "idle") as "idle" | "checking" | "low" | "medium" | "high" | "error",
          quickCheckScore: s.quickCheckScore,
          quickCheckConflicts: s.quickCheckConflicts,
          quickCheckCriticalCount: s.quickCheckCriticalCount,
        }));

        store.setSuggestions(suggestions);
        
        // Return the suggestions array (the modal expects an array)
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

  // Quick check a name via API
  const quickCheck = useCallback(
    async (name: string): Promise<{ riskLevel: "low" | "medium" | "high"; riskScore: number; conflicts: number; criticalCount: number }> => {
      store.updateSuggestion(name, { quickCheckStatus: "checking" });

      try {
        const response = await fetch("/api/recherche/quick-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            classes: store.selectedClasses,
            countries: [], // Use defaults
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
          criticalCount: data.criticalCount ?? 0,
        };

        store.updateSuggestion(name, {
          quickCheckStatus: result.riskLevel,
          quickCheckScore: result.riskScore,
          quickCheckConflicts: result.conflicts,
          quickCheckCriticalCount: result.criticalCount,
        });

        // Add to checked names history
        store.addCheckedName({
          name,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          conflictCount: result.conflicts,
          criticalCount: result.criticalCount,
          timestamp: new Date(),
        });

        return result;
      } catch (error) {
        store.updateSuggestion(name, { quickCheckStatus: "error" });
        throw error;
      }
    },
    [store]
  );

  // Quick check for manual entry
  const quickCheckManual = useCallback(
    async (name: string): Promise<{ riskLevel: "low" | "medium" | "high"; riskScore: number; conflicts: number; criticalCount: number }> => {
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
          criticalCount: data.criticalCount ?? 0,
        };

        // Add to checked names history
        store.addCheckedName({
          name,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          conflictCount: result.conflicts,
          criticalCount: result.criticalCount,
          timestamp: new Date(),
        });

        return result;
      } catch (error) {
        throw error;
      }
    },
    [store]
  );

  // Add to shortlist
  const addToShortlist = useCallback(
    (name: string, data: { riskScore: number; riskLevel: string; conflicts?: number; criticalCount?: number }) => {
      const item: ShortlistItem = {
        name,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel as "low" | "medium" | "high" | "unknown",
        conflictCount: data.conflicts ?? 0,
        criticalCount: data.criticalCount ?? 0,
        domainDe: "unknown",
        domainCom: "unknown",
        pronunciation: 4, // Default to 4 stars
        aiTip: "Prüfung abgeschlossen",
        hasFullAnalysis: false,
      };
      store.addToShortlist(item);
    },
    [store]
  );

  // Remove from shortlist
  const removeFromShortlist = useCallback(
    (name: string) => {
      store.removeFromShortlist(name);
    },
    [store]
  );

  // Clear entire shortlist
  const clearShortlist = useCallback(() => {
    store.clearShortlist();
  }, [store]);

  // Open generator modal
  const openGenerator = useCallback(() => {
    store.openGenerator();
  }, [store]);

  // Close generator modal
  const closeGenerator = useCallback(() => {
    store.closeGenerator();
  }, [store]);

  // Open shortlist modal
  const openShortlist = useCallback(() => {
    store.openShortlist();
  }, [store]);

  // Close shortlist modal
  const closeShortlist = useCallback(() => {
    store.closeShortlist();
  }, [store]);

  // Initialize with original search data
  const initializeSearch = useCallback(
    (brand: string, classes: number[], riskLevel: "low" | "medium" | "high", caseId?: string | null) => {
      store.setOriginalSearch(brand, classes, riskLevel, caseId);
    },
    [store]
  );

  // Select a name (highlight it in shortlist)
  const selectName = useCallback(
    (name: string) => {
      // Toggle selection - if already selected, deselect
      if (store.selectedName === name) {
        store.setSelectedName(null);
      } else {
        store.setSelectedName(name);
      }
    },
    [store]
  );

  // Confirm selection and close modals
  const confirmSelection = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      if (!store.selectedName) {
        return { success: false, error: "Kein Name ausgewählt" };
      }
      
      const selectedItem = store.shortlist.find(item => item.name === store.selectedName);
      
      if (store.caseId && selectedItem) {
        try {
          const response = await fetch("/api/cases/select-alternative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: store.caseId,
              selectedName: store.selectedName,
              riskScore: selectedItem.riskScore,
              conflictCount: selectedItem.conflictCount,
              criticalCount: selectedItem.criticalCount,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Speichern fehlgeschlagen" }));
            console.error("Failed to save selection:", errorData.error);
            return { success: false, error: errorData.error };
          }
        } catch (error) {
          console.error("Failed to save selection:", error);
          return { success: false, error: "Netzwerkfehler beim Speichern" };
        }
      }
      
      store.closeShortlist();
      store.closeGenerator();
      return { success: true };
    },
    [store]
  );

  // Download PDF (placeholder)
  const downloadPDF = useCallback(() => {
    console.log("Download PDF - to be implemented");
  }, []);

  // Full analysis (placeholder)
  const startFullAnalysis = useCallback((name: string) => {
    console.log("Start full analysis for:", name);
  }, []);

  return {
    // State
    originalBrand: store.originalBrand,
    selectedClasses: store.selectedClasses,
    originalRiskLevel: store.originalRiskLevel,
    isGeneratorOpen: store.isGeneratorOpen,
    generatorTab: store.generatorTab,
    generatorSettings: store.generatorSettings,
    suggestions: store.suggestions,
    isGenerating: store.isGenerating,
    generatorError: store.generatorError,
    shortlist: store.shortlist,
    isShortlistOpen: store.isShortlistOpen,
    recommendation: store.recommendation,
    selectedName: store.selectedName,
    checkedNames: store.checkedNames,

    // Actions
    initializeSearch,
    openGenerator,
    closeGenerator,
    setGeneratorTab: store.setGeneratorTab,
    setGeneratorSettings: store.setGeneratorSettings,
    generateAlternatives,
    quickCheck,
    quickCheckManual,
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
    openShortlist,
    closeShortlist,
    selectName,
    confirmSelection,
    downloadPDF,
    startFullAnalysis,
    clearSuggestions: store.clearSuggestions,
    reset: store.reset,
  };
}

export default useAlternativeSearch;
