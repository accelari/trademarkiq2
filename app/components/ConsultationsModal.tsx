"use client";

import { useState } from "react";
import {
  FolderOpen,
  X,
  Loader2,
  FileText,
  Sparkles,
  MessageSquare,
  Search,
  Check,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  Tag,
  Percent,
  Calendar,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ConflictMark {
  id?: string;
  name: string;
  register?: string;
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
}

interface ConflictDetailModalProps {
  conflict: ConflictMark;
  onClose: () => void;
}

function ConflictDetailModal({ conflict, onClose }: ConflictDetailModalProps) {
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
      const date = new Date(dateStr);
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
      <div className="bg-white rounded-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-start justify-between gap-4">
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
                Register
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
                <Tag className="w-4 h-4 text-primary" />
                Nizza-Klassen
              </h3>
              <div className="flex flex-wrap gap-2">
                {conflict.classes.map((cls) => (
                  <span key={cls} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg">
                    Klasse {cls}
                  </span>
                ))}
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
  onShowDetail: (conflict: ConflictMark) => void;
}

function ConflictCard({ conflict, onShowDetail }: ConflictCardProps) {
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
    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-blue-50/50 transition-colors"
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
        <div className="px-3 pb-3 space-y-2 border-t border-blue-100 pt-2">
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
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowDetail(conflict);
            }}
            className="w-full mt-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
          >
            Vollständige Details anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

interface CaseStep {
  step: string;
  status: string;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: string | null;
  metadata?: Record<string, any>;
}

interface Consultation {
  id: string;
  title: string;
  summary: string;
  duration: number | null;
  mode: string;
  createdAt: string;
  updatedAt?: string;
  caseId?: string | null;
  caseNumber?: string | null;
  trademarkName?: string | null;
  countries?: string[];
  niceClasses?: number[];
  caseSteps?: CaseStep[];
  extractedData?: {
    trademarkName?: string;
    countries?: string[];
    niceClasses?: number[];
    isComplete?: boolean;
  };
}

interface ConsultationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultations: Consultation[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
  onNavigate: (path: string) => void;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type StepStatusType = "completed" | "current" | "skipped" | "pending";

const getStepStatus = (consultation: Consultation, stepName: string): StepStatusType => {
  const step = consultation.caseSteps?.find(s => s.step === stepName);
  if (!step) return "pending";
  if (step.skippedAt || step.status === "skipped") return "skipped";
  if (step.completedAt || step.status === "completed") return "completed";
  return "pending";
};

const getEnhancedStepStatus = (consultation: Consultation, stepName: string): StepStatusType => {
  const baseStatus = getStepStatus(consultation, stepName);
  
  if (baseStatus === "completed" || baseStatus === "skipped") {
    return baseStatus;
  }
  
  const allSteps = journeySteps.map(s => ({ name: s, status: getStepStatus(consultation, s) }));
  const currentStepIndex = allSteps.findIndex(s => 
    s.status !== "completed" && s.status !== "skipped"
  );
  
  if (currentStepIndex === -1) return baseStatus;
  
  const stepIndex = journeySteps.indexOf(stepName);
  
  if (stepIndex === currentStepIndex) {
    return "current";
  }
  
  return "pending";
};

const journeySteps = ["beratung", "recherche", "risikoanalyse", "anmeldung", "watchlist"];
const stepLabels: Record<string, string> = {
  beratung: "Beratung",
  recherche: "Recherche",
  risikoanalyse: "Risiko",
  anmeldung: "Anmeldung",
  watchlist: "Watchlist",
};

interface StepBadgeProps {
  step: string;
  status: StepStatusType;
  caseId?: string;
  onNavigate?: (path: string) => void;
  onClose?: () => void;
  isBeratungIncomplete?: boolean;
}

const stepRoutes: Record<string, (caseId: string) => string> = {
  beratung: (caseId) => `/dashboard/copilot?case=${caseId}`,
  recherche: (caseId) => `/dashboard/recherche?caseId=${caseId}`,
  risikoanalyse: (caseId) => `/dashboard/risiko?caseId=${caseId}`,
  anmeldung: (caseId) => `/dashboard/anmeldung?caseId=${caseId}`,
  watchlist: (caseId) => `/dashboard/watchlist?caseId=${caseId}`,
};

const getSkipRoute = (step: string, caseId: string) => {
  if (step === "beratung") {
    return `/dashboard/copilot?catchUpCase=${caseId}`;
  }
  return stepRoutes[step](caseId);
};

function StepBadge({ step, status, caseId, onNavigate, onClose, isBeratungIncomplete }: StepBadgeProps) {
  const isClickable = status !== "pending" && caseId && onNavigate;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isClickable || !caseId || !onNavigate) return;
    
    onClose?.();
    
    if (status === "skipped") {
      onNavigate(getSkipRoute(step, caseId));
    } else if (status === "current" && step === "beratung" && isBeratungIncomplete) {
      onNavigate(`/dashboard/copilot?resumeCase=${caseId}`);
    } else {
      onNavigate(stepRoutes[step](caseId));
    }
  };

  const getStyles = () => {
    switch (status) {
      case "completed":
        return {
          container: "bg-primary text-white border-primary hover:bg-primary/90",
          icon: <Check className="w-3 h-3" />,
        };
      case "current":
        return {
          container: "bg-primary text-white border-primary hover:bg-primary/90",
          icon: null,
        };
      case "skipped":
        return {
          container: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
          icon: <ArrowRight className="w-3 h-3 rotate-180" />,
        };
      case "pending":
      default:
        return {
          container: "bg-gray-50 text-gray-400 border-gray-200",
          icon: null,
        };
    }
  };

  const styles = getStyles();
  
  const getLabel = () => {
    if (status === "current") {
      return (
        <>
          <span>Weiter: {stepLabels[step]}</span>
          <ArrowRight className="w-3 h-3" />
        </>
      );
    }
    if (status === "skipped") {
      return <span>{stepLabels[step]} nachholen</span>;
    }
    return <span>{stepLabels[step]}</span>;
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${styles.container} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {styles.icon}
      {getLabel()}
    </button>
  );
}

