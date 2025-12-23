"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Search,
  BarChart3,
  Clock,
  Check,
  Circle,
  AlertCircle,
  Globe,
  Tag,
  Sparkles,
  FileText,
  Mail,
  Eye,
  Calendar,
  CheckCircle,
  HelpCircle,
  Save,
  FileDown,
} from "lucide-react";
import { AnimatedRiskScore } from "@/app/components/cases/AnimatedRiskScore";
import { ConflictCard, ConflictMark, ConflictDetailModal } from "@/app/components/cases/ConflictCard";
import OpenAIVoiceAssistant, { VoiceAssistantHandle } from "@/app/components/OpenAIVoiceAssistant";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

interface StepStatus {
  status: string;
  completedAt: Date | null;
  skippedAt: Date | null;
}

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
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;
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
  steps: {
    beratung: StepStatus;
    markenname: StepStatus;
    recherche: StepStatus;
    analyse: StepStatus;
    ueberpruefung: StepStatus;
    anmeldung: StepStatus;
    kommunikation: StepStatus;
    ueberwachung: StepStatus;
    fristen: StepStatus;
  };
}

type WorkflowStepId = keyof CaseData["steps"];

interface WorkflowStep {
  id: WorkflowStepId;
  title: string;
  icon: React.ElementType;
  buttonText: string;
  buttonAction: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "beratung", title: "Beratung", icon: MessageCircle, buttonText: "Beratung starten", buttonAction: "/dashboard/beratung" },
  { id: "markenname", title: "Markenname", icon: Tag, buttonText: "Markenname festlegen", buttonAction: "edit" },
  { id: "recherche", title: "Recherche", icon: Search, buttonText: "Recherche starten", buttonAction: "/dashboard/recherche" },
  { id: "analyse", title: "Analyse", icon: BarChart3, buttonText: "Analyse anzeigen", buttonAction: "show" },
  { id: "ueberpruefung", title: "Überprüfung", icon: CheckCircle, buttonText: "Überprüfung dokumentieren", buttonAction: "placeholder" },
  { id: "anmeldung", title: "Anmeldung", icon: FileText, buttonText: "Anmeldung vorbereiten", buttonAction: "placeholder" },
  { id: "kommunikation", title: "Kommunikation", icon: Mail, buttonText: "Kommunikation erfassen", buttonAction: "placeholder" },
  { id: "ueberwachung", title: "Überwachung", icon: Eye, buttonText: "Überwachung starten", buttonAction: "placeholder" },
  { id: "fristen", title: "Fristen", icon: Calendar, buttonText: "Fristen verwalten", buttonAction: "placeholder" },
];

