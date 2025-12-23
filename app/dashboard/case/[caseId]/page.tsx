"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  MessageCircle,
  Search,
  BarChart3,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { WorkflowStepper } from "@/app/components/cases/WorkflowStepper";
import { StepCard } from "@/app/components/cases/StepCard";
import { CaseSummary } from "@/app/components/cases/CaseSummary";
import { BeratungModal } from "@/app/components/cases/BeratungModal";
import { AnimatedRiskScore } from "@/app/components/cases/AnimatedRiskScore";
import { ConflictCard, ConflictMark, ConflictDetailModal } from "@/app/components/cases/ConflictCard";
import { ACTIVE_STEPS, WorkflowStepId, StepState } from "@/lib/workflow-steps";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

interface CaseData {
  case: {
    id: string;
    caseNumber: string;
    trademarkName: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  consultation: {
    id: string;
    title: string;
    summary: string;
    duration: number | null;
    mode: string;
    createdAt: string;
  } | null;
  decisions: {
    trademarkNames: string[];
    countries: string[];
    niceClasses: number[];
    completenessScore: number;
  } | null;
  analysis: {
    searchQuery: {
      trademarkName: string;
      countries: string[];
      niceClasses: number[];
    };
    conflicts: ConflictMark[];
    riskScore: number;
    riskLevel: "high" | "medium" | "low";
    aiAnalysis: {
      nameAnalysis: string;
      searchStrategy: string;
      riskAssessment: string;
      overallRisk: string;
      recommendation: string;
      famousMarkDetected: boolean;
      famousMarkNames: string[];
    } | null;
    alternativeNames: {
      name: string;
      riskScore: number;
      riskLevel: string;
      conflictCount: number;
      explanation?: string;
    }[];
    searchTermsUsed: string[];
  } | null;
  steps: Record<WorkflowStepId, StepState>;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-16 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")} Min`;
}

function formatGermanDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "-";
  }
}

