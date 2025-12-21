"use client";

import { useState } from "react";
import { ChevronDown, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { ConflictCard, ConflictingMark } from "../ConflictCard";

interface RiskAnalysisAccordionProps {
  conflicts: ConflictingMark[];
  selectedClasses: number[];
  includeRelatedClasses: boolean;
  onConflictClick: (conflict: ConflictingMark) => void;
}

export function RiskAnalysisAccordion({
  conflicts,
  selectedClasses,
  includeRelatedClasses,
  onConflictClick,
}: RiskAnalysisAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const kritisch = conflicts.filter(c => c.riskLevel === "high");
  const pruefen = conflicts.filter(c => c.riskLevel === "medium");
  const unbedenklich = conflicts.filter(c => c.riskLevel === "low");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-700">{kritisch.length}</span>
          </div>
          <p className="text-sm font-medium text-red-600">Kritisch</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-2xl font-bold text-orange-700">{pruefen.length}</span>
          </div>
          <p className="text-sm font-medium text-orange-600">Prüfen</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-700">{unbedenklich.length}</span>
          </div>
          <p className="text-sm font-medium text-green-600">Unbedenklich</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-900">
              Alle Konflikte ({conflicts.length})
            </span>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {conflicts.map((conflict, idx) => (
                <ConflictCard
                  key={idx}
                  conflict={conflict}
                  selectedClasses={selectedClasses}
                  includeRelatedClasses={includeRelatedClasses}
                  onClick={() => onConflictClick(conflict)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
