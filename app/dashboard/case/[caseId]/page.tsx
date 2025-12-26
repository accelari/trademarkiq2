"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mic,
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
  X,
  Wand2,
  Info,
  Upload,
} from "lucide-react";
import { AnimatedRiskScore } from "@/app/components/cases/AnimatedRiskScore";
import { ConflictCard, ConflictMark, ConflictDetailModal } from "@/app/components/cases/ConflictCard";
import OpenAIVoiceAssistant, { VoiceAssistantHandle } from "@/app/components/OpenAIVoiceAssistant";
import Tooltip, { 
  NiceClassesTooltip, 
  RiskLevelTooltip, 
  RiskScoreTooltip, 
  AlternativeNamesTooltip, 
  QuickCheckTooltip, 
  ConflictsTooltip, 
} from "@/app/components/ui/tooltip";

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

type CountryOption = {
  code: string;
  label: string;
  icon: string;
  numeric?: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "AE", label: "Vereinigte Arabische Emirate", icon: "🇦🇪", numeric: "784" },
  { code: "AM", label: "Armenien", icon: "🇦🇲", numeric: "051" },
  { code: "AR", label: "Argentinien", icon: "🇦🇷", numeric: "032" },
  { code: "AT", label: "Österreich", icon: "🇦🇹", numeric: "040" },
  { code: "AU", label: "Australien", icon: "🇦🇺", numeric: "036" },
  { code: "AZ", label: "Aserbaidschan", icon: "🇦🇿", numeric: "031" },
  { code: "BA", label: "Bosnien und Herzegowina", icon: "🇧🇦", numeric: "070" },
  { code: "BE", label: "Belgien", icon: "🇧🇪", numeric: "056" },
  { code: "BG", label: "Bulgarien", icon: "🇧🇬", numeric: "100" },
  { code: "BH", label: "Bahrain", icon: "🇧🇭", numeric: "048" },
  { code: "BW", label: "Botswana", icon: "🇧🇼", numeric: "072" },
  { code: "BR", label: "Brasilien", icon: "🇧🇷", numeric: "076" },
  { code: "BY", label: "Belarus", icon: "🇧🇾", numeric: "112" },
  { code: "CA", label: "Kanada", icon: "🇨🇦", numeric: "124" },
  { code: "CH", label: "Schweiz", icon: "🇨🇭", numeric: "756" },
  { code: "CN", label: "China", icon: "🇨🇳", numeric: "156" },
  { code: "CZ", label: "Tschechien", icon: "🇨🇿", numeric: "203" },
  { code: "DE", label: "Deutschland", icon: "🇩🇪", numeric: "276" },
  { code: "DK", label: "Dänemark", icon: "🇩🇰", numeric: "208" },
  { code: "EE", label: "Estland", icon: "🇪🇪", numeric: "233" },
  { code: "EG", label: "Ägypten", icon: "🇪🇬", numeric: "818" },
  { code: "ES", label: "Spanien", icon: "🇪🇸", numeric: "724" },
  { code: "EU", label: "Europäische Union", icon: "🇪🇺" },
  { code: "EUIPO", label: "EUIPO", icon: "🇪🇺" },
  { code: "FI", label: "Finnland", icon: "🇫🇮", numeric: "246" },
  { code: "FR", label: "Frankreich", icon: "🇫🇷", numeric: "250" },
  { code: "GB", label: "Vereinigtes Königreich", icon: "🇬🇧", numeric: "826" },
  { code: "GE", label: "Georgien", icon: "🇬🇪", numeric: "268" },
  { code: "GR", label: "Griechenland", icon: "🇬🇷", numeric: "300" },
  { code: "HK", label: "Hongkong", icon: "🇭🇰", numeric: "344" },
  { code: "HR", label: "Kroatien", icon: "🇭🇷", numeric: "191" },
  { code: "HU", label: "Ungarn", icon: "🇭🇺", numeric: "348" },
  { code: "ID", label: "Indonesien", icon: "🇮🇩", numeric: "360" },
  { code: "IE", label: "Irland", icon: "🇮🇪", numeric: "372" },
  { code: "IL", label: "Israel", icon: "🇮🇱", numeric: "376" },
  { code: "IN", label: "Indien", icon: "🇮🇳", numeric: "356" },
  { code: "IT", label: "Italien", icon: "🇮🇹", numeric: "380" },
  { code: "JP", label: "Japan", icon: "🇯🇵", numeric: "392" },
  { code: "KE", label: "Kenia", icon: "🇰🇪", numeric: "404" },
  { code: "KG", label: "Kirgisistan", icon: "🇰🇬", numeric: "417" },
  { code: "KZ", label: "Kasachstan", icon: "🇰🇿", numeric: "398" },
  { code: "KR", label: "Südkorea", icon: "🇰🇷", numeric: "410" },
  { code: "LT", label: "Litauen", icon: "🇱🇹", numeric: "440" },
  { code: "LV", label: "Lettland", icon: "🇱🇻", numeric: "428" },
  { code: "MA", label: "Marokko", icon: "🇲🇦", numeric: "504" },
  { code: "MD", label: "Moldau", icon: "🇲🇩", numeric: "498" },
  { code: "MX", label: "Mexiko", icon: "🇲🇽", numeric: "484" },
  { code: "MY", label: "Malaysia", icon: "🇲🇾", numeric: "458" },
  { code: "NL", label: "Niederlande", icon: "🇳🇱", numeric: "528" },
  { code: "NO", label: "Norwegen", icon: "🇳🇴", numeric: "578" },
  { code: "OM", label: "Oman", icon: "🇴🇲", numeric: "512" },
  { code: "PH", label: "Philippinen", icon: "🇵🇭", numeric: "608" },
  { code: "PL", label: "Polen", icon: "🇵🇱", numeric: "616" },
  { code: "PT", label: "Portugal", icon: "🇵🇹", numeric: "620" },
  { code: "RO", label: "Rumänien", icon: "🇷🇴", numeric: "642" },
  { code: "RU", label: "Russische Föderation", icon: "🇷🇺", numeric: "643" },
  { code: "SA", label: "Saudi-Arabien", icon: "🇸🇦", numeric: "682" },
  { code: "SE", label: "Schweden", icon: "🇸🇪", numeric: "752" },
  { code: "SG", label: "Singapur", icon: "🇸🇬", numeric: "702" },
  { code: "TH", label: "Thailand", icon: "🇹🇭", numeric: "764" },
  { code: "TR", label: "Türkei", icon: "🇹🇷", numeric: "792" },
  { code: "TW", label: "Taiwan", icon: "🇹🇼", numeric: "158" },
  { code: "UA", label: "Ukraine", icon: "🇺🇦", numeric: "804" },
  { code: "US", label: "Vereinigte Staaten", icon: "🇺🇸", numeric: "840" },
  { code: "UZ", label: "Usbekistan", icon: "🇺🇿", numeric: "860" },
  { code: "VN", label: "Vietnam", icon: "🇻🇳", numeric: "704" },
  { code: "WO", label: "WIPO", icon: "🌐" },
  { code: "ZA", label: "Südafrika", icon: "🇿🇦", numeric: "710" },
].slice().sort((a, b) => a.label.localeCompare(b.label));

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
  stepId,
  title,
  icon: Icon,
  isCompleted,
  status,
  isOpen,
  onToggle,
  headerMeta,
  children,
}: {
  stepId: string;
  title: string;
  icon: React.ElementType;
  isCompleted: boolean;
  status: string;
  isOpen: boolean;
  onToggle: () => void;
  headerMeta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div
      id={`accordion-${stepId}`}
      ref={sectionRef}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden scroll-mt-28 lg:scroll-mt-32"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isCompleted ? (
            <Check className="w-4 h-4 text-teal-600" />
          ) : (
            <span className="w-4 h-4" />
          )}
          <Icon className={`w-5 h-5 ${isCompleted ? "text-teal-600" : "text-gray-400"}`} />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-gray-900 truncate">{title}</span>
            {headerMeta && (
              <div className="ml-auto mr-4 min-w-0 max-w-[720px]">
                {headerMeta}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

function truncateText(value: string, maxLen: number): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.length <= maxLen) return v;
  return `${v.slice(0, maxLen - 1)}…`;
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
  const [isApplyingAlternative, setIsApplyingAlternative] = useState(false);
  const [applyingAlternativeName, setApplyingAlternativeName] = useState<string | null>(null);
  const [applyAlternativeError, setApplyAlternativeError] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingTransferHash, setPendingTransferHash] = useState<string | null>(null);
  const [isStartingRecherche, setIsStartingRecherche] = useState(false);
  const [rechercheStartError, setRechercheStartError] = useState<string | null>(null);
  const [isSavingRechercheForm, setIsSavingRechercheForm] = useState(false);
  const [rechercheFormSaveError, setRechercheFormSaveError] = useState<string | null>(null);
  const [rechercheFormValidationAttempted, setRechercheFormValidationAttempted] = useState(false);
  const [isUpdatingStep, setIsUpdatingStep] = useState<WorkflowStepId | null>(null);
  const [stepUpdateError, setStepUpdateError] = useState<string | null>(null);

  const [isAutoExtractingDecisions, setIsAutoExtractingDecisions] = useState(false);
  const autoExtractAttemptedForConsultationIdsRef = useRef<Map<string, string>>(new Map());
  const lastAutoExtractAtByConsultationIdRef = useRef<Map<string, number>>(new Map());
  const autoCompleteBeratungAttemptedForCaseIdsRef = useRef<Set<string>>(new Set());

  const [markennameInput, setMarkennameInput] = useState("");
  const [markennameTouched, setMarkennameTouched] = useState(false);
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

  // Trademark type and details state
  const [markennameTab, setMarkennameTab] = useState<"markenname" | "generator">("markenname");
  const [trademarkType, setTrademarkType] = useState<"wortmarke" | "wort-bildmarke" | "bildmarke">("wortmarke");
  const [trademarkImageUrl, setTrademarkImageUrl] = useState<string | null>(null);
  const [trademarkImageFile, setTrademarkImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // KI-Logo Generator Modal state
  const [showLogoGeneratorModal, setShowLogoGeneratorModal] = useState(false);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [logoGenerationError, setLogoGenerationError] = useState<string | null>(null);
  const [isRecordingLogoPrompt, setIsRecordingLogoPrompt] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [isAutoGeneratingPrompt, setIsAutoGeneratingPrompt] = useState(false);

  useEffect(() => {
    if (String(manualNameInput || "").trim().length > 0) return;
    const candidate = String(
      markennameInput || data?.case?.trademarkName || data?.decisions?.trademarkNames?.[0] || ""
    ).trim();
    if (!candidate) return;
    setManualNameInput(candidate);
  }, [data?.case?.trademarkName, data?.decisions?.trademarkNames, manualNameInput, markennameInput]);

  // Recherche form state (moved to top level for React Hooks rules)
  const [rechercheForm, setRechercheForm] = useState({
    trademarkName: "",
    countries: [] as string[],
    niceClasses: [] as number[],
    includeRelatedNiceClasses: true,
  });

  const getRelatedNiceClasses = useCallback((selected: number[]) => {
    const MAP: Record<number, number[]> = {
      1: [2, 3, 5],
      2: [1, 3, 4, 5],
      3: [1, 2, 5, 10, 14],
      4: [2, 5, 10],
      5: [1, 2, 3, 4, 10],
      6: [7, 8, 19],
      7: [6, 8, 9, 11, 12],
      8: [6, 7, 9],
      9: [7, 8, 11, 38, 42],
      10: [3, 4, 5, 14],
      11: [7, 9, 12],
      12: [7, 11, 37, 39],
      13: [9, 11, 42],
      14: [3, 10],
      15: [16, 21],
      16: [9, 35, 41],
      17: [6, 19],
      18: [25, 28],
      19: [6, 17, 20],
      20: [19, 21],
      21: [15, 20],
      22: [16, 25],
      23: [24, 25, 26],
      24: [23, 25, 26, 27],
      25: [23, 24, 26, 28],
      26: [23, 24, 25, 27],
      27: [24, 26, 28],
      28: [18, 25, 27],
      29: [30, 31, 32],
      30: [29, 31, 32, 33],
      31: [29, 30, 32, 33],
      32: [29, 30, 31, 33],
      33: [30, 31, 32, 34],
      34: [33],
      35: [36, 41, 42],
      36: [35, 41, 42],
      37: [39, 40, 42],
      38: [9, 41, 42],
      39: [37, 40, 42],
      40: [37, 39],
      41: [35, 36, 38, 42, 44],
      42: [9, 35, 36, 37, 38, 39, 41, 45],
      43: [35, 41],
      44: [9, 35, 41],
      45: [41, 42],
    };

    const base = Array.from(
      new Set(
        (selected || [])
          .filter((n) => Number.isFinite(n))
          .map((n) => Math.max(1, Math.min(45, Math.floor(n))))
      )
    ).sort((a, b) => a - b);

    const out = new Set<number>();
    for (const c of base) {
      const related = MAP[c] || [];
      for (const r of related) out.add(r);
      if (!MAP[c]) {
        if (c > 1) out.add(c - 1);
        if (c < 45) out.add(c + 1);
      }
    }
    for (const c of base) out.delete(c);

    return Array.from(out)
      .filter((n) => n >= 1 && n <= 45)
      .sort((a, b) => a - b)
      .slice(0, 12);
  }, []);

  const getEffectiveNiceClasses = useCallback(
    (selected: number[], includeRelated: boolean) => {
      const base = Array.from(
        new Set(
          (selected || [])
            .filter((n) => Number.isFinite(n))
            .map((n) => Math.max(1, Math.min(45, Math.floor(n))))
        )
      ).sort((a, b) => a - b);

      if (!includeRelated) return base;
      const related = getRelatedNiceClasses(base);
      return Array.from(new Set([...base, ...related])).sort((a, b) => a - b);
    },
    [getRelatedNiceClasses]
  );

  const [isRunningRecherche, setIsRunningRecherche] = useState(false);
  const [rechercheError, setRechercheError] = useState<string | null>(null);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [countriesSearch, setCountriesSearch] = useState("");
  const [classesOpen, setClassesOpen] = useState(false);
  const [classesSearch, setClassesSearch] = useState("");

  const alternativeNamesRef = useRef<HTMLDivElement>(null);
  
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const isSavingSessionRef = useRef(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const previousAccordionRef = useRef<string | null>("beratung");
  const sessionMessagesRef = useRef<any[]>([]);
  const summaryDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSummarySavedAtRef = useRef<number>(0);
  const lastSummarySavedMessageCountRef = useRef<number>(0);

  const renderBeratungHeaderMeta = useCallback(() => {
    const decision = data?.decisions as any;
    const caseRecord = data?.case as any;

    const summaryText = String(sessionSummary || data?.consultation?.summary || "");
    const summaryLower = summaryText.toLowerCase();

    const formatList = (items: string[], max: number) => {
      const cleaned = items.map((x) => String(x || "").trim()).filter(Boolean);
      if (cleaned.length === 0) return "";
      if (cleaned.length <= max) return cleaned.join(", ");
      return `${cleaned.slice(0, max).join(", ")} +${cleaned.length - max}`;
    };

    const extractNameFromSummary = () => {
      const quoted = summaryText.match(
        /\b(?:marke\/thema|marke|markenname)\s*:\s*(?:[^\n\r]*?)["'„“”‚‘’]([^"'„“”‚‘’\n\r]{2,60})["'„“”‚‘’]/i
      );
      if (quoted?.[1]) return quoted[1].trim();

      const m = summaryText.match(/\b(?:marke\/thema|marke|markenname)\s*:\s*([^\n\r]{2,80})/i);
      if (!m?.[1]) return "";

      const rest = m[1].trim();
      const cleaned = rest.replace(/^anmeldung\s+der\s+marke\s+/i, "").trim();
      return cleaned;
    };

    const extractClassesFromSummary = (): number[] => {
      const m = summaryText.match(/\bklasse(?:n)?\s*:?\s*([^\n\r]{1,80})/i);
      if (!m?.[1]) return [];
      const nums = Array.from(m[1].matchAll(/\b(\d{1,2})\b/g)).map((x) => Number(x[1]));
      return nums.filter((n) => Number.isFinite(n) && n >= 1 && n <= 45);
    };

    const extractCountriesFromSummary = (): string[] => {
      const result: string[] = [];
      const add = (code: string) => {
        const c = String(code || "").trim();
        if (!c) return;
        if (!result.includes(c)) result.push(c);
      };

      if (/\b(usa|u\.?s\.?a\.?|united states|amerika|us)\b/i.test(summaryLower)) add("US");
      if (/\b(deutschland|germany|de)\b/i.test(summaryLower)) add("DE");
      if (/\b(österreich|austria|at)\b/i.test(summaryLower)) add("AT");
      if (/\b(schweiz|switzerland|ch)\b/i.test(summaryLower)) add("CH");
      if (/\b(eu|europa|europäische union|european union)\b/i.test(summaryLower)) add("EU");

      return result;
    };

    const nameFromDecisions = Array.isArray(decision?.trademarkNames)
      ? String(decision.trademarkNames.find((n: any) => typeof n === "string" && n.trim().length > 0) || "").trim()
      : "";

    const nameFromCase = String(caseRecord?.trademarkName || "").trim();
    const name = nameFromDecisions || nameFromCase || extractNameFromSummary();

    const classesFromDecisions = Array.isArray(decision?.niceClasses)
      ? decision.niceClasses
          .map((n: any) => Number(n))
          .filter((n: any) => Number.isFinite(n) && n >= 1 && n <= 45)
      : [];

    const classes = classesFromDecisions.length > 0 ? classesFromDecisions : extractClassesFromSummary();

    const countriesFromDecisions = Array.isArray(decision?.countries)
      ? decision.countries.map((c: any) => String(c || "").trim()).filter(Boolean)
      : [];

    const countries = countriesFromDecisions.length > 0 ? countriesFromDecisions : extractCountriesFromSummary();

    const countryLabelByCode = new Map(
      COUNTRY_OPTIONS.map((c) => [String(c.code || "").toUpperCase(), String(c.label || "")])
    );

    const countriesLabel = countries
      .map((c: string) => {
        const upper = String(c || "").toUpperCase();
        return countryLabelByCode.get(upper) || upper;
      })
      .filter(Boolean);

    const chip = (label: string, value: string, missing: boolean) => (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium max-w-[260px] ${
          missing
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-teal-50 text-teal-700 border-teal-200"
        }`}
      >
        <span className="opacity-80">{label}:</span>
        <span className="font-semibold truncate">{missing ? "fehlt" : value}</span>
      </span>
    );

    return (
      <div className="flex flex-wrap gap-1.5 justify-end">
        {chip("Marke", truncateText(name, 28), !name)}
        {chip(
          "Klassen",
          classes.length > 0 ? formatList(classes.map(String), 5) : "",
          classes.length === 0
        )}
        {chip(
          "Länder",
          countriesLabel.length > 0 ? formatList(countriesLabel, 4) : "",
          countriesLabel.length === 0
        )}
      </div>
    );
  }, [data?.case, data?.consultation?.summary, data?.decisions, sessionSummary]);

  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash || "";
      const hash = raw.startsWith("#") ? raw.slice(1) : raw;
      if (!hash) return;

      const map: Record<string, WorkflowStepId> = {
        beratung: "beratung",
        markenpruefung: "recherche",
        recherche: "recherche",
        ueberpruefung: "ueberpruefung",
        anmeldung: "anmeldung",
        kommunikation: "kommunikation",
        ueberwachung: "ueberwachung",
        fristen: "fristen",
      };

      const next = map[hash] || (hash as WorkflowStepId);
      const exists = WORKFLOW_STEPS.some((s) => s.id === next);
      if (!exists) return;

      // If user is moving into Recherche and Beratung produced data, ask whether to transfer.
      if (next === "recherche" && !showTransferModal) {
        const beratungStatus = data?.steps?.beratung?.status;
        const beratungDone = beratungStatus === "completed";

        const decision = data?.decisions;
        const hasUsefulDecisions =
          !!decision &&
          ((decision.trademarkNames?.length || 0) > 0 || (decision.countries?.length || 0) > 0 || (decision.niceClasses?.length || 0) > 0);

        const rawSummary = (sessionSummary || data?.consultation?.summary || "").trim();
        const hasSummaryData =
          /\bmarke\s*:\s*[^\n\r]{2,}/i.test(rawSummary) ||
          /\bmarkenname\s*:\s*[^\n\r]{2,}/i.test(rawSummary) ||
          /\bklasse(n)?\b[^\d]{0,8}\d{1,2}\b/i.test(rawSummary);

        const rechercheMeta = (data?.steps?.recherche?.metadata || {}) as Record<string, any>;
        const transferChoice = rechercheMeta?.transferFromBeratung;

        const shouldAsk = beratungDone && (hasUsefulDecisions || hasSummaryData) && !transferChoice;
        if (shouldAsk) {
          setPendingTransferHash(hash);
          setShowTransferModal(true);
          return;
        }
      }

      setOpenAccordion(next);

      setTimeout(() => {
        const el = document.getElementById(`accordion-${next}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [data?.consultation?.summary, data?.decisions, data?.steps?.beratung?.status, data?.steps?.recherche?.metadata, sessionSummary, showTransferModal]);

  useEffect(() => {
    sessionMessagesRef.current = sessionMessages;
  }, [sessionMessages]);

  useEffect(() => {
    if (data?.consultation?.messages && !messagesLoaded) {
      setSessionMessages(data.consultation.messages);
      setMessagesLoaded(true);
      if (data.consultation.summary) {
        setSessionSummary(data.consultation.summary);
        lastSummarySavedAtRef.current = Date.now();
        lastSummarySavedMessageCountRef.current = data.consultation.messages.length;
      }
    }
  }, [data?.consultation, messagesLoaded]);

  // Initialize rechercheForm when data loads
  useEffect(() => {
    if (data) {
      const { decisions, case: caseInfo } = data;
      const metaQuery = (data?.steps?.recherche?.metadata as any)?.searchQuery;
      const metaBaseClasses = Array.isArray(metaQuery?.baseNiceClasses) ? metaQuery.baseNiceClasses : null;
      const metaIncludeRelated = typeof metaQuery?.includeRelatedNiceClasses === "boolean" ? metaQuery.includeRelatedNiceClasses : null;

      setRechercheForm((prev) => ({
        trademarkName: prev.trademarkName || decisions?.trademarkNames?.[0] || caseInfo?.trademarkName || "",
        countries: prev.countries.length > 0 ? prev.countries : decisions?.countries || [],
        niceClasses: prev.niceClasses.length > 0 ? prev.niceClasses : metaBaseClasses || decisions?.niceClasses || [],
        includeRelatedNiceClasses: metaIncludeRelated !== null ? metaIncludeRelated : prev.includeRelatedNiceClasses,
      }));
    }
  }, [data]);

  useEffect(() => {
    const c = data?.consultation;
    const decision = data?.decisions;
    const caseRecord = data?.case;

    if (!c?.id || !caseRecord?.id) return;
    const summary = (sessionSummary || c.summary || "").trim();
    if (!summary) return;

    const hasUsefulDecisions =
      !!decision &&
      ((decision.trademarkNames?.length || 0) > 0 || (decision.countries?.length || 0) > 0 || (decision.niceClasses?.length || 0) > 0);

    const hasNameFromDecisions = (decision?.trademarkNames || []).some((n: any) => typeof n === "string" && n.trim().length > 0);
    const hasCountriesFromDecisions = (decision?.countries || []).some((x: any) => typeof x === "string" && String(x).trim().length > 0);
    const hasClassesFromDecisions = (decision?.niceClasses || []).some((k: any) => Number.isFinite(Number(k)));

    if (hasNameFromDecisions && hasCountriesFromDecisions && hasClassesFromDecisions) return;

    const lastAttemptedSummary = autoExtractAttemptedForConsultationIdsRef.current.get(c.id);
    if (lastAttemptedSummary === summary) return;

    const now = Date.now();
    const lastAt = lastAutoExtractAtByConsultationIdRef.current.get(c.id) || 0;
    if (now - lastAt < 30000) return;

    lastAutoExtractAtByConsultationIdRef.current.set(c.id, now);
    autoExtractAttemptedForConsultationIdsRef.current.set(c.id, summary);
    setIsAutoExtractingDecisions(true);

    (async () => {
      try {
        const res = await fetch(`/api/cases/extract-decisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseRecord.id,
            consultationId: c.id,
            summary,
          }),
        });

        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          const parsed = (() => {
            try {
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          })();

          const message =
            (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as any).error === "string"
              ? String((parsed as any).error)
              : raw?.trim()?.slice(0, 240)) ||
            `${res.status} ${res.statusText}`;

          if (res.status === 401) {
            console.warn("[Auto Decisions] Skipped (unauthorized)");
          } else {
            console.warn(`[Auto Decisions] Failed (${res.status}): ${message}`);
          }
          return;
        }

        await mutate();
      } catch (e) {
        console.warn("[Auto Decisions] Failed:", e);
      } finally {
        setIsAutoExtractingDecisions(false);
      }
    })();
  }, [data?.case, data?.consultation?.id, data?.consultation?.summary, data?.decisions, mutate, sessionSummary]);

  useEffect(() => {
    const caseRecord = data?.case;
    if (!caseRecord?.id) return;
    if (isUpdatingStep) return;

    const current = data?.steps?.beratung?.status;
    if (current === "completed" || current === "skipped") return;

    const d = data?.decisions;
    const hasNameFromDecisions = (d?.trademarkNames || []).some((n) => typeof n === "string" && n.trim().length > 0);
    const hasCountriesFromDecisions = (d?.countries || []).some((c) => typeof c === "string" && c.trim().length > 0);
    const hasClassesFromDecisions = (d?.niceClasses || []).some((k) => Number.isFinite(k));

    const rawSummary = (sessionSummary || data?.consultation?.summary || "").trim();
    const lower = rawSummary.toLowerCase();

    const hasNameFromSummary =
      /\b(?:marke\/thema|marke|markenname)\s*:\s*[^\n\r]{2,}/i.test(rawSummary) ||
      /\b(?:marke\/thema|marke|markenname)\s*:\s*(?:[^\n\r]*?)["'„“”‚‘’][^"'„“”‚‘’\n\r]{2,60}["'„“”‚‘’]/i.test(rawSummary);

    const hasClassFromSummary = /\bklasse(n)?\b[^\d]{0,8}\d{1,2}\b/i.test(rawSummary);
    const hasCountryFromSummary =
      /\b(usa|us|deutschland|de|österreich|at|schweiz|ch|eu|europa|europäische union)\b/i.test(lower);

    const hasName = hasNameFromDecisions || hasNameFromSummary;
    const hasCountries = hasCountriesFromDecisions || hasCountryFromSummary;
    const hasClasses = hasClassesFromDecisions || hasClassFromSummary;

    if (!hasName || !hasCountries || !hasClasses) return;
    if (autoCompleteBeratungAttemptedForCaseIdsRef.current.has(caseRecord.id)) return;

    autoCompleteBeratungAttemptedForCaseIdsRef.current.add(caseRecord.id);
    setStepUpdateError(null);
    setIsUpdatingStep("beratung");

    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/steps`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "beratung",
            status: "completed",
            metadata: {
              autoCompleted: true,
              autoCompletedFrom: d ? "decisions" : "summary_text",
              summaryMatched: Boolean(rawSummary),
              completedAtIso: new Date().toISOString(),
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
          setStepUpdateError(err.error || "Status konnte nicht gespeichert werden");
          return;
        }

        await mutate();
      } catch (e) {
        console.error("Failed to auto-complete beratung:", e);
        setStepUpdateError("Status konnte nicht gespeichert werden");
      } finally {
        setIsUpdatingStep(null);
      }
    })();
  }, [caseId, data?.case?.id, data?.consultation?.summary, data?.decisions, data?.steps?.beratung?.status, isUpdatingStep, mutate, sessionSummary]);

  useEffect(() => {
    setShowAllConflicts(false);
  }, [selectedAnalysisId]);

  const autoSaveSession = useCallback(async (strategy: "incremental" | "full" = "full") => {
    if (isSavingSessionRef.current) return;
    const messages = sessionMessagesRef.current;
    if (messages.length === 0) return;

    const currentPrevSummary = (sessionSummary || data?.consultation?.summary || "").trim();
    const deltaMessages = messages.slice(lastSummarySavedMessageCountRef.current);

    const effectiveStrategy: "incremental" | "full" =
      strategy === "incremental" && currentPrevSummary && deltaMessages.length > 0
        ? "incremental"
        : "full";

    if (
      effectiveStrategy === "full" &&
      messages.length === lastSummarySavedMessageCountRef.current &&
      sessionSummary
    ) {
      return;
    }
    
    isSavingSessionRef.current = true;
    setIsSavingSession(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          mode: "voice",
          summaryStrategy: effectiveStrategy,
          previousSummary: effectiveStrategy === "incremental" ? currentPrevSummary : undefined,
          deltaMessages: effectiveStrategy === "incremental" ? deltaMessages : undefined,
        })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        setSessionSummary(responseData.summary || "Zusammenfassung erstellt.");
        lastSummarySavedAtRef.current = Date.now();
        lastSummarySavedMessageCountRef.current = messages.length;
        mutate();
      }
    } catch (err) {
      console.error("Failed to auto-save session:", err);
    } finally {
      isSavingSessionRef.current = false;
      setIsSavingSession(false);
    }
  }, [caseId, data?.consultation?.summary, mutate, sessionSummary]);

  useEffect(() => {
    const messageCount = sessionMessages.length;
    if (messageCount === 0) return;

    const lastMessage = sessionMessages[messageCount - 1];
    const isAssistant = lastMessage?.role === "assistant";
    if (!isAssistant) return;

    const newMessagesSinceLastSave = messageCount - lastSummarySavedMessageCountRef.current;
    if (newMessagesSinceLastSave <= 0) return;

    if (summaryDebounceTimeoutRef.current) {
      clearTimeout(summaryDebounceTimeoutRef.current);
    }

    summaryDebounceTimeoutRef.current = setTimeout(() => {
      autoSaveSession("incremental");
    }, 1200);
  }, [autoSaveSession, sessionMessages]);

  useEffect(() => {
    return () => {
      if (summaryDebounceTimeoutRef.current) {
        clearTimeout(summaryDebounceTimeoutRef.current);
      }
    };
  }, []);

  const persistRechercheTransferChoice = useCallback(
    async (choice: "accepted" | "declined") => {
      if (!data?.case?.id) return;
      const currentStatus = (data?.steps?.recherche?.status || "pending") as any;
      const currentMeta = (data?.steps?.recherche?.metadata || {}) as Record<string, any>;
      const nextMeta: Record<string, any> = {
        ...currentMeta,
        transferFromBeratung: choice,
        transferFromBeratungAtIso: new Date().toISOString(),
      };

      const res = await fetch(`/api/cases/${caseId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "recherche", status: currentStatus, metadata: nextMeta }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        throw new Error(err.error || "Status konnte nicht gespeichert werden");
      }

      await mutate();
    },
    [caseId, data?.case?.id, data?.steps?.recherche?.metadata, data?.steps?.recherche?.status, mutate]
  );

  useEffect(() => {
    const prevAccordion = previousAccordionRef.current;
    if (prevAccordion === "beratung" && openAccordion !== "beratung") {
      if (summaryDebounceTimeoutRef.current) {
        clearTimeout(summaryDebounceTimeoutRef.current);
        summaryDebounceTimeoutRef.current = null;
      }
      autoSaveSession("full");
    }
    previousAccordionRef.current = openAccordion;
  }, [openAccordion, autoSaveSession]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionMessagesRef.current.length > 0) {
        navigator.sendBeacon(
          `/api/cases/${caseId}/consultation`,
          JSON.stringify({ messages: sessionMessagesRef.current, mode: "voice", summaryStrategy: "full" })
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
        lastSummarySavedAtRef.current = 0;
        lastSummarySavedMessageCountRef.current = 0;
        if (summaryDebounceTimeoutRef.current) {
          clearTimeout(summaryDebounceTimeoutRef.current);
          summaryDebounceTimeoutRef.current = null;
        }
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

  const saveRechercheForm = useCallback(async (): Promise<boolean> => {
    if (isSavingRechercheForm) return false;
    if (!data?.case?.id) return false;

    setRechercheFormSaveError(null);
    setIsSavingRechercheForm(true);

    try {
      const trademarkName = (rechercheForm.trademarkName || "").trim();
      const countries = (rechercheForm.countries || []).map((c) => String(c || "").trim()).filter(Boolean);
      const baseNiceClasses = (rechercheForm.niceClasses || []).filter((n) => Number.isFinite(n));
      const effectiveNiceClasses = getEffectiveNiceClasses(baseNiceClasses, !!rechercheForm.includeRelatedNiceClasses);

      if (!trademarkName || countries.length === 0 || baseNiceClasses.length === 0) {
        return false;
      }

      const saveRes = await fetch("/api/cases/save-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: data.case.id,
          trademarkName,
          countries,
          niceClasses: effectiveNiceClasses,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setRechercheFormSaveError(err.error || "Konnte nicht gespeichert werden");
        return false;
      }

      const currentStatus = (data?.steps?.recherche?.status || "pending") as any;
      const nextStatus = currentStatus === "pending" ? "in_progress" : currentStatus;
      const currentMeta = (data?.steps?.recherche?.metadata || {}) as Record<string, any>;

      const stepRes = await fetch(`/api/cases/${caseId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "recherche",
          status: nextStatus,
          trademarkName,
          metadata: {
            ...currentMeta,
            searchQuery: {
              trademarkName,
              countries,
              niceClasses: effectiveNiceClasses,
              baseNiceClasses,
              includeRelatedNiceClasses: !!rechercheForm.includeRelatedNiceClasses,
            },
            searchQueryUpdatedAtIso: new Date().toISOString(),
          },
        }),
      });

      if (!stepRes.ok) {
        const err = await stepRes.json().catch(() => ({ error: "Unbekannter Fehler" }));
        setRechercheFormSaveError(err.error || "Konnte nicht gespeichert werden");
        return false;
      }

      await mutate();
      return true;
    } catch (e) {
      console.error("Failed to save recherche form:", e);
      setRechercheFormSaveError("Konnte nicht gespeichert werden");
      return false;
    } finally {
      setIsSavingRechercheForm(false);
    }
  }, [caseId, data?.case?.id, data?.steps?.recherche?.metadata, data?.steps?.recherche?.status, getEffectiveNiceClasses, isSavingRechercheForm, mutate, rechercheForm]);

  const startRechercheFromForm = useCallback(async () => {
    if (isStartingRecherche || isSavingRechercheForm) return;
    setRechercheFormValidationAttempted(true);
    const ok = await saveRechercheForm();
    if (!ok) return;
    await startRecherche();
  }, [isSavingRechercheForm, isStartingRecherche, saveRechercheForm, startRecherche]);

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

  // KI-Logo Generator functions
  const refineLogoPrompt = useCallback(async () => {
    if (!logoPrompt.trim()) return;
    setIsRefiningPrompt(true);
    setLogoGenerationError(null);
    try {
      const isWordImageMark = trademarkType === "wort-bildmarke";
      const brandName = manualNameInput || "Marke";
      
      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Du bist ein Experte für Logo-Design und Markenentwicklung. Verfeinere den folgenden Prompt für die KI-Bildgenerierung eines ${isWordImageMark ? "Wort-/Bildmarke Logos (der Text '" + brandName + "' muss im Bild enthalten sein)" : "reinen Bildmarke Logos (kein Text im Bild)"}. Mache den Prompt präziser, detaillierter und besser für die Bildgenerierung geeignet. Antworte NUR mit dem verbesserten Prompt, ohne Erklärungen.`
            },
            {
              role: "user",
              content: logoPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error("Prompt-Verfeinerung fehlgeschlagen");
      }

      const result = await response.json();
      const refinedPrompt = result.content || result.message?.content || logoPrompt;
      setLogoPrompt(refinedPrompt);
    } catch (e) {
      console.error("Failed to refine prompt:", e);
      setLogoGenerationError("Prompt konnte nicht verfeinert werden");
    } finally {
      setIsRefiningPrompt(false);
    }
  }, [logoPrompt, trademarkType, manualNameInput]);

  const generateLogo = useCallback(async () => {
    if (!logoPrompt.trim()) {
      setLogoGenerationError("Bitte gib einen Prompt ein");
      return;
    }
    setIsGeneratingLogo(true);
    setLogoGenerationError(null);
    try {
      const isWordImageMark = trademarkType === "wort-bildmarke";
      const brandName = manualNameInput || "Marke";
      
      // Build the final prompt with trademark type context
      let finalPrompt = logoPrompt;
      if (isWordImageMark) {
        finalPrompt = `Logo design with the text "${brandName}" prominently displayed. ${logoPrompt}. The text "${brandName}" must be clearly visible and integrated into the design.`;
      } else {
        finalPrompt = `Abstract logo design without any text. ${logoPrompt}. Pure visual symbol, no letters or words.`;
      }

      // Call image generation API (placeholder - will be replaced with actual API)
      const response = await fetch("/api/generate-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          trademarkType,
          brandName: isWordImageMark ? brandName : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Bildgenerierung fehlgeschlagen" }));
        throw new Error(err.error || "Bildgenerierung fehlgeschlagen");
      }

      const result = await response.json();
      if (result.imageUrl) {
        setTrademarkImageUrl(result.imageUrl);
        setShowLogoGeneratorModal(false);
        setLogoPrompt("");
      } else {
        throw new Error("Kein Bild generiert");
      }
    } catch (e: any) {
      console.error("Failed to generate logo:", e);
      setLogoGenerationError(e.message || "Logo-Generierung fehlgeschlagen");
    } finally {
      setIsGeneratingLogo(false);
    }
  }, [logoPrompt, trademarkType, manualNameInput]);

  // Auto-generate logo prompt based on brand name
  const autoGenerateLogoPrompt = useCallback(async () => {
    const brandName = manualNameInput || "Marke";
    setIsAutoGeneratingPrompt(true);
    setLogoGenerationError(null);
    try {
      const isWordImageMark = trademarkType === "wort-bildmarke";
      
      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Du bist ein kreativer Logo-Designer. Erstelle einen detaillierten Prompt für die KI-Bildgenerierung eines ${isWordImageMark ? "Wort-/Bildmarke Logos (der Text muss im Bild enthalten sein)" : "reinen Bildmarke Logos (kein Text, nur Symbol)"}. Der Prompt soll kreativ, modern und professionell sein. Antworte NUR mit dem Prompt, ohne Erklärungen.`
            },
            {
              role: "user",
              content: `Erstelle einen Logo-Generierungs-Prompt für die Marke "${brandName}". Das Logo soll professionell, einprägsam und modern sein.`
            }
          ],
          temperature: 0.8,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        throw new Error("Prompt-Generierung fehlgeschlagen");
      }

      const result = await response.json();
      const generatedPrompt = result.content || result.message?.content || "";
      setLogoPrompt(generatedPrompt);
    } catch (e) {
      console.error("Failed to auto-generate prompt:", e);
      setLogoGenerationError("Automatische Prompt-Generierung fehlgeschlagen");
    } finally {
      setIsAutoGeneratingPrompt(false);
    }
  }, [trademarkType, manualNameInput]);

  // Analyze reference image and generate description
  const analyzeReferenceImage = useCallback(async (imageDataUrl: string) => {
    setIsAnalyzingReference(true);
    setLogoGenerationError(null);
    try {
      const isWordImageMark = trademarkType === "wort-bildmarke";
      const brandName = manualNameInput || "Marke";
      
      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Du bist ein Experte für Logo-Analyse und -Design. Analysiere das hochgeladene Referenzbild und erstelle einen detaillierten Prompt für die Generierung eines ähnlichen Logos für die Marke "${brandName}". ${isWordImageMark ? "Das neue Logo soll den Text '" + brandName + "' enthalten." : "Das neue Logo soll ein reines Symbol ohne Text sein."} Beschreibe Stil, Farben, Formen und Konzept. Antworte NUR mit dem Prompt, ohne Erklärungen.`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageDataUrl }
                },
                {
                  type: "text",
                  text: "Analysiere dieses Referenzbild und erstelle einen Prompt für ein ähnliches Logo."
                }
              ]
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error("Bildanalyse fehlgeschlagen");
      }

      const result = await response.json();
      const analysisPrompt = result.content || result.message?.content || "";
      setLogoPrompt(analysisPrompt);
    } catch (e) {
      console.error("Failed to analyze reference image:", e);
      setLogoGenerationError("Referenzbild-Analyse fehlgeschlagen");
    } finally {
      setIsAnalyzingReference(false);
    }
  }, [trademarkType, manualNameInput]);

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
        setManualQuickCheck(null);
        setNameSuggestions([]);

        const applied = (name || "").trim();
        if (applied) {
          setMarkennameInput(applied);
          setMarkennameTouched(false);
        }

        await mutate();

        if (sessionMessagesRef.current.length > 0) {
          try {
            const res2 = await fetch(`/api/cases/${caseId}/consultation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: sessionMessagesRef.current,
                mode: "voice",
                summaryStrategy: "full",
              }),
            });
            if (res2.ok) {
              const responseData2 = await res2.json().catch(() => null);
              if (responseData2?.summary) {
                setSessionSummary(String(responseData2.summary));
              }
              await mutate();
            }
          } catch (e) {
            console.warn("Failed to rewrite consultation summary after trademark name change:", e);
          }
        }
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

  const { case: caseInfo, consultation, decisions, analysis, steps } = data;
  const activeAnalysis = selectedAnalysisResponse?.analysis || analysis;

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
    lines.push(`- <RiskLevelTooltip>Risiko-Level</RiskLevelTooltip>: ${activeAnalysis.riskLevel?.toUpperCase?.() || activeAnalysis.riskLevel || "-"}`);
    lines.push(`- <RiskScoreTooltip>Risiko-Score</RiskScoreTooltip>: ${typeof activeAnalysis.riskScore === "number" ? `${activeAnalysis.riskScore}%` : "-"}`);
    lines.push(`- <ConflictsTooltip>Konflikte</ConflictsTooltip>: ${(activeAnalysis.conflicts || []).length}`);
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

    lines.push("<AlternativeNamesTooltip>Alternative Namen</AlternativeNamesTooltip>");
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
        return "bg-primary text-white";
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
            previousSummary={(sessionSummary || consultation?.summary) || undefined}
            onDelete={handleDeleteConsultation}
          />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Schnellfragen</div>
                  <div className="text-xs text-white/85 truncate">Häufige Fragen, sofort beantwortet</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Sitzungszusammenfassung</div>
                  <div className="text-xs text-white/85 truncate">Automatisch aus dem Gespräch</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar p-4">
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

    const baseNiceClasses = Array.from(
      new Set((rechercheForm.niceClasses || []).filter((n) => Number.isFinite(n)).map((n) => Math.max(1, Math.min(45, Math.floor(n)))))
    ).sort((a, b) => a - b);
    const isAllClassesSelected = baseNiceClasses.length === 45;
    const relatedClasses = !isAllClassesSelected && rechercheForm.includeRelatedNiceClasses ? getRelatedNiceClasses(baseNiceClasses) : [];
    const trademarkNameMissing = rechercheFormValidationAttempted && !(rechercheForm.trademarkName || "").trim();
    const countriesMissing = rechercheFormValidationAttempted && (rechercheForm.countries || []).length === 0;
    const classesMissing =
      rechercheFormValidationAttempted && (rechercheForm.niceClasses || []).filter((n) => Number.isFinite(n)).length === 0;

    const hasValidationErrors = trademarkNameMissing || countriesMissing || classesMissing;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:min-h-[400px] flex flex-col">
        {/* Header Banner */}
        <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">Recherche</div>
              <div className="text-xs text-white/85 truncate">Markenrecherche starten</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="space-y-6">
            {/* Validation Info Box */}
            {(hasValidationErrors || (!rechercheForm.trademarkName && rechercheForm.countries.length === 0 && baseNiceClasses.length === 0)) && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-teal-800 mb-2">Bitte füllen Sie alle Felder aus:</div>
                    <ul className="space-y-1">
                      <li className={`flex items-center gap-2 text-sm ${trademarkNameMissing || !rechercheForm.trademarkName ? "text-teal-700" : "text-teal-600"}`}>
                        {rechercheForm.trademarkName ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-teal-400" />
                        )}
                        <span>Markenname eingeben</span>
                      </li>
                      <li className={`flex items-center gap-2 text-sm ${countriesMissing || rechercheForm.countries.length === 0 ? "text-teal-700" : "text-teal-600"}`}>
                        {rechercheForm.countries.length > 0 ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-teal-400" />
                        )}
                        <span>Mindestens ein Land / Register auswählen</span>
                      </li>
                      <li className={`flex items-center gap-2 text-sm ${classesMissing || baseNiceClasses.length === 0 ? "text-teal-700" : "text-teal-600"}`}>
                        {baseNiceClasses.length > 0 ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-teal-400" />
                        )}
                        <span>Mindestens eine Nizza-Klasse auswählen</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {rechercheFormSaveError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {rechercheFormSaveError}
              </div>
            )}

            {/* Markenname Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Markenname</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={rechercheForm.trademarkName}
                  onChange={(e) => setRechercheForm((prev) => ({ ...prev, trademarkName: e.target.value }))}
                  placeholder="z.B. TechFlow, BrandX..."
                  className={`w-full h-11 pl-10 pr-4 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition-all ${
                    trademarkNameMissing
                      ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                      : "border-gray-200 focus:ring-gray-100 focus:border-gray-300"
                  }`}
                />
              </div>
            </div>

            {/* Two Column Dropdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Countries Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Länder / Register</label>
                <button
                  type="button"
                  onClick={() => setCountriesOpen(true)}
                  className={`w-full h-11 px-4 border rounded-lg text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 transition-all ${
                    countriesMissing
                      ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                      : "border-gray-200 focus:ring-teal-100 focus:border-teal-300 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className={`truncate ${rechercheForm.countries.length ? "text-gray-900" : "text-gray-400"}`}>
                      {rechercheForm.countries.length 
                        ? `${rechercheForm.countries.length} ausgewählt` 
                        : "Länder / Register auswählen"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {rechercheForm.countries.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rechercheForm.countries.slice(0, 5).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-md font-medium border border-teal-200"
                      >
                        {c}
                        <button
                          type="button"
                          className="text-teal-500 hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechercheForm((prev) => ({
                              ...prev,
                              countries: prev.countries.filter((x) => x !== c),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {rechercheForm.countries.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                        +{rechercheForm.countries.length - 5} weitere
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Nizza Classes Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nizza-Klassifikation</label>
                <button
                  type="button"
                  onClick={() => setClassesOpen(true)}
                  className={`w-full h-11 px-4 border rounded-lg text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 transition-all ${
                    classesMissing
                      ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                      : "border-gray-200 focus:ring-teal-100 focus:border-teal-300 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className={`truncate ${baseNiceClasses.length ? "text-gray-900" : "text-gray-400"}`}>
                      {baseNiceClasses.length 
                        ? (isAllClassesSelected ? "Alle Klassen" : `${baseNiceClasses.length} Klassen ausgewählt`)
                        : "Nizza-Klassen auswählen"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {baseNiceClasses.length > 0 && !isAllClassesSelected && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {baseNiceClasses.slice(0, 8).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-md font-medium border border-teal-200"
                      >
                        Klasse {c}
                        <button
                          type="button"
                          className="text-teal-500 hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechercheForm((prev) => ({
                              ...prev,
                              niceClasses: (prev.niceClasses || []).filter((x) => Number(x) !== c),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {baseNiceClasses.length > 8 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                        +{baseNiceClasses.length - 8} weitere
                      </span>
                    )}
                  </div>
                )}

                {/* Related Classes Checkbox */}
                {baseNiceClasses.length > 0 && !isAllClassesSelected && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!rechercheForm.includeRelatedNiceClasses}
                        onChange={(e) => setRechercheForm((prev) => ({ ...prev, includeRelatedNiceClasses: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-700">Auch verwandte Klassen prüfen</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">empfohlen</span>
                    </label>
                    
                    {rechercheForm.includeRelatedNiceClasses && relatedClasses.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Verwandt:</span>
                          {relatedClasses.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded border border-amber-200 font-medium"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-2">
                          Findet Konflikte in Klassen mit typischen Überschneidungen bei Waren/Dienstleistungen
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Markenart Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Markenart</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "wortmarke", label: "Wortmarke" },
                  { value: "wort-bildmarke", label: "Wort-/Bildmarke" },
                  { value: "bildmarke", label: "Bildmarke" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTrademarkType(type.value as "wortmarke" | "wort-bildmarke" | "bildmarke")}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      trademarkType === type.value
                        ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${trademarkType === type.value ? "text-teal-700" : "text-gray-800"}`}>
                      {type.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {rechercheStartError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{rechercheStartError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Button */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => void startRechercheFromForm()}
            disabled={isSavingRechercheForm || isStartingRecherche}
            className="w-full py-3.5 px-4 s-gradient-button text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSavingRechercheForm ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Speichere...</span>
              </>
            ) : isStartingRecherche ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Starte Recherche...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Recherche starten</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderMarkennameContent = () => {
    return (
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setMarkennameTab("markenname")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              markennameTab === "markenname"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Markenname
          </button>
          <button
            type="button"
            onClick={() => setMarkennameTab("generator")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              markennameTab === "generator"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Markengenerator
          </button>
        </div>

        {/* Tab 1: Markenname */}
        {markennameTab === "markenname" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Input Area */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Markenname</div>
                      <div className="text-xs text-white/85 truncate">Name und Markenart festlegen</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <div className="p-4 flex flex-col gap-4">
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-teal-700 mb-2">Übernommener Name aus Beratung</div>
                      <input
                        type="text"
                        value={manualNameInput}
                        onChange={(e) => setManualNameInput(e.target.value)}
                        placeholder="Markenname eingeben"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                      />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Markenart</div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="trademarkType"
                            value="wortmarke"
                            checked={trademarkType === "wortmarke"}
                            onChange={(e) => setTrademarkType(e.target.value as any)}
                            className="w-4 h-4 text-gray-600 focus:ring-2 focus:ring-gray-200 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">Wortmarke</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="trademarkType"
                            value="wort-bildmarke"
                            checked={trademarkType === "wort-bildmarke"}
                            onChange={(e) => setTrademarkType(e.target.value as any)}
                            className="w-4 h-4 text-gray-600 focus:ring-2 focus:ring-gray-200 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">Wort-/Bildmarke</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="trademarkType"
                            value="bildmarke"
                            checked={trademarkType === "bildmarke"}
                            onChange={(e) => setTrademarkType(e.target.value as any)}
                            className="w-4 h-4 text-gray-600 focus:ring-2 focus:ring-gray-200 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">Bildmarke</span>
                        </label>
                      </div>
                    </div>

                    {(trademarkType === "wort-bildmarke" || trademarkType === "bildmarke") && (
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          {trademarkType === "bildmarke" ? "Bildmarke hochladen" : "Logo/Bildanteil"}
                        </div>
                        
                        {imageUploadError && (
                          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                            {imageUploadError}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  setImageUploadError("Datei zu groß (max. 5 MB)");
                                  return;
                                }
                                setImageUploadError(null);
                                setTrademarkImageFile(file);
                                const url = URL.createObjectURL(file);
                                setTrademarkImageUrl(url);
                              }}
                              className="hidden"
                              id="trademark-image-upload"
                            />
                            <div className="cursor-pointer px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 text-center transition-colors">
                              Bild hochladen (.png, .jpg, .svg)
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowLogoGeneratorModal(true)}
                            className="w-full px-4 py-3 s-gradient-button text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            KI-Logo generieren
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Marke gespeichert:\nName: ${manualNameInput}\nTyp: ${trademarkType}`);
                    }}
                    disabled={!manualNameInput.trim()}
                    className="w-full py-3 px-4 s-gradient-button text-sm rounded-lg transition-colors"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Large Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Vorschau</div>
                      <div className="text-xs text-white/85 truncate">
                        {trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex items-center justify-center p-8 bg-gray-50">
                  <div className="text-center">
                    {trademarkType === "wortmarke" && (
                      <div className="text-5xl font-bold text-gray-900">
                        {manualNameInput || "Markenname"}
                      </div>
                    )}

                    {trademarkType === "bildmarke" && (
                      <>
                        {trademarkImageUrl ? (
                          <img
                            src={trademarkImageUrl}
                            alt="Bildmarke preview"
                            className="max-w-full max-h-80 object-contain mx-auto"
                          />
                        ) : (
                          <div className="text-gray-400 text-lg">
                            Bild hochladen um Vorschau zu sehen
                          </div>
                        )}
                      </>
                    )}

                    {trademarkType === "wort-bildmarke" && (
                      <div className="flex flex-col items-center gap-4">
                        {trademarkImageUrl ? (
                          <img
                            src={trademarkImageUrl}
                            alt="Logo preview"
                            className="max-w-full max-h-48 object-contain"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            Logo fehlt
                          </div>
                        )}
                        <div className="text-4xl font-bold text-gray-900">
                          {manualNameInput || "Markenname"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Markengenerator */}
        {markennameTab === "generator" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Generator */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Marken-Generator</div>
                      <div className="text-xs text-white/85 truncate">KI-gestützte Namensvorschläge</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
                  {/* Settings Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stil & Keywords</span>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {(["similar", "modern", "creative", "serious"] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setGeneratorStyle(style)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              generatorStyle === style
                                ? "bg-teal-600 text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50"
                            }`}
                          >
                            {style === "similar" ? "Ähnlich" : style === "modern" ? "Modern" : style === "creative" ? "Kreativ" : "Seriös"}
                          </button>
                        ))}
                      </div>
                      <input
                        value={generatorKeywords}
                        onChange={(e) => setGeneratorKeywords(e.target.value)}
                        placeholder="Keywords eingeben (optional)"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all"
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    type="button"
                    onClick={generateSuggestions}
                    disabled={isGeneratingNames || !manualNameInput.trim()}
                    className="w-full py-3.5 px-4 s-gradient-button text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingNames ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generiere Vorschläge...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Vorschläge generieren</span>
                      </>
                    )}
                  </button>

                  {nameGenError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{nameGenError}</span>
                    </div>
                  )}

                  {/* Suggestions Section */}
                  <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Vorschläge
                        </span>
                        {nameSuggestions.length > 0 && (
                          <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                            {nameSuggestions.length} Namen
                          </span>
                        )}
                      </div>
                    </div>
                    {nameSuggestions.length > 0 ? (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
                        <div className="space-y-1.5">
                          {nameSuggestions.map((s) => {
                            const isInShortlist = shortlist.some((x) => x.name === s.name);
                            return (
                              <div
                                key={s.name}
                                className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
                                  isInShortlist
                                    ? "bg-teal-50 border border-teal-200"
                                    : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm text-gray-900">{s.name}</div>
                                  {s.explanation && (
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.explanation}</div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isInShortlist) return;
                                    setShortlist((prev) => [
                                      {
                                        name: s.name,
                                        riskLevel: "unknown" as const,
                                        riskScore: 0,
                                        conflicts: 0,
                                        criticalCount: 0,
                                      },
                                      ...prev,
                                    ].slice(0, 10));
                                  }}
                                  disabled={isInShortlist}
                                  className={`ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isInShortlist
                                      ? "bg-teal-100 text-teal-600 cursor-default"
                                      : "bg-white border border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 shadow-sm"
                                  }`}
                                >
                                  {isInShortlist ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Hinzugefügt</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Zur Shortlist</span>
                                      <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <Sparkles className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="text-sm font-medium text-gray-600 mb-1">Keine Vorschläge</div>
                        <div className="text-xs text-gray-400">
                          Klicke auf „Vorschläge generieren" um KI-basierte Namensideen zu erhalten
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Shortlist */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Shortlist</div>
                      <div className="text-xs text-white/85 truncate">Ausgewählte Namen prüfen</div>
                    </div>
                  </div>
                  {shortlist.length > 0 && (
                    <span className="text-xs font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                      {shortlist.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                  {shortlist.length > 0 ? (
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3">
                      <div className="space-y-2">
                        {shortlist.map((item) => (
                          <div
                            key={item.name}
                            className={`p-3 rounded-lg border transition-all ${
                              item.riskLevel === "low"
                                ? "bg-green-50 border-green-200"
                                : item.riskLevel === "medium"
                                ? "bg-orange-50 border-orange-200"
                                : item.riskLevel === "high"
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="font-medium text-sm text-gray-900">{item.name}</div>
                              <button
                                type="button"
                                onClick={() => setShortlist((prev) => prev.filter((x) => x.name !== item.name))}
                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.riskLevel === "unknown" ? (
                                <button
                                  type="button"
                                  onClick={() => quickCheckName(item.name)}
                                  disabled={isCheckingManualName}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-600 text-white rounded-md text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                                >
                                  {isCheckingManualName ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>Prüfe...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-3 h-3" />
                                      <span>Quick-Check</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <>
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                      item.riskLevel === "low"
                                        ? "bg-green-100 text-green-700"
                                        : item.riskLevel === "medium"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {item.riskLevel === "low" ? "✓ Niedriges Risiko" : item.riskLevel === "medium" ? "⚠ Mittleres Risiko" : "✕ Hohes Risiko"}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {item.riskScore}% · {item.conflicts} Konflikte
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <CheckCircle className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Shortlist leer</div>
                      <div className="text-xs text-gray-400 max-w-[200px]">
                        Füge Namen aus dem Generator hinzu oder gib sie unten manuell ein
                      </div>
                    </div>
                  )}

                  {/* Manual Add Section */}
                  <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Name manuell eingeben..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            const name = input.value.trim();
                            if (!name) return;
                            if (shortlist.some((x) => x.name === name)) return;
                            setShortlist((prev) => [
                              {
                                name,
                                riskLevel: "unknown" as const,
                                riskScore: 0,
                                conflicts: 0,
                                criticalCount: 0,
                              },
                              ...prev,
                            ].slice(0, 10));
                            input.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const name = input?.value?.trim();
                          if (!name) return;
                          if (shortlist.some((x) => x.name === name)) return;
                          setShortlist((prev) => [
                            {
                              name,
                              riskLevel: "unknown" as const,
                              riskScore: 0,
                              conflicts: 0,
                              criticalCount: 0,
                            },
                              ...prev,
                            ].slice(0, 10));
                            input.value = "";
                          }}
                          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors font-medium"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  {/* Footer with Research Button */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        {shortlist.filter((s) => s.riskLevel !== "unknown").length} von {shortlist.length} geprüft
                      </span>
                      {shortlist.length > 0 && shortlist.every((s) => s.riskLevel !== "unknown") && (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Alle geprüft
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenAccordion("recherche")}
                      disabled={shortlist.length === 0}
                      className="w-full py-3 px-4 s-gradient-button text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>Zur Recherche</span>
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                  </div>
                </div>
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
              badgeColor: "bg-red-100 text-red-700 border-red-300",
              bgColor: "bg-red-50",
              borderColor: "border-red-200",
              titleColor: "text-red-900",
              subtitleColor: "text-red-700",
            }
          : decisionTier === "adjust"
          ? {
              title: "Mit Anpassungen empfohlen",
              subtitle: "Mittleres Risiko – Konflikte prüfen und Parameter optimieren.",
              badge: "GO MIT ANPASSUNG",
              badgeColor: "bg-orange-100 text-orange-700 border-orange-300",
              bgColor: "bg-orange-50",
              borderColor: "border-orange-200",
              titleColor: "text-orange-900",
              subtitleColor: "text-orange-700",
            }
          : {
              title: "Anmeldung wahrscheinlich sinnvoll",
              subtitle: "Geringes Risiko – trotzdem Ergebnisse kurz prüfen.",
              badge: "GO",
              badgeColor: "bg-teal-100 text-teal-700 border-teal-300",
              bgColor: "bg-teal-50",
              borderColor: "border-teal-200",
              titleColor: "text-teal-900",
              subtitleColor: "text-teal-700",
            };

      const decisionReason =
        conflictCount === 0
          ? "Keine relevanten Konflikte gefunden."
          : `Stärkster Treffer: ${mostSimilarConflict?.name || "-"}${mostSimilarConflict?.register ? ` (${mostSimilarConflict.register})` : ""} – ${conflictCount} Konflikt${conflictCount === 1 ? "" : "e"} insgesamt.`;

      const riskLevelLabel = effectiveRiskLevel === "high" ? "Hohes Risiko" : effectiveRiskLevel === "medium" ? "Mittleres Risiko" : "Geringes Risiko";
      const riskLevelColor = effectiveRiskLevel === "high" ? "text-red-600" : effectiveRiskLevel === "medium" ? "text-orange-600" : "text-teal-600";
      
      return (
        <div className="space-y-6">
          {/* Three Widget Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget 1: Risk Overview */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Kollisionsrisiko</div>
                      <div className="text-xs text-white/85 truncate">Gesamtbewertung</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
                  {/* Decision Badge */}
                  <div className={`p-4 rounded-lg border ${decisionConfig.bgColor} ${decisionConfig.borderColor} mb-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${decisionConfig.badgeColor}`}>
                        {decisionConfig.badge}
                      </span>
                      <span className="text-xs text-gray-500">Risiko: {effectiveRiskScore}%</span>
                    </div>
                    <div className={`text-base font-semibold ${decisionConfig.titleColor}`}>{decisionConfig.title}</div>
                    <div className={`text-sm mt-1 ${decisionConfig.subtitleColor}`}>{decisionConfig.subtitle}</div>
                    <div className="text-xs text-gray-600 mt-2">{decisionReason}</div>
                  </div>

                  {/* Risk Circle and Stats */}
                  <div className="flex items-center gap-6">
                    <AnimatedRiskScore
                      score={effectiveRiskScore}
                      risk={effectiveRiskLevel}
                      size="large"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Konflikte gefunden</div>
                      <div className="text-3xl font-bold text-gray-900">{conflictCount}</div>
                      <p className="text-sm text-gray-600 mt-2">
                        {effectiveRiskLevel === "high" 
                          ? "Es wurden kritische Konflikte identifiziert."
                          : effectiveRiskLevel === "medium"
                          ? "Es gibt potenzielle Risiken zu beachten."
                          : "Geringe Konfliktwahrscheinlichkeit."}
                      </p>
                    </div>
                  </div>

                  <div className={`text-center mt-4 text-sm font-semibold ${riskLevelColor}`}>
                    {riskLevelLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: KI-Analyse */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">KI-Analyse</div>
                      <div className="text-xs text-white/85 truncate">Kurzfazit + Details</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 p-5 overflow-y-auto custom-scrollbar">
                  {activeAnalysis.aiAnalysis ? (
                    <>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                        <div className="text-xs font-semibold text-gray-700 mb-3">Executive Summary</div>
                        <ul className="text-sm text-gray-700 space-y-2">
                          {activeAnalysis.aiAnalysis.nameAnalysis && (
                            <li className="flex items-start gap-2">
                              <span className="text-teal-500 mt-0.5">•</span>
                              <span><span className="font-medium">Namens-Check:</span> {activeAnalysis.aiAnalysis.nameAnalysis.slice(0, 120)}{activeAnalysis.aiAnalysis.nameAnalysis.length > 120 ? "…" : ""}</span>
                            </li>
                          )}
                          {activeAnalysis.aiAnalysis.riskAssessment && (
                            <li className="flex items-start gap-2">
                              <span className="text-teal-500 mt-0.5">•</span>
                              <span><span className="font-medium">Risiko:</span> {activeAnalysis.aiAnalysis.riskAssessment.slice(0, 120)}{activeAnalysis.aiAnalysis.riskAssessment.length > 120 ? "…" : ""}</span>
                            </li>
                          )}
                          {activeAnalysis.aiAnalysis.recommendation && (
                            <li className="flex items-start gap-2">
                              <span className="text-teal-500 mt-0.5">•</span>
                              <span><span className="font-medium">Empfehlung:</span> {activeAnalysis.aiAnalysis.recommendation.slice(0, 120)}{activeAnalysis.aiAnalysis.recommendation.length > 120 ? "…" : ""}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <button
                        onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                        className="w-full text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors flex items-center justify-center gap-1 py-2"
                      >
                        {showFullAnalysis ? "Details ausblenden" : "Details anzeigen"}
                        {showFullAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

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
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Keine KI-Analyse verfügbar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Widget 3: Konfliktliste */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Gefundene Konflikte</div>
                      <div className="text-xs text-white/85 truncate">{conflictCount} Treffer</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
                  {sortedConflicts.length > 0 ? (
                    <div className="space-y-3">
                      {sortedConflicts.map((conflict, idx) => {
                        const accuracy = conflict.accuracy || 0;
                        const riskColor = accuracy >= 80 ? "text-red-600" : accuracy >= 60 ? "text-orange-600" : "text-teal-600";
                        const riskBg = accuracy >= 80 ? "bg-red-50" : accuracy >= 60 ? "bg-orange-50" : "bg-teal-50";
                        
                        return (
                          <button
                            key={conflict.id || idx}
                            onClick={() => setSelectedConflict(conflict)}
                            className={`w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${riskBg}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="font-semibold text-gray-900 truncate">{conflict.name}</div>
                              <span className={`text-sm font-bold ${riskColor}`}>{accuracy}%</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {conflict.register && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                  {conflict.register}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                                {conflict.status || "Unbekannt"}
                              </span>
                              {conflict.isFamousMark && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                                  Bekannte Marke
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Check className="w-10 h-10 mx-auto mb-3 text-teal-400" />
                      <p className="text-sm text-teal-600 font-medium">Keine Konflikte gefunden</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setMarkennameTab("generator");
                setOpenAccordion("markenname");
                window.location.hash = "#markenname";
              }}
              className="px-6 py-3 s-gradient-button text-sm font-semibold"
            >
              Alternative Namen prüfen
            </button>
            <button
              onClick={() => setOpenAccordion("recherche")}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Klassen/Länder anpassen
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6 text-lg">
          Noch keine Analyse durchgeführt
        </p>
        <button
          onClick={() => setOpenAccordion("recherche")}
          className="px-8 py-3 s-gradient-button text-sm font-semibold"
        >
          Recherche starten
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

  const bannerSteps = [
    { hash: "beratung", label: "Beratung", stepId: "beratung" as WorkflowStepId, icon: Mic },
    { hash: "recherche", label: "Recherche", stepId: "recherche" as WorkflowStepId, icon: Search },
    { hash: "ueberpruefung", label: "Überprüfung", stepId: "ueberpruefung" as WorkflowStepId, icon: CheckCircle },
    { hash: "anmeldung", label: "Anmeldung", stepId: "anmeldung" as WorkflowStepId, icon: FileText },
    { hash: "kommunikation", label: "Kommunikation", stepId: "kommunikation" as WorkflowStepId, icon: Mail },
    { hash: "ueberwachung", label: "Überwachung", stepId: "ueberwachung" as WorkflowStepId, icon: Eye },
    { hash: "fristen", label: "Fristen", stepId: "fristen" as WorkflowStepId, icon: Calendar },
  ] as const;

  const bannerStatuses = bannerSteps.map((s) => getStepStatus(s.stepId).status);
  const firstInProgressIndex = bannerStatuses.findIndex((s) => s === "in_progress");
  const lastDoneIndex = bannerStatuses.reduce((acc, s, idx) => {
    if (s === "completed" || s === "skipped") return idx;
    return acc;
  }, -1);
  const progressIndex = firstInProgressIndex !== -1 ? firstInProgressIndex : Math.max(0, lastDoneIndex);
  const progressPercent = bannerSteps.length > 1 ? (progressIndex / (bannerSteps.length - 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="sticky top-0 z-40 bg-gray-50 pt-2 pb-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {caseInfo.trademarkName || "Unbenannter Fall"}
                  </h1>
                </div>
                <p className="text-gray-500 font-mono text-sm">{caseInfo.caseNumber}</p>
              </div>

              <div className="sm:flex-1 sm:px-6">
                <div className="relative h-14">
                  <div className="absolute left-4 right-4 top-4 h-px bg-gray-300 rounded">
                    <div className="h-px bg-primary rounded" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="relative flex items-start justify-between">
                    {bannerSteps.map((s) => {
                      const status = getStepStatus(s.stepId).status;
                      const isCompleted = status === "completed";
                      const isSkipped = status === "skipped";
                      const isActive = status === "in_progress";

                      const Icon = s.icon;

                      const circleClass = isCompleted
                        ? "bg-primary border-primary text-white shadow-sm"
                        : isActive
                          ? "bg-white border-primary text-primary ring-2 ring-primary/15 shadow-sm"
                          : isSkipped
                            ? "bg-gray-100 border-gray-300 text-gray-500 group-hover:border-gray-400 group-hover:text-gray-600"
                            : "bg-white border-gray-300 text-gray-500 group-hover:border-gray-400 group-hover:text-gray-600";

                      const labelClass = isCompleted
                        ? "text-primary"
                        : isActive
                          ? "text-gray-900"
                          : isSkipped
                            ? "text-gray-500"
                            : "text-gray-500";

                      return (
                        <button
                          key={s.hash}
                          type="button"
                          onClick={() => {
                            window.location.hash = `#${s.hash}`;

                            if (s.stepId === "beratung") {
                              setOpenAccordion("beratung");
                              setTimeout(() => {
                                voiceAssistantRef.current?.startSession("voice");
                              }, 100);
                            }
                          }}
                          className="group relative min-w-[68px] flex flex-col items-center"
                        >
                          <span
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${circleClass}`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>

                          <span className={`mt-1 text-[11px] font-medium leading-tight ${labelClass}`}>
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${getStatusBadge(caseInfo.status)}`}>
                  {getStatusLabel(caseInfo.status)}
                </span>
                <div className="text-xs text-gray-500 whitespace-nowrap mt-2">
                  Erstellt: {formatGermanDate(caseInfo.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {WORKFLOW_STEPS.map((step) => (
            <AccordionSection
              key={step.id}
              stepId={step.id}
              title={step.title}
              icon={step.icon}
              isCompleted={isStepComplete(step.id)}
              status={getStepStatus(step.id).status}
              isOpen={openAccordion === step.id}
              onToggle={() => handleToggleAccordion(step.id)}
              headerMeta={step.id === "beratung" ? renderBeratungHeaderMeta() : undefined}
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

        {showTransferModal && (
          <div
            className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-4"
            onClick={() => {
              setShowTransferModal(false);
              setPendingTransferHash(null);
              window.location.hash = "#beratung";
            }}
          >
            <div
              className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100">
                <div className="text-lg font-semibold text-gray-900">Daten übernehmen?</div>
                <div className="text-sm text-gray-600 mt-1">
                  Aus der Beratung wurden Markenname, Länder oder Klassen erkannt. Möchtest du diese Daten in die Recherche übernehmen?
                </div>
              </div>
              <div className="p-5 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setShowTransferModal(false);
                    setPendingTransferHash(null);
                    window.location.hash = "#beratung";
                  }}
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setRechercheForm({ trademarkName: "", countries: [], niceClasses: [], includeRelatedNiceClasses: true });
                    void persistRechercheTransferChoice("declined")
                      .catch((e) => console.warn("Failed to persist transfer choice:", e))
                      .finally(() => {
                        setShowTransferModal(false);
                        setPendingTransferHash(null);
                        setOpenAccordion("recherche");
                        window.location.hash = "#recherche";
                      });
                  }}
                >
                  Neu starten
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg s-gradient-button"
                  onClick={() => {
                    void persistRechercheTransferChoice("accepted")
                      .catch((e) => console.warn("Failed to persist transfer choice:", e))
                      .finally(() => {
                        setShowTransferModal(false);
                        setPendingTransferHash(null);
                        setOpenAccordion("recherche");
                        window.location.hash = `#${pendingTransferHash || "recherche"}`;
                      });
                  }}
                >
                  Übernehmen
                </button>
              </div>
            </div>
          </div>
        )}

        {countriesOpen && (
          <div
            className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-4"
            onClick={() => {
              setCountriesOpen(false);
              setCountriesSearch("");
            }}
          >
            <div
              className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden h-[70vh] max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">Länder auswählen</div>
                  <div className="text-xs text-gray-500">Mehrfachauswahl möglich · Änderungen werden automatisch übernommen</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => {
                    setCountriesOpen(false);
                    setCountriesSearch("");
                  }}
                >
                  Schließen
                </button>
              </div>

              <div className="p-4 border-b border-gray-100">
                <input
                  value={countriesSearch}
                  onChange={(e) => setCountriesSearch(e.target.value)}
                  placeholder="Suchen: Name, Kürzel (DE) oder Nummer (276)"
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-gray-300 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="flex-1 overflow-auto">
                {COUNTRY_OPTIONS.filter((opt) => {
                  const q = countriesSearch.trim().toLowerCase();
                  if (!q) return true;
                  const label = (opt.label || "").toLowerCase();
                  const code = (opt.code || "").toLowerCase();
                  const numeric = (opt.numeric || "").toLowerCase();
                  return label.includes(q) || code.includes(q) || numeric.includes(q);
                }).map((opt) => {
                  const selected = rechercheForm.countries.includes(opt.code);
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setRechercheForm((prev) => {
                          const exists = prev.countries.includes(opt.code);
                          const next = exists
                            ? prev.countries.filter((x) => x !== opt.code)
                            : [...prev.countries, opt.code];
                          return { ...prev, countries: next };
                        });
                      }}
                      className="w-full px-5 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-base">
                          {opt.icon}
                        </div>
                        <div className="text-sm text-gray-900">{opt.label}</div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {opt.numeric || ""}
                        </span>
                        {selected ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {classesOpen && (
          <div
            className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-4"
            onClick={() => {
              setClassesOpen(false);
              setClassesSearch("");
            }}
          >
            <div
              className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden h-[70vh] max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">Klassen auswählen</div>
                  <div className="text-xs text-gray-500">Nizza-Klassen (1–45) · Mehrfachauswahl möglich</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => {
                      setRechercheForm((prev) => ({
                        ...prev,
                        niceClasses: Array.from({ length: 45 }, (_, i) => i + 1),
                      }));
                    }}
                  >
                    Alle Klassen
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => {
                      setClassesOpen(false);
                      setClassesSearch("");
                    }}
                  >
                    Schließen
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-gray-100">
                <input
                  value={classesSearch}
                  onChange={(e) => setClassesSearch(e.target.value)}
                  placeholder="Suchen: Klassen-Nummer (z.B. 35)"
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-gray-300 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="flex-1 overflow-auto">
                {(() => {
                  const q = classesSearch.trim();
                  const base = Array.from(
                    new Set(
                      (rechercheForm.niceClasses || [])
                        .filter((x) => Number.isFinite(x))
                        .map((x) => Math.max(1, Math.min(45, Math.floor(Number(x)))))
                    )
                  ).sort((a, b) => a - b);
                  const allSelected = base.length === 45;

                  const rows: React.ReactNode[] = [];

                  if (!q) {
                    rows.push(
                      <button
                        key="all"
                        type="button"
                        onClick={() => {
                          setRechercheForm((prev) => ({
                            ...prev,
                            niceClasses: allSelected ? [] : Array.from({ length: 45 }, (_, i) => i + 1),
                          }));
                        }}
                        className="w-full px-5 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                            ∞
                          </div>
                          <div className="text-sm text-gray-900 font-medium">Alle Klassen</div>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {allSelected ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      </button>
                    );
                  }

                  for (const n of Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => (q ? String(n).includes(q) : true))) {
                    const selected = base.includes(n);
                    rows.push(
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setRechercheForm((prev) => {
                            const current = Array.from(
                              new Set(
                                (prev.niceClasses || [])
                                  .filter((x) => Number.isFinite(x))
                                  .map((x) => Math.max(1, Math.min(45, Math.floor(Number(x)))))
                              )
                            );
                            const exists = current.includes(n);
                            const next = exists ? current.filter((x) => x !== n) : [...current, n];
                            next.sort((a, b) => a - b);
                            return { ...prev, niceClasses: next };
                          });
                        }}
                        className="w-full px-5 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                            {n}
                          </div>
                          <div className="text-sm text-gray-900">Klasse {n}</div>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {selected ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      </button>
                    );
                  }
                  return rows;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* KI-Logo Generator Modal */}
        {showLogoGeneratorModal && (
          <div
            className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-4"
            onClick={() => setShowLogoGeneratorModal(false)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">KI-Logo generieren</div>
                    <div className="text-sm text-gray-500">
                      {trademarkType === "bildmarke" ? "Reine Bildmarke (ohne Text)" : `Wort-/Bildmarke mit "${manualNameInput || 'Marke'}"`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoGeneratorModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={autoGenerateLogoPrompt}
                    disabled={isAutoGeneratingPrompt}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg text-sm hover:from-teal-600 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAutoGeneratingPrompt ? "Generiere Idee..." : `Idee für "${manualNameInput || 'Marke'}"`}
                  </button>

                  <label className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-200 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          setLogoGenerationError("Datei zu groß (max. 5 MB)");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setReferenceImageUrl(dataUrl);
                          analyzeReferenceImage(dataUrl);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                    <Upload className="w-4 h-4" />
                    {isAnalyzingReference ? "Analysiere..." : "Referenzbild"}
                  </label>
                </div>

                {/* Reference Image Preview */}
                {referenceImageUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={referenceImageUrl}
                        alt="Referenzbild"
                        className="w-16 h-16 object-cover rounded-lg border border-blue-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-blue-700">Referenzbild hochgeladen</div>
                        <div className="text-xs text-blue-600 mt-1">
                          {isAnalyzingReference ? "Wird analysiert..." : "Prompt wurde basierend auf dem Bild generiert"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReferenceImageUrl(null)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibe dein Logo
                  </label>
                  <div className="relative">
                    <textarea
                      value={logoPrompt}
                      onChange={(e) => setLogoPrompt(e.target.value)}
                      placeholder={trademarkType === "bildmarke" 
                        ? "z.B. Minimalistisches Symbol einer Banane in goldener Farbe, eleganter Stil..."
                        : `z.B. Modernes Logo mit dem Text "${manualNameInput || 'Marke'}", Farbverlauf von Blau zu Grün...`
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 resize-none"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecordingLogoPrompt(!isRecordingLogoPrompt);
                      // TODO: Implement voice recording
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isRecordingLogoPrompt
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    <Mic className={`w-4 h-4 ${isRecordingLogoPrompt ? "animate-pulse" : ""}`} />
                    {isRecordingLogoPrompt ? "Aufnahme..." : "Diktieren"}
                  </button>

                  <button
                    type="button"
                    onClick={refineLogoPrompt}
                    disabled={!logoPrompt.trim() || isRefiningPrompt}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isRefiningPrompt ? "Verfeinere..." : "KI-Verfeinerung"}
                  </button>
                </div>

                {trademarkType === "wort-bildmarke" && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-teal-700 text-sm">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>Der Text <strong>"{manualNameInput || 'Marke'}"</strong> wird automatisch ins Logo integriert.</span>
                    </div>
                  </div>
                )}

                {logoGenerationError && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {logoGenerationError}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoGeneratorModal(false);
                    setLogoPrompt("");
                    setLogoGenerationError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={generateLogo}
                  disabled={!logoPrompt.trim() || isGeneratingLogo}
                  className="px-4 py-2 s-gradient-button text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingLogo ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Logo generieren
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
