"use client";

import { HelpCircle, X, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";

interface RiskScoreLegendProps {
  currentScore?: number;
  variant?: "inline" | "tooltip" | "card";
}

export function RiskScoreLegend({ currentScore, variant = "card" }: RiskScoreLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRiskBand = (score: number) => {
    if (score <= 39) return "low";
    if (score <= 69) return "medium";
    return "high";
  };

  const currentBand = currentScore !== undefined ? getRiskBand(currentScore) : null;

  if (variant === "tooltip") {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Risiko-Score erklärt"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute z-50 right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Was bedeutet der Score?</h4>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <LegendContent currentBand={currentBand} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return <LegendContent currentBand={currentBand} compact />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Risiko-Score Legende
      </h4>
      <LegendContent currentBand={currentBand} />
    </div>
  );
}

interface LegendContentProps {
  currentBand: "low" | "medium" | "high" | null;
  compact?: boolean;
}

function LegendContent({ currentBand, compact = false }: LegendContentProps) {
  const bands = [
    {
      id: "low",
      range: "0-39%",
      label: "Niedriges Risiko",
      emoji: "🟢",
      color: "bg-green-50 border-green-200",
      activeColor: "ring-2 ring-green-500",
      icon: CheckCircle,
      iconColor: "text-green-600",
      recommendation: "Anmeldung empfohlen",
      description: "Geringe Wahrscheinlichkeit für Widersprüche. Die Marke kann in der Regel problemlos angemeldet werden.",
    },
    {
      id: "medium",
      range: "40-69%",
      label: "Mittleres Risiko",
      emoji: "🟡",
      color: "bg-yellow-50 border-yellow-200",
      activeColor: "ring-2 ring-yellow-500",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      recommendation: "Anwalt konsultieren",
      description: "Es bestehen potenzielle Konflikte. Eine rechtliche Beratung vor der Anmeldung wird empfohlen.",
    },
    {
      id: "high",
      range: "70-100%",
      label: "Hohes Risiko",
      emoji: "🔴",
      color: "bg-red-50 border-red-200",
      activeColor: "ring-2 ring-red-500",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      recommendation: "Namensänderung empfohlen",
      description: "Hohe Wahrscheinlichkeit für Widersprüche oder Ablehnung. Alternativen prüfen.",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {bands.map((band) => (
          <span
            key={band.id}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${band.color} border ${
              currentBand === band.id ? band.activeColor : ""
            }`}
          >
            {band.emoji} {band.range}: {band.recommendation}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bands.map((band) => {
        const Icon = band.icon;
        const isActive = currentBand === band.id;
        return (
          <div
            key={band.id}
            className={`p-3 rounded-lg border ${band.color} ${isActive ? band.activeColor : ""} transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${band.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {band.emoji} {band.range}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${band.color}`}>
                    {band.recommendation}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{band.description}</p>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
        Der Score basiert auf phonetischer, visueller und konzeptueller Ähnlichkeit zu bestehenden Marken
        sowie Branchenüberschneidungen (Nizza-Klassen).
      </p>
    </div>
  );
}

export function RiskScoreExplanation({ score }: { score: number }) {
  const getExplanation = (s: number) => {
    if (s <= 39) {
      return {
        text: `${s}% Risiko bedeutet: Kaum Konfliktpotenzial gefunden. Die Anmeldung hat gute Erfolgsaussichten.`,
        color: "text-green-700 bg-green-50",
      };
    }
    if (s <= 69) {
      return {
        text: `${s}% Risiko bedeutet: Ähnliche Marken existieren. Eine Prüfung durch einen Anwalt ist ratsam.`,
        color: "text-yellow-700 bg-yellow-50",
      };
    }
    return {
      text: `${s}% Risiko bedeutet: Bei ähnlichen Fällen wurde häufig Widerspruch eingelegt. Alternative Namen prüfen.`,
      color: "text-red-700 bg-red-50",
    };
  };

  const explanation = getExplanation(score);

  return (
    <p className={`text-sm px-3 py-2 rounded-lg ${explanation.color}`}>
      {explanation.text}
    </p>
  );
}
