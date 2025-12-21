"use client";

import { useState } from "react";
import { 
  Wand2, 
  PenLine, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight,
  Search,
  Lightbulb
} from "lucide-react";
import { StyleSelector, type GeneratorStyle } from "./StyleSelector";

export type QuickCheckStatus = "idle" | "checking" | "low" | "medium" | "high" | "error";

export interface NameSuggestion {
  name: string;
  explanation: string;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
}

interface ManualCheckResult {
  name: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  conflicts: number;
}

interface SimpleAlternativeCardsProps {
  originalBrand: string;
  selectedClasses: number[];
  suggestions: NameSuggestion[];
  isGenerating: boolean;
  onGenerateAlternatives: (style: GeneratorStyle) => Promise<NameSuggestion[]>;
  onQuickCheck: (name: string) => Promise<{ riskLevel: "low" | "medium" | "high"; riskScore: number; conflicts: number }>;
  onSelectName: (name: string) => void;
  onClearSuggestions: () => void;
}

const riskConfig = {
  low: { 
    bg: "bg-green-50", 
    border: "border-green-200", 
    icon: CheckCircle, 
    color: "text-green-600", 
    label: "Niedriges Risiko",
    buttonBg: "bg-green-600 hover:bg-green-700"
  },
  medium: { 
    bg: "bg-yellow-50", 
    border: "border-yellow-200", 
    icon: AlertCircle, 
    color: "text-yellow-600", 
    label: "Mittleres Risiko",
    buttonBg: "bg-yellow-600 hover:bg-yellow-700"
  },
  high: { 
    bg: "bg-red-50", 
    border: "border-red-200", 
    icon: AlertTriangle, 
    color: "text-red-600", 
    label: "Hohes Risiko",
    buttonBg: "bg-red-600 hover:bg-red-700"
  },
};

