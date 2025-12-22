"use client";

import { useState, useEffect } from "react";
import { X, Plus, FileDown, ArrowLeft, Check } from "lucide-react";
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
  onFullAnalysis,
  onAddMore,
  onDownloadPDF,
}: ShortlistComparisonProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
              <h2 className="text-xl font-bold text-gray-900">Shortlist-Vergleich</h2>
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
          <button
            onClick={onAddMore}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Weitere Namen hinzufügen
          </button>
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
                onClick={onConfirmSelection}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Check className="w-4 h-4" />
                "{selectedName}" übernehmen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShortlistComparison;
