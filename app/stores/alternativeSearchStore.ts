"use client";

import { create } from "zustand";

export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type QuickCheckStatus = "idle" | "checking" | "low" | "medium" | "high" | "error";
export type GeneratorStyle = "similar" | "modern" | "creative" | "serious";

export interface NameSuggestion {
  name: string;
  explanation: string;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
}

export interface GeneratorSettings {
  style: GeneratorStyle;
}

interface AlternativeSearchState {
  originalBrand: string;
  selectedClasses: number[];
  originalRiskLevel: RiskLevel;
  suggestions: NameSuggestion[];
  isGenerating: boolean;
  generatorError: string | null;

  setOriginalSearch: (brand: string, classes: number[], riskLevel: RiskLevel) => void;
  setSuggestions: (suggestions: NameSuggestion[]) => void;
  updateSuggestion: (name: string, update: Partial<NameSuggestion>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGeneratorError: (error: string | null) => void;
  clearSuggestions: () => void;
  reset: () => void;
}

const initialState = {
  originalBrand: "",
  selectedClasses: [] as number[],
  originalRiskLevel: "unknown" as RiskLevel,
  suggestions: [] as NameSuggestion[],
  isGenerating: false,
  generatorError: null as string | null,
};

export const useAlternativeSearchStore = create<AlternativeSearchState>((set) => ({
  ...initialState,

  setOriginalSearch: (brand, classes, riskLevel) =>
    set({ originalBrand: brand, selectedClasses: classes, originalRiskLevel: riskLevel }),

  setSuggestions: (suggestions) => set({ suggestions }),

  updateSuggestion: (name, update) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.name === name ? { ...s, ...update } : s
      ),
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setGeneratorError: (error) => set({ generatorError: error }),

  clearSuggestions: () => set({ suggestions: [] }),

  reset: () => set(initialState),
}));

export default useAlternativeSearchStore;
