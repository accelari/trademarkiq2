"use client";

import { useState } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RechercheHistoryItem {
  id: string;
  keyword: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  trademarkType?: string;
  classes?: number[];
  countries?: string[];
  result: any; // Vollständiges Analyse-Ergebnis
}

interface RechercheHistoryBannerProps {
  history: RechercheHistoryItem[];
  activeId: string | null;
  showingAnalysis: boolean;
  onSelectRecherche: (id: string) => void;
  onDeleteRecherche: (id: string) => void;
  onNewRecherche: () => void;
}

export function RechercheHistoryBanner({
  history,
  activeId,
  showingAnalysis,
  onSelectRecherche,
  onDeleteRecherche,
  onNewRecherche,
}: RechercheHistoryBannerProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; keyword: string } | null>(null);

  if (history.length === 0) return null;

  // Formatiert Markenart kurz
  const formatType = (type?: string) => {
    if (type === "wortmarke" || type === "word") return "Wort";
    if (type === "bildmarke" || type === "image") return "Bild";
    if (type === "wort-bildmarke" || type === "word_image") return "W/B";
    return type || "W/B";
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Tabs mit Markenname + Kurzinfo */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap flex-1">
        {history.map((r) => {
          const isActive = activeId === r.id && showingAnalysis;
          const riskBorder =
            r.riskLevel === "high"
              ? "border-l-red-500"
              : r.riskLevel === "medium"
              ? "border-l-orange-500"
              : "border-l-green-500";
          const riskDot =
            r.riskLevel === "high"
              ? "bg-red-500"
              : r.riskLevel === "medium"
              ? "bg-orange-500"
              : "bg-green-500";
          
          // Kurzinfo: Art, Klassen, Länder
          const shortInfo = [
            formatType(r.trademarkType),
            r.classes?.length ? `Kl.${r.classes.slice(0, 2).join(",")}${r.classes.length > 2 ? "+" : ""}` : null,
            r.countries?.slice(0, 2).join(","),
          ].filter(Boolean).join(" · ");

          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectRecherche(r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectRecherche(r.id); }}
              className={`group px-3 py-2 text-sm rounded-md transition-all flex items-center gap-2 cursor-pointer border-l-4 ${riskBorder} ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${riskDot} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="font-medium truncate max-w-[120px]">&quot;{r.keyword}&quot;</div>
                {shortInfo && <div className="text-xs text-gray-500 truncate">{shortInfo}</div>}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: r.id, keyword: r.keyword }); }}
                className="ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                title="Recherche löschen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
              </div>

      {/* "+ Weitere Recherche" Button */}
      <button
        type="button"
        onClick={onNewRecherche}
        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
      >
        <Plus className="w-4 h-4" />
        Weitere Recherche
      </button>

      {/* Bestätigungsdialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Recherche löschen?</div>
                <div className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-600">Marke: <span className="font-medium text-gray-900">&quot;{deleteConfirm.keyword}&quot;</span></div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => { onDeleteRecherche(deleteConfirm.id); setDeleteConfirm(null); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
