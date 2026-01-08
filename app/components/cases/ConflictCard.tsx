"use client";

import { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  Tag,
  Percent,
  AlertTriangle,
} from "lucide-react";

export interface ConflictMark {
  id?: string;
  name: string;
  register?: string;
  protection?: string[]; // Schutzländer (z.B. ["US", "EU"] bei WO-Marke)
  holder?: string;
  classes?: number[];
  accuracy?: number;
  riskLevel?: "high" | "medium" | "low";
  reasoning?: string;
  status?: string;
  applicationNumber?: string;
  applicationDate?: string | null;
  registrationNumber?: string;
  registrationDate?: string | null;
  isFamousMark?: boolean;
  goodsServices?: string[]; // Waren/Dienstleistungen
  image?: string; // Bild/Logo URL
}

interface ConflictDetailModalProps {
  conflict: ConflictMark;
  onClose: () => void;
}

export function ConflictDetailModal({ conflict, onClose }: ConflictDetailModalProps) {
  const getRiskStyles = () => {
    const riskLevel = conflict.riskLevel || (conflict.accuracy && conflict.accuracy >= 90 ? "high" : conflict.accuracy && conflict.accuracy >= 80 ? "medium" : "low");
    switch (riskLevel) {
      case "high": return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", icon: "text-red-600" };
      case "medium": return { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", icon: "text-orange-600" };
      case "low": return { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", icon: "text-green-600" };
      default: return { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700", icon: "text-gray-600" };
    }
  };
  
  const formatGermanDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      let date: Date;
      // Handle YYYYMMDD format from tmsearch API
      if (/^\d{8}$/.test(dateStr)) {
        const year = parseInt(dateStr.slice(0, 4), 10);
        const month = parseInt(dateStr.slice(4, 6), 10) - 1;
        const day = parseInt(dateStr.slice(6, 8), 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "-";
    }
  };
  
  const styles = getRiskStyles();
  const riskLevel = conflict.riskLevel || (conflict.accuracy && conflict.accuracy >= 90 ? "high" : conflict.accuracy && conflict.accuracy >= 80 ? "medium" : "low");
  const riskEmoji = riskLevel === "high" ? "🔴" : riskLevel === "medium" ? "🟡" : "🟢";
  const riskLabel = riskLevel === "high" ? "Hohes Risiko" : riskLevel === "medium" ? "Mittleres Risiko" : "Niedriges Risiko";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full sm:max-w-2xl max-h-[98vh] sm:max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-start justify-between gap-4">
            {conflict.image && (
              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                <img 
                  src={conflict.image} 
                  alt={conflict.name} 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${styles.badge}`}>
                  {riskEmoji} {riskLabel}
                </span>
                {conflict.accuracy !== undefined && (
                  <span className={`px-2 py-1 bg-white/80 rounded-full text-sm font-bold ${styles.icon}`}>
                    {conflict.accuracy}%
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{conflict.name}</h2>
              {conflict.holder && <p className="text-gray-600 mt-1">{conflict.holder}</p>}
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Globe className="w-3.5 h-3.5" />
                Register (Amt)
              </div>
              <p className="font-semibold text-gray-900">{conflict.register || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Status</div>
              <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${conflict.status === "active" ? "bg-green-100 text-green-700" : conflict.status === "expired" ? "bg-gray-200 text-gray-600" : "bg-gray-200 text-gray-600"}`}>
                {conflict.status === "active" ? "Aktiv" : conflict.status === "expired" ? "Abgelaufen" : "Unbekannt"}
              </span>
            </div>
          </div>

          {conflict.protection && conflict.protection.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 text-xs mb-2">
                <Globe className="w-3.5 h-3.5" />
                Betroffene Länder/Regionen
              </div>
              <div className="flex flex-wrap gap-2">
                {conflict.protection.map((country) => (
                  <span key={country} className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Anmeldenummer</div>
              <p className="font-semibold text-gray-900">{conflict.applicationNumber || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Anmeldedatum</div>
              <p className="font-semibold text-gray-900">{formatGermanDate(conflict.applicationDate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Registrierungsnummer</div>
              <p className="font-semibold text-gray-900">{conflict.registrationNumber || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">Registrierungsdatum</div>
              <p className="font-semibold text-gray-900">{formatGermanDate(conflict.registrationDate)}</p>
            </div>
          </div>

          {conflict.accuracy !== undefined && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Percent className="w-3.5 h-3.5" />
                Ähnlichkeit
              </div>
              <p className={`font-bold ${conflict.accuracy >= 90 ? 'text-red-600' : conflict.accuracy >= 80 ? 'text-orange-600' : 'text-green-600'}`}>
                {conflict.accuracy}%
              </p>
            </div>
          )}

          {conflict.holder && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Building2 className="w-3.5 h-3.5" />
                Inhaber
              </div>
              <p className="font-semibold text-gray-900">{conflict.holder}</p>
            </div>
          )}

          {conflict.classes && conflict.classes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600" />
                Nizza-Klassen
              </h3>
              <div className="flex flex-wrap gap-2">
                {conflict.classes.map((cls) => (
                  <span key={cls} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg">
                    Klasse {cls}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conflict.goodsServices && conflict.goodsServices.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                Waren/Dienstleistungen
              </h3>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 max-h-32 overflow-y-auto">
                <ul className="text-sm text-gray-700 space-y-1">
                  {conflict.goodsServices.slice(0, 10).map((gs, idx) => (
                    <li key={idx} className="leading-relaxed">• {gs}</li>
                  ))}
                  {conflict.goodsServices.length > 10 && (
                    <li className="text-purple-600 font-medium">... und {conflict.goodsServices.length - 10} weitere</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {conflict.reasoning && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${styles.icon}`} />
                Begründung
              </h3>
              <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
                <p className="text-gray-700 leading-relaxed">{conflict.reasoning}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConflictCardProps {
  conflict: ConflictMark;
  onShowDetail?: (conflict: ConflictMark) => void;
}

export function ConflictCard({ conflict, onShowDetail }: ConflictCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const accuracy = conflict.accuracy || 0;
  const accuracyColor = accuracy >= 90 ? 'bg-red-100 text-red-700' : accuracy >= 80 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
  
  const formatGermanDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "-";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 truncate">{conflict.name}</p>
            {accuracy > 0 && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${accuracyColor}`}>
                {accuracy}%
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {conflict.register && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                {conflict.register}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              conflict.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {conflict.status === "active" ? "Aktiv" : conflict.status === "expired" ? "Abgelaufen" : "Unbekannt"}
            </span>
            {conflict.isFamousMark && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                Bekannte Marke
              </span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {conflict.classes && conflict.classes.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Nizza-Klassen:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {conflict.classes.map(c => `Klasse ${c}`).join(", ")}
                </span>
              </div>
            )}
            {conflict.applicationNumber && (
              <div>
                <span className="text-gray-500">Anmeldenr.:</span>
                <span className="ml-1 font-medium text-gray-900">{conflict.applicationNumber}</span>
              </div>
            )}
            {conflict.applicationDate && (
              <div>
                <span className="text-gray-500">Anmeldedatum:</span>
                <span className="ml-1 font-medium text-gray-900">{formatGermanDate(conflict.applicationDate)}</span>
              </div>
            )}
            {conflict.registrationNumber && (
              <div>
                <span className="text-gray-500">Reg.-Nr.:</span>
                <span className="ml-1 font-medium text-gray-900">{conflict.registrationNumber}</span>
              </div>
            )}
            {conflict.registrationDate && (
              <div>
                <span className="text-gray-500">Reg.-Datum:</span>
                <span className="ml-1 font-medium text-gray-900">{formatGermanDate(conflict.registrationDate)}</span>
              </div>
            )}
            {conflict.holder && (
              <div className="col-span-2">
                <span className="text-gray-500">Inhaber:</span>
                <span className="ml-1 font-medium text-gray-900">{conflict.holder}</span>
              </div>
            )}
          </div>
          
          {conflict.reasoning && (
            <div className="text-xs">
              <span className="text-gray-500">Begründung:</span>
              <p className="mt-0.5 text-gray-700 bg-gray-50 p-2 rounded">{conflict.reasoning}</p>
            </div>
          )}
          
          {onShowDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDetail(conflict);
              }}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2"
            >
              Details anzeigen →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ConflictCard;
