"use client";

import { create } from "zustand";

export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type QuickCheckStatus = "idle" | "checking" | "low" | "medium" | "high" | "error";
export type GeneratorStyle = "similar" | "modern" | "creative" | "serious";
export type GeneratorLanguage = "de" | "en" | "international";

export interface NameSuggestion {
  name: string;
  explanation: string;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
}

export interface ShortlistItem {
  name: string;
  riskScore: number;
  riskLevel: RiskLevel;
  conflictCount: number;
  criticalCount: number;
  domainDe: "available" | "taken" | "unknown";
  domainCom: "available" | "taken" | "unknown";
  pronunciation: 1 | 2 | 3 | 4 | 5;
  aiTip: string;
  hasFullAnalysis: boolean;
}

export interface CheckedName {
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  timestamp: Date;
}

export interface GeneratorSettings {
  style: GeneratorStyle;
  keywords: string[];
  language: GeneratorLanguage;
}

interface AlternativeSearchState {
  // Original search
  originalBrand: string;
  selectedClasses: number[];
  originalRiskLevel: RiskLevel;

  // Generator
  isGeneratorOpen: boolean;
  generatorTab: "ai" | "manual";
  generatorSettings: GeneratorSettings;
  suggestions: NameSuggestion[];
  isGenerating: boolean;
  generatorError: string | null;

  // Shortlist
  shortlist: ShortlistItem[];
  isShortlistOpen: boolean;
  recommendation: { name: string; reasons: string[] } | null;

  // History
  checkedNames: CheckedName[];

  // Actions
  setOriginalSearch: (brand: string, classes: number[], riskLevel: RiskLevel) => void;
  openGenerator: () => void;
  closeGenerator: () => void;
  setGeneratorTab: (tab: "ai" | "manual") => void;
  setGeneratorSettings: (settings: Partial<GeneratorSettings>) => void;
  setSuggestions: (suggestions: NameSuggestion[]) => void;
  updateSuggestion: (name: string, update: Partial<NameSuggestion>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGeneratorError: (error: string | null) => void;
  addToShortlist: (item: ShortlistItem) => void;
  removeFromShortlist: (name: string) => void;
  updateShortlistItem: (name: string, update: Partial<ShortlistItem>) => void;
  openShortlist: () => void;
  closeShortlist: () => void;
  setRecommendation: (recommendation: { name: string; reasons: string[] } | null) => void;
  addCheckedName: (checked: CheckedName) => void;
  clearSuggestions: () => void;
  reset: () => void;
}

const initialState = {
  originalBrand: "",
  selectedClasses: [],
  originalRiskLevel: "unknown" as RiskLevel,
  isGeneratorOpen: false,
  generatorTab: "ai" as const,
  generatorSettings: {
    style: "similar" as GeneratorStyle,
    keywords: [],
    language: "de" as GeneratorLanguage,
  },
  suggestions: [],
  isGenerating: false,
  generatorError: null,
  shortlist: [],
  isShortlistOpen: false,
  recommendation: null,
  checkedNames: [],
};

export const useAlternativeSearchStore = create<AlternativeSearchState>((set, get) => ({
  ...initialState,

  setOriginalSearch: (brand, classes, riskLevel) =>
    set({ originalBrand: brand, selectedClasses: classes, originalRiskLevel: riskLevel }),

  openGenerator: () => set({ isGeneratorOpen: true }),

  closeGenerator: () => set({ isGeneratorOpen: false }),

  setGeneratorTab: (tab) => set({ generatorTab: tab }),

  setGeneratorSettings: (settings) =>
    set((state) => ({
      generatorSettings: { ...state.generatorSettings, ...settings },
    })),

  setSuggestions: (suggestions) => set({ suggestions }),

  updateSuggestion: (name, update) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.name === name ? { ...s, ...update } : s
      ),
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setGeneratorError: (error) => set({ generatorError: error }),

  addToShortlist: (item) =>
    set((state) => {
      // Don't add duplicates
      if (state.shortlist.some((s) => s.name === item.name)) {
        return state;
      }
      // Max 10 items
      if (state.shortlist.length >= 10) {
        return state;
      }
      const newShortlist = [...state.shortlist, item];

      // Generate recommendation if we have 2+ items
      let recommendation = state.recommendation;
      if (newShortlist.length >= 2) {
        const bestItem = [...newShortlist].sort((a, b) => a.riskScore - b.riskScore)[0];
        recommendation = {
          name: bestItem.name,
          reasons: [
            `Niedrigstes Konfliktrisiko (Score: ${bestItem.riskScore})`,
            bestItem.criticalCount === 0 ? "Keine kritischen Überschneidungen" : null,
            bestItem.domainDe === "available" ? "Domain .de ist verfügbar" : null,
          ].filter(Boolean) as string[],
        };
      }

      return { shortlist: newShortlist, recommendation };
    }),

  removeFromShortlist: (name) =>
    set((state) => ({
      shortlist: state.shortlist.filter((s) => s.name !== name),
      recommendation:
        state.recommendation?.name === name ? null : state.recommendation,
    })),

  updateShortlistItem: (name, update) =>
    set((state) => ({
      shortlist: state.shortlist.map((s) =>
        s.name === name ? { ...s, ...update } : s
      ),
    })),

  openShortlist: () => set({ isShortlistOpen: true }),

  closeShortlist: () => set({ isShortlistOpen: false }),

  setRecommendation: (recommendation) => set({ recommendation }),

  addCheckedName: (checked) =>
    set((state) => ({
      checkedNames: [checked, ...state.checkedNames].slice(0, 20), // Keep last 20
    })),

  clearSuggestions: () => set({ suggestions: [] }),

  reset: () => set(initialState),
}));

export default useAlternativeSearchStore;
