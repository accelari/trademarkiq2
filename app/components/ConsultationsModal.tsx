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

const getStepStatus = (consultation: Consultation, stepName: string) => {
  const step = consultation.caseSteps?.find(s => s.step === stepName);
  if (!step) return "pending";
  if (step.skippedAt || step.status === "skipped") return "skipped";
  if (step.completedAt || step.status === "completed") return "completed";
  if (step.status === "in_progress") return "in_progress";
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
              
              {(() => {
                const rechercheStep = selectedConsultation.caseSteps?.find(s => s.step === "recherche" && (s.status === "completed" || s.completedAt));
                if (!rechercheStep) return null;
                const meta = rechercheStep.metadata || {};
                return (
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Recherche-Ergebnisse
                    </h4>
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
                      {meta.conflictsCount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">Konflikte gefunden:</span>
                          <span className={`font-medium ${meta.conflictsCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {meta.conflictsCount}
                          </span>
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
                              {journeySteps.map((step) => {
                                const status = getStepStatus(consultation, step);
                                const statusStyles = status === "completed" 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : status === "skipped"
                                  ? "bg-gray-100 text-gray-400 border-gray-200 line-through"
                                  : status === "in_progress"
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-gray-50 text-gray-500 border-gray-200";
                                const statusIcon = status === "completed" 
                                  ? <Check className="w-3 h-3" />
                                  : status === "skipped"
                                  ? <span className="text-[10px]">⊘</span>
                                  : null;
                                return (
                                  <div
                                    key={step}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${statusStyles}`}
                                  >
                                    {statusIcon}
                                    <span>{stepLabels[step]}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {journeySteps.filter(s => getStepStatus(consultation, s) === "completed").length} von {journeySteps.length} Schritten abgeschlossen
                            </p>
                          </div>
                        )}
                        
                        {consultation.caseId && (
                          <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const beratungStatus = getStepStatus(consultation, "beratung");
                              const nextStep = journeySteps.find((s, i) => i > 0 && getStepStatus(consultation, s) !== "completed" && getStepStatus(consultation, s) !== "skipped");
                              const stepRoutes: Record<string, string> = {
                                recherche: `/dashboard/recherche?caseId=${consultation.caseId}`,
                                risikoanalyse: `/dashboard/risikoanalyse?caseId=${consultation.caseId}`,
                                anmeldung: `/dashboard/anmeldung?caseId=${consultation.caseId}`,
                                watchlist: `/dashboard/watchlist?caseId=${consultation.caseId}`,
                              };
                              
                              const isIncomplete = consultation.extractedData && !(consultation.extractedData as any).isComplete;
                              
                              return (
                                <>
                                  {beratungStatus === "skipped" && (
                                    <button
                                      onClick={() => {
                                        handleClose();
                                        onNavigate(`/dashboard/copilot?catchUpCase=${consultation.caseId}`);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      Beratung nachholen
                                    </button>
                                  )}
                                  {isIncomplete && (
                                    <button
                                      onClick={() => {
                                        handleClose();
                                        onNavigate(`/dashboard/copilot?catchUpCase=${consultation.caseId}`);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      Beratung fortsetzen
                                    </button>
                                  )}
                                  {nextStep && nextStep !== "beratung" && (
                                    <button
                                      onClick={() => {
                                        handleClose();
                                        onNavigate(stepRoutes[nextStep]);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                      Weiter: {stepLabels[nextStep]}
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  
                                  {journeySteps.slice(1).filter(s => getStepStatus(consultation, s) !== "completed").length > 1 && (
                                    <div className="flex gap-1">
                                      {journeySteps.slice(1).filter(s => s !== nextStep && getStepStatus(consultation, s) !== "completed").slice(0, 2).map(step => (
                                        <button
                                          key={step}
                                          onClick={() => {
                                            handleClose();
                                            onNavigate(stepRoutes[step]);
                                          }}
                                          className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                          {stepLabels[step]}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
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
    </div>
  );
}
