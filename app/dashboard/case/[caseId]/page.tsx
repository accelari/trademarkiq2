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

type QuickCheckStatus = "idle" | "checking" | "low" | "medium" | "high" | "error";

type NameSuggestion = {
  name: string;
  explanation?: string;
  quickCheckStatus: QuickCheckStatus;
  quickCheckScore?: number;
  quickCheckConflicts?: number;
  quickCheckCriticalCount?: number;
};

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
  metadata: Record<string, any>;
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
  events: Array<{
    id: string;
    eventType: string;
    eventData: Record<string, any>;
    createdAt: string;
  }>;
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
  status,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isCompleted: boolean;
  status: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const statusLabel =
    status === "completed"
      ? "Abgeschlossen"
      : status === "skipped"
      ? "Übersprungen"
      : status === "in_progress"
      ? "In Arbeit"
      : "Ausstehend";

  const statusBadgeClass =
    status === "completed"
      ? "bg-teal-100 text-teal-700"
      : status === "skipped"
      ? "bg-gray-200 text-gray-700"
      : status === "in_progress"
      ? "bg-orange-100 text-orange-700"
      : "bg-gray-100 text-gray-500";

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
            statusBadgeClass
          }`}>
            {statusLabel}
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

  const shouldAutoSelectLatestAnalysisRef = useRef(false);
  const pendingAutoSelectAnalysisIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const analyses = analysesData?.analyses;
    if (!analyses || analyses.length === 0) return;

    const latest = analyses[0].id;

    const pending = pendingAutoSelectAnalysisIdRef.current;
    if (pending) {
      const pendingExists = analyses.some((a) => a.id === pending);
      if (pendingExists) {
        setSelectedAnalysisId(pending);
        pendingAutoSelectAnalysisIdRef.current = null;
        shouldAutoSelectLatestAnalysisRef.current = false;
        return;
      }
      // Wait until the new analysis appears in the list; don't override user's selection.
    }

    if (shouldAutoSelectLatestAnalysisRef.current) {
      setSelectedAnalysisId(latest);
      shouldAutoSelectLatestAnalysisRef.current = false;
      return;
    }

    if (selectedAnalysisId === null) {
      setSelectedAnalysisId(latest);
      return;
    }

    const exists = analyses.some((a) => a.id === selectedAnalysisId);
    if (!exists) {
      setSelectedAnalysisId(latest);
    }
  }, [analysesData?.analyses, selectedAnalysisId]);

  const [openAccordion, setOpenAccordion] = useState<string | null>("beratung");
  const [selectedConflict, setSelectedConflict] = useState<ConflictMark | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showAllConflicts, setShowAllConflicts] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [isApplyingAlternative, setIsApplyingAlternative] = useState(false);
  const [applyingAlternativeName, setApplyingAlternativeName] = useState<string | null>(null);
  const [applyAlternativeError, setApplyAlternativeError] = useState<string | null>(null);
  const [isStartingRecherche, setIsStartingRecherche] = useState(false);
  const [rechercheStartError, setRechercheStartError] = useState<string | null>(null);
  const [isUpdatingStep, setIsUpdatingStep] = useState<WorkflowStepId | null>(null);
  const [stepUpdateError, setStepUpdateError] = useState<string | null>(null);

  const [isAutoExtractingDecisions, setIsAutoExtractingDecisions] = useState(false);
  const autoExtractAttemptedForConsultationIdsRef = useRef<Set<string>>(new Set());

  const [isMarkennameModalOpen, setIsMarkennameModalOpen] = useState(false);
  const [manualNameInput, setManualNameInput] = useState("");
  const [manualQuickCheck, setManualQuickCheck] = useState<{
    riskLevel: "low" | "medium" | "high";
    riskScore: number;
    conflicts: number;
    criticalCount: number;
  } | null>(null);
  const [isCheckingManualName, setIsCheckingManualName] = useState(false);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [nameGenError, setNameGenError] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([]);
  const [shortlist, setShortlist] = useState<
    Array<{ name: string; riskLevel: "low" | "medium" | "high" | "unknown"; riskScore: number; conflicts: number; criticalCount: number }>
  >([]);
  const [generatorStyle, setGeneratorStyle] = useState<"similar" | "modern" | "creative" | "serious">("similar");
  const [generatorLanguage, setGeneratorLanguage] = useState<"de" | "en" | "international">("de");
  const [generatorKeywords, setGeneratorKeywords] = useState("");

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
      shouldAutoSelectLatestAnalysisRef.current = true;
      pendingAutoSelectAnalysisIdRef.current = null;
      const response = await fetch(`/api/cases/${caseId}/run-recherche-analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setRechercheStartError(err.error || "Recherche konnte nicht gestartet werden");
        shouldAutoSelectLatestAnalysisRef.current = false;
        return;
      }

      const runData = await response.json().catch(() => null);
      const newAnalysisId: string | undefined = runData?.analysis?.id;
      if (newAnalysisId) {
        pendingAutoSelectAnalysisIdRef.current = newAnalysisId;
        setSelectedAnalysisId(newAnalysisId);
        shouldAutoSelectLatestAnalysisRef.current = false;
      }

      setOpenAccordion("analyse");
      await Promise.all([
        mutate(),
        globalMutate(caseId ? `/api/cases/${caseId}/analyses` : null),
      ]);
    } catch (e) {
      console.error("Failed to start recherche:", e);
      setRechercheStartError("Recherche konnte nicht gestartet werden");
      shouldAutoSelectLatestAnalysisRef.current = false;
      pendingAutoSelectAnalysisIdRef.current = null;
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
        shouldAutoSelectLatestAnalysisRef.current = true;
        pendingAutoSelectAnalysisIdRef.current = null;

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
          shouldAutoSelectLatestAnalysisRef.current = false;
          return;
        }

        const runRes = await fetch(`/api/cases/${caseId}/run-recherche-analyse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!runRes.ok) {
          const err = await runRes.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setApplyAlternativeError(err.error || "Analyse konnte nicht gestartet werden");
          shouldAutoSelectLatestAnalysisRef.current = false;
          return;
        }

        const runData = await runRes.json().catch(() => null);
        const newAnalysisId: string | undefined = runData?.analysis?.id;
        if (newAnalysisId) {
          pendingAutoSelectAnalysisIdRef.current = newAnalysisId;
          setSelectedAnalysisId(newAnalysisId);
          shouldAutoSelectLatestAnalysisRef.current = false;
        }

        setOpenAccordion("analyse");
        await Promise.all([
          mutate(),
          globalMutate(caseId ? `/api/cases/${caseId}/analyses` : null),
        ]);
      } catch (err) {
        console.error("Failed to apply alternative:", err);
        setApplyAlternativeError("Alternative konnte nicht übernommen werden");
        shouldAutoSelectLatestAnalysisRef.current = false;
        pendingAutoSelectAnalysisIdRef.current = null;
      } finally {
        await new Promise((r) => setTimeout(r, 250));
        setApplyingAlternativeName(null);
        setIsApplyingAlternative(false);
      }
    },
    [caseId, isApplyingAlternative, mutate]
  );

  const quickCheckName = useCallback(
    async (name: string) => {
      setIsCheckingManualName(true);
      setNameGenError(null);
      try {
        const response = await fetch("/api/recherche/quick-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            classes: (data?.decisions?.niceClasses || []).length ? data?.decisions?.niceClasses : rechercheForm.niceClasses,
            countries: data?.decisions?.countries || [],
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setNameGenError(err.error || "Quick-Check fehlgeschlagen");
          setManualQuickCheck(null);
          return;
        }

        const qc = await response.json();
        setManualQuickCheck({
          riskLevel: qc.riskLevel,
          riskScore: qc.riskScore,
          conflicts: qc.conflicts,
          criticalCount: qc.criticalCount ?? 0,
        });
      } catch (e) {
        console.error("Quick check failed:", e);
        setNameGenError("Quick-Check fehlgeschlagen");
        setManualQuickCheck(null);
      } finally {
        setIsCheckingManualName(false);
      }
    },
    [data?.decisions?.countries, data?.decisions?.niceClasses, rechercheForm.niceClasses]
  );

  const generateSuggestions = useCallback(async () => {
    setIsGeneratingNames(true);
    setNameGenError(null);
    try {
      const base = (manualNameInput || data?.case?.trademarkName || data?.decisions?.trademarkNames?.[0] || "Neue Marke").trim();
      const keywords = generatorKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 6);

      const response = await fetch("/api/recherche/generate-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalBrand: base,
          classes: (data?.decisions?.niceClasses || []).length ? data?.decisions?.niceClasses : rechercheForm.niceClasses,
          style: generatorStyle,
          keywords,
          language: generatorLanguage,
          count: 5,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setNameGenError(err.error || "Generierung fehlgeschlagen");
        return;
      }

      const res = await response.json();
      const suggestions: NameSuggestion[] = (res.suggestions || []).map((s: any) => ({
        name: s.name,
        explanation: s.explanation,
        quickCheckStatus: (s.quickCheckStatus || "idle") as QuickCheckStatus,
        quickCheckScore: s.quickCheckScore,
        quickCheckConflicts: s.quickCheckConflicts,
        quickCheckCriticalCount: s.quickCheckCriticalCount,
      }));
      setNameSuggestions(suggestions);
    } catch (e) {
      console.error("Failed to generate suggestions:", e);
      setNameGenError("Generierung fehlgeschlagen");
    } finally {
      setIsGeneratingNames(false);
    }
  }, [data?.case?.trademarkName, data?.decisions?.niceClasses, data?.decisions?.trademarkNames, generatorKeywords, generatorLanguage, generatorStyle, manualNameInput, rechercheForm.niceClasses]);

  const applyTrademarkName = useCallback(
    async (name: string, qc?: { riskLevel?: string; riskScore?: number; conflicts?: number; criticalCount?: number }) => {
      setNameGenError(null);
      try {
        const response = await fetch("/api/cases/select-alternative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            selectedName: name,
            riskScore: qc?.riskScore,
            conflictCount: qc?.conflicts,
            criticalCount: qc?.criticalCount,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setNameGenError(err.error || "Markenname konnte nicht gespeichert werden");
          return;
        }

        setIsMarkennameModalOpen(false);
        setManualQuickCheck(null);
        setNameSuggestions([]);
        await mutate();
      } catch (e) {
        console.error("Failed to apply trademark name:", e);
        setNameGenError("Markenname konnte nicht gespeichert werden");
      }
    },
    [caseId, mutate]
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

  const { case: caseInfo, consultation, decisions, analysis, steps, events } = data;
  const activeAnalysis = selectedAnalysisResponse?.analysis || analysis;

  const formatEvent = (evt: { eventType: string; eventData?: Record<string, any> }) => {
    const type = evt.eventType;
    const d = evt.eventData || {};

    if (type === "step_status_changed") {
      const step = d.step ? String(d.step) : "Step";
      const status = d.status ? String(d.status) : "-";
      const previous = d.previousStatus ? String(d.previousStatus) : null;
      return previous ? `${step}: ${previous} → ${status}` : `${step}: ${status}`;
    }

    if (type === "step_skipped") {
      const step = d.step ? String(d.step) : "Step";
      return d.reason ? `${step} übersprungen (${String(d.reason)})` : `${step} übersprungen`;
    }

    if (type === "analysis_created") {
      return "Neue Analyse erstellt";
    }

    if (type === "alternative_selected") {
      return d.selectedName ? `Alternative übernommen: ${String(d.selectedName)}` : "Alternative übernommen";
    }

    if (type === "updated") {
      return "Fall aktualisiert";
    }

    return type;
  };

  const downloadAnalysisReport = () => {
    if (!activeAnalysis) return;

    const safe = (value: string) => value.replace(/[\\/:*?"<>|\n\r]+/g, "_");
    const formatDateTime = (value?: string | null) => {
      if (!value) return "-";
      try {
        return new Date(value).toLocaleString("de-DE");
      } catch {
        return value;
      }
    };

    const toAscii = (value: string) => {
      return value
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/Ä/g, "Ae")
        .replace(/Ö/g, "Oe")
        .replace(/Ü/g, "Ue")
        .replace(/ß/g, "ss")
        .replace(/\u0000/g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const wrapText = (text: string, maxLen: number) => {
      const out: string[] = [];
      const words = text.split(" ").filter(Boolean);
      let line = "";
      for (const w of words) {
        if (!line) {
          line = w;
          continue;
        }
        if ((line + " " + w).length <= maxLen) {
          line = line + " " + w;
        } else {
          out.push(line);
          line = w;
        }
      }
      if (line) out.push(line);
      return out;
    };

    const pdfEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    const buildPdf = (rawLines: string[]) => {
      const fontSize = 11;
      const leading = 14;
      const x = 50;
      const yStart = 800;
      const maxLines = 56;
      const maxLen = 92;

      const normalized: string[] = [];
      for (const l of rawLines) {
        const ascii = toAscii(l);
        if (!ascii) {
          normalized.push("");
          continue;
        }
        normalized.push(...wrapText(ascii, maxLen));
      }
      const sliced = normalized.length > maxLines ? [...normalized.slice(0, maxLines - 1), "... (gekürzt)"] : normalized;

      const streamLines = [
        "BT",
        `/F1 ${fontSize} Tf`,
        `${leading} TL`,
        `${x} ${yStart} Td`,
        ...sliced.map((l) => `(${pdfEscape(l)}) Tj T*`),
        "ET",
      ];
      const stream = streamLines.join("\n") + "\n";

      const encoder = new TextEncoder();
      const obj = (n: number, body: string) => `${n} 0 obj\n${body}\nendobj\n`;
      const parts: string[] = [];
      parts.push("%PDF-1.4\n");

      const objs: string[] = [];
      objs.push(obj(1, "<< /Type /Catalog /Pages 2 0 R >>"));
      objs.push(obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
      objs.push(obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"));
      objs.push(obj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

      const streamLen = encoder.encode(stream).length;
      objs.push(obj(5, `<< /Length ${streamLen} >>\nstream\n${stream}endstream`));

      const offsets: number[] = [0];
      let byteCount = encoder.encode(parts.join("")).length;
      for (const o of objs) {
        offsets.push(byteCount);
        byteCount += encoder.encode(o).length;
        parts.push(o);
      }

      const xrefStart = byteCount;
      const pad10 = (num: number) => String(num).padStart(10, "0");
      let xref = "xref\n0 6\n0000000000 65535 f \n";
      for (let i = 1; i <= 5; i++) {
        xref += `${pad10(offsets[i])} 00000 n \n`;
      }
      const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
      parts.push(xref);
      parts.push(trailer);

      return encoder.encode(parts.join(""));
    };

    const lines: string[] = [];
    lines.push("TrademarkIQ Analyse-Report (Mock)");
    lines.push("");
    lines.push(`Fallnummer: ${caseInfo.caseNumber}`);
    lines.push(`Analyse-ID: ${activeAnalysis.id}`);
    lines.push(`Erstellt am: ${formatDateTime(activeAnalysis.createdAt)}`);
    lines.push("");

    lines.push("Suchparameter");
    lines.push(`- Markenname: ${activeAnalysis.searchQuery?.trademarkName || "-"}`);
    lines.push(`- Laender: ${(activeAnalysis.searchQuery?.countries || []).join(", ") || "-"}`);
    lines.push(`- Nizza-Klassen: ${(activeAnalysis.searchQuery?.niceClasses || []).join(", ") || "-"}`);
    lines.push("");

    lines.push("Ergebnis");
    lines.push(`- Risiko-Level: ${activeAnalysis.riskLevel?.toUpperCase?.() || activeAnalysis.riskLevel || "-"}`);
    lines.push(`- Risiko-Score: ${typeof activeAnalysis.riskScore === "number" ? `${activeAnalysis.riskScore}%` : "-"}`);
    lines.push(`- Konflikte: ${(activeAnalysis.conflicts || []).length}`);
    lines.push("");

    lines.push("Suchbegriffe");
    const terms = activeAnalysis.searchTermsUsed || [];
    if (terms.length === 0) {
      lines.push("- (keine)");
    } else {
      for (const t of terms) lines.push(`- ${t}`);
    }
    lines.push("");

    lines.push("Top-Konflikte");
    const conflicts = (activeAnalysis.conflicts || [])
      .slice()
      .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
      .slice(0, 10);
    if (conflicts.length === 0) {
      lines.push("- (keine)");
    } else {
      conflicts.forEach((c, idx) => {
        const headerParts = [
          c.name,
          c.register ? `(${c.register})` : null,
          c.accuracy !== undefined ? `Aehnlichkeit: ${c.accuracy}%` : null,
        ].filter(Boolean);
        lines.push(`${idx + 1}. ${headerParts.join(" ")}`);
      });
    }
    lines.push("");

    lines.push("KI Executive Summary");
    const ai = activeAnalysis.aiAnalysis;
    if (!ai) {
      lines.push("- (keine)");
    } else {
      if (ai.nameAnalysis) lines.push(`- Namens-Check: ${ai.nameAnalysis}`);
      if (ai.riskAssessment) lines.push(`- Risiko: ${ai.riskAssessment}`);
      if (ai.recommendation) lines.push(`- Empfehlung: ${ai.recommendation}`);
      if (!ai.nameAnalysis && !ai.riskAssessment && !ai.recommendation) lines.push("- (keine)");
    }
    lines.push("");

    lines.push("Alternative Namen");
    const alts = activeAnalysis.alternativeNames || [];
    if (alts.length === 0) {
      lines.push("- (keine)");
    } else {
      alts.slice(0, 10).forEach((a) => {
        lines.push(`- ${a.name} (Score: ${a.riskScore}%, Konflikte: ${a.conflictCount})`);
      });
    }

    const pdfBytes = buildPdf(lines);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const filename = safe(`Analyse-Report_${caseInfo.caseNumber}_${stamp}.pdf`);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getStepStatus = (stepId: WorkflowStepId): StepStatus => {
    return steps?.[stepId] || { status: "pending", completedAt: null, skippedAt: null, metadata: {} };
  };

  const setStepStatus = async (
    stepId: WorkflowStepId,
    status: "pending" | "in_progress" | "completed",
    metadata?: Record<string, any>
  ) => {
    if (isUpdatingStep) return;
    setStepUpdateError(null);
    setIsUpdatingStep(stepId);
    try {
      const res = await fetch(`/api/cases/${caseId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, status, metadata }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setStepUpdateError(err.error || "Status konnte nicht gespeichert werden");
        return;
      }

      await mutate();
    } catch (e) {
      console.error("Failed to update step status:", e);
      setStepUpdateError("Status konnte nicht gespeichert werden");
    } finally {
      setIsUpdatingStep(null);
    }
  };

  const updateChecklistItem = async (
    stepId: WorkflowStepId,
    key: string,
    checked: boolean,
    items: Array<{ key: string; label: string }>
  ) => {
    const s = getStepStatus(stepId);
    if (s.status === "skipped") return;

    const currentChecklist = (s.metadata?.checklist || {}) as Record<string, boolean>;
    const nextChecklist: Record<string, boolean> = {
      ...currentChecklist,
      [key]: checked,
    };
    const nextMetadata: Record<string, any> = {
      ...(s.metadata || {}),
      checklist: {
        ...nextChecklist,
      },
    };

    const doneAfter = items.reduce((acc, it) => acc + (nextChecklist[it.key] ? 1 : 0), 0);
    const nextStatus: "pending" | "in_progress" | "completed" =
      items.length > 0 && doneAfter === items.length ? "completed" : "in_progress";

    await setStepStatus(stepId, nextStatus, nextMetadata);
  };

  const renderChecklist = (
    stepId: WorkflowStepId,
    items: Array<{ key: string; label: string }>
  ) => {
    const s = getStepStatus(stepId);
    const checklist = (s.metadata?.checklist || {}) as Record<string, boolean>;
    const done = items.reduce((acc, it) => acc + (checklist[it.key] ? 1 : 0), 0);
    const total = items.length;

    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
            {done}/{total} erledigt
          </span>
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <label key={it.key} className="flex items-start gap-3 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-600"
                checked={!!checklist[it.key]}
                disabled={s.status === "skipped"}
                onChange={(e) => void updateChecklistItem(stepId, it.key, e.target.checked, items)}
              />
              <span className={checklist[it.key] ? "line-through text-gray-500" : ""}>{it.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const skipStep = async (stepId: WorkflowStepId) => {
    if (isUpdatingStep) return;
    const reason = window.prompt("Optionaler Grund (kann leer bleiben):", "") ?? "";
    setStepUpdateError(null);
    setIsUpdatingStep(stepId);
    try {
      const res = await fetch(`/api/cases/${caseId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, reason: reason.trim() || null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setStepUpdateError(err.error || "Step konnte nicht übersprungen werden");
        return;
      }

      await mutate();
    } catch (e) {
      console.error("Failed to skip step:", e);
      setStepUpdateError("Step konnte nicht übersprungen werden");
    } finally {
      setIsUpdatingStep(null);
    }
  };

  const isStepComplete = (stepId: WorkflowStepId): boolean => {
    const stepStatus = getStepStatus(stepId);
    return stepStatus.status === "completed" || stepStatus.status === "skipped";
  };

  const handleToggleAccordion = (stepId: WorkflowStepId) => {
    const isOpening = openAccordion !== stepId;
    setOpenAccordion(isOpening ? stepId : null);

    if (!isOpening) return;
    const current = getStepStatus(stepId);
    if (current.status === "pending") {
      void setStepStatus(stepId, "in_progress");
    }
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

  const renderKommunikationContent = () => {
    const s = getStepStatus("kommunikation");
    const isBusy = isUpdatingStep === "kommunikation";

    return (
      <div className="space-y-4">
        {stepUpdateError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {stepUpdateError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Kommunikation (Mock)</div>
          <div className="text-xs text-gray-500 mb-3">Halte den Austausch mit Ämtern/Partnern im Blick.</div>
          {renderChecklist("kommunikation", [
            { key: "questions_answered", label: "Rückfragen/Fragen gesammelt und beantwortet" },
            { key: "notes_saved", label: "Wichtige E-Mails/Notizen dokumentiert" },
            { key: "next_steps", label: "Nächste Schritte und Verantwortlichkeiten festgelegt" },
          ])}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.status === "pending" && (
            <button
              onClick={() => setStepStatus("kommunikation", "in_progress")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Kommunikation starten"}
            </button>
          )}

          {s.status !== "completed" && (
            <button
              onClick={() => setStepStatus("kommunikation", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Als abgeschlossen markieren"}
            </button>
          )}

          {s.status !== "skipped" && (
            <button
              onClick={() => skipStep("kommunikation")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              }
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderUeberwachungContent = () => {
    const s = getStepStatus("ueberwachung");
    const isBusy = isUpdatingStep === "ueberwachung";

    return (
      <div className="space-y-4">
        {stepUpdateError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {stepUpdateError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Überwachung (Mock)</div>
          <div className="text-xs text-gray-500 mb-3">Beobachte neue Anmeldungen/Marken, die ähnlich sein könnten.</div>
          {renderChecklist("ueberwachung", [
            { key: "strategy", label: "Monitoring-Strategie festgelegt (Länder/Klassen/Begriffe)" },
            { key: "alerts", label: "Benachrichtigungen eingerichtet (Mock)" },
            { key: "reaction_plan", label: "Reaktionsplan bei Konfliktfällen dokumentiert" },
          ])}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.status === "pending" && (
            <button
              onClick={() => setStepStatus("ueberwachung", "in_progress")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Überwachung starten"}
            </button>
          )}

          {s.status !== "completed" && (
            <button
              onClick={() => setStepStatus("ueberwachung", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Als abgeschlossen markieren"}
            </button>
          )}

          {s.status !== "skipped" && (
            <button
              onClick={() => skipStep("ueberwachung")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              }
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFristenContent = () => {
    const s = getStepStatus("fristen");
    const isBusy = isUpdatingStep === "fristen";

    return (
      <div className="space-y-4">
        {stepUpdateError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {stepUpdateError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Fristen (Mock)</div>
          <div className="text-xs text-gray-500 mb-3">Wichtige Termine für Widerspruch, Verlängerung und Gebühren.</div>
          {renderChecklist("fristen", [
            { key: "opposition_deadlines", label: "Widerspruchsfristen notiert" },
            { key: "renewal_deadlines", label: "Verlängerungs- & Zahlungsfristen geplant" },
            { key: "reminders", label: "Reminder/Calendar-Notizen eingerichtet (Mock)" },
          ])}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.status === "pending" && (
            <button
              onClick={() => setStepStatus("fristen", "in_progress")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Fristen starten"}
            </button>
          )}

          {s.status !== "completed" && (
            <button
              onClick={() => setStepStatus("fristen", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Als abgeschlossen markieren"}
            </button>
          )}

          {s.status !== "skipped" && (
            <button
              onClick={() => skipStep("fristen")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              }
            >
              Überspringen
            </button>
          )}
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

  const renderMarkennameContent = () => {
    const currentName = caseInfo.trademarkName || decisions?.trademarkNames?.[0] || "";
    const countries = decisions?.countries || [];
    const niceClasses = decisions?.niceClasses || [];

    return (
      <div className="space-y-4">
        {isAutoExtractingDecisions && (
          <div className="px-4 py-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-sm">
            Entscheidungen werden aus der Beratung übernommen…
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Aktueller Markenname
            </div>
            <div className="font-semibold text-gray-900">{currentName || "-"}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Länder
            </div>
            <div className="font-semibold text-gray-900">{countries.join(", ") || "-"}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Nizza-Klassen</div>
            <div className="font-semibold text-gray-900">{niceClasses.map((c) => `${c}`).join(", ") || "-"}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setNameGenError(null);
              setIsMarkennameModalOpen(true);
              setManualNameInput(currentName || "");
            }}
            className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Namen prüfen / generieren
          </button>
          <button
            onClick={() => setOpenAccordion("recherche")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Weiter zur Recherche
          </button>
        </div>

        {isMarkennameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">Markenname prüfen / generieren</div>
                  <div className="text-xs text-gray-500">Manuell prüfen oder Vorschläge generieren und shortlist-en.</div>
                </div>
                <button
                  onClick={() => setIsMarkennameModalOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Schließen
                </button>
              </div>

              <div className="p-5 space-y-6">
                {nameGenError && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {nameGenError}
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Manuell</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={manualNameInput}
                      onChange={(e) => setManualNameInput(e.target.value)}
                      placeholder="Markenname eingeben"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    />
                    <button
                      onClick={() => quickCheckName(manualNameInput)}
                      disabled={isCheckingManualName || !manualNameInput.trim()}
                      className={
                        isCheckingManualName || !manualNameInput.trim()
                          ? "px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                          : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      }
                    >
                      {isCheckingManualName ? "Prüfe…" : "Quick-Check"}
                    </button>
                    <button
                      onClick={() => applyTrademarkName(manualNameInput, manualQuickCheck || undefined)}
                      disabled={!manualNameInput.trim()}
                      className={
                        !manualNameInput.trim()
                          ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                          : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                      }
                    >
                      Übernehmen
                    </button>
                  </div>

                  {manualQuickCheck && (
                    <div className="mt-3 text-sm text-gray-700 flex flex-wrap items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          manualQuickCheck.riskLevel === "low"
                            ? "bg-teal-100 text-teal-700"
                            : manualQuickCheck.riskLevel === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {manualQuickCheck.riskLevel.toUpperCase()} {manualQuickCheck.riskScore}%
                      </span>
                      <span className="text-xs text-gray-500">{manualQuickCheck.conflicts} Konflikte</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Vorschläge (KI)</div>
                      <div className="text-xs text-gray-500">Generiert Vorschläge inkl. Quick-Check.</div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={generatorStyle}
                        onChange={(e) => setGeneratorStyle(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="similar">Ähnlich</option>
                        <option value="modern">Modern</option>
                        <option value="creative">Kreativ</option>
                        <option value="serious">Seriös</option>
                      </select>
                      <select
                        value={generatorLanguage}
                        onChange={(e) => setGeneratorLanguage(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="de">DE</option>
                        <option value="en">EN</option>
                        <option value="international">INTL</option>
                      </select>
                      <button
                        onClick={generateSuggestions}
                        disabled={isGeneratingNames}
                        className={
                          isGeneratingNames
                            ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                            : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                        }
                      >
                        {isGeneratingNames ? "Generiere…" : "Generieren"}
                      </button>
                    </div>
                  </div>

                  <input
                    value={generatorKeywords}
                    onChange={(e) => setGeneratorKeywords(e.target.value)}
                    placeholder="Keywords (Komma-getrennt)"
                    className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />

                  {nameSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {nameSuggestions.map((s) => (
                        <div
                          key={s.name}
                          className="p-3 bg-white rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">{s.name}</div>
                            {s.explanation && <div className="text-xs text-gray-500">{s.explanation}</div>}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {s.quickCheckStatus !== "idle" && s.quickCheckStatus !== "checking" && s.quickCheckStatus !== "error" && (
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  s.quickCheckStatus === "low"
                                    ? "bg-teal-100 text-teal-700"
                                    : s.quickCheckStatus === "medium"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {s.quickCheckStatus.toUpperCase()} {s.quickCheckScore}%
                              </span>
                            )}
                            <button
                              onClick={() => {
                                const exists = shortlist.some((x) => x.name === s.name);
                                if (exists) return;
                                const riskLevel: "low" | "medium" | "high" | "unknown" =
                                  s.quickCheckStatus === "low" ||
                                  s.quickCheckStatus === "medium" ||
                                  s.quickCheckStatus === "high"
                                    ? s.quickCheckStatus
                                    : "unknown";
                                setShortlist((prev) =>
                                  [
                                    {
                                      name: s.name,
                                      riskLevel,
                                      riskScore: s.quickCheckScore ?? 0,
                                      conflicts: s.quickCheckConflicts ?? 0,
                                      criticalCount: s.quickCheckCriticalCount ?? 0,
                                    },
                                    ...prev,
                                  ].slice(0, 10)
                                );
                              }}
                              className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Zur Shortlist
                            </button>
                            <button
                              onClick={() =>
                                applyTrademarkName(s.name, {
                                  riskLevel: s.quickCheckStatus,
                                  riskScore: s.quickCheckScore,
                                  conflicts: s.quickCheckConflicts,
                                  criticalCount: s.quickCheckCriticalCount,
                                })
                              }
                              className="px-3 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                            >
                              Übernehmen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Noch keine Vorschläge generiert.</div>
                  )}
                </div>

                {shortlist.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Shortlist</div>
                    <div className="space-y-2">
                      {shortlist.map((item) => (
                        <div
                          key={item.name}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                item.riskLevel === "low"
                                  ? "bg-teal-100 text-teal-700"
                                  : item.riskLevel === "medium"
                                  ? "bg-orange-100 text-orange-700"
                                  : item.riskLevel === "high"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {item.riskScore}%
                            </span>
                            <span className="text-xs text-gray-500">{item.conflicts} Konflikte</span>
                            <button
                              onClick={() => applyTrademarkName(item.name, item)}
                              className="px-3 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                            >
                              Übernehmen
                            </button>
                            <button
                              onClick={() => setShortlist((prev) => prev.filter((x) => x.name !== item.name))}
                              className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <select
                    value={selectedAnalysisId || ""}
                    onChange={(e) => {
                      pendingAutoSelectAnalysisIdRef.current = null;
                      shouldAutoSelectLatestAnalysisRef.current = false;
                      setSelectedAnalysisId(e.target.value || null);
                    }}
                    className="w-full sm:w-[360px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {selectedAnalysisId && !analysesData.analyses.some((a) => a.id === selectedAnalysisId) && (
                      <option value={selectedAnalysisId}>Neue Analyse wird geladen…</option>
                    )}
                    {analysesData.analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatGermanDateTime(a.createdAt)}   {a.trademarkName || "(ohne Namen)"}   {a.riskLevel.toUpperCase()} {a.riskScore}%
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={downloadAnalysisReport}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF herunterladen
                  </button>
                </div>
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
                    <div className="min-w-0 flex-1">
                      <span title={alt.name} className="block font-medium text-gray-900 truncate">
                        {alt.name}
                      </span>
                    </div>
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

  const renderUeberpruefungContent = () => {
    const s = getStepStatus("ueberpruefung");
    const isBusy = isUpdatingStep === "ueberpruefung";

    return (
      <div className="space-y-4">
        {stepUpdateError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {stepUpdateError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Checkliste (Mock)</div>
          <div className="text-xs text-gray-500 mb-3">Dokumentiere die finale Prüfung vor der Anmeldung.</div>
          {renderChecklist("ueberpruefung", [
            { key: "conflicts_reviewed", label: "Konflikte im Detail geprüft (Ähnlichkeit, Waren/Dienstleistungen, Registerstatus)" },
            { key: "classes_confirmed", label: "Nizza-Klassen & Länder final bestätigt" },
            { key: "recommendation_documented", label: "Empfehlung / nächste Schritte dokumentiert" },
          ])}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.status === "pending" && (
            <button
              onClick={() => setStepStatus("ueberpruefung", "in_progress")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Überprüfung starten"}
            </button>
          )}

          {s.status !== "completed" && (
            <button
              onClick={() => setStepStatus("ueberpruefung", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Als abgeschlossen markieren"}
            </button>
          )}

          {s.status !== "skipped" && (
            <button
              onClick={() => skipStep("ueberpruefung")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              }
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderAnmeldungContent = () => {
    const s = getStepStatus("anmeldung");
    const isBusy = isUpdatingStep === "anmeldung";

    return (
      <div className="space-y-4">
        {stepUpdateError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {stepUpdateError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-1">Anmeldung vorbereiten (Mock)</div>
          <div className="text-xs text-gray-500 mb-3">Nächste Schritte für die formale Einreichung.</div>
          {renderChecklist("anmeldung", [
            { key: "applicant_data", label: "Anmeldedaten (Inhaber, Adresse, Vertreter) zusammenstellen" },
            { key: "goods_services", label: "Waren- & Dienstleistungsverzeichnis finalisieren" },
            { key: "filing_plan", label: "Einreichung planen (DPMA/EUIPO/WIPO) und Gebühren prüfen" },
          ])}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {s.status === "pending" && (
            <button
              onClick={() => setStepStatus("anmeldung", "in_progress")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Anmeldung starten"}
            </button>
          )}

          {s.status !== "completed" && (
            <button
              onClick={() => setStepStatus("anmeldung", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Als abgeschlossen markieren"}
            </button>
          )}

          {s.status !== "skipped" && (
            <button
              onClick={() => skipStep("anmeldung")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              }
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = (step: WorkflowStep) => {
    switch (step.id) {
      case "beratung":
        return renderBeratungContent();
      case "markenname":
        return renderMarkennameContent();
      case "recherche":
        return renderRechercheContent();
      case "analyse":
        return renderAnalyseContent();
      case "ueberpruefung":
        return renderUeberpruefungContent();
      case "anmeldung":
        return renderAnmeldungContent();
      case "kommunikation":
        return renderKommunikationContent();
      case "ueberwachung":
        return renderUeberwachungContent();
      case "fristen":
        return renderFristenContent();
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

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <div>
                <div className="font-semibold text-gray-900">Aktivität</div>
                <div className="text-xs text-gray-500">Letzte Änderungen und Aktionen</div>
              </div>
            </div>
            {(events?.length || 0) > 8 && (
              <button
                onClick={() => setShowAllEvents((v) => !v)}
                className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
              >
                {showAllEvents ? "Weniger anzeigen" : `Alle anzeigen (${events.length})`}
              </button>
            )}
          </div>

          {(events?.length || 0) === 0 ? (
            <div className="text-sm text-gray-500">Noch keine Aktivität.</div>
          ) : (
            <div className="space-y-2">
              {(showAllEvents ? events : events.slice(0, 8)).map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{formatEvent(e)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatGermanDateTime(e.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {WORKFLOW_STEPS.map((step) => (
            <AccordionSection
              key={step.id}
              title={step.title}
              icon={step.icon}
              isCompleted={isStepComplete(step.id)}
              status={getStepStatus(step.id).status}
              isOpen={openAccordion === step.id}
              onToggle={() => handleToggleAccordion(step.id)}
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
