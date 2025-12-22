"use client";

import { Wand2, RefreshCw, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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
  quickCheckCriticalCount?: number;
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

// Helper to count suggestions by risk level
function countByRisk(suggestions: NameSuggestion[]) {
  return {
    low: suggestions.filter(s => s.quickCheckStatus === "low").length,
    medium: suggestions.filter(s => s.quickCheckStatus === "medium").length,
    high: suggestions.filter(s => s.quickCheckStatus === "high").length,
  };
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
        <div className="space-y-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="flex flex-col items-center">
                  <span>Generiere und prüfe Namen...</span>
                  <span className="text-xs font-normal opacity-80">15 Kandidaten werden gegen das Register geprüft</span>
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Sichere Namen finden
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-500">
            Die KI generiert mehrere Vorschläge und prüft jeden automatisch gegen das Markenregister.
            Nur die sichersten Namen werden angezeigt.
          </p>
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          {/* Smart Generation Result Banner */}
          {(() => {
            const counts = countByRisk(suggestions);
            const hasPreChecked = suggestions.some(s => s.quickCheckStatus !== "idle");
            
            if (!hasPreChecked) return null;
            
            if (counts.low > 0) {
              return (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">{counts.low} konfliktarme Namen</span> gefunden!
                    {counts.medium > 0 && ` Plus ${counts.medium} mit mittlerem Risiko.`}
                  </p>
                </div>
              );
            } else if (counts.medium > 0) {
              return (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Keine konfliktfreien Namen gefunden.</span>
                    {" "}Zeige {counts.medium} Namen mit mittlerem Risiko.
                  </p>
                </div>
              );
            } else {
              return (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Alle Namen haben Konflikte.</span>
                    {" "}Hier die besten {suggestions.length} Optionen. Versuche es mit einem anderen Stil.
                  </p>
                </div>
              );
            }
          })()}

          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Vorschläge</h4>
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
