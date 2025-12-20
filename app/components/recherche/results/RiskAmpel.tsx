"use client";

import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

export type RiskLevel = "low" | "medium" | "high";

interface RiskAmpelProps {
  riskLevel: RiskLevel;
  riskScore: number;
  brandName: string;
  shortExplanation: string;
}

export function RiskAmpel({ riskLevel, riskScore, brandName, shortExplanation }: RiskAmpelProps) {
  const config = {
    high: {
      bg: "bg-gradient-to-br from-red-50 to-red-100",
      border: "border-red-300",
      icon: AlertTriangle,
      iconBg: "bg-red-500",
      emoji: "🔴",
      title: "HOHES RISIKO",
      titleColor: "text-red-700",
      pulse: "animate-pulse",
      glow: "shadow-red-200",
    },
    medium: {
      bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
      border: "border-yellow-300",
      icon: AlertCircle,
      iconBg: "bg-yellow-500",
      emoji: "🟡",
      title: "MITTLERES RISIKO",
      titleColor: "text-yellow-700",
      pulse: "",
      glow: "shadow-yellow-200",
    },
    low: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-300",
      icon: CheckCircle,
      iconBg: "bg-green-500",
      emoji: "🟢",
      title: "NIEDRIGES RISIKO",
      titleColor: "text-green-700",
      pulse: "",
      glow: "shadow-green-200",
    },
  };

  const c = config[riskLevel];
  const Icon = c.icon;

  return (
    <div className={`${c.bg} ${c.border} border-2 rounded-2xl p-6 shadow-lg ${c.glow} transition-all`}>
      <div className="flex flex-col items-center text-center">
        {/* Risk Icon */}
        <div className={`w-16 h-16 ${c.iconBg} rounded-full flex items-center justify-center mb-4 ${c.pulse} shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Risk Title */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{c.emoji}</span>
          <h2 className={`text-xl font-bold ${c.titleColor}`}>{c.title}</h2>
        </div>

        {/* Risk Score */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Score:</span>
          <span className={`text-2xl font-bold ${c.titleColor}`}>{riskScore}/100</span>
        </div>

        {/* Brand Name */}
        <p className="text-gray-700 mb-2">
          <span className="font-semibold">"{brandName}"</span>
        </p>

        {/* Short Explanation */}
        <p className="text-sm text-gray-600 max-w-md leading-relaxed">
          {shortExplanation}
        </p>
      </div>
    </div>
  );
}

export default RiskAmpel;
