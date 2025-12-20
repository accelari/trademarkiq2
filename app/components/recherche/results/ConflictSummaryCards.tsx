"use client";

import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface ConflictSummaryCardsProps {
  critical: number;
  review: number;
  okay: number;
  onCategoryClick: (category: "critical" | "review" | "okay") => void;
}

export function ConflictSummaryCards({ critical, review, okay, onCategoryClick }: ConflictSummaryCardsProps) {
  const cards = [
    {
      id: "critical" as const,
      count: critical,
      label: "kritisch",
      sublabel: ">80% Ähnlich",
      icon: AlertTriangle,
      bg: "bg-red-50 hover:bg-red-100",
      border: "border-red-200 hover:border-red-300",
      iconBg: "bg-red-500",
      textColor: "text-red-700",
      emoji: "🔴",
    },
    {
      id: "review" as const,
      count: review,
      label: "prüfen",
      sublabel: "60-80%",
      icon: AlertCircle,
      bg: "bg-yellow-50 hover:bg-yellow-100",
      border: "border-yellow-200 hover:border-yellow-300",
      iconBg: "bg-yellow-500",
      textColor: "text-yellow-700",
      emoji: "🟡",
    },
    {
      id: "okay" as const,
      count: okay,
      label: "okay",
      sublabel: "<60%",
      icon: CheckCircle,
      bg: "bg-green-50 hover:bg-green-100",
      border: "border-green-200 hover:border-green-300",
      iconBg: "bg-green-500",
      textColor: "text-green-700",
      emoji: "🟢",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onCategoryClick(card.id)}
            className={`${card.bg} ${card.border} border-2 rounded-xl p-4 transition-all cursor-pointer group text-left`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.emoji}</span>
              <span className={`text-2xl font-bold ${card.textColor}`}>{card.count}</span>
            </div>
            <p className={`text-sm font-medium ${card.textColor}`}>{card.label}</p>
            <p className="text-xs text-gray-500">{card.sublabel}</p>
          </button>
        );
      })}
    </div>
  );
}

export default ConflictSummaryCards;
