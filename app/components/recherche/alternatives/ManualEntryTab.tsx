"use client";

import { useState } from "react";
import { Search, Lightbulb, AlertCircle, CheckCircle, AlertTriangle, Plus, Check, ChevronDown } from "lucide-react";

interface CheckedName {
  name: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  conflictCount: number;
  criticalCount: number;
  timestamp: Date;
}

interface ManualEntryTabProps {
  selectedClasses: number[];
  checkedNames: CheckedName[];
  isChecking: boolean;
  shortlist: string[];
  onQuickCheck: (name: string) => void;
  onAddToShortlist: (name: string, data: { riskScore: number; riskLevel: string; conflicts?: number; criticalCount?: number }) => void;
  onRemoveFromShortlist: (name: string) => void;
}

export function ManualEntryTab({
  selectedClasses,
  checkedNames,
  isChecking,
  shortlist,
  onQuickCheck,
  onAddToShortlist,
  onRemoveFromShortlist,
}: ManualEntryTabProps) {
  const [nameInput, setNameInput] = useState("");
  const [lastCheckedName, setLastCheckedName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      const trimmedName = nameInput.trim();
      onQuickCheck(trimmedName);
      setLastCheckedName(trimmedName);
    }
  };

  const getRiskConfig = (level: "low" | "medium" | "high") => {
    const configs = {
      low: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Niedriges Risiko" },
      medium: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50", label: "Mittleres Risiko" },
      high: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Hohes Risiko" },
    };
    return configs[level];
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Geben Sie Ihren Wunschnamen ein:
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="z.B. TechFlow, InnoVate, CloudPulse..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
            disabled={isChecking}
          />
        </div>

        <button
          type="submit"
          disabled={!nameInput.trim() || isChecking}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {isChecking ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 text-sm">Tipps für einen guten Markennamen:</p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Vermeiden Sie rein beschreibende Begriffe (z.B. "Schnell-Service")</li>
              <li>Prüfen Sie, ob die Domain verfügbar ist</li>
              <li>Achten Sie auf internationale Aussprache</li>
              <li>Phantasienamen haben die höchste Schutzfähigkeit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Check Result - Most Recent */}
      {checkedNames.length > 0 && (() => {
        const latestCheck = checkedNames[0];
        const config = getRiskConfig(latestCheck.riskLevel);
        const Icon = config.icon;
        const isInShortlist = shortlist.includes(latestCheck.name);
        
        return (
          <div className="space-y-4">
            {/* Main Result Card */}
            <div className={`${config.bg} border-2 ${
              latestCheck.riskLevel === 'low' ? 'border-green-300' : 
              latestCheck.riskLevel === 'medium' ? 'border-yellow-300' : 'border-red-300'
            } rounded-xl p-5`}>
              <div className="text-center mb-4">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
                  latestCheck.riskLevel === 'low' ? 'bg-green-200' : 
                  latestCheck.riskLevel === 'medium' ? 'bg-yellow-200' : 'bg-red-200'
                } mb-3`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">"{latestCheck.name}"</h3>
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-lg font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">Score: {latestCheck.riskScore}</span>
                </div>
              </div>

              {/* Explanation based on risk level */}
              <p className="text-sm text-gray-600 text-center mb-4">
                {latestCheck.riskLevel === 'low' && 
                  "Dieser Name hat wenige Konflikte im Markenregister. Eine Anmeldung ist vielversprechend."}
                {latestCheck.riskLevel === 'medium' && 
                  "Es gibt ähnliche Marken. Prüfen Sie die Konflikte genauer oder testen Sie andere Namen."}
                {latestCheck.riskLevel === 'high' && 
                  "Hohe Überschneidung mit bestehenden Marken. Wir empfehlen, einen anderen Namen zu wählen."}
              </p>

              {/* Primary CTA */}
              {isInShortlist ? (
                <button
                  onClick={() => onRemoveFromShortlist(latestCheck.name)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg"
                >
                  <Check className="w-5 h-5" />
                  In Shortlist - zum Vergleichen bereit
                </button>
              ) : (
                <button
                  onClick={() => onAddToShortlist(latestCheck.name, { 
                    riskScore: latestCheck.riskScore, 
                    riskLevel: latestCheck.riskLevel,
                    conflicts: latestCheck.conflictCount,
                    criticalCount: latestCheck.criticalCount
                  })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  In Shortlist übernehmen
                </button>
              )}
              
              <p className="text-xs text-center text-gray-500 mt-2">
                Fügen Sie Namen zur Shortlist hinzu, um sie später zu vergleichen
              </p>
            </div>

            {/* Helper for next action */}
            <p className="text-sm text-center text-gray-500">
              Nicht überzeugt? Geben Sie oben einen weiteren Namen ein.
            </p>
          </div>
        );
      })()}
      
      {/* Previous Checks - Collapsed */}
      {checkedNames.length > 1 && (
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-500 hover:text-gray-700 py-2">
            <span>Vergangene Prüfungen ({checkedNames.length - 1})</span>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-2">
            {checkedNames.slice(1, 6).map((checked) => {
              const config = getRiskConfig(checked.riskLevel);
              const isInShortlist = shortlist.includes(checked.name);
              return (
                <div
                  key={`${checked.name}-${checked.timestamp.getTime()}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{checked.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                      {checked.riskScore}
                    </span>
                  </div>
                  {isInShortlist ? (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> In Shortlist
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddToShortlist(checked.name, { 
                        riskScore: checked.riskScore, 
                        riskLevel: checked.riskLevel,
                        conflicts: checked.conflictCount,
                        criticalCount: checked.criticalCount
                      })}
                      className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Hinzufügen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

export default ManualEntryTab;
