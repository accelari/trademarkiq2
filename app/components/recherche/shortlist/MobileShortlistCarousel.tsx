"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, HelpCircle, Star, Trash2, BarChart3 } from "lucide-react";
import type { ShortlistItem } from "./ComparisonTable";

interface MobileShortlistCarouselProps {
  items: ShortlistItem[];
  selectedName: string | null;
  onSelectName: (name: string) => void;
  onRemoveFromShortlist: (name: string) => void;
  onFullAnalysis: (name: string) => void;
}

function DomainStatus({ status, label }: { status: "available" | "taken" | "unknown"; label: string }) {
  const icons = {
    available: <CheckCircle className="w-4 h-4 text-green-500" />,
    taken: <XCircle className="w-4 h-4 text-red-500" />,
    unknown: <HelpCircle className="w-4 h-4 text-gray-400" />,
  };
  const labels = {
    available: "frei",
    taken: "belegt",
    unknown: "unbekannt",
  };

  return (
    <div className="flex items-center gap-2">
      {icons[status]}
      <span className="text-sm text-gray-600">
        {label}: <span className="font-medium">{labels[status]}</span>
      </span>
    </div>
  );
}

function PronunciationStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export function MobileShortlistCarousel({
  items,
  selectedName,
  onSelectName,
  onRemoveFromShortlist,
  onFullAnalysis,
}: MobileShortlistCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Keine Namen in der Shortlist.</p>
        <p className="text-sm mt-1">Fügen Sie Namen hinzu, um sie zu vergleichen.</p>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const riskConfig = {
    low: { emoji: "🟢", color: "text-green-600", bg: "bg-green-50", label: "Niedriges Risiko" },
    medium: { emoji: "🟡", color: "text-yellow-600", bg: "bg-yellow-50", label: "Mittleres Risiko" },
    high: { emoji: "🔴", color: "text-red-600", bg: "bg-red-50", label: "Hohes Risiko" },
    unknown: { emoji: "⚪", color: "text-gray-500", bg: "bg-gray-50", label: "Unbekannt" },
  };

  const config = riskConfig[currentItem.riskLevel] || riskConfig.unknown;

  return (
    <div className="space-y-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={items.length <= 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="font-bold text-gray-900 text-lg">{currentItem.name}</span>
          <span className="text-gray-400 text-sm ml-2">
            {currentIndex + 1}/{items.length}
          </span>
        </div>
        <button
          onClick={goToNext}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={items.length <= 1}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Risk Badge */}
        <div className={`${config.bg} p-4 text-center`}>
          <span className="text-2xl">{config.emoji}</span>
          <p className={`font-semibold ${config.color} mt-1`}>{config.label}</p>
          <p className={`text-sm ${config.color}`}>Score: {currentItem.riskScore}</p>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Konflikte:</span>
            <span className={`font-semibold ${currentItem.conflictCount === 0 ? "text-green-600" : "text-gray-700"}`}>
              {currentItem.conflictCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Kritisch:</span>
            <span className={`font-semibold ${currentItem.criticalCount === 0 ? "text-green-600" : "text-red-600"}`}>
              {currentItem.criticalCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <DomainStatus status={currentItem.domainDe} label=".de" />
          </div>
          <div className="flex items-center justify-between">
            <DomainStatus status={currentItem.domainCom} label=".com" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Aussprache:</span>
            <PronunciationStars rating={currentItem.pronunciation} />
          </div>
        </div>

        {/* AI Tip */}
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-3">
            "{currentItem.aiTip}"
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
          {!currentItem.hasFullAnalysis && (
            <button
              onClick={() => onFullAnalysis(currentItem.name)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Vollanalyse
            </button>
          )}
          <button
            onClick={() => onSelectName(currentItem.name)}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Wählen
          </button>
          <button
            onClick={() => onRemoveFromShortlist(currentItem.name)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Entfernen
          </button>
        </div>
      </div>

      {/* Dot Indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileShortlistCarousel;
