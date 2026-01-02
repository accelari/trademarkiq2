"use client";

import { Sparkles } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RechercheHistoryItem {
  id: string;
  keyword: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  result: any; // Vollständiges Analyse-Ergebnis
}

interface RechercheHistoryBannerProps {
  history: RechercheHistoryItem[];
  activeId: string | null;
  showingAnalysis: boolean;
  onSelectRecherche: (id: string) => void;
  onNewRecherche: () => void;
}

export function RechercheHistoryBanner({
  history,
  activeId,
  showingAnalysis,
  onSelectRecherche,
  onNewRecherche,
}: RechercheHistoryBannerProps) {
  if (history.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <div>
            <div className="font-semibold">Durchgeführte Recherchen</div>
            <div className="text-sm text-white/80">
              {history.length} Analyse{history.length > 1 ? "n" : ""} verfügbar
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {history.map((r) => {
          const isActive = activeId === r.id && showingAnalysis;
          const riskColor =
            r.riskLevel === "high"
              ? "bg-red-500"
              : r.riskLevel === "medium"
              ? "bg-orange-500"
              : "bg-green-500";
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRecherche(r.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-white text-teal-700 shadow-md"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${riskColor}`} />
              <span className="truncate max-w-[120px]">&quot;{r.keyword}&quot;</span>
              <span className="text-xs opacity-75">{r.riskScore}%</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onNewRecherche}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            !showingAnalysis
              ? "bg-white text-teal-700 shadow-md"
              : "bg-white/20 hover:bg-white/30 text-white border border-dashed border-white/50"
          }`}
        >
          + Neue Recherche
        </button>
      </div>
    </div>
  );
}
