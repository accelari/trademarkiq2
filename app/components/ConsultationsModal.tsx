"use client";

import { useState } from "react";
import {
  FolderOpen,
  X,
  Loader2,
  FileText,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface CaseStep {
  step: string;
  status: string;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: string | null;
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

const journeySteps = ["beratung", "recherche", "risikoanalyse", "anmeldung", "watchlist"];

const getCompletedStepsCount = (consultation: Consultation): number => {
  if (!consultation.caseSteps) return 0;
  return consultation.caseSteps.filter(s => 
    s.status === "completed" || s.completedAt
  ).length;
};

const getCaseStatus = (consultation: Consultation): { label: string; color: string } => {
  const completedCount = getCompletedStepsCount(consultation);
  if (completedCount === 0) {
    return { label: "Neu", color: "bg-gray-100 text-gray-600" };
  }
  if (completedCount >= journeySteps.length) {
    return { label: "Abgeschlossen", color: "bg-green-100 text-green-700" };
  }
  return { label: `${completedCount}/${journeySteps.length} Schritte`, color: "bg-primary/10 text-primary" };
};

export default function ConsultationsModal({
  isOpen,
  onClose,
  consultations,
  isLoading,
  onDelete,
  deletingId,
  onNavigate,
}: ConsultationsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const handleCaseClick = (consultation: Consultation) => {
    if (consultation.caseId) {
      handleClose();
      onNavigate(`/dashboard/case/${consultation.caseId}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await onDelete(id);
  };

  const filteredConsultations = consultations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(query) ||
      c.trademarkName?.toLowerCase().includes(query) ||
      c.caseNumber?.toLowerCase().includes(query)
    );
  });

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
                  {consultations.length} gespeicherte Fälle
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

        {consultations.length > 5 && (
          <div className="px-6 py-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Suchen nach Name, Marke oder Fallnummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              {searchQuery ? (
                <>
                  <p className="text-gray-600 font-medium">Keine Ergebnisse gefunden</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Versuchen Sie einen anderen Suchbegriff.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-600 font-medium">Noch keine Fälle vorhanden</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Starten Sie eine neue Beratung, um Ihren ersten Fall zu erstellen.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConsultations.map((consultation) => {
                const status = getCaseStatus(consultation);
                const hasCase = !!consultation.caseId;
                
                return (
                  <div
                    key={consultation.id}
                    onClick={() => hasCase && handleCaseClick(consultation)}
                    className={`bg-gray-50 rounded-xl p-4 border border-gray-100 transition-all ${
                      hasCase 
                        ? "hover:border-primary/30 hover:shadow-md cursor-pointer group" 
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-semibold text-gray-900 truncate ${hasCase ? "group-hover:text-primary transition-colors" : ""}`}>
                            {consultation.trademarkName || "Kein Markenname"}
                          </h4>
                          {consultation.caseNumber && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                              {consultation.caseNumber}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-1">
                          {consultation.updatedAt && consultation.updatedAt !== consultation.createdAt 
                            ? `Aktualisiert: ${formatDate(consultation.updatedAt)}`
                            : formatDate(consultation.createdAt)
                          }
                          {consultation.duration && ` · ${formatDuration(consultation.duration)}`}
                        </p>

                        {(consultation.countries?.length || consultation.niceClasses?.length) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {consultation.countries && consultation.countries.length > 0 && (
                              <span className="text-xs text-gray-500">
                                🌍 {consultation.countries.slice(0, 3).join(", ")}
                                {consultation.countries.length > 3 && ` +${consultation.countries.length - 3}`}
                              </span>
                            )}
                            {consultation.niceClasses && consultation.niceClasses.length > 0 && (
                              <span className="text-xs text-gray-500">
                                📋 Klassen: {consultation.niceClasses.slice(0, 5).join(", ")}
                                {consultation.niceClasses.length > 5 && ` +${consultation.niceClasses.length - 5}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasCase && (
                          <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, consultation.id)}
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
    </div>
  );
}