export function SimpleAlternativeCards({
  originalBrand,
  selectedClasses,
  suggestions,
  isGenerating,
  onGenerateAlternatives,
  onQuickCheck,
  onSelectName,
  onClearSuggestions,
}: SimpleAlternativeCardsProps) {
  const [selectedStyle, setSelectedStyle] = useState<GeneratorStyle>("similar");
  const [manualName, setManualName] = useState("");
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [manualResult, setManualResult] = useState<ManualCheckResult | null>(null);

  const handleGenerate = async () => {
    await onGenerateAlternatives(selectedStyle);
  };

  const handleRegenerate = async () => {
    onClearSuggestions();
    await onGenerateAlternatives(selectedStyle);
  };

  const handleManualCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    setIsCheckingManual(true);
    setManualResult(null);
    
    try {
      const result = await onQuickCheck(manualName.trim());
      setManualResult({
        name: manualName.trim(),
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        conflicts: result.conflicts,
      });
    } catch (error) {
      console.error("Error checking name:", error);
    } finally {
      setIsCheckingManual(false);
    }
  };

  const handleSelectManualName = () => {
    if (manualResult) {
      onSelectName(manualResult.name);
    }
  };

  const handleNewCheck = () => {
    setManualName("");
    setManualResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Card 1: KI-Namen generieren */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">KI-Namen generieren</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Lassen Sie die KI alternative Namen vorschlagen und automatisch prüfen
            </p>
          </div>
        </div>

        {/* Style Selector - always visible before generation */}
        {suggestions.length === 0 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-3">
                Basierend auf <span className="font-semibold text-gray-900">"{originalBrand}"</span>
                {selectedClasses.length > 0 && (
                  <span> in Klasse <span className="font-semibold text-gray-900">{selectedClasses.join(", ")}</span></span>
                )}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stil der Vorschläge
              </label>
              <StyleSelector selected={selectedStyle} onChange={setSelectedStyle} />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="flex flex-col items-center">
                    <span>Generiere und prüfe Namen...</span>
                    <span className="text-xs font-normal opacity-80">Kandidaten werden gegen das Register geprüft</span>
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Namen vorschlagen
                </>
              )}
            </button>
          </div>
        )}

        {/* Suggestions List */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => {
              const hasResult = suggestion.quickCheckStatus === "low" || 
                               suggestion.quickCheckStatus === "medium" || 
                               suggestion.quickCheckStatus === "high";
              const config = hasResult ? riskConfig[suggestion.quickCheckStatus as keyof typeof riskConfig] : null;
              const Icon = config?.icon;

              return (
                <div 
                  key={suggestion.name} 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    hasResult && config 
                      ? `${config.bg} ${config.border}` 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-900 truncate">{suggestion.name}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 ml-8 line-clamp-1">{suggestion.explanation}</p>
                    
                    {/* Risk indicator */}
                    {hasResult && config && Icon && (
                      <div className="flex items-center gap-2 mt-2 ml-8">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                        {suggestion.quickCheckScore !== undefined && (
                          <span className={`text-sm ${config.color}`}>• Score: {suggestion.quickCheckScore}</span>
                        )}
                        {suggestion.quickCheckConflicts !== undefined && suggestion.quickCheckConflicts > 0 && (
                          <span className="text-sm text-gray-500">
                            • {suggestion.quickCheckConflicts} Konflikt{suggestion.quickCheckConflicts !== 1 ? "e" : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Loading state */}
                    {suggestion.quickCheckStatus === "checking" && (
                      <div className="flex items-center gap-2 mt-2 ml-8">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-sm text-gray-600">Prüfe Register...</span>
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => onSelectName(suggestion.name)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 ml-3 ${
                      hasResult && config ? config.buttonBg : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    Auswählen
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Regenerate button */}
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 font-medium rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generiere...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Andere Vorschläge generieren
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Card 2: Eigenen Namen prüfen */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Eigenen Namen prüfen</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Prüfen Sie einen eigenen Namensvorschlag gegen das Markenregister
            </p>
          </div>
        </div>

        {/* Input Form - show when no result */}
        {!manualResult && (
          <form onSubmit={handleManualCheck} className="space-y-3">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Geben Sie Ihren Wunschnamen ein..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
              disabled={isCheckingManual}
            />
            <button
              type="submit"
              disabled={!manualName.trim() || isCheckingManual}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCheckingManual ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Prüfe Register...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Quick-Check starten
                </>
              )}
            </button>
          </form>
        )}

        {/* Result Card */}
        {manualResult && (
          <div className="space-y-3">
            <div className={`${riskConfig[manualResult.riskLevel].bg} ${riskConfig[manualResult.riskLevel].border} border-2 rounded-xl p-5`}>
              <div className="text-center">
                {(() => {
                  const Icon = riskConfig[manualResult.riskLevel].icon;
                  return (
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${riskConfig[manualResult.riskLevel].bg} mb-3`}>
                      <Icon className={`w-6 h-6 ${riskConfig[manualResult.riskLevel].color}`} />
                    </div>
                  );
                })()}
                <h3 className="text-xl font-bold text-gray-900 mb-1">"{manualResult.name}"</h3>
                <p className={`font-semibold ${riskConfig[manualResult.riskLevel].color}`}>
                  {riskConfig[manualResult.riskLevel].label}
                </p>
                
                <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                  <span className={`font-semibold ${riskConfig[manualResult.riskLevel].color}`}>
                    Score: {manualResult.riskScore}
                  </span>
                  {manualResult.conflicts > 0 && (
                    <span className="text-gray-500">
                      {manualResult.conflicts} Konflikt{manualResult.conflicts !== 1 ? "e" : ""}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSelectManualName}
                className={`w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-colors ${riskConfig[manualResult.riskLevel].buttonBg}`}
              >
                "{manualResult.name}" auswählen
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleNewCheck}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Anderen Namen prüfen
            </button>
          </div>
        )}

        {/* Tips - show when no result */}
        {!manualResult && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 text-sm">Tipps für einen guten Markennamen:</p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Phantasienamen haben die höchste Schutzfähigkeit</li>
                  <li>Vermeiden Sie rein beschreibende Begriffe</li>
                  <li>Achten Sie auf internationale Aussprache</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleAlternativeCards;
