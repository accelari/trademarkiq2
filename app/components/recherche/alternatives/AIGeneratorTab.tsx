"use client";

import { Wand2, RefreshCw, Loader2 } from "lucide-react";
import { StyleSelector, type GeneratorStyle } from "./StyleSelector";
import { NameSuggestionCard, type QuickCheckStatus } from "./NameSuggestionCard";

export type GeneratorLanguage = "de" | "en" | "international";

export interface GeneratorSettings {
  style: GeneratorStyle;
  keywords: string[];
  language: GeneratorLanguage;
}

export interface NameSuggestion {
  name: string;
  explanation: string;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
}

interface AIGeneratorTabProps {
  originalBrand: string;
  selectedClasses: number[];
  settings: GeneratorSettings;
  onSettingsChange: (settings: GeneratorSettings) => void;
  suggestions: NameSuggestion[];
  isGenerating: boolean;
  shortlist: string[];
  onGenerate: () => void;
  onRegenerate: () => void;
  onQuickCheck: (name: string) => void;
  onToggleShortlist: (name: string) => void;
}

export function AIGeneratorTab({
  originalBrand,
  selectedClasses,
  settings,
  onSettingsChange,
  suggestions,
  isGenerating,
  shortlist,
  onGenerate,
  onRegenerate,
  onQuickCheck,
  onToggleShortlist,
}: AIGeneratorTabProps) {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-gray-700">
          Basierend auf <span className="font-semibold">"{originalBrand}"</span> in
          {selectedClasses.length > 0 ? (
            <span className="font-semibold"> Klasse {selectedClasses.join(", ")}</span>
          ) : (
            " allen Klassen"
          )}
        </p>
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Stil der Vorschläge
        </label>
        <StyleSelector
          selected={settings.style}
          onChange={(style) => onSettingsChange({ ...settings, style })}
        />
      </div>

      {/* Generate Button */}
      {suggestions.length === 0 && (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generiere Namen...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              5 Namen generieren
            </>
          )}
        </button>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Generierte Vorschläge</h4>
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Andere Vorschläge
            </button>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <NameSuggestionCard
                key={suggestion.name}
                name={suggestion.name}
                explanation={suggestion.explanation}
                index={idx + 1}
                quickCheckStatus={suggestion.quickCheckStatus}
                quickCheckScore={suggestion.quickCheckScore}
                quickCheckConflicts={suggestion.quickCheckConflicts}
                isInShortlist={shortlist.includes(suggestion.name)}
                onQuickCheck={() => onQuickCheck(suggestion.name)}
                onToggleShortlist={() => onToggleShortlist(suggestion.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIGeneratorTab;
