"use client";

import { Globe, Tag, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CaseSummaryProps {
  trademarkName: string | null;
  countries: string[];
  niceClasses: number[];
  riskScore: number | null;
  riskLevel: "high" | "medium" | "low" | null;
  conflictCount: number;
}

export function CaseSummary({
  trademarkName,
  countries,
  niceClasses,
  riskScore,
  riskLevel,
  conflictCount,
}: CaseSummaryProps) {
  const getRiskColor = () => {
    if (!riskLevel) return "text-gray-400";
    switch (riskLevel) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-amber-600";
      case "low":
        return "text-green-600";
    }
  };

  const getRiskBgColor = () => {
    if (!riskLevel) return "bg-gray-50";
    switch (riskLevel) {
      case "high":
        return "bg-red-50";
      case "medium":
        return "bg-amber-50";
      case "low":
        return "bg-green-50";
    }
  };

  const getRiskIcon = () => {
    if (!riskLevel) return <Minus className="w-5 h-5" />;
    switch (riskLevel) {
      case "high":
        return <TrendingUp className="w-5 h-5" />;
      case "medium":
        return <Minus className="w-5 h-5" />;
      case "low":
        return <TrendingDown className="w-5 h-5" />;
    }
  };

  const getRiskLabel = () => {
    if (!riskLevel) return "Nicht bewertet";
    switch (riskLevel) {
      case "high":
        return "Hohes Risiko";
      case "medium":
        return "Mittleres Risiko";
      case "low":
        return "Geringes Risiko";
    }
  };

  const hasData = trademarkName || countries.length > 0 || niceClasses.length > 0;

  if (!hasData && riskScore === null) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Zusammenfassung
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {trademarkName && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Markenname</div>
            <div className="text-lg font-semibold text-gray-900">{trademarkName}</div>
          </div>
        )}

        {countries.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <Globe className="w-4 h-4" />
              Länder / Register
            </div>
            <div className="flex flex-wrap gap-1">
              {countries.slice(0, 3).map((country) => (
                <span
                  key={country}
                  className="px-2 py-0.5 bg-white border border-gray-200 rounded text-sm font-medium"
                >
                  {country}
                </span>
              ))}
              {countries.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-200 rounded text-sm text-gray-600">
                  +{countries.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {niceClasses.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <Tag className="w-4 h-4" />
              Nizza-Klassen
            </div>
            <div className="flex flex-wrap gap-1">
              {niceClasses.slice(0, 4).map((cls) => (
                <span
                  key={cls}
                  className="px-2 py-0.5 bg-white border border-gray-200 rounded text-sm font-medium"
                >
                  {cls}
                </span>
              ))}
              {niceClasses.length > 4 && (
                <span className="px-2 py-0.5 bg-gray-200 rounded text-sm text-gray-600">
                  +{niceClasses.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {riskScore !== null && (
          <div className={`${getRiskBgColor()} rounded-lg p-4`}>
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Risikobewertung
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getRiskColor()}`}>
                {riskScore}%
              </span>
              <div className={`flex items-center gap-1 ${getRiskColor()}`}>
                {getRiskIcon()}
                <span className="text-sm font-medium">{getRiskLabel()}</span>
              </div>
            </div>
            {conflictCount > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                {conflictCount} Konflikt{conflictCount !== 1 ? "e" : ""} gefunden
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
