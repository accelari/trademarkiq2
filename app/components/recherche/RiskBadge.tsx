"use client";

export type RiskLevel = "high" | "medium" | "low";

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: "small" | "medium" | "large";
}

export function RiskBadge({ risk, size = "medium" }: RiskBadgeProps) {
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-4 py-2 text-lg",
    large: "px-5 py-2.5 text-xl",
  };

  switch (risk) {
    case "high":
      return (
        <span className={`inline-flex items-center gap-2 ${sizeClasses[size]} bg-red-100 text-red-800 font-bold rounded-full`}>
          🔴 Hohes Risiko
        </span>
      );
    case "medium":
      return (
        <span className={`inline-flex items-center gap-2 ${sizeClasses[size]} bg-yellow-100 text-yellow-800 font-bold rounded-full`}>
          🟡 Mittleres Risiko
        </span>
      );
    case "low":
      return (
        <span className={`inline-flex items-center gap-2 ${sizeClasses[size]} bg-green-100 text-green-800 font-bold rounded-full`}>
          🟢 Niedriges Risiko
        </span>
      );
  }
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "active":
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aktiv</span>;
    case "expired":
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Abgelaufen</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Unbekannt</span>;
  }
}

interface OfficeBadgeProps {
  office: string;
}

const officeColors: Record<string, string> = {
  WO: "bg-purple-100 text-purple-700",
  EU: "bg-blue-100 text-blue-700",
  DE: "bg-gray-100 text-gray-700",
  US: "bg-red-100 text-red-700",
  GB: "bg-indigo-100 text-indigo-700",
  CH: "bg-orange-100 text-orange-700",
};

export function OfficeBadge({ office }: OfficeBadgeProps) {
  return (
    <span className={`px-2 py-1 ${officeColors[office] || "bg-gray-100 text-gray-700"} text-xs font-medium rounded-full`}>
      {office}
    </span>
  );
}

interface AccuracyBadgeProps {
  accuracy: number;
}

export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 95) return "text-red-600";
  if (accuracy >= 90) return "text-orange-600";
  if (accuracy >= 85) return "text-yellow-600";
  return "text-green-600";
}

export function AccuracyBadge({ accuracy }: AccuracyBadgeProps) {
  return (
    <span className={`flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs font-semibold ${getAccuracyColor(accuracy)}`}>
      {accuracy}%
    </span>
  );
}