function AccordionSection({
  title,
  icon: Icon,
  isCompleted,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isCompleted: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"
          }`}>
            {isCompleted ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </div>
          <Icon className={`w-5 h-5 ${isCompleted ? "text-teal-600" : "text-gray-400"}`} />
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            isCompleted ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
          }`}>
            {isCompleted ? "Abgeschlossen" : "Ausstehend"}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48"></div>
      <div className="h-12 bg-gray-200 rounded w-64"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
        ))}
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

  const [openAccordion, setOpenAccordion] = useState<string | null>("beratung");
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  useEffect(() => {
    if (data?.consultation?.messages && !messagesLoaded) {
      setSessionMessages(data.consultation.messages);
      setMessagesLoaded(true);
      if (data.consultation.summary) {
        setSessionSummary(data.consultation.summary);
      }
    }
  }, [data?.consultation, messagesLoaded]);

  const QUICK_QUESTIONS = [
    "Welche Schritte sind für eine Markenanmeldung in Deutschland erforderlich?",
    "Was sind die häufigsten Gründe für eine Markenablehnung?",
    "Wie kann ich prüfen, ob mein Markenname bereits existiert?",
    "Welche Nizza-Klassen sind für mein Produkt relevant?",
    "Was kostet eine Markenanmeldung beim DPMA?",
    "Wie lange dauert das Eintragungsverfahren?",
  ];

  const handleQuickQuestion = useCallback((question: string) => {
    voiceAssistantRef.current?.sendQuestion(question);
  }, []);

  const handleMessageSent = useCallback((message: any) => {
    setSessionMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (sessionMessages.length === 0) return;
    
    setIsSavingSession(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sessionMessages,
          mode: "voice"
        })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        setSessionSummary(responseData.summary || "Sitzung erfolgreich gespeichert.");
        mutate();
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    } finally {
      setIsSavingSession(false);
    }
  }, [caseId, sessionMessages, mutate]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
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
    );
  }

  const { case: caseInfo, consultation, decisions, analysis, steps } = data;

  const getStepStatus = (stepId: WorkflowStepId): StepStatus => {
    return steps?.[stepId] || { status: "pending", completedAt: null, skippedAt: null };
  };

  const isStepComplete = (stepId: WorkflowStepId): boolean => {
    const stepStatus = getStepStatus(stepId);
    return stepStatus.status === "completed" || stepStatus.status === "skipped";
  };

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

  const renderBeratungContent = () => {
    const isComplete = isStepComplete("beratung");
    
    if (isComplete && consultation && !sessionMessages.length) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Dauer</div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                {formatDuration(consultation.duration)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Modus</div>
              <div className="font-semibold text-gray-900 capitalize">
                {consultation.mode === "voice" ? "Sprache" : "Text"}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Datum</div>
              <div className="font-semibold text-gray-900">
                {formatGermanDate(consultation.createdAt)}
              </div>
            </div>
          </div>
          {consultation.summary && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Zusammenfassung</div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {consultation.summary}
              </p>
            </div>
          )}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setSessionMessages([])}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Beratung fortsetzen
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <OpenAIVoiceAssistant
            ref={voiceAssistantRef}
            caseId={caseId}
            onMessageSent={handleMessageSent}
            previousMessages={sessionMessages}
            previousSummary={consultation?.summary || undefined}
          />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Schnellfragen</h3>
            </div>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(question)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-teal-50 rounded-lg text-sm text-gray-700 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-gray-900">Sitzungsprotokoll</h3>
              </div>
              {sessionMessages.length > 0 && (
                <button
                  onClick={handleSaveSession}
                  disabled={isSavingSession}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:bg-teal-400 transition-colors"
                >
                  {isSavingSession ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Speichern
                </button>
              )}
            </div>
            
            {sessionSummary && (
              <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="text-sm font-medium text-teal-800 mb-1">Zusammenfassung</div>
                <p className="text-sm text-teal-700">{sessionSummary}</p>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1 custom-scrollbar">
              {sessionMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileDown className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Das Protokoll wird automatisch während des Gesprächs erstellt.</p>
                </div>
              ) : (
                sessionMessages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`p-3 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-teal-50 border border-teal-100"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {msg.role === "user" ? "Sie" : "Klaus"}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRechercheContent = () => {
    const isComplete = isStepComplete("recherche");
    if (isComplete && (decisions || analysis)) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Markenname
              </div>
              <div className="font-semibold text-gray-900">
                {analysis?.searchQuery?.trademarkName || decisions?.trademarkNames?.[0] || caseInfo.trademarkName || "-"}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Länder
              </div>
              <div className="font-semibold text-gray-900">
                {(analysis?.searchQuery?.countries || decisions?.countries || []).join(", ") || "-"}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Nizza-Klassen</div>
              <div className="font-semibold text-gray-900">
                {(analysis?.searchQuery?.niceClasses || decisions?.niceClasses || []).map(c => `${c}`).join(", ") || "-"}
              </div>
            </div>
          </div>

          {analysis?.searchTermsUsed && analysis.searchTermsUsed.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Verwendete Suchbegriffe</div>
              <div className="flex flex-wrap gap-2">
                {analysis.searchTermsUsed.map((term, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return renderPlaceholder(WORKFLOW_STEPS[2]);
  };

  const renderAnalyseContent = () => {
    if (analysis) {
      const maxConflictAccuracy = analysis.conflicts?.length > 0
        ? Math.max(...analysis.conflicts.map((c: ConflictMark) => c.accuracy || 0))
        : 0;
      const effectiveRiskScore = analysis.riskScore > 0 ? analysis.riskScore : maxConflictAccuracy;
      const effectiveRiskLevel = analysis.riskScore > 0 
        ? analysis.riskLevel 
        : (maxConflictAccuracy >= 80 ? "high" : maxConflictAccuracy >= 60 ? "medium" : "low") as "high" | "medium" | "low";
      
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <AnimatedRiskScore
              score={effectiveRiskScore}
              risk={effectiveRiskLevel}
              size="large"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="text-sm text-gray-500 mb-1">Konflikte gefunden</div>
              <div className="text-3xl font-bold text-gray-900">
                {analysis.conflicts?.length || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {effectiveRiskLevel === "high" 
                  ? "Es wurden kritische Konflikte identifiziert."
                  : effectiveRiskLevel === "medium"
                  ? "Es gibt potenzielle Risiken zu beachten."
                  : "Geringe Konfliktwahrscheinlichkeit."}
              </p>
            </div>
          </div>

          {analysis.conflicts && analysis.conflicts.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">Gefundene Konflikte</div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {analysis.conflicts.map((conflict, idx) => (
                  <ConflictCard
                    key={conflict.id || idx}
                    conflict={conflict}
                    onShowDetail={setSelectedConflict}
                  />
                ))}
              </div>
            </div>
          )}

          {analysis.aiAnalysis && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-gray-700">KI-Analyse</span>
                </div>
                {showFullAnalysis ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showFullAnalysis && (
                <div className="mt-4 space-y-4 text-sm text-gray-600">
                  {analysis.aiAnalysis.nameAnalysis && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Namensanalyse</div>
                      <p className="leading-relaxed">{analysis.aiAnalysis.nameAnalysis}</p>
                    </div>
                  )}
                  {analysis.aiAnalysis.riskAssessment && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Risikobewertung</div>
                      <p className="leading-relaxed">{analysis.aiAnalysis.riskAssessment}</p>
                    </div>
                  )}
                  {analysis.aiAnalysis.recommendation && (
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Empfehlung</div>
                      <p className="leading-relaxed">{analysis.aiAnalysis.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {analysis.alternativeNames && analysis.alternativeNames.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">Alternative Namen</div>
              <div className="space-y-2">
                {analysis.alternativeNames.map((alt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-900">{alt.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        alt.riskLevel === "low" ? "bg-teal-100 text-teal-700" :
                        alt.riskLevel === "medium" ? "bg-orange-100 text-orange-700" :
                        alt.riskLevel === "high" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {alt.riskScore}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {alt.conflictCount} Konflikte
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">
          Noch keine Analyse durchgeführt
        </p>
        <button
          onClick={() => router.push(`/dashboard/recherche?caseId=${caseInfo.id}`)}
          className="px-6 py-3 bg-[#0D9488] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          Analyse durchführen
        </button>
      </div>
    );
  };

  const renderPlaceholder = (step: WorkflowStep) => {
    const Icon = step.icon;
    const isNavigable = step.buttonAction.startsWith("/");
    
    return (
      <div className="text-center py-8">
        <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">
          {isNavigable 
            ? `${step.title} wurde noch nicht gestartet.`
            : "Diese Funktion ist demnächst verfügbar."
          }
        </p>
        <button
          onClick={isNavigable ? () => router.push(`${step.buttonAction}?caseId=${caseInfo.id}`) : undefined}
          disabled={!isNavigable}
          className={isNavigable 
            ? "px-6 py-3 bg-[#0D9488] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            : "px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
          }
        >
          {step.buttonText}
        </button>
      </div>
    );
  };

  const renderStepContent = (step: WorkflowStep) => {
    switch (step.id) {
      case "beratung":
        return renderBeratungContent();
      case "recherche":
        return renderRechercheContent();
      case "analyse":
        return renderAnalyseContent();
      default:
        return renderPlaceholder(step);
    }
  };

  return (
    <div className="space-y-6">
      <div>
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
                  {caseInfo.trademarkName || "Unbenannter Fall"}
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

        <div className="space-y-4">
          {WORKFLOW_STEPS.map((step) => (
            <AccordionSection
              key={step.id}
              title={step.title}
              icon={step.icon}
              isCompleted={isStepComplete(step.id)}
              isOpen={openAccordion === step.id}
              onToggle={() => setOpenAccordion(openAccordion === step.id ? null : step.id)}
            >
              {renderStepContent(step)}
            </AccordionSection>
          ))}
        </div>

        {selectedConflict && (
          <ConflictDetailModal
            conflict={selectedConflict}
            onClose={() => setSelectedConflict(null)}
          />
        )}
      </div>
    </div>
  );
}
