"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
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
  FileDown,
} from "lucide-react";
import { AnimatedRiskScore } from "@/app/components/cases/AnimatedRiskScore";
import { ConflictCard, ConflictMark, ConflictDetailModal } from "@/app/components/cases/ConflictCard";
import OpenAIVoiceAssistant, { VoiceAssistantHandle } from "@/app/components/OpenAIVoiceAssistant";

interface AnalysisSummary {
  id: string;
  createdAt: string;
  trademarkName: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
}

interface AnalysesResponse {
  analyses: AnalysisSummary[];
}

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
    id: string;
    createdAt: string;
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
  { id: "beratung", title: "Beratung", icon: MessageCircle, buttonText: "Beratung starten", buttonAction: "open" },
  { id: "markenname", title: "Markenname", icon: Tag, buttonText: "Markenname festlegen", buttonAction: "edit" },
  { id: "recherche", title: "Recherche", icon: Search, buttonText: "Recherche starten", buttonAction: "open" },
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
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [isOpen]);

  return (
    <div ref={sectionRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden scroll-mt-4">
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

function formatGermanDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const d = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const t = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return `${d} ${t}`;
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

  const { data: analysesData } = useSWR<AnalysesResponse>(
    caseId ? `/api/cases/${caseId}/analyses` : null,
    fetcher
  );

  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const { data: selectedAnalysisResponse } = useSWR<
    { analysis: CaseData["analysis"]; case: CaseData["case"] }
  >(
    caseId && selectedAnalysisId ? `/api/cases/${caseId}/analysis?analysisId=${encodeURIComponent(selectedAnalysisId)}` : null,
    fetcher
  );

  useEffect(() => {
    const latestId = data?.analysis?.id;
    if (latestId && selectedAnalysisId === null) {
      setSelectedAnalysisId(latestId);
    }
  }, [data?.analysis?.id, selectedAnalysisId]);

  const [openAccordion, setOpenAccordion] = useState<string | null>("beratung");
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showAllConflicts, setShowAllConflicts] = useState(false);
  const [isApplyingAlternative, setIsApplyingAlternative] = useState(false);
  const [applyingAlternativeName, setApplyingAlternativeName] = useState<string | null>(null);
  const [applyAlternativeError, setApplyAlternativeError] = useState<string | null>(null);
  const [isStartingRecherche, setIsStartingRecherche] = useState(false);
  const [rechercheStartError, setRechercheStartError] = useState<string | null>(null);

  const [isAutoExtractingDecisions, setIsAutoExtractingDecisions] = useState(false);
  const autoExtractAttemptedForConsultationIdsRef = useRef<Set<string>>(new Set());

  // Recherche form state (moved to top level for React Hooks rules)
  const [rechercheForm, setRechercheForm] = useState({
    trademarkName: "",
    countries: [] as string[],
    niceClasses: [] as number[],
  });
  const [isRunningRecherche, setIsRunningRecherche] = useState(false);
  const [rechercheError, setRechercheError] = useState<string | null>(null);
  const [includeRelated, setIncludeRelated] = useState(true);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);

  const alternativeNamesRef = useRef<HTMLDivElement>(null);
  
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const previousAccordionRef = useRef<string | null>("beratung");
  const sessionMessagesRef = useRef<any[]>([]);

  useEffect(() => {
    sessionMessagesRef.current = sessionMessages;
  }, [sessionMessages]);

  useEffect(() => {
    if (data?.consultation?.messages && !messagesLoaded) {
      setSessionMessages(data.consultation.messages);
      setMessagesLoaded(true);
      if (data.consultation.summary) {
        setSessionSummary(data.consultation.summary);
      }
    }
  }, [data?.consultation, messagesLoaded]);

  // Initialize rechercheForm when data loads
  useEffect(() => {
    if (data) {
      const { decisions, case: caseInfo } = data;
      setRechercheForm(prev => ({
        trademarkName: prev.trademarkName || decisions?.trademarkNames?.[0] || caseInfo?.trademarkName || "",
        countries: prev.countries.length > 0 ? prev.countries : (decisions?.countries || []),
        niceClasses: prev.niceClasses.length > 0 ? prev.niceClasses : (decisions?.niceClasses || []),
      }));
    }
  }, [data]);

  useEffect(() => {
    const c = data?.consultation;
    const decision = data?.decisions;
    const caseRecord = data?.case;

    if (!c?.id || !caseRecord?.id) return;
    if (!c.summary || !c.summary.trim()) return;

    const hasUsefulDecisions =
      !!decision &&
      ((decision.trademarkNames?.length || 0) > 0 || (decision.countries?.length || 0) > 0 || (decision.niceClasses?.length || 0) > 0);

    if (hasUsefulDecisions) return;
    if (autoExtractAttemptedForConsultationIdsRef.current.has(c.id)) return;

    autoExtractAttemptedForConsultationIdsRef.current.add(c.id);
    setIsAutoExtractingDecisions(true);

    (async () => {
      try {
        const res = await fetch(`/api/cases/extract-decisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseRecord.id,
            consultationId: c.id,
            summary: c.summary,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
          console.error("Auto decision extraction failed:", err);
          return;
        }

        await mutate();
      } catch (e) {
        console.error("Auto decision extraction failed:", e);
      } finally {
        setIsAutoExtractingDecisions(false);
      }
    })();
  }, [data?.case, data?.consultation, data?.decisions, mutate]);

  useEffect(() => {
    setShowAllConflicts(false);
  }, [selectedAnalysisId]);

  const autoSaveSession = useCallback(async () => {
    const messages = sessionMessagesRef.current;
    if (messages.length === 0) return;
    
    setIsSavingSession(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          mode: "voice"
        })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        setSessionSummary(responseData.summary || "Zusammenfassung erstellt.");
        mutate();
      }
    } catch (err) {
      console.error("Failed to auto-save session:", err);
    } finally {
      setIsSavingSession(false);
    }
  }, [caseId, mutate]);

  useEffect(() => {
    const prevAccordion = previousAccordionRef.current;
    if (prevAccordion === "beratung" && openAccordion !== "beratung") {
      autoSaveSession();
    }
    previousAccordionRef.current = openAccordion;
  }, [openAccordion, autoSaveSession]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionMessagesRef.current.length > 0) {
        navigator.sendBeacon(
          `/api/cases/${caseId}/consultation`,
          JSON.stringify({ messages: sessionMessagesRef.current, mode: "voice" })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [caseId]);

  const QUICK_QUESTION_GROUPS = [
    {
      title: "GRUNDLAGEN",
      questions: [
        "Was ist überhaupt eine Marke?",
        "Wofür brauche ich eine Marke?",
        "Was ist der Unterschied zwischen Wortmarke und Bildmarke?",
        "Was ist eine Nizza-Klassifikation?",
      ],
    },
    {
      title: "MARKENRECHERCHE",
      questions: [
        "Wozu dient die Markenrecherche?",
        "Wo und wie wird die Markenrecherche durchgeführt?",
        "Können Sie für mich Markenrecherche durchführen?",
        "Was passiert, wenn ich keine Markenrecherche mache?",
        "Wie kann ich prüfen, ob mein Markenname bereits existiert?",
      ],
    },
    {
      title: "MARKENPRÜFUNG",
      questions: [
        "Wozu dient die Markenprüfung?",
        "Wo und wie wird die Markenprüfung durchgeführt?",
        "Was kostet die Markenprüfung?",
        "Was sind die häufigsten Gründe für eine Markenablehnung?",
        "Welche Nizza-Klassen sind für mein Produkt relevant?",
        "Welche Schritte sind für eine Markenanmeldung in Deutschland erforderlich?",
        "Was kostet eine Markenanmeldung beim DPMA?",
        "Wie lange dauert das Eintragungsverfahren?",
        "Wie lange gilt eine Marke?",
        "Kann ich meine Marke später erweitern oder ändern?",
        "Was kostet die Markenverlängerung?",
      ],
    },
  ] as const;

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

  const handleDeleteConsultation = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/consultation`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setSessionMessages([]);
        setSessionSummary(null);
        setMessagesLoaded(false);
        mutate();
      }
    } catch (err) {
      console.error("Failed to delete consultation:", err);
    }
  }, [caseId, mutate]);

  const startRecherche = useCallback(async () => {
    if (isStartingRecherche) return;

    setRechercheStartError(null);
    setIsStartingRecherche(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/run-recherche-analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setRechercheStartError(err.error || "Recherche konnte nicht gestartet werden");
        return;
      }

      setOpenAccordion("analyse");
      await mutate();
    } catch (e) {
      console.error("Failed to start recherche:", e);
      setRechercheStartError("Recherche konnte nicht gestartet werden");
    } finally {
      await new Promise((r) => setTimeout(r, 350));
      setIsStartingRecherche(false);
    }
  }, [caseId, isStartingRecherche, mutate]);

  const applyAlternativeAndRerun = useCallback(
    async (alt: { name: string; riskScore: number; riskLevel: string; conflictCount: number }) => {
      if (isApplyingAlternative) return;

      setApplyAlternativeError(null);
      setIsApplyingAlternative(true);
      setApplyingAlternativeName(alt.name);
      try {
        const saveRes = await fetch(`/api/cases/select-alternative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            selectedName: alt.name,
            riskScore: alt.riskScore,
            conflictCount: alt.conflictCount,
            criticalCount: alt.riskLevel === "high" ? 1 : 0,
          }),
        });

        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setApplyAlternativeError(err.error || "Alternative konnte nicht gespeichert werden");
          return;
        }

        const runRes = await fetch(`/api/cases/${caseId}/run-recherche-analyse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!runRes.ok) {
          const err = await runRes.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setApplyAlternativeError(err.error || "Analyse konnte nicht gestartet werden");
          return;
        }

        const runData = await runRes.json().catch(() => null);
        const newAnalysisId: string | undefined = runData?.analysis?.id;
        if (newAnalysisId) {
          setSelectedAnalysisId(newAnalysisId);
        }

        setOpenAccordion("analyse");
        await Promise.all([
          mutate(),
          globalMutate(caseId ? `/api/cases/${caseId}/analyses` : null),
        ]);
      } catch (e) {
        console.error("Failed to apply alternative:", e);
        setApplyAlternativeError("Alternative konnte nicht übernommen werden");
      } finally {
        await new Promise((r) => setTimeout(r, 250));
        setApplyingAlternativeName(null);
        setIsApplyingAlternative(false);
      }
    },
    [caseId, isApplyingAlternative, mutate]
  );

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
  const activeAnalysis = selectedAnalysisResponse?.analysis || analysis;

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
            onDelete={handleDeleteConsultation}
          />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:h-[560px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Schnellfragen</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-4">
                {QUICK_QUESTION_GROUPS.map((group) => (
                  <div key={group.title}>
                    <div className="text-xs font-semibold text-teal-700 mb-2 tracking-wide">
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {group.questions.map((question) => (
                        <button
                          key={question}
                          onClick={() => handleQuickQuestion(question)}
                          className="w-full text-left p-3 bg-gray-50 hover:bg-teal-50 rounded-lg text-sm text-gray-700 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-200"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Sitzungszusammenfassung</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {isSavingSession ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-600">OpenAI erstellt Ihre Zusammenfassung...</p>
                </div>
              ) : sessionSummary ? (
                <div className="space-y-3">
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <p className="text-sm text-teal-800 whitespace-pre-wrap leading-relaxed">{sessionSummary}</p>
                  </div>
                  {sessionMessages.length > 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      Basierend auf {sessionMessages.length} Nachrichten
                    </div>
                  )}
                </div>
              ) : sessionMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileDown className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Führen Sie ein Gespräch mit Klaus. Die Zusammenfassung wird automatisch erstellt.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-teal-600" />
                  <p className="text-sm mb-2">{sessionMessages.length} Nachrichten im Gespräch</p>
                  <p className="text-xs text-gray-400">Die Zusammenfassung wird automatisch erstellt, wenn Sie das Akkordeon schließen.</p>
                </div>
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

    return (
      <div className="text-center py-8">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">
          {isStartingRecherche
            ? "Recherche + Analyse läuft (Mock)…"
            : "Recherche wurde noch nicht gestartet."}
        </p>
        {rechercheStartError && (
          <div className="max-w-xl mx-auto mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {rechercheStartError}
          </div>
        )}
        <button
          onClick={startRecherche}
          disabled={isStartingRecherche}
          className={
            isStartingRecherche
              ? "px-6 py-3 bg-teal-200 text-white rounded-lg font-medium cursor-not-allowed"
              : "px-6 py-3 bg-[#0D9488] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          }
        >
          {isStartingRecherche ? "Wird ausgeführt..." : "Recherche starten"}
        </button>
      </div>
    );
  };

  const renderAnalyseContent = () => {
    if (activeAnalysis) {
      const sortedConflicts = activeAnalysis.conflicts
        ? [...activeAnalysis.conflicts].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
        : [];
      const visibleConflicts = showAllConflicts ? sortedConflicts : sortedConflicts.slice(0, 3);

      const maxConflictAccuracy = activeAnalysis.conflicts?.length > 0
        ? Math.max(...activeAnalysis.conflicts.map((c: ConflictMark) => c.accuracy || 0))
        : 0;
      const effectiveRiskScore = activeAnalysis.riskScore > 0 ? activeAnalysis.riskScore : maxConflictAccuracy;
      const effectiveRiskLevel = activeAnalysis.riskScore > 0 
        ? activeAnalysis.riskLevel 
        : (maxConflictAccuracy >= 80 ? "high" : maxConflictAccuracy >= 60 ? "medium" : "low") as "high" | "medium" | "low";

      const conflictCount = activeAnalysis.conflicts?.length || 0;
      const mostSimilarConflict = activeAnalysis.conflicts && activeAnalysis.conflicts.length > 0
        ? activeAnalysis.conflicts.reduce((best, c) => ((c.accuracy || 0) > (best.accuracy || 0) ? c : best))
        : null;

      const decisionTier: "go" | "adjust" | "no_go" =
        effectiveRiskLevel === "high" || effectiveRiskScore >= 80
          ? "no_go"
          : effectiveRiskLevel === "medium" || effectiveRiskScore >= 60
          ? "adjust"
          : "go";

      const decisionConfig =
        decisionTier === "no_go"
          ? {
              title: "Aktuell nicht empfohlen",
              subtitle: "Hohes Konfliktrisiko – zuerst Name oder Parameter anpassen.",
              badge: "NO-GO",
              styles: {
                wrapper: "bg-red-50 border-red-200",
                badge: "bg-red-100 text-red-700 border-red-200",
                title: "text-red-900",
                subtitle: "text-red-800",
              },
            }
          : decisionTier === "adjust"
          ? {
              title: "Mit Anpassungen empfohlen",
              subtitle: "Mittleres Risiko – Konflikte prüfen und Parameter optimieren.",
              badge: "GO MIT ANPASSUNG",
              styles: {
                wrapper: "bg-orange-50 border-orange-200",
                badge: "bg-orange-100 text-orange-700 border-orange-200",
                title: "text-orange-900",
                subtitle: "text-orange-800",
              },
            }
          : {
              title: "Anmeldung wahrscheinlich sinnvoll",
              subtitle: "Geringes Risiko – trotzdem Ergebnisse kurz prüfen.",
              badge: "GO",
              styles: {
                wrapper: "bg-teal-50 border-teal-200",
                badge: "bg-teal-100 text-teal-700 border-teal-200",
                title: "text-teal-900",
                subtitle: "text-teal-800",
              },
            };

      const decisionReason =
        conflictCount === 0
          ? "Keine relevanten Konflikte gefunden."
          : `Stärkster Treffer: ${mostSimilarConflict?.name || "-"}${mostSimilarConflict?.register ? ` (${mostSimilarConflict.register})` : ""} – ${conflictCount} Konflikt${conflictCount === 1 ? "" : "e"} insgesamt.`;
      
      return (
        <div className="space-y-6">
          {analysesData?.analyses && analysesData.analyses.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Analyse-Version</div>
                  <div className="text-xs text-gray-500">Historie bleibt erhalten. Neueste Version ist oben.</div>
                </div>
                <select
                  value={selectedAnalysisId || ""}
                  onChange={(e) => setSelectedAnalysisId(e.target.value || null)}
                  className="w-full sm:w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {analysesData.analyses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatGermanDateTime(a.createdAt)}   {a.trademarkName || "(ohne Namen)"}   {a.riskLevel.toUpperCase()} {a.riskScore}%
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={`p-4 rounded-lg border ${decisionConfig.styles.wrapper}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${decisionConfig.styles.badge}`}>
                    {decisionConfig.badge}
                  </span>
                  <span className="text-xs text-gray-500">
                    Risiko: {effectiveRiskScore}%
                  </span>
                </div>
                <div className={`text-base font-semibold ${decisionConfig.styles.title}`}>{decisionConfig.title}</div>
                <div className={`text-sm mt-1 ${decisionConfig.styles.subtitle}`}>{decisionConfig.subtitle}</div>
                <div className="text-xs text-gray-600 mt-2">{decisionReason}</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      alternativeNamesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Alternative Namen prüfen
                </button>
                <button
                  onClick={() => setOpenAccordion("recherche")}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Klassen/Länder anpassen
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <AnimatedRiskScore
              score={effectiveRiskScore}
              risk={effectiveRiskLevel}
              size="large"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="text-sm text-gray-500 mb-1">Konflikte gefunden</div>
              <div className="text-3xl font-bold text-gray-900">
                {activeAnalysis.conflicts?.length || 0}
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

          {sortedConflicts.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-medium text-gray-700">Gefundene Konflikte</div>
                {sortedConflicts.length > 3 && (
                  <button
                    onClick={() => setShowAllConflicts(v => !v)}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    {showAllConflicts ? "Weniger anzeigen" : `Alle anzeigen (${sortedConflicts.length})`}
                  </button>
                )}
              </div>
              <div className={showAllConflicts ? "space-y-2" : "space-y-2 max-h-80 overflow-y-auto"}>
                {visibleConflicts.map((conflict, idx) => (
                  <ConflictCard
                    key={conflict.id || idx}
                    conflict={conflict}
                    onShowDetail={setSelectedConflict}
                  />
                ))}
              </div>
            </div>
          )}

          {activeAnalysis.aiAnalysis && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {(() => {
                const clamp = (text: string, maxLen: number) => {
                  const t = text.replace(/\s+/g, " ").trim();
                  if (t.length <= maxLen) return t;
                  return `${t.slice(0, maxLen - 1)}…`;
                };
                const toBullet = (label: string, text?: string | null) => {
                  if (!text) return null;
                  return `${label}: ${clamp(text, 160)}`;
                };
                const bullets = [
                  toBullet("Namens-Check", activeAnalysis.aiAnalysis.nameAnalysis),
                  toBullet("Risiko", activeAnalysis.aiAnalysis.riskAssessment),
                  toBullet("Empfehlung", activeAnalysis.aiAnalysis.recommendation),
                ].filter(Boolean) as string[];

                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">KI-Analyse</div>
                          <div className="text-xs text-gray-500">Kurzfazit + Details</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                        className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors flex items-center gap-1"
                      >
                        {showFullAnalysis ? "Details ausblenden" : "Details anzeigen"}
                        {showFullAnalysis ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {bullets.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Executive Summary</div>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                          {bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {showFullAnalysis && (
                      <div className="mt-4 space-y-4 text-sm text-gray-600">
                        {activeAnalysis.aiAnalysis.nameAnalysis && (
                          <div>
                            <div className="font-medium text-gray-700 mb-1">Namensanalyse</div>
                            <p className="leading-relaxed">{activeAnalysis.aiAnalysis.nameAnalysis}</p>
                          </div>
                        )}
                        {activeAnalysis.aiAnalysis.riskAssessment && (
                          <div>
                            <div className="font-medium text-gray-700 mb-1">Risikobewertung</div>
                            <p className="leading-relaxed">{activeAnalysis.aiAnalysis.riskAssessment}</p>
                          </div>
                        )}
                        {activeAnalysis.aiAnalysis.recommendation && (
                          <div>
                            <div className="font-medium text-gray-700 mb-1">Empfehlung</div>
                            <p className="leading-relaxed">{activeAnalysis.aiAnalysis.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {activeAnalysis.alternativeNames && activeAnalysis.alternativeNames.length > 0 && (
            <div ref={alternativeNamesRef} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">Alternative Namen</div>
              {applyAlternativeError && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {applyAlternativeError}
                </div>
              )}
              <div className="space-y-2">
                {activeAnalysis.alternativeNames.map((alt, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-900">{alt.name}</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

                      <button
                        onClick={() => applyAlternativeAndRerun(alt)}
                        disabled={isApplyingAlternative}
                        className={
                          isApplyingAlternative
                            ? "px-3 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                            : "px-3 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                        }
                      >
                        {isApplyingAlternative && applyingAlternativeName === alt.name
                          ? "Wird übernommen..."
                          : "Übernehmen & neu analysieren"}
                      </button>
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
          onClick={() => setOpenAccordion("recherche")}
          className="px-6 py-3 bg-[#0D9488] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          Analyse durchführen
        </button>
      </div>
    );
  };

  const renderPlaceholder = (step: WorkflowStep) => {
    const Icon = step.icon;
    const isOpenAction = step.buttonAction === "open";
    const isNavigable = step.buttonAction.startsWith("/");
    
    return (
      <div className="text-center py-8">
        <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">
          {isNavigable
            ? `${step.title} wurde noch nicht gestartet.`
            : isOpenAction
            ? `${step.title} wurde noch nicht gestartet.`
            : "Diese Funktion ist demnächst verfügbar."}
        </p>
        <button
          onClick={
            isNavigable
              ? () => router.push(`${step.buttonAction}?caseId=${caseInfo.id}`)
              : isOpenAction
              ? () => setOpenAccordion(step.id)
              : undefined
          }
          disabled={!isNavigable && !isOpenAction}
          className={isNavigable || isOpenAction
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
