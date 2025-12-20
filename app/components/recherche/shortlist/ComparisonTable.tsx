"use client";

import { CheckCircle, XCircle, AlertCircle, AlertTriangle, Star, Trash2, BarChart3, HelpCircle } from "lucide-react";

export interface ShortlistItem {
  name: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "unknown";
  conflictCount: number;
  criticalCount: number;
  domainDe: "available" | "taken" | "unknown";
  domainCom: "available" | "taken" | "unknown";
  pronunciation: 1 | 2 | 3 | 4 | 5;
  aiTip: string;
  hasFullAnalysis: boolean;
}

interface ComparisonTableProps {
  items: ShortlistItem[];
  onSelectName: (name: string) => void;
  onRemoveFromShortlist: (name: string) => void;
  onFullAnalysis: (name: string) => void;
}

function DomainStatus({ status }: { status: "available" | "taken" | "unknown" }) {
  if (status === "available") {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (status === "taken") {
    return <XCircle className="w-4 h-4 text-red-500" />;
  }
  return <HelpCircle className="w-4 h-4 text-gray-400" />;
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const config = {
    low: { emoji: "🟢", color: "text-green-600", bg: "bg-green-50" },
    medium: { emoji: "🟡", color: "text-yellow-600", bg: "bg-yellow-50" },
    high: { emoji: "🔴", color: "text-red-600", bg: "bg-red-50" },
    unknown: { emoji: "⚪", color: "text-gray-500", bg: "bg-gray-50" },
  };
  const c = config[level as keyof typeof config] || config.unknown;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${c.bg}`}>
      <span>{c.emoji}</span>
      <span className={`font-semibold ${c.color}`}>{score}</span>
    </span>
  );
}

function PronunciationStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export function ComparisonTable({
  items,
  onSelectName,
  onRemoveFromShortlist,
  onFullAnalysis,
}: ComparisonTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Keine Namen in der Shortlist.</p>
        <p className="text-sm mt-1">Fügen Sie Namen hinzu, um sie zu vergleichen.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Merkmal</th>
            {items.map((item) => (
              <th key={item.name} className="text-center py-3 px-4 min-w-[140px]">
                <span className="font-semibold text-gray-900">{item.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Risk Score */}
          <tr className="bg-gray-50/50">
            <td className="py-3 px-4 text-sm text-gray-600">Risiko</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4 text-center">
                <RiskBadge level={item.riskLevel} score={item.riskScore} />
              </td>
            ))}
          </tr>

          {/* Conflicts */}
          <tr>
            <td className="py-3 px-4 text-sm text-gray-600">Konflikte</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4 text-center">
                <span className={`font-semibold ${item.conflictCount === 0 ? "text-green-600" : "text-gray-700"}`}>
                  {item.conflictCount}
                </span>
              </td>
            ))}
          </tr>

          {/* Critical */}
          <tr className="bg-gray-50/50">
            <td className="py-3 px-4 text-sm text-gray-600">Kritisch</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4 text-center">
                <span className={`font-semibold ${item.criticalCount === 0 ? "text-green-600" : "text-red-600"}`}>
                  {item.criticalCount}
                </span>
              </td>
            ))}
          </tr>

          {/* Domain .de */}
          <tr>
            <td className="py-3 px-4 text-sm text-gray-600">Domain .de</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4">
                <div className="flex justify-center">
                  <DomainStatus status={item.domainDe} />
                </div>
              </td>
            ))}
          </tr>

          {/* Domain .com */}
          <tr className="bg-gray-50/50">
            <td className="py-3 px-4 text-sm text-gray-600">Domain .com</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4">
                <div className="flex justify-center">
                  <DomainStatus status={item.domainCom} />
                </div>
              </td>
            ))}
          </tr>

          {/* Pronunciation */}
          <tr>
            <td className="py-3 px-4 text-sm text-gray-600">Aussprache</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4">
                <div className="flex justify-center">
                  <PronunciationStars rating={item.pronunciation} />
                </div>
              </td>
            ))}
          </tr>

          {/* AI Tip */}
          <tr className="bg-gray-50/50">
            <td className="py-3 px-4 text-sm text-gray-600">KI-Tipp</td>
            {items.map((item) => (
              <td key={item.name} className="py-3 px-4 text-center">
                <p className="text-xs text-gray-600 italic">"{item.aiTip}"</p>
              </td>
            ))}
          </tr>

          {/* Actions */}
          <tr>
            <td className="py-4 px-4"></td>
            {items.map((item) => (
              <td key={item.name} className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  {!item.hasFullAnalysis && (
                    <button
                      onClick={() => onFullAnalysis(item.name)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Vollanalyse
                    </button>
                  )}
                  <button
                    onClick={() => onSelectName(item.name)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Wählen
                  </button>
                  <button
                    onClick={() => onRemoveFromShortlist(item.name)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Entfernen
                  </button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
