"use client";

import { useState, useEffect } from "react";
import { X, Plus, FileDown, ArrowLeft, Check, Trash2, AlertTriangle } from "lucide-react";
import { ComparisonTable, type ShortlistItem } from "./ComparisonTable";
import { MobileShortlistCarousel } from "./MobileShortlistCarousel";
import { AIRecommendation } from "./AIRecommendation";

interface Recommendation {
  name: string;
  reasons: string[];
}

interface ShortlistComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShortlistItem[];
  recommendation: Recommendation | null;
  selectedName: string | null;
  onSelectName: (name: string) => void;
  onConfirmSelection: () => void;
  onRemoveFromShortlist: (name: string) => void;
  onClearShortlist: () => void;
  onFullAnalysis: (name: string) => void;
  onAddMore: () => void;
  onDownloadPDF: () => void;
}

export function ShortlistComparison({
  isOpen,
  onClose,
  items,
  recommendation,
  selectedName,
  onSelectName,
  onConfirmSelection,
  onRemoveFromShortlist,
  onClearShortlist,
  onFullAnalysis,
  onAddMore,
  onDownloadPDF,
}: ShortlistComparisonProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConfirmSelection = () => {
    setShowConfirmDialog(false);
    onConfirmSelection();
  };

  const handleClearShortlist = () => {
    setShowClearDialog(false);
    onClearShortlist();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Meine Marken – Vergleich</h2>
              <p className="text-sm text-gray-500">
                {items.length} Name{items.length !== 1 ? "n" : ""} im Vergleich
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comparison Table or Carousel */}
          {isMobile ? (
            <MobileShortlistCarousel
              items={items}
              selectedName={selectedName}
              onSelectName={onSelectName}
              onRemoveFromShortlist={onRemoveFromShortlist}
              onFullAnalysis={onFullAnalysis}
            />
          ) : (
            <ComparisonTable
              items={items}
              selectedName={selectedName}
              onSelectName={onSelectName}
              onRemoveFromShortlist={onRemoveFromShortlist}
              onFullAnalysis={onFullAnalysis}
            />
          )}

          {/* AI Recommendation */}
          {recommendation && items.length > 1 && (
            <AIRecommendation
              recommendedName={recommendation.name}
              reasons={recommendation.reasons}
              onSelectRecommended={() => onSelectName(recommendation.name)}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={onAddMore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Weitere Namen hinzufügen
            </button>
            {items.length > 0 && (
              <button
                onClick={() => setShowClearDialog(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                title="Liste leeren"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Leeren</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Vergleich als PDF
            </button>
            {selectedName && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Check className="w-4 h-4" />
                Als Markennamen festlegen
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && selectedName && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Markennamen festlegen</h3>
                  <p className="text-sm text-gray-500">Diese Auswahl wird gespeichert</p>
                </div>
              </div>
              <p className="text-gray-700">
                Sie haben <span className="font-semibold text-primary">"{selectedName}"</span> als Ihren 
                finalen Markennamen ausgewählt. Damit können Sie zur Anmeldung fortfahren.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmSelection}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear List Dialog */}
        {showClearDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Liste leeren?</h3>
                  <p className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden</p>
                </div>
              </div>
              <p className="text-gray-700">
                Folgendes wird unwiderruflich gelöscht:
              </p>
              <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc list-inside">
                <li><span className="font-semibold">{items.length} Namen</span> in Ihrer Liste</li>
                <li>Alle Quick-Check Ergebnisse und Prüfhistorie</li>
                <li>Die KI-Empfehlung</li>
              </ul>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowClearDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleClearShortlist}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Endgültig löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShortlistComparison;
