"use client";

import { Brain, AlertTriangle, Star } from "lucide-react";

interface TopConflict {
  name: string;
  office: string;
  classes: number[];
  similarity: number;
  similarityType: "phonetic" | "visual" | "exact";
}

interface AIExecutiveSummaryProps {
  summary: string;
  topConflicts: TopConflict[];
  criticalClasses: number[];
  famousMarkDetected?: boolean;
  famousMarkNames?: string[];
}

function getSimilarityTypeLabel(type: "phonetic" | "visual" | "exact"): string {
  switch (type) {
    case "phonetic":
      return "phonetisch ähnlich";
    case "visual":
      return "visuell ähnlich";
    case "exact":
      return "exakt übereinstimmend";
    default:
      return "ähnlich";
  }
}

export function AIExecutiveSummary({
  summary,
  topConflicts,
  criticalClasses,
  famousMarkDetected = false,
  famousMarkNames = [],
}: AIExecutiveSummaryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">KI-Zusammenfassung</h3>
            <p className="text-xs text-gray-500">Automatische Analyse der Konflikte</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Famous Mark Warning */}
        {famousMarkDetected && famousMarkNames.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
            <Star className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Bekannte Marken erkannt</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {famousMarkNames.join(", ")} - Diese haben erweiterten Schutz.
              </p>
            </div>
          </div>
        )}

        {/* Summary Text */}
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>

        {/* Top Conflicts */}
        {topConflicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kritischste Konflikte:
            </p>
            <ul className="space-y-2">
              {topConflicts.slice(0, 3).map((conflict, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{conflict.name}</span>
                    <span className="text-xs text-gray-500">
                      ({conflict.office}, Klasse {conflict.classes.join(", ")})
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {conflict.similarity}% {getSimilarityTypeLabel(conflict.similarityType)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Critical Classes */}
        {criticalClasses.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Kritische Klassenüberschneidung
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Klasse {criticalClasses.join(", ")} - Hohe Verwechslungsgefahr in diesen Bereichen.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIExecutiveSummary;