export default function CasePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  const { data, error, isLoading, mutate } = useSWR<CaseData>(
    caseId ? `/api/cases/${caseId}/full` : null,
    fetcher
  );

  const [showBeratungModal, setShowBeratungModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </button>
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Fall nicht gefunden
            </h2>
            <p className="text-gray-600">
              {error?.message || "Der angeforderte Fall konnte nicht geladen werden."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { case: caseInfo, consultation, decisions, analysis, steps } = data;
  
  const stepStates: Record<WorkflowStepId, StepState> = {
    beratung: steps.beratung || { status: "pending", completedAt: null, skippedAt: null },
    recherche: steps.recherche || { status: "pending", completedAt: null, skippedAt: null },
    analyse: steps.risikoanalyse || { status: analysis ? "completed" : "pending", completedAt: null, skippedAt: null },
    anmeldung: steps.anmeldung || { status: "pending", completedAt: null, skippedAt: null },
    watchlist: steps.watchlist || { status: "pending", completedAt: null, skippedAt: null },
  };

  const isBeratungComplete = stepStates.beratung.status === "completed" || stepStates.beratung.status === "skipped";
  const isBeratungInProgress = stepStates.beratung.status === "in_progress";
  const isRechercheComplete = stepStates.recherche.status === "completed" || stepStates.recherche.status === "skipped";
  const hasAnalysis = !!analysis;

  const trademarkName = caseInfo.trademarkName || decisions?.trademarkNames?.[0] || analysis?.searchQuery?.trademarkName || null;
  const countries = decisions?.countries || analysis?.searchQuery?.countries || [];
  const niceClasses = decisions?.niceClasses || analysis?.searchQuery?.niceClasses || [];

  const effectiveRiskScore = analysis ? (
    analysis.riskScore > 0 ? analysis.riskScore : 
    (analysis.conflicts?.length > 0 ? Math.max(...analysis.conflicts.map(c => c.accuracy || 0)) : 0)
  ) : null;
  
  const effectiveRiskLevel = analysis ? (
    analysis.riskScore > 0 ? analysis.riskLevel :
    (effectiveRiskScore !== null ? (effectiveRiskScore >= 80 ? "high" : effectiveRiskScore >= 60 ? "medium" : "low") : null)
  ) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-teal-100 text-teal-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "archived":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Aktiv";
      case "completed":
        return "Abgeschlossen";
      case "archived":
        return "Archiviert";
      default:
        return status;
    }
  };

  const handleStartBeratung = () => {
    setShowBeratungModal(false);
    router.push(`/dashboard/copilot?caseId=${caseId}`);
  };

  const handleNavigateToRecherche = () => {
    router.push(`/dashboard/recherche?caseId=${caseId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {trademarkName || "Unbenannter Fall"}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(caseInfo.status)}`}>
                  {getStatusLabel(caseInfo.status)}
                </span>
              </div>
              <p className="text-gray-500 font-mono text-sm">{caseInfo.caseNumber}</p>
            </div>
            <div className="text-sm text-gray-500">
              Erstellt: {formatGermanDate(caseInfo.createdAt)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <WorkflowStepper steps={stepStates} />
        </div>

        <CaseSummary
          trademarkName={trademarkName}
          countries={countries}
          niceClasses={niceClasses}
          riskScore={effectiveRiskScore}
          riskLevel={effectiveRiskLevel}
          conflictCount={analysis?.conflicts?.length || 0}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StepCard
            title="Beratung"
            description="KI-Markenberater"
            icon={MessageCircle}
            status={stepStates.beratung}
            ctaLabel={isBeratungComplete ? "Ansehen" : isBeratungInProgress ? "Fortsetzen" : "Starten"}
            onCtaClick={() => {
              if (isBeratungComplete && consultation) {
                router.push(`/dashboard/copilot?caseId=${caseId}`);
              } else {
                setShowBeratungModal(true);
              }
            }}
          >
            {consultation && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  Dauer: {formatDuration(consultation.duration)}
                </div>
                {consultation.summary && (
                  <p className="text-gray-600 line-clamp-2">{consultation.summary}</p>
                )}
              </div>
            )}
          </StepCard>

          <StepCard
            title="Recherche"
            description="Markensuche"
            icon={Search}
            status={stepStates.recherche}
            ctaLabel={isRechercheComplete ? "Ansehen" : "Zur Recherche"}
            onCtaClick={handleNavigateToRecherche}
          >
            {analysis && (
              <div className="space-y-2 text-sm">
                <div className="text-gray-600">
                  Suche: <span className="font-medium">{analysis.searchQuery.trademarkName}</span>
                </div>
                {analysis.searchTermsUsed?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysis.searchTermsUsed.slice(0, 3).map((term, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </StepCard>

          <StepCard
            title="Analyse"
            description="Risikoauswertung"
            icon={BarChart3}
            status={{ 
              status: hasAnalysis ? "completed" : "pending", 
              completedAt: null, 
              skippedAt: null 
            }}
          >
            {hasAnalysis && effectiveRiskScore !== null ? (
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  effectiveRiskLevel === "high" ? "text-red-600" :
                  effectiveRiskLevel === "medium" ? "text-amber-600" : "text-green-600"
                }`}>
                  {effectiveRiskScore}%
                </div>
                <div className="text-sm text-gray-600">
                  {analysis.conflicts?.length || 0} Konflikte
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Wird nach der Recherche erstellt
              </p>
            )}
          </StepCard>
        </div>

        {hasAnalysis && analysis.conflicts && analysis.conflicts.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gefundene Konflikte ({analysis.conflicts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.conflicts.slice(0, 4).map((conflict) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  onClick={() => setSelectedConflict(conflict)}
                />
              ))}
            </div>
            {analysis.conflicts.length > 4 && (
              <button
                onClick={handleNavigateToRecherche}
                className="mt-4 text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                Alle {analysis.conflicts.length} Konflikte anzeigen
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {hasAnalysis && analysis.aiAnalysis && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              KI-Bewertung
            </h3>
            
            {analysis.aiAnalysis.famousMarkDetected && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-800">Bekannte Marke erkannt</div>
                  <p className="text-sm text-red-700">
                    {analysis.aiAnalysis.famousMarkNames.join(", ")} - Hohes Konfliktrisiko
                  </p>
                </div>
              </div>
            )}

            <div className="prose prose-sm max-w-none text-gray-600">
              <p>{analysis.aiAnalysis.recommendation}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Empfehlung:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  analysis.aiAnalysis.overallRisk === "high" 
                    ? "bg-red-100 text-red-700"
                    : analysis.aiAnalysis.overallRisk === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {analysis.aiAnalysis.overallRisk === "high" 
                    ? "Nicht empfohlen" 
                    : analysis.aiAnalysis.overallRisk === "medium"
                    ? "Mit Vorsicht fortfahren"
                    : "Empfohlen"}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasAnalysis && analysis.alternativeNames && analysis.alternativeNames.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alternative Namensvorschläge
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.alternativeNames.slice(0, 6).map((alt, i) => (
                <div 
                  key={i}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{alt.name}</span>
                    <span className={`text-sm font-medium ${
                      alt.riskLevel === "low" ? "text-green-600" :
                      alt.riskLevel === "medium" ? "text-amber-600" : "text-red-600"
                    }`}>
                      {alt.riskScore}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {alt.conflictCount} Konflikt{alt.conflictCount !== 1 ? "e" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BeratungModal
        isOpen={showBeratungModal}
        onClose={() => setShowBeratungModal(false)}
        caseId={caseId}
        caseNumber={caseInfo.caseNumber}
        onStartBeratung={handleStartBeratung}
      />

      {selectedConflict && (
        <ConflictDetailModal
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
        />
      )}
    </div>
  );
}
