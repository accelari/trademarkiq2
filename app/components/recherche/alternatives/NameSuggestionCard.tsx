"use client";

import { Search, Plus, Check, Loader2, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

export type QuickCheckStatus = "idle" | "checking" | "low" | "medium" | "high" | "error";

interface NameSuggestionCardProps {
  name: string;
  explanation: string;
  index: number;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
  isInShortlist: boolean;
  onQuickCheck: () => void;
  onToggleShortlist: () => void;
}

export function NameSuggestionCard({
  name,
  explanation,
  index,
  quickCheckStatus,
  quickCheckScore,
  quickCheckConflicts = 0,
  isInShortlist,
  onQuickCheck,
  onToggleShortlist,
}: NameSuggestionCardProps) {
  const hasResult = quickCheckStatus === "low" || quickCheckStatus === "medium" || quickCheckStatus === "high";

  const riskConfig = {
    low: { bg: "bg-green-50", border: "border-green-200", icon: CheckCircle, color: "text-green-600", label: "Niedriges Risiko" },
    medium: { bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertCircle, color: "text-yellow-600", label: "Mittleres Risiko" },
    high: { bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, color: "text-red-600", label: "Hohes Risiko" },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
              {index}
            </span>
            <div>
              <h4 className="font-semibold text-gray-900">{name}</h4>
              <p className="text-sm text-gray-500 mt-0.5">"{explanation}"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Check Result (if done) */}
      {hasResult && quickCheckStatus in riskConfig && (
        <div className={`${riskConfig[quickCheckStatus as keyof typeof riskConfig].bg} ${riskConfig[quickCheckStatus as keyof typeof riskConfig].border} border-t p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = riskConfig[quickCheckStatus as keyof typeof riskConfig].icon;
                return <Icon className={`w-4 h-4 ${riskConfig[quickCheckStatus as keyof typeof riskConfig].color}`} />;
              })()}
              <span className={`text-sm font-medium ${riskConfig[quickCheckStatus as keyof typeof riskConfig].color}`}>
                {riskConfig[quickCheckStatus as keyof typeof riskConfig].label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {quickCheckScore !== undefined && (
                <span className={`font-semibold ${riskConfig[quickCheckStatus as keyof typeof riskConfig].color}`}>
                  Score: {quickCheckScore}
                </span>
              )}
              {quickCheckConflicts > 0 && (
                <span className="text-gray-500">
                  {quickCheckConflicts} Konflikt{quickCheckConflicts !== 1 ? "e" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {quickCheckStatus === "checking" && (
        <div className="bg-gray-50 border-t border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-gray-600">Prüfe Register...</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* Error State */}
      {quickCheckStatus === "error" && (
        <div className="bg-red-50 border-t border-red-100 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">Prüfung fehlgeschlagen</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 bg-gray-50 flex items-center gap-2">
        {quickCheckStatus === "idle" && (
          <button
            onClick={onQuickCheck}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Search className="w-4 h-4" />
            Quick-Check
          </button>
        )}
        {hasResult && (
          <button
            onClick={onQuickCheck}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Search className="w-4 h-4" />
            Recherche durchführen
          </button>
        )}
        <button
          onClick={onToggleShortlist}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isInShortlist
              ? "bg-primary text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          {isInShortlist ? (
            <>
              <Check className="w-4 h-4" />
              In Shortlist
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Zur Shortlist
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default NameSuggestionCard;
