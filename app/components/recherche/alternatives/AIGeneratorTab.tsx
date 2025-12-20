"use client";

import { useState } from "react";
import { Wand2, RefreshCw, Loader2, X } from "lucide-react";
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
  const [keywordInput, setKeywordInput] = useState("");

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !settings.keywords.includes(keyword)) {
      onSettingsChange({
        ...settings,
        keywords: [...settings.keywords, keyword],
      });
    }
    setKeywordInput("");
  };

  const removeKeyword = (keyword: string) => {
    onSettingsChange({
      ...settings,
      keywords: settings.keywords.filter((k) => k !== keyword),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

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

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Keywords (optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="z.B. Tech, Innovation, Digital..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            onClick={addKeyword}
            disabled={!keywordInput.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hinzufügen
          </button>
        </div>
        {settings.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {settings.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sprache
        </label>
        <div className="flex gap-3">
          {[
            { id: "de" as const, label: "Deutsch" },
            { id: "en" as const, label: "Englisch" },
            { id: "international" as const, label: "International" },
          ].map((lang) => (
            <label key={lang.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language"
                checked={settings.language === lang.id}
                onChange={() => onSettingsChange({ ...settings, language: lang.id })}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">{lang.label}</span>
            </label>
          ))}
        </div>
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
