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
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 p-6 shadow-lg">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-5 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-gradient-to-b from-teal-400 to-teal-600 rounded-full" />
        Zusammenfassung
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {trademarkName && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Markenname</div>
            <div className="text-xl font-bold text-gray-900">{trademarkName}</div>
          </div>
        )}

        {countries.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              <Globe className="w-3.5 h-3.5 text-teal-500" />
              Länder / Register
            </div>
            <div className="flex flex-wrap gap-1.5">
              {countries.slice(0, 3).map((country) => (
                <span
                  key={country}
                  className="px-2.5 py-1 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg text-sm font-semibold text-teal-700"
                >
                  {country}
                </span>
              ))}
              {countries.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                  +{countries.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {niceClasses.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              <Tag className="w-3.5 h-3.5 text-teal-500" />
              Nizza-Klassen
            </div>
            <div className="flex flex-wrap gap-1.5">
              {niceClasses.slice(0, 4).map((cls) => (
                <span
                  key={cls}
                  className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700"
                >
                  {cls}
                </span>
              ))}
              {niceClasses.length > 4 && (
                <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                  +{niceClasses.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {riskScore !== null && (
          <div className={`${getRiskBgColor()} rounded-xl p-4 shadow-sm border ${riskLevel === 'high' ? 'border-red-200' : riskLevel === 'medium' ? 'border-amber-200' : riskLevel === 'low' ? 'border-green-200' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              <AlertTriangle className={`w-3.5 h-3.5 ${getRiskColor()}`} />
              Risikobewertung
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${getRiskColor()}`}>
                {riskScore}%
              </span>
              <div className={`flex flex-col ${getRiskColor()}`}>
                <span className="text-sm font-semibold">{getRiskLabel()}</span>
                {conflictCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {conflictCount} Konflikt{conflictCount !== 1 ? "e" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