export default function ConsultationsModal({
  isOpen,
  onClose,
  consultations,
  isLoading,
  onDelete,
  deletingId,
  onNavigate,
}: ConsultationsModalProps) {
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [rechercheExpanded, setRechercheExpanded] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);

  const handleClose = () => {
    setSelectedConsultation(null);
    onClose();
  };

  const handleDelete = async (id: string) => {
    if (selectedConsultation?.id === id) {
      setSelectedConsultation(null);
    }
    await onDelete(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary to-teal-500 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Meine Markenfälle</h2>
                <p className="text-white/80 text-sm">
                  {consultations.length} gespeicherte Beratungen
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white p-1 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedConsultation ? (
            <div>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="text-primary hover:underline text-sm mb-4 flex items-center gap-1"
              >
                ← Zurück zur Liste
              </button>
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{selectedConsultation.title}</h3>
                <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                  <p>Erstellt: {formatDate(selectedConsultation.createdAt)} · {formatDuration(selectedConsultation.duration)}</p>
                  {selectedConsultation.updatedAt && selectedConsultation.updatedAt !== selectedConsultation.createdAt && (
                    <p className="text-primary font-medium">Aktualisiert: {formatDate(selectedConsultation.updatedAt)}</p>
                  )}
                </div>
              </div>
              {selectedConsultation.summary && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Beratungszusammenfassung
                  </h4>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h2 className="text-base font-bold mt-4 mb-2 first:mt-0 text-gray-900">{children}</h2>,
                      h2: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-2 first:mt-0 text-primary">{children}</h3>,
                      h3: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0 text-gray-800">{children}</h4>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700 text-sm">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-700 text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      table: ({ children }) => <table className="w-full border-collapse mb-3 text-sm">{children}</table>,
                      thead: ({ children }) => <thead className="bg-white">{children}</thead>,
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                      th: ({ children }) => <th className="text-left py-1.5 px-2 font-semibold text-gray-600 text-xs uppercase">{children}</th>,
                      td: ({ children }) => <td className="py-1.5 px-2 text-gray-800">{children}</td>,
                    }}
                  >
                    {selectedConsultation.summary}
                  </ReactMarkdown>
                </div>
              )}

              {(selectedConsultation.trademarkName || (selectedConsultation.countries && selectedConsultation.countries.length > 0) || (selectedConsultation.niceClasses && selectedConsultation.niceClasses.length > 0)) && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 mb-4">
                  <h4 className="text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Extrahierte Informationen
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedConsultation.trademarkName && (
                      <div className="flex justify-between">
                        <span className="text-teal-700">Markenname:</span>
                        <span className="font-medium text-teal-900">"{selectedConsultation.trademarkName}"</span>
                      </div>
                    )}
                    {selectedConsultation.countries && selectedConsultation.countries.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-teal-700">Zielländer:</span>
                        <span className="font-medium text-teal-900">{selectedConsultation.countries.join(", ")}</span>
                      </div>
                    )}
                    {selectedConsultation.niceClasses && selectedConsultation.niceClasses.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-teal-700">Nizza-Klassen:</span>
                        <span className="font-medium text-teal-900">{selectedConsultation.niceClasses.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {(() => {
                const rechercheStep = selectedConsultation.caseSteps?.find(s => s.step === "recherche" && (s.status === "completed" || s.completedAt));
                if (!rechercheStep) return null;
                const meta = rechercheStep.metadata || {};
                const conflicts = meta.conflicts || [];
                return (
                  <div className="bg-blue-50 rounded-xl border border-blue-100 mb-4 overflow-hidden">
                    <button
                      onClick={() => setRechercheExpanded(!rechercheExpanded)}
                      className="w-full p-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                    >
                      <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Recherche-Ergebnisse
                        {meta.conflictsCount !== undefined && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${meta.conflictsCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {meta.conflictsCount} Konflikte
                          </span>
                        )}
                      </h4>
                      <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform ${rechercheExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {rechercheExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="space-y-2 text-sm">
                          {meta.searchQuery && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Suchbegriff:</span>
                              <span className="font-medium text-blue-900">"{meta.searchQuery}"</span>
                            </div>
                          )}
                          {meta.resultsCount !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Ergebnisse analysiert:</span>
                              <span className="font-medium text-blue-900">{meta.resultsCount}</span>
                            </div>
                          )}
                          {meta.countries && meta.countries.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Länder:</span>
                              <span className="font-medium text-blue-900">{meta.countries.join(", ")}</span>
                            </div>
                          )}
                          {meta.classes && meta.classes.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Nizza-Klassen:</span>
                              <span className="font-medium text-blue-900">{meta.classes.join(", ")}</span>
                            </div>
                          )}
                          {rechercheStep.completedAt && (
                            <div className="flex justify-between pt-2 border-t border-blue-200 mt-2">
                              <span className="text-blue-700">Durchgeführt am:</span>
                              <span className="font-medium text-blue-900">
                                {new Date(rechercheStep.completedAt).toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {conflicts.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-blue-200">
                            <h5 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              Gefundene Konflikte ({conflicts.length})
                            </h5>
                            <div className="space-y-2">
                              {conflicts.map((conflict: ConflictMark, index: number) => (
                                <ConflictCard
                                  key={conflict.id || index}
                                  conflict={conflict}
                                  onShowDetail={setSelectedConflict}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Noch keine Beratungen gespeichert</p>
              <p className="text-sm text-gray-500 mt-2">
                Erstellen Sie eine Zusammenfassung und speichern Sie diese.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((consultation) => {
                return (
                  <div
                    key={consultation.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedConsultation(consultation)}
                      >
                        <h4 className="font-medium text-gray-900 hover:text-primary transition-colors">
                          {consultation.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-sm text-gray-500">
                            {consultation.updatedAt && consultation.updatedAt !== consultation.createdAt 
                              ? `Aktualisiert: ${formatDate(consultation.updatedAt)}`
                              : formatDate(consultation.createdAt)
                            } · {formatDuration(consultation.duration)}
                          </p>
                          {consultation.caseNumber && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {consultation.caseNumber}
                            </span>
                          )}
                          {consultation.extractedData && !(consultation.extractedData as any).isComplete && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Unvollständig
                            </span>
                          )}
                        </div>
                        
                        {consultation.caseNumber && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const beratungStep = consultation.caseSteps?.find(s => s.step === "beratung");
                                const beratungStatus = getEnhancedStepStatus(consultation, "beratung");
                                const isBeratungIncomplete = beratungStep?.status === "in_progress" || 
                                  (beratungStatus === "current" && consultation.extractedData && !(consultation.extractedData as any).isComplete);
                                
                                return journeySteps.map((step) => {
                                  const status = getEnhancedStepStatus(consultation, step);
                                  return (
                                    <StepBadge 
                                      key={step} 
                                      step={step} 
                                      status={status}
                                      caseId={consultation.caseId ?? undefined}
                                      onNavigate={onNavigate}
                                      onClose={handleClose}
                                      isBeratungIncomplete={step === "beratung" ? isBeratungIncomplete : undefined}
                                    />
                                  );
                                });
                              })()}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {journeySteps.filter(s => getStepStatus(consultation, s) === "completed").length} von {journeySteps.length} Schritten abgeschlossen
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(consultation.id)}
                        disabled={deletingId === consultation.id}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Löschen"
                      >
                        {deletingId === consultation.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
      
      {selectedConflict && (
        <ConflictDetailModal 
          conflict={selectedConflict} 
          onClose={() => setSelectedConflict(null)} 
        />
      )}
    </div>
  );
}
