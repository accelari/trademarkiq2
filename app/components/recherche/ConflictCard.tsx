"use client";

import { Globe, Tag, Star, Lightbulb, ExternalLink } from "lucide-react";
import { getClassRelationInfo } from "@/lib/related-classes";
import { getRegisterUrl, getRegisterName } from "@/lib/register-urls";

export interface ConflictingMark {
  id: string;
  name: string;
  register: string;
  holder: string;
  classes: number[];
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
  status: string;
  applicationNumber: string;
  applicationDate: string | null;
  registrationNumber: string;
  registrationDate: string | null;
  isFamousMark: boolean;
  isDirectClass?: boolean;
  isRelatedClass?: boolean;
}

interface ConflictCardProps {
  conflict: ConflictingMark;
  selectedClasses?: number[];
  includeRelatedClasses?: boolean;
  onClick?: () => void;
}

function formatGermanDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "-";
  }
}

export function ConflictCard({ conflict, selectedClasses = [], includeRelatedClasses = false, onClick }: ConflictCardProps) {
  const riskStyles = conflict.riskLevel === "high"
    ? "border-red-200 hover:border-red-300 bg-red-50/50"
    : conflict.riskLevel === "medium"
      ? "border-orange-200 hover:border-orange-300 bg-orange-50/50"
      : "border-green-200 hover:border-green-300 bg-green-50/50";
  const riskEmoji = conflict.riskLevel === "high" ? "🔴" : conflict.riskLevel === "medium" ? "🟡" : "🟢";

  const isInSelectedClasses = conflict.classes.some(cls => selectedClasses.includes(cls));

  const relatedClassInfo = conflict.classes.length > 0 && !isInSelectedClasses
    ? conflict.classes.map(cls => getClassRelationInfo(selectedClasses, cls)).find(info => info.isRelated)
    : null;
  const isRelatedClass = !!relatedClassInfo;

  // Berechne überlappende und verwandte Klassen
  const overlappingClasses = conflict.classes.filter(cls => selectedClasses.includes(cls));
  const relatedClasses = conflict.classes.filter(cls => {
    if (selectedClasses.includes(cls)) return false;
    const info = getClassRelationInfo(selectedClasses, cls);
    return info.isRelated;
  });

  // Generiere Register-URL
  const registerUrl = getRegisterUrl({
    office: conflict.register,
    applicationNumber: conflict.applicationNumber,
    registrationNumber: conflict.registrationNumber,
  });
  const registerName = getRegisterName(conflict.register);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`p-3 rounded-xl border-2 ${riskStyles} transition-all text-left hover:shadow-md cursor-pointer group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{conflict.name}</h4>
            <span className="flex items-center gap-1 text-sm font-bold whitespace-nowrap">
              {riskEmoji} {conflict.accuracy}%
            </span>
          </div>
          {conflict.holder && conflict.holder !== "Unbekannt" && conflict.holder !== "unbekannt" && (
            <p className="text-sm text-gray-600 truncate mt-0.5">{conflict.holder}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${conflict.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {conflict.status === "active" ? "Aktiv" : conflict.status === "expired" ? "Abgelaufen" : "Unbekannt"}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 px-1.5 py-0.5 bg-gray-50 rounded">
              <Globe className="w-3 h-3" /> {conflict.register}
            </span>
            {conflict.classes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 px-1.5 py-0.5 bg-gray-50 rounded">
                <Tag className="w-3 h-3" />
                {overlappingClasses.length > 0 ? (
                  <span>
                    <span className="text-red-600 font-semibold">{overlappingClasses.join(", ")}</span>
                    {conflict.classes.length > overlappingClasses.length && (
                      <span className="text-gray-400">, {conflict.classes.filter(c => !overlappingClasses.includes(c)).join(", ")}</span>
                    )}
                  </span>
                ) : (
                  <span>{conflict.classes.join(", ")}</span>
                )}
              </span>
            )}
            {conflict.isFamousMark && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                <Star className="w-3 h-3" /> Bekannt
              </span>
            )}
            {isRelatedClass && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                <Lightbulb className="w-3 h-3" /> Verwandt
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5 shrink-0">
          <p>Anm: {conflict.applicationNumber || "-"}</p>
          {conflict.applicationDate && <p>({formatGermanDate(conflict.applicationDate)})</p>}
          <p>Reg: {conflict.registrationNumber || "-"}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3" /> Details
        </span>
        {registerUrl && (
          <a
            href={registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium opacity-70 group-hover:opacity-100 transition-opacity hover:underline"
          >
            <Globe className="w-3 h-3" /> {registerName}
          </a>
        )}
      </div>
    </div>
  );
}
