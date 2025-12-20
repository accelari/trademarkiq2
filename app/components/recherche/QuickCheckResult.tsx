"use client";

import { Check, Search, FilePlus, ArrowRight, AlertCircle } from "lucide-react";

interface QuickCheckResultProps {
  searchQuery: string;
  hasConflicts: boolean;
  conflictsCount?: number;
  onStartFullAnalysis?: () => void;
  onStartRegistration?: () => void;
}

export function QuickCheckResult({ 
  searchQuery, 
  hasConflicts, 
  conflictsCount = 0,
  onStartFullAnalysis,
  onStartRegistration 
}: QuickCheckResultProps) {
  if (!hasConflicts) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h4 className="font-semibold text-green-800 mb-1">Keine Konflikte gefunden</h4>
        <p className="text-sm text-green-700">
          Die KI-Analyse hat keine potenziellen Markenkonflikte identifiziert.
        </p>
        {onStartRegistration && (
          <button
            onClick={onStartRegistration}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <FilePlus className="w-4 h-4" />
            Marke jetzt anmelden
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6 text-amber-600" />
      </div>
      <h4 className="font-semibold text-amber-800 mb-1">
        {conflictsCount} potenzielle{conflictsCount === 1 ? 'r' : ''} Konflikt{conflictsCount !== 1 ? 'e' : ''} gefunden
      </h4>
      <p className="text-sm text-amber-700">
        Für "{searchQuery}" wurden ähnliche Marken gefunden. Eine detaillierte Analyse wird empfohlen.
      </p>
      {onStartFullAnalysis && (
        <button
          onClick={onStartFullAnalysis}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Search className="w-4 h-4" />
          Vollständige Prüfung starten
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface NoResultsFoundProps {
  searchQuery: string;
  onStartRegistration?: () => void;
}

export function NoResultsFound({ searchQuery, onStartRegistration }: NoResultsFoundProps) {
  return (
    <div className="bg-green-50 rounded-xl p-8 text-center border border-green-200">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-800 mb-2">
        Keine ähnlichen Marken gefunden
      </h3>
      <p className="text-green-700 mb-6">
        Es gibt keine registrierten Marken, die "{searchQuery}" ähneln. 
        Sie können mit der Anmeldung fortfahren.
      </p>
      {onStartRegistration && (
        <button
          onClick={onStartRegistration}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
        >
          <FilePlus className="w-5 h-5" />
          Marke jetzt anmelden
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
