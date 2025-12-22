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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ConflictCard, ConflictDetailModal, ConflictMark } from "@/app/components/cases/ConflictCard";

interface ResetConfirmDialogProps {
  isOpen: boolean;
  fromStep: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ResetConfirmDialog({ isOpen, fromStep, onConfirm, onCancel, isLoading }: ResetConfirmDialogProps) {
  if (!isOpen) return null;
  
  const affectedSteps = {
    beratung: ["Beratung", "Recherche", "Risikoanalyse"],
    recherche: ["Recherche", "Risikoanalyse"],
  };
  
  const steps = affectedSteps[fromStep as keyof typeof affectedSteps] || [];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Schritte zurücksetzen?</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Wenn Sie {fromStep === "beratung" ? "die Beratung" : "die Recherche"} erneut durchführen, werden folgende Schritte zurückgesetzt:
        </p>
        <div className="bg-amber-50 rounded-lg p-3 mb-6">
          <ul className="space-y-1">
            {steps.map((step) => (
              <li key={step} className="flex items-center gap-2 text-amber-800">
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
                {step}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Fortfahren
          </button>
        </div>
      </div>
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
  onScrollToSection?: (sectionId: string) => void;
  consultation?: Consultation;
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

const stepToSectionId: Record<string, string> = {
  beratung: "section-beratung",
  recherche: "section-recherche",
  risikoanalyse: "section-risiko",
};

function StepBadge({ step, status, caseId, onNavigate, onClose, isBeratungIncomplete, onScrollToSection, consultation }: StepBadgeProps) {
  const canScroll = status === "completed" && onScrollToSection && stepToSectionId[step];
  const canNavigate = status !== "pending" && caseId && onNavigate;
  const isClickable = caseId && (canScroll || canNavigate);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!caseId || status === "pending") return;
    
    if (status === "completed" && onScrollToSection && stepToSectionId[step]) {
      onScrollToSection(stepToSectionId[step]);
      return;
    }
    
    if (!onNavigate) return;
    
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
          container: "bg-transparent text-primary border-primary border-2 hover:bg-primary/10",
          icon: null,
        };
      case "skipped":
        return {
          container: "bg-transparent text-amber-600 border-amber-500 border-2 hover:bg-amber-50",
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
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState<{ isOpen: boolean; fromStep: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleScrollToSection = (sectionId: string) => {
    setHighlightedSection(sectionId);
    setTimeout(() => setHighlightedSection(null), 2000);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const handleResetSteps = async () => {
    if (!resetDialog || !selectedConsultation?.caseId) return;
    
    setIsResetting(true);
    try {
      const res = await fetch(`/api/cases/${selectedConsultation.caseId}/reset-steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStep: resetDialog.fromStep }),
      });
      
      if (!res.ok) throw new Error("Reset failed");
      
      setResetDialog(null);
      handleClose();
      
      if (resetDialog.fromStep === "beratung") {
        onNavigate?.(`/dashboard/copilot?resumeCase=${selectedConsultation.caseId}`);
      } else {
        onNavigate?.(`/dashboard/recherche?caseId=${selectedConsultation.caseId}`);
      }
    } catch (error) {
      console.error("Error resetting steps:", error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary to-teal-500 p-6 sticky top-0 z-20">
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
          {selectedConsultation && (() => {
            const hasBeratung = !!selectedConsultation.summary;
            const hasRecherche = !!(selectedConsultation.trademarkName || (selectedConsultation.countries && selectedConsultation.countries.length > 0) || (selectedConsultation.niceClasses && selectedConsultation.niceClasses.length > 0));
            const rechercheStep = selectedConsultation.caseSteps?.find(s => s.step === "recherche" && (s.status === "completed" || s.completedAt));
            const hasRisiko = !!rechercheStep;
            
            const availableChips = [
              hasBeratung && { id: "section-beratung", label: "Beratung", icon: MessageCircle },
              hasRecherche && { id: "section-recherche", label: "Recherche", icon: Search },
              hasRisiko && { id: "section-risiko", label: "Risikoanalyse", icon: AlertTriangle },
            ].filter(Boolean) as { id: string; label: string; icon: typeof MessageCircle }[];
            
            return (
              <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  ← Zurück zur Liste
                </button>
                {availableChips.length > 0 && (
                  <>
                    <div className="h-5 w-px bg-white/30 mx-1 hidden sm:block" />
                    {availableChips.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => handleScrollToSection(id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${highlightedSection === id ? 'bg-white text-primary' : 'bg-white/20 text-white hover:bg-white/30'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedConsultation ? (
            <div>
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
                <div id="section-beratung" className={`mb-4 ${highlightedSection === 'section-beratung' ? 'ring-2 ring-primary ring-offset-2 animate-pulse rounded-xl' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-gray-900">Beratung</h3>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => setResetDialog({ isOpen: true, fromStep: "beratung" })}
                      className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Beratung erneut durchführen
                    </button>
                  </div>
                  </div>
                </div>
              )}

              {(selectedConsultation.trademarkName || (selectedConsultation.countries && selectedConsultation.countries.length > 0) || (selectedConsultation.niceClasses && selectedConsultation.niceClasses.length > 0)) && (
                <div id="section-recherche" className={`mb-4 ${highlightedSection === 'section-recherche' ? 'ring-2 ring-primary ring-offset-2 animate-pulse rounded-xl' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-5 h-5 text-teal-600" />
                    <h3 className="text-lg font-bold text-gray-900">Recherche</h3>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
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
                </div>
              )}
              
              {(() => {
                const rechercheStep = selectedConsultation.caseSteps?.find(s => s.step === "recherche" && (s.status === "completed" || s.completedAt));
                if (!rechercheStep) return null;
                const meta = rechercheStep.metadata || {};
                const conflicts = meta.conflicts || [];
                return (
                  <div id="section-risiko" className={`mb-4 ${highlightedSection === 'section-risiko' ? 'ring-2 ring-primary ring-offset-2 animate-pulse rounded-xl' : ''}`}>
                    <div className="flex items-center gap-2 mb-3 mt-6">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-gray-900">Risikoanalyse</h3>
                    </div>
                    <div className="bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
                      <div className="p-4">
                        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
                          <Search className="w-4 h-4" />
                          Konfliktanalyse
                          {meta.conflictsCount !== undefined && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${meta.conflictsCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {meta.conflictsCount} Konflikte
                            </span>
                          )}
                        </h4>
                        <div className="space-y-3">
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
                          <div className="mt-4 pt-3 border-t border-blue-200">
                            <button
                              onClick={() => setResetDialog({ isOpen: true, fromStep: "recherche" })}
                              className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                              <ArrowRight className="w-4 h-4 rotate-180" />
                              Recherche erneut durchführen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                        </div>
                        
                        {consultation.caseNumber && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const beratungStep = consultation.caseSteps?.find(s => s.step === "beratung");
                                const beratungStatus = getEnhancedStepStatus(consultation, "beratung");
                                const isBeratungIncomplete = beratungStep?.status === "in_progress" || 
                                  (beratungStatus === "current" && consultation.extractedData && !(consultation.extractedData as any).isComplete);
                                
                                const handleScrollToSection = (sectionId: string) => {
                                  setSelectedConsultation(consultation);
                                  setTimeout(() => {
                                    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                };
                                
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
                                      onScrollToSection={handleScrollToSection}
                                      consultation={consultation}
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
      
      <ResetConfirmDialog
        isOpen={resetDialog?.isOpen || false}
        fromStep={resetDialog?.fromStep || ""}
        onConfirm={handleResetSteps}
        onCancel={() => setResetDialog(null)}
        isLoading={isResetting}
      />
    </div>
  );
}
