"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mic,
  Type,
  Search,
  BarChart3,
  Clock,
  Check,
  Circle,
  AlertCircle,
  AlertTriangle,
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
  MessageSquare,
  MoreVertical,
  Phone,
  Zap,
  Image as ImageIcon,
  Download,
  Trash2,
} from "lucide-react";
import { AnimatedRiskScore } from "@/app/components/cases/AnimatedRiskScore";
import { RechercheHistoryBanner, RechercheHistoryItem } from "@/app/components/RechercheHistoryBanner";
import { ConflictCard, ConflictMark, ConflictDetailModal } from "@/app/components/cases/ConflictCard";
import ClaudeAssistant, { ClaudeAssistantHandle } from "@/app/components/ClaudeAssistant";
import Tooltip, { 
  NiceClassesTooltip, 
  RiskLevelTooltip, 
  RiskScoreTooltip, 
  AlternativeNamesTooltip, 
  QuickCheckTooltip, 
  ConflictsTooltip, 
} from "@/app/components/ui/tooltip";
import { getBeratungPrompt, getRecherchePrompt, getMarkennamePrompt, getAnmeldungPrompt } from "@/lib/prompts";
import { RechercheSteps, RechercheStep } from "@/app/components/RechercheSteps";
import { ReportGenerator } from "@/app/components/ReportGenerator";

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
  { code: "AU", label: "Australien", icon: "🇦🇺", numeric: "036" },
  { code: "AZ", label: "Aserbaidschan", icon: "🇦🇿", numeric: "031" },
  { code: "BH", label: "Bahrain", icon: "🇧🇭", numeric: "048" },
  { code: "BW", label: "Botswana", icon: "🇧🇼", numeric: "072" },
  { code: "BY", label: "Belarus", icon: "🇧🇾", numeric: "112" },
  { code: "CA", label: "Kanada", icon: "🇨🇦", numeric: "124" },
  { code: "CH", label: "Schweiz", icon: "🇨🇭", numeric: "756" },
  { code: "EE", label: "Estland", icon: "🇪🇪", numeric: "233" },
  { code: "EG", label: "Ägypten", icon: "🇪🇬", numeric: "818" },
  { code: "ES", label: "Spanien", icon: "🇪🇸", numeric: "724" },
  { code: "EU", label: "Europäische Union", icon: "🇪🇺" },
  { code: "GB", label: "Vereinigtes Königreich", icon: "🇬🇧", numeric: "826" },
  { code: "GE", label: "Georgien", icon: "🇬🇪", numeric: "268" },
  { code: "HK", label: "Hongkong", icon: "🇭🇰", numeric: "344" },
  { code: "IL", label: "Israel", icon: "🇮🇱", numeric: "376" },
  { code: "IN", label: "Indien", icon: "🇮🇳", numeric: "356" },
  { code: "IT", label: "Italien", icon: "🇮🇹", numeric: "380" },
  { code: "KE", label: "Kenia", icon: "🇰🇪", numeric: "404" },
  { code: "KG", label: "Kirgisistan", icon: "🇰🇬", numeric: "417" },
  { code: "KZ", label: "Kasachstan", icon: "🇰🇿", numeric: "398" },
  { code: "LT", label: "Litauen", icon: "🇱🇹", numeric: "440" },
  { code: "LV", label: "Lettland", icon: "🇱🇻", numeric: "428" },
  { code: "MA", label: "Marokko", icon: "🇲🇦", numeric: "504" },
  { code: "MD", label: "Moldau", icon: "🇲🇩", numeric: "498" },
  { code: "MX", label: "Mexiko", icon: "🇲🇽", numeric: "484" },
  { code: "NO", label: "Norwegen", icon: "🇳🇴", numeric: "578" },
  { code: "OM", label: "Oman", icon: "🇴🇲", numeric: "512" },
  { code: "RU", label: "Russische Föderation", icon: "🇷🇺", numeric: "643" },
  { code: "SA", label: "Saudi-Arabien", icon: "🇸🇦", numeric: "682" },
  { code: "TR", label: "Türkei", icon: "🇹🇷", numeric: "792" },
  { code: "TW", label: "Taiwan", icon: "🇹🇼", numeric: "158" },
  { code: "UA", label: "Ukraine", icon: "🇺🇦", numeric: "804" },
  { code: "US", label: "Vereinigte Staaten", icon: "🇺🇸", numeric: "840" },
  { code: "UZ", label: "Usbekistan", icon: "🇺🇿", numeric: "860" },
  { code: "WO", label: "WIPO", icon: "🌐" },
].slice().sort((a, b) => a.label.localeCompare(b.label));

// Welche Länder erlauben Selbstanmeldung ohne lokalen Vertreter?
// true = Selbstanmeldung möglich, false = Vertreter erforderlich
const SELF_REGISTER_ALLOWED: Record<string, boolean> = {
  // Selbstanmeldung möglich
  AU: true,  // Australien
  CA: true,  // Kanada
  CH: true,  // Schweiz
  EU: true,  // EUIPO
  GB: true,  // UK
  NO: true,  // Norwegen
  WO: true,  // WIPO Madrid
  // EU-Länder (EU-Bürger können selbst anmelden)
  EE: true,  // Estland
  ES: true,  // Spanien
  IT: true,  // Italien
  LT: true,  // Litauen
  LV: true,  // Lettland
  // Vertreter erforderlich
  AE: false, // VAE
  AM: false, // Armenien
  AR: false, // Argentinien
  AZ: false, // Aserbaidschan
  BH: false, // Bahrain
  BW: false, // Botswana
  BY: false, // Belarus
  EG: false, // Ägypten
  GE: false, // Georgien
  HK: false, // Hongkong
  IL: false, // Israel
  IN: false, // Indien
  KE: false, // Kenia
  KG: false, // Kirgisistan
  KZ: false, // Kasachstan
  MA: false, // Marokko
  MD: false, // Moldau
  MX: false, // Mexiko
  OM: false, // Oman
  RU: false, // Russland
  SA: false, // Saudi-Arabien
  TR: false, // Türkei
  TW: false, // Taiwan
  UA: false, // Ukraine
  US: false, // USA (Ausländer brauchen Anwalt)
  UZ: false, // Usbekistan
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
  { id: "ueberpruefung", title: "Checkliste", icon: CheckCircle, buttonText: "Checkliste prüfen", buttonAction: "placeholder" },
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
  isSkipped,
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
  isSkipped: boolean;
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
          <Icon
            className={`w-5 h-5 ${
              isCompleted ? "text-teal-600" : isSkipped ? "text-yellow-600" : "text-gray-400"
            }`}
          />
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
          {isSkipped && (
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 shadow-sm cursor-help"
              title="Übersprungen – du kannst diesen Schritt jederzeit nachholen"
            >
              <span className="text-white text-[10px] font-bold leading-none">!</span>
            </span>
          )}
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
  const [skippedStepsNotice, setSkippedStepsNotice] = useState<string[] | null>(null);
  const [isStartingRecherche, setIsStartingRecherche] = useState(false);
  const [autoStartRecherche, setAutoStartRecherche] = useState(false); // Flag für automatischen Start durch Claude
  const [rechercheStartError, setRechercheStartError] = useState<string | null>(null);
  const [isSavingRechercheForm, setIsSavingRechercheForm] = useState(false);
  const [rechercheFormSaveError, setRechercheFormSaveError] = useState<string | null>(null);
  const [rechercheFormValidationAttempted, setRechercheFormValidationAttempted] = useState(false);
  const [showTMSearchDebugModal, setShowTMSearchDebugModal] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [tmsearchDebugLoading, setTMSearchDebugLoading] = useState(false);
  const [tmsearchDebugError, setTMSearchDebugError] = useState<string | null>(null);
  const [tmsearchDebugPayload, setTMSearchDebugPayload] = useState<unknown>(null);
  const [tmsearchDebugTab, setTMSearchDebugTab] = useState<"request" | "response" | "filter" | "analysis" | "raw">("request");
  
  // Recherche Flip View + Historie
  const [showRechercheAnalysis, setShowRechercheAnalysis] = useState(false);
  const [rechercheHistory, setRechercheHistory] = useState<RechercheHistoryItem[]>([]);
  const [activeRechercheId, setActiveRechercheId] = useState<string | null>(null);
  
  // Live Analyse States
  const [isRunningLiveAnalysis, setIsRunningLiveAnalysis] = useState(false);
  const [isRunningWebSearch, setIsRunningWebSearch] = useState(false);
  const [liveAnalysisError, setLiveAnalysisError] = useState<string | null>(null);
  const [rechercheSteps, setRechercheSteps] = useState<RechercheStep[]>([]);
  const rechercheStepsRef = useRef<RechercheStep[]>([]); // Ref für aktuelle Steps (Closure-Fix)
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<{
    success: boolean;
    isTestMode: boolean;
    query: { keyword: string; countries: string[]; classes: number[]; effectiveClasses: number[]; trademarkType: string };
    stats: { totalRaw: number; totalLive: number; totalFiltered: number; analyzedCount: number };
    analysis: {
      overallRiskScore: number;
      overallRiskLevel: "low" | "medium" | "high";
      decision: "go" | "go_with_changes" | "no_go";
      executiveSummary: string;
      nameAnalysis: string;
      riskAssessment: string;
      recommendation: string;
      topConflicts: Array<{ name: string; office: string; classes: number[]; riskScore: number; reasoning: string }>;
    };
    conflicts: Array<{
      id: string | number;
      name: string;
      status: string;
      office: string;
      protection: string[];
      classes: string[];
      accuracy: number;
      applicationNumber: string;
      registrationNumber: string;
      dates: { applied?: string; granted?: string; expiration?: string };
      owner: { name?: string; country?: string };
      goodsServices: string[];
      imageUrl: string | null;
      riskScore: number;
      riskLevel: "low" | "medium" | "high";
      reasoning: string;
    }>;
  } | null>(null);
  
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
  const [trademarkType, setTrademarkType] = useState<"" | "wortmarke" | "wort-bildmarke" | "bildmarke">("");
  const [isTrademarkTypeConfirmed, setIsTrademarkTypeConfirmed] = useState(false); // Erst true wenn User explizit wählt
  const [trademarkImageUrl, setTrademarkImageUrl] = useState<string | null>(null);
  const [trademarkImageFile, setTrademarkImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  // Logo-Galerie: Alle generierten/hochgeladenen Logos
  const [logoGallery, setLogoGallery] = useState<Array<{
    id: string;
    url: string;
    timestamp: Date;
    source: "generated" | "uploaded" | "edited";
    prompt?: string;
  }>>([]);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [checkedLogoIds, setCheckedLogoIds] = useState<Set<string>>(new Set());

  // Anmeldung form state
  const [anmeldungTab, setAnmeldungTab] = useState<"amt" | "anmelder" | "vertreter">("amt");
  const [anmeldungOfficeSearch, setAnmeldungOfficeSearch] = useState("");
  const [anmeldungForm, setAnmeldungForm] = useState({
    selectedOffices: [] as string[],
    // Pro Land: "self" oder "representative" - wird automatisch gesetzt basierend auf SELF_REGISTER_ALLOWED
    officeRegistrationMode: {} as Record<string, "self" | "representative">,
    applicantType: "person" as "person" | "company",
    applicantName: "",
    applicantCompany: "",
    applicantLegalForm: "",
    applicantStreet: "",
    applicantZip: "",
    applicantCity: "",
    applicantCountry: "DE",
    applicantEmail: "",
    applicantPhone: "",
    representativeName: "",
    representativeFirm: "",
    representativeEmail: "",
  });

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

  // Klassen, Länder und Markenart aus DB laden beim Reload
  const decisionsInitializedRef = useRef(false);
  useEffect(() => {
    if (!data) return; // Warten bis data geladen
    if (decisionsInitializedRef.current) return; // Nur einmal initialisieren
    
    // WICHTIG: Immer auf true setzen wenn data geladen (auch wenn leer!)
    decisionsInitializedRef.current = true;
    
    const decisions = data.decisions as any;
    if (!decisions) return;
    
    const { niceClasses, countries, trademarkNames, trademarkType: savedTrademarkType } = decisions;
    const hasData = (niceClasses?.length ?? 0) > 0 || (countries?.length ?? 0) > 0 || savedTrademarkType;
    
    if (hasData) {
      setRechercheForm(prev => ({
        ...prev,
        trademarkName: trademarkNames?.[0] || prev.trademarkName,
        niceClasses: niceClasses?.length ? niceClasses : prev.niceClasses,
        countries: countries?.length ? countries : prev.countries,
      }));
      // Markenart wiederherstellen
      if (savedTrademarkType && !trademarkType) {
        setTrademarkType(savedTrademarkType);
        setIsTrademarkTypeConfirmed(true);
      }
    }
  }, [data, trademarkType]);

  // Auto-Save für Felder (wie Chat) - speichert automatisch nach 2 Sekunden
  const autoSaveDecisionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDecisionsRef = useRef<string>("");
  
  useEffect(() => {
    if (!caseId || !data?.case?.id) return;
    if (!decisionsInitializedRef.current) return; // Nicht speichern bevor initialisiert
    
    // Aktueller Zustand als String für Vergleich
    const currentState = JSON.stringify({
      name: manualNameInput,
      type: trademarkType,
      classes: rechercheForm.niceClasses,
      countries: rechercheForm.countries,
    });
    
    // Nicht speichern wenn nichts geändert wurde
    if (currentState === lastSavedDecisionsRef.current) return;
    
    // Nicht speichern wenn alles leer ist
    if (!manualNameInput && !trademarkType && rechercheForm.niceClasses.length === 0 && rechercheForm.countries.length === 0) return;
    
    // Debounce: 2 Sekunden warten nach letzter Änderung
    if (autoSaveDecisionsTimeoutRef.current) {
      clearTimeout(autoSaveDecisionsTimeoutRef.current);
    }
    
    autoSaveDecisionsTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/cases/save-decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: data.case.id,
            trademarkName: manualNameInput || undefined,
            trademarkType: trademarkType || undefined,
            countries: rechercheForm.countries.length > 0 ? rechercheForm.countries : undefined,
            niceClasses: rechercheForm.niceClasses.length > 0 ? rechercheForm.niceClasses : undefined,
          }),
        });
        if (res.ok) {
          lastSavedDecisionsRef.current = currentState;
          console.log("[Auto-Save] Felder gespeichert");
        }
      } catch (err) {
        console.error("[Auto-Save] Fehler:", err);
      }
    }, 2000);
    
    return () => {
      if (autoSaveDecisionsTimeoutRef.current) {
        clearTimeout(autoSaveDecisionsTimeoutRef.current);
      }
    };
  }, [manualNameInput, trademarkType, rechercheForm.niceClasses, rechercheForm.countries, caseId, data?.case?.id]);

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
  
  // Beratung Voice Assistant
  const voiceAssistantRef = useRef<ClaudeAssistantHandle>(null);
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

  // GLOBALER CHAT: Alle Akkordeons teilen dieselbe Voice-Session und Messages
  // markennameMessages und rechercheMessages wurden entfernt - alle nutzen sessionMessages
  // Voice-Refs bleiben für Schnellfragen-Buttons
  const markennameVoiceRef = useRef<ClaudeAssistantHandle>(null);
  const rechercheVoiceRef = useRef<ClaudeAssistantHandle>(null);

  // Analyse Voice Assistant
  const analyseVoiceRef = useRef<ClaudeAssistantHandle>(null);
  const [analyseMessages, setAnalyseMessages] = useState<any[]>([]);


  // Anmeldung Voice Assistant
  const anmeldungVoiceRef = useRef<ClaudeAssistantHandle>(null);
  const [anmeldungMessages, setAnmeldungMessages] = useState<any[]>([]);
  const [anmeldungSummary, setAnmeldungSummary] = useState<string | null>(null);
  
  // Event-Protokoll System
  type EventLogEntry = {
    id: string;
    timestamp: Date;
    type: "session_start" | "user_message" | "ai_message" | "ai_greeting" | "field_change" | "accordion_change" | "trigger" | "recherche_start" | "recherche_complete" | "accordion_greeting" | "logo_generate" | "logo_upload" | "logo_reference";
    icon: string;
    description: string;
    details?: string;
  };
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [showEventLogModal, setShowEventLogModal] = useState(false);
  const eventLogInitializedRef = useRef(false);
  
  const logEvent = useCallback((
    type: EventLogEntry["type"],
    description: string,
    details?: string
  ) => {
    const icons: Record<EventLogEntry["type"], string> = {
      session_start: "🟢",
      user_message: "💬",
      ai_message: "🤖",
      ai_greeting: "👋",
      field_change: "📝",
      accordion_change: "📂",
      trigger: "⚠️",
      recherche_start: "🔍",
      recherche_complete: "✅",
      accordion_greeting: "💡",
      logo_generate: "🎨",
      logo_upload: "📤",
      logo_reference: "🖼️"
    };
    
    const newEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      icon: icons[type],
      description,
      details
    };
    
    // Sofort im State anzeigen
    setEventLog(prev => [...prev, newEvent]);
    
    // In DB speichern (async, non-blocking)
    fetch(`/api/cases/${caseId}/session-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newEvent.id,
        timestamp: newEvent.timestamp.toISOString(),
        type: newEvent.type,
        icon: newEvent.icon,
        description: newEvent.description,
        details: newEvent.details
      })
    }).catch(err => console.warn("Failed to save event to DB:", err));
  }, [caseId]);
  
  const [anmeldungStrategy, setAnmeldungStrategy] = useState<{
    route: string;
    steps: { country: string; office: string; selfRegister: boolean; cost: number; icon: string }[];
    totalCost: number;
    hints: string[];
  } | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const lastStrategyMessageCountRef = useRef(0);

  // Generiere Strategie aus Anmeldungs-Nachrichten
  const generateAnmeldungStrategy = useCallback(async () => {
    if (anmeldungMessages.length < 4) return; // Mindestens 2 Austausche
    if (isGeneratingStrategy) return;
    if (anmeldungMessages.length === lastStrategyMessageCountRef.current) return;

    setIsGeneratingStrategy(true);
    lastStrategyMessageCountRef.current = anmeldungMessages.length;

    try {
      const response = await fetch("/api/anmeldung/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: anmeldungMessages,
          context: {
            trademarkName: data?.case?.trademarkName || manualNameInput || "",
            trademarkType: trademarkType,
            niceClasses: rechercheForm.niceClasses || [],
            selectedCountries: rechercheForm.countries || [],
          },
        }),
      });

      if (response.ok) {
        const { strategy } = await response.json();
        if (strategy) {
          setAnmeldungStrategy(strategy);
        }
      }
    } catch (error) {
      console.error("Strategy generation failed:", error);
    } finally {
      setIsGeneratingStrategy(false);
    }
  }, [anmeldungMessages, data?.case?.trademarkName, manualNameInput, trademarkType, rechercheForm.niceClasses, rechercheForm.countries, isGeneratingStrategy]);

  // Automatisch Strategie generieren wenn neue Nachrichten kommen
  useEffect(() => {
    if (anmeldungMessages.length >= 4 && anmeldungMessages.length > lastStrategyMessageCountRef.current) {
      // Debounce: Warte 2 Sekunden nach der letzten Nachricht
      const timer = setTimeout(() => {
        generateAnmeldungStrategy();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [anmeldungMessages.length, generateAnmeldungStrategy]);

  // Automatischer Akkordeon-Wechsel via [WEITER:ziel] Trigger
  const lastRedirectMsgIdRef = useRef<string | null>(null);
  const VALID_ACCORDIONS = ["beratung", "markenname", "recherche", "checkliste", "anmeldung", "ueberwachung", "kosten"];
  
  useEffect(() => {
    if (sessionMessages.length < 1) return;
    
    const lastMessage = sessionMessages[sessionMessages.length - 1];
    if (lastMessage?.role !== "assistant") return;
    
    // Verhindere doppelte Weiterleitung
    if (lastMessage.id === lastRedirectMsgIdRef.current) return;
    
    const content = lastMessage.content || "";
    
    // [WEITER:ziel] Trigger erkennen
    const weiterMatch = content.match(/\[WEITER:(\w+)\]/i);
    if (weiterMatch) {
      const target = weiterMatch[1].toLowerCase();
      
      // Validiere Ziel-Akkordeon
      if (!VALID_ACCORDIONS.includes(target)) {
        console.warn("Ungültiges Akkordeon-Ziel:", target);
        return;
      }
      
      lastRedirectMsgIdRef.current = lastMessage.id;
      console.log("Weiterleitung via [WEITER:] zu:", target);
      
      // Wechsle nach kurzer Verzögerung (damit User die Nachricht lesen kann)
      setTimeout(() => {
        setOpenAccordion(target);
        window.location.hash = `#${target}`;
        setTimeout(() => {
          const el = document.getElementById(`accordion-${target}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, 1500);
      return;
    }
    
    // Fallback: Alte Phrase-Erkennung (für Kompatibilität)
    const contentLower = content.toLowerCase();
    if (contentLower.includes("leite dich weiter") || contentLower.includes("leite ich dich weiter")) {
      lastRedirectMsgIdRef.current = lastMessage.id;
      const targetAccordion = (trademarkType === "bildmarke" || trademarkType === "wort-bildmarke") 
        ? "markenname" 
        : "recherche";
      
      console.log("Weiterleitung via Phrase zu:", targetAccordion);
      
      setTimeout(() => {
        setOpenAccordion(targetAccordion);
        window.location.hash = `#${targetAccordion}`;
        setTimeout(() => {
          const el = document.getElementById(`accordion-${targetAccordion}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, 2000);
    }
  }, [sessionMessages, trademarkType]);

  // Daten-Extraktion erfolgt jetzt NUR über Chat-Trigger [MARKE:...], [KLASSEN:...], etc.
  // Zusammenfassungs-Extraktion entfernt - konsistent mit Markenname und Recherche

  // GLOBALER CHAT: Nachrichten-Übertragung nicht mehr nötig - alle nutzen sessionMessages

  // Automatische Kontextnachricht bei Akkordeon-Wechsel (nur einmal pro Akkordeon)
  const lastVisitedAccordionRef = useRef<string | null>(null);
  const greetedAccordionsRef = useRef<Set<string>>(new Set());
  const greetingsInitializedRef = useRef(false);
  
  // Bei Laden: Events aus DB laden
  const eventsLoadedRef = useRef(false);
  useEffect(() => {
    if (eventsLoadedRef.current) return;
    if (!caseId) return;
    
    eventsLoadedRef.current = true;
    
    // Events aus DB laden
    fetch(`/api/cases/${caseId}/session-events`)
      .then(res => res.json())
      .then(data => {
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          // Events aus DB laden (mit Date-Objekt für timestamp)
          const loadedEvents = data.events.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          }));
          setEventLog(loadedEvents);
          eventLogInitializedRef.current = true;
        }
      })
      .catch(err => console.warn("Failed to load events from DB:", err));
  }, [caseId]);
  
  // Bei Laden: Besuchte Akkordeons aus DB laden + Session Start loggen
  useEffect(() => {
    if (greetingsInitializedRef.current) return;
    if (!data) return;
    
    greetingsInitializedRef.current = true;
    
    // Session Start loggen (nur wenn noch keine Events aus DB geladen wurden)
    if (!eventLogInitializedRef.current) {
      eventLogInitializedRef.current = true;
      logEvent("session_start", "Beratungs-Session gestartet", `Fall: ${data.case?.caseNumber || caseId}`);
    }
    
    // Besuchte Akkordeons aus DB laden
    const visitedFromDB = (data.decisions as any)?.visitedAccordions || [];
    visitedFromDB.forEach((acc: string) => greetedAccordionsRef.current.add(acc));
  }, [data, caseId, logEvent]);
  
  // Akkordeon als besucht in DB speichern
  const saveVisitedAccordion = useCallback(async (accordion: string) => {
    if (!caseId) return;
    try {
      await fetch(`/api/cases/${caseId}/visited-accordions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accordion }),
      });
    } catch (err) {
      console.error("Failed to save visited accordion:", err);
    }
  }, [caseId]);
  
  // Fix: Start-Akkordeon als "besucht" markieren, wenn initiale Begrüßung erfolgt
  // (Wenn erste Nachricht erscheint und Akkordeon noch nicht besucht wurde)
  const initialGreetingMarkedRef = useRef(false);
  useEffect(() => {
    if (initialGreetingMarkedRef.current) return;
    if (sessionMessages.length === 0) return;
    if (!openAccordion) return;
    
    const accordionsWithAI = ["beratung", "markenname", "recherche"];
    if (!accordionsWithAI.includes(openAccordion)) return;
    
    // Erste Nachricht erscheint → Start-Akkordeon als besucht markieren
    initialGreetingMarkedRef.current = true;
    
    if (!greetedAccordionsRef.current.has(openAccordion)) {
      greetedAccordionsRef.current.add(openAccordion);
      saveVisitedAccordion(openAccordion);
    }
  }, [sessionMessages.length, openAccordion, saveVisitedAccordion]);
  
  useEffect(() => {
    if (!openAccordion) return;
    if (openAccordion === lastVisitedAccordionRef.current) return;
    
    // Event-Log: Akkordeon-Wechsel (IMMER loggen bei jedem Wechsel)
    const allAccordionNames: Record<string, string> = { 
      beratung: "Beratung", 
      markenname: "Markenname", 
      recherche: "Recherche",
      checkliste: "Checkliste",
      anmeldung: "Anmeldung",
      kommunikation: "Kommunikation",
      ueberwachung: "Überwachung",
      kosten: "Kosten",
      analyse: "Analyse"
    };
    if (eventLogInitializedRef.current) {
      logEvent("accordion_change", `Wechsel zu "${allAccordionNames[openAccordion] || openAccordion}"`, `Von: ${lastVisitedAccordionRef.current || "Start"}`);
    }
    
    // Nur bei Akkordeons mit KI-Berater (Beratung, Markenname, Recherche)
    const accordionsWithAI = ["beratung", "markenname", "recherche"];
    if (!accordionsWithAI.includes(openAccordion)) {
      lastVisitedAccordionRef.current = openAccordion;
      return;
    }
    
    // Nicht beim ersten Laden (wenn noch keine Nachrichten da sind)
    if (sessionMessages.length === 0) {
      lastVisitedAccordionRef.current = openAccordion;
      return;
    }
    
    // Begrüßung nur einmal pro Akkordeon in der Session
    if (greetedAccordionsRef.current.has(openAccordion)) {
      lastVisitedAccordionRef.current = openAccordion;
      return;
    }
    
    // Kontextnachricht je nach Akkordeon
    const contextMessages: Record<string, string> = {
      beratung: `Wir sind jetzt im Bereich **Beratung**. Hier können wir:
- Deinen Markennamen besprechen
- Die passende Markenart wählen (Wort-, Bild- oder Wort-/Bildmarke)
- Die richtigen Nizza-Klassen für dein Geschäft finden
- Die Länder/Regionen für den Markenschutz auswählen

Was möchtest du als nächstes tun?`,
      markenname: (() => {
        // Prüfen ob Beratung bereits durchgeführt wurde (Markenname + Markenart gesetzt)
        const beratungDone = manualNameInput && trademarkType;
        const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
        
        if (beratungDone && needsLogo) {
          // Beratung fertig, Logo wird gebraucht
          return `Perfekt! Hier erstellen wir dein Logo für "${manualNameInput}". 🎨

Du hast 3 Möglichkeiten:
- **KI Logo** - Logo mit KI generieren lassen
- **Referenz** - Referenzbild hochladen, KI generiert im gleichen Stil
- **Logo** - Eigenes Logo hochladen

Was möchtest du?`;
        } else if (beratungDone && !needsLogo) {
          // Beratung fertig, Wortmarke - kein Logo nötig
          return `"${manualNameInput}" als Wortmarke - hier kannst du:
- Kreative Namensalternativen generieren lassen
- Den Namen noch anpassen

Oder direkt weiter zur Recherche?`;
        } else {
          // Neuer Fall, User startet hier
          return `Willkommen! 👋 Hier legst du deine Marke an:

1. **Markenname** eingeben
2. **Markenart** wählen (Wort-, Bild- oder Wort-/Bildmarke)
${trademarkType === "bildmarke" || trademarkType === "wort-bildmarke" ? "3. **Logo** erstellen oder hochladen" : ""}

Wie soll deine Marke heißen?`;
        }
      })(),
      recherche: `Perfekt, wir sind jetzt bei der **Markenrecherche**! Hier prüfen wir:
- Ob dein Markenname bereits geschützt ist
- Ähnliche eingetragene Marken in deinen Klassen
- Konflikte in den gewählten Ländern/Regionen

${rechercheForm.trademarkName ? `Markenname: "${rechercheForm.trademarkName}"` : ""}
${(rechercheForm.niceClasses?.length ?? 0) > 0 ? `Klassen: ${rechercheForm.niceClasses?.join(", ")}` : ""}
${(rechercheForm.countries?.length ?? 0) > 0 ? `Länder: ${rechercheForm.countries?.join(", ")}` : ""}

Soll ich die Recherche starten?`
    };
    
    const contextMsg = contextMessages[openAccordion];
    
    if (contextMsg && lastVisitedAccordionRef.current !== null) {
      // Wähle die richtige ref je nach Akkordeon für Streaming-Effekt
      const targetRef = openAccordion === "beratung" 
        ? voiceAssistantRef 
        : openAccordion === "markenname" 
          ? markennameVoiceRef 
          : rechercheVoiceRef;
      
      // Streaming-Effekt wie bei Begrüßung
      targetRef.current?.simulateStreaming(contextMsg);
      
      // Event-Log: Akkordeon-Begrüßung
      logEvent("accordion_greeting", `Begrüßung für "${allAccordionNames[openAccordion] || openAccordion}" gesendet`);
      
      // Akkordeon als "begrüßt" markieren - wird nie mehr begrüßt (auch nach Reload)
      greetedAccordionsRef.current.add(openAccordion);
      saveVisitedAccordion(openAccordion);
    }
    
    lastVisitedAccordionRef.current = openAccordion;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAccordion, sessionMessages.length, manualNameInput, trademarkType, rechercheForm.trademarkName, rechercheForm.niceClasses, rechercheForm.countries]);


  // Refs für Trigger- und manuelle Änderungs-Erkennung
  const lastProcessedBeratungMsgIdRef = useRef<string | null>(null);
  const triggerChangeInProgressRef = useRef(false); // Flag: Änderung durch KI-Trigger (nicht manuell)
  const lastNotifiedStateRef = useRef<string>("");
  const manualChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstManualCheckRef = useRef(true); // Flag: Ersten Render überspringen
  
  // Event-Log: Feldänderungen tracken (debounced)
  // Wichtig: Initialisiere mit aktuellen Werten, um fake Events beim Laden zu vermeiden
  const lastLoggedFieldsRef = useRef<{ name?: string; type?: string; classes?: string; countries?: string; initialized?: boolean }>({});
  const fieldChangeLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialisiere lastLoggedFieldsRef mit aktuellen Werten beim ersten Laden
  useEffect(() => {
    if (!lastLoggedFieldsRef.current.initialized && messagesLoaded) {
      lastLoggedFieldsRef.current = {
        name: manualNameInput || undefined,
        type: trademarkType || undefined,
        classes: (rechercheForm.niceClasses || []).sort((a, b) => a - b).join(",") || undefined,
        countries: (rechercheForm.countries || []).sort().join(",") || undefined,
        initialized: true
      };
    }
  }, [messagesLoaded, manualNameInput, trademarkType, rechercheForm.niceClasses, rechercheForm.countries]);
  
  useEffect(() => {
    // Nicht beim ersten Render loggen
    if (!eventLogInitializedRef.current) return;
    // Nicht wenn durch KI-Trigger geändert
    if (triggerChangeInProgressRef.current) return;
    // Nicht loggen bevor Initialwerte gesetzt wurden
    if (!lastLoggedFieldsRef.current.initialized) return;
    
    // Debounce: 1.5 Sekunden warten
    if (fieldChangeLogTimeoutRef.current) {
      clearTimeout(fieldChangeLogTimeoutRef.current);
    }
    
    fieldChangeLogTimeoutRef.current = setTimeout(() => {
      // Markenname
      if (manualNameInput && manualNameInput !== lastLoggedFieldsRef.current.name) {
        lastLoggedFieldsRef.current.name = manualNameInput;
        logEvent("field_change", `Markenname → "${manualNameInput}"`);
      }
      
      // Markenart
      if (trademarkType && trademarkType !== lastLoggedFieldsRef.current.type) {
        lastLoggedFieldsRef.current.type = trademarkType;
        const typeNames: Record<string, string> = { wortmarke: "Wortmarke", bildmarke: "Bildmarke", "wort-bildmarke": "Wort-/Bildmarke" };
        logEvent("field_change", `Markenart → ${typeNames[trademarkType] || trademarkType}`);
      }
      
      // Klassen
      const classesStr = (rechercheForm.niceClasses || []).sort((a, b) => a - b).join(",");
      if (classesStr && classesStr !== lastLoggedFieldsRef.current.classes) {
        lastLoggedFieldsRef.current.classes = classesStr;
        logEvent("field_change", `Klassen → ${rechercheForm.niceClasses?.join(", ")}`, `${rechercheForm.niceClasses?.length} Klassen`);
      }
      
      // Länder
      const countriesStr = (rechercheForm.countries || []).sort().join(",");
      if (countriesStr && countriesStr !== lastLoggedFieldsRef.current.countries) {
        lastLoggedFieldsRef.current.countries = countriesStr;
        logEvent("field_change", `Länder → ${rechercheForm.countries?.join(", ")}`, `${rechercheForm.countries?.length} Länder`);
      }
    }, 1500);
    
    return () => {
      if (fieldChangeLogTimeoutRef.current) {
        clearTimeout(fieldChangeLogTimeoutRef.current);
      }
    };
  }, [manualNameInput, trademarkType, rechercheForm.niceClasses, rechercheForm.countries, logEvent]);

  // Trigger-Erkennung für BERATUNG (sessionMessages)
  useEffect(() => {
    if (sessionMessages.length === 0) return;
    const lastMsg = sessionMessages[sessionMessages.length - 1];
    if (lastMsg?.role !== "assistant") return;
    if (lastMsg.id === lastProcessedBeratungMsgIdRef.current) return;
    
    const content = lastMsg.content || "";
    let hasAction = false;
    
    // [MARKE:Name] - Markenname ändern (auch ins Recherche-Formular!)
    const markeMatch = content.match(/\[MARKE:([^\]]+)\]/);
    if (markeMatch?.[1]) {
      hasAction = true;
      const name = markeMatch[1].trim();
      triggerChangeInProgressRef.current = true; // Flag: Änderung durch KI-Trigger
      setManualNameInput(name);
      setRechercheForm(prev => ({ ...prev, trademarkName: name }));
      setTimeout(() => { triggerChangeInProgressRef.current = false; }, 100);
    }
    
    // [KLASSEN:01,03,09] - Klassen ändern
    const klassenMatch = content.match(/\[KLASSEN:([^\]]+)\]/);
    if (klassenMatch?.[1]) {
      hasAction = true;
      const classes = klassenMatch[1].split(",").map((c: string) => parseInt(c.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 45);
      if (classes.length > 0) {
        triggerChangeInProgressRef.current = true;
        setRechercheForm(prev => ({ ...prev, niceClasses: [...new Set(classes)] as number[] }));
        setTimeout(() => { triggerChangeInProgressRef.current = false; }, 100);
      }
    }
    
    // [LAENDER:DE,US,EU] - Länder ändern
    const laenderMatch = content.match(/\[LAENDER:([^\]]+)\]/);
    if (laenderMatch?.[1]) {
      hasAction = true;
      const codes = laenderMatch[1].split(",").map((c: string) => c.trim().toUpperCase()).filter((c: string) => c.length >= 2);
      if (codes.length > 0) {
        triggerChangeInProgressRef.current = true;
        setRechercheForm(prev => ({ ...prev, countries: [...new Set(codes)] as string[] }));
        setTimeout(() => { triggerChangeInProgressRef.current = false; }, 100);
      }
    }
    
    // [ART:wortmarke] - Markenart ändern
    const artMatch = content.match(/\[ART:(wortmarke|bildmarke|wort-bildmarke)\]/i);
    if (artMatch?.[1]) {
      hasAction = true;
      const art = artMatch[1].toLowerCase() as "wortmarke" | "bildmarke" | "wort-bildmarke";
      triggerChangeInProgressRef.current = true;
      setTrademarkType(art);
      setIsTrademarkTypeConfirmed(true);
      setTimeout(() => { triggerChangeInProgressRef.current = false; }, 100);
    }
    
    // [GOTO:markenname] - Zu Akkordeon navigieren (nur wenn nicht bereits dort)
    const gotoMatch = content.match(/\[GOTO:(beratung|markenname|recherche|checkliste|anmeldung|kommunikation|ueberwachung|fristen)\]/i);
    if (gotoMatch?.[1]) {
      const target = gotoMatch[1].toLowerCase();
      // Nur navigieren wenn User NICHT bereits im Ziel-Akkordeon ist
      if (openAccordion !== target) {
        hasAction = true;
        setTimeout(() => {
          setOpenAccordion(target);
          window.location.hash = `#${target}`;
          const el = document.getElementById(`accordion-${target}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 500);
      }
    }
    
    if (hasAction) {
      lastProcessedBeratungMsgIdRef.current = lastMsg.id;
      // Update lastNotifiedState damit der manuelle Änderungs-Check nicht auslöst
      lastNotifiedStateRef.current = JSON.stringify({
        name: markeMatch?.[1]?.trim() || manualNameInput,
        classes: klassenMatch?.[1] ? klassenMatch[1].split(",").map((c: string) => parseInt(c.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 45) : rechercheForm.niceClasses,
        countries: laenderMatch?.[1] ? laenderMatch[1].split(",").map((c: string) => c.trim().toUpperCase()).filter((c: string) => c.length >= 2) : rechercheForm.countries,
        type: artMatch?.[1]?.toLowerCase() || trademarkType,
        typeConfirmed: artMatch?.[1] ? true : isTrademarkTypeConfirmed
      });
    }
  }, [sessionMessages, manualNameInput, rechercheForm.niceClasses, rechercheForm.countries, trademarkType, isTrademarkTypeConfirmed, openAccordion]);

  // Erkennung manueller Änderungen - KI reagiert mit Verzögerung (nur bei ECHTEN manuellen Änderungen)
  const lastAccordionRef = useRef<string | null>(null);
  useEffect(() => {
    // Nicht wenn keine Session aktiv oder wenn Änderung durch KI-Trigger kam
    if (sessionMessages.length === 0) return;
    if (triggerChangeInProgressRef.current) return;
    // Nur in Beratung, Markenname oder Recherche aktiv
    if (openAccordion !== "beratung" && openAccordion !== "markenname" && openAccordion !== "recherche") return;
    
    // Akkordeon-Wechsel erkennen und überspringen (keine Benachrichtigung bei Wechsel)
    if (lastAccordionRef.current !== openAccordion) {
      lastAccordionRef.current = openAccordion;
      // Aktuellen Zustand speichern ohne Benachrichtigung
      lastNotifiedStateRef.current = JSON.stringify({
        name: openAccordion === "recherche" ? rechercheForm.trademarkName : manualNameInput,
        classes: rechercheForm.niceClasses,
        countries: rechercheForm.countries,
        type: trademarkType,
        typeConfirmed: isTrademarkTypeConfirmed,
        logo: trademarkImageUrl
      });
      return;
    }
    
    // Aktueller Zustand als String für Vergleich (OHNE accordion - sonst löst Wechsel aus)
    const currentState = JSON.stringify({
      name: openAccordion === "recherche" ? rechercheForm.trademarkName : manualNameInput,
      classes: rechercheForm.niceClasses,
      countries: rechercheForm.countries,
      type: trademarkType,
      typeConfirmed: isTrademarkTypeConfirmed,
      logo: trademarkImageUrl
    });
    
    // Ersten Render überspringen - nur initialen Zustand speichern
    if (isFirstManualCheckRef.current) {
      isFirstManualCheckRef.current = false;
      lastNotifiedStateRef.current = currentState;
      return;
    }
    
    // Wenn sich nichts geändert hat oder gleicher Zustand wie letzte Benachrichtigung, abbrechen
    if (currentState === lastNotifiedStateRef.current) return;
    
    // Vorherigen Timeout löschen (Debounce)
    if (manualChangeTimeoutRef.current) {
      clearTimeout(manualChangeTimeoutRef.current);
    }
    
    // Neuen Timeout setzen - KI reagiert erst nach 3 Sekunden Inaktivität
    manualChangeTimeoutRef.current = setTimeout(() => {
      // Wähle die richtige Ref je nach Akkordeon
      const targetRef = openAccordion === "recherche" 
        ? rechercheVoiceRef 
        : openAccordion === "markenname" 
          ? markennameVoiceRef 
          : voiceAssistantRef;
      const currentName = openAccordion === "recherche" ? rechercheForm.trademarkName : manualNameInput;
      
      // Prüfe was fehlt (je nach Akkordeon unterschiedlich)
      const missing: string[] = [];
      const present: string[] = [];
      
      if (openAccordion === "markenname") {
        // Im Markenname-Akkordeon: Name, Art, Logo (bei Bild-/Wort-Bildmarke)
        if (!currentName) missing.push("Markenname");
        if (!isTrademarkTypeConfirmed) missing.push("Markenart");
        const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
        if (needsLogo && !trademarkImageUrl) missing.push("Logo");
        
        if (currentName) present.push(`Marke: "${currentName}"`);
        if (isTrademarkTypeConfirmed) {
          const typeLabel = trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke";
          present.push(`Art: ${typeLabel}`);
        }
        if (trademarkImageUrl) present.push("Logo vorhanden");
      } else {
        // Beratung/Recherche: Name, Klassen, Länder, Art
        if (!currentName) missing.push("Markenname");
        if (rechercheForm.niceClasses.length === 0) missing.push("Nizza-Klassen");
        if (rechercheForm.countries.length === 0) missing.push("Länder");
        if (openAccordion === "beratung" && !isTrademarkTypeConfirmed) missing.push("Markenart");
        
        if (currentName) present.push(`Marke: "${currentName}"`);
        if (rechercheForm.niceClasses.length > 0) present.push(`Klassen: ${rechercheForm.niceClasses.join(", ")}`);
        if (rechercheForm.countries.length > 0) present.push(`Länder: ${rechercheForm.countries.join(", ")}`);
        if (isTrademarkTypeConfirmed) {
          const typeLabel = trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke";
          present.push(`Art: ${typeLabel}`);
        }
      }
      
      // Nachricht an KI - immer wenn sich etwas geändert hat
      lastNotifiedStateRef.current = currentState;
      
      if (openAccordion === "markenname") {
        // Im Markenname-Akkordeon
        if (present.length > 0) {
          const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
          const nextStep = missing.length === 0 
            ? (needsLogo ? "Logo ist bereit! Weiter zur Recherche?" : "Alles bereit für die Recherche!")
            : `Noch offen: ${missing.join(", ")}.`;
          targetRef.current?.sendQuestion(
            `[SYSTEM: Formular aktualisiert: ${present.join(", ")}. ${nextStep} Bestätige kurz.]`
          );
        }
      } else if (openAccordion === "recherche") {
        // Im Recherche-Akkordeon
        if (present.length > 0) {
          targetRef.current?.sendQuestion(
            `[SYSTEM: Formular aktualisiert: ${present.join(", ")}. ${missing.length > 0 ? `Noch offen: ${missing.join(", ")}.` : "Alles bereit für die Recherche!"} Bestätige kurz.]`
          );
        }
      } else {
        // Im Beratung-Akkordeon: Original-Logik
        if (missing.length === 0) {
          targetRef.current?.sendQuestion(
            `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. Bestätige kurz und frag ob der Benutzer zur Recherche weitergehen möchte.]`
          );
        } else {
          targetRef.current?.sendQuestion(
            `[SYSTEM: Aktueller Stand: ${present.length > 0 ? present.join(", ") : "noch nichts eingetragen"}. Noch offen: ${missing.join(", ")}. Bestätige kurz was eingetragen wurde und frag nach dem nächsten fehlenden Punkt.]`
          );
        }
      }
    }, 3000); // 3 Sekunden warten
    
    return () => {
      if (manualChangeTimeoutRef.current) {
        clearTimeout(manualChangeTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualNameInput, rechercheForm.trademarkName, rechercheForm.niceClasses?.join(",") || "", rechercheForm.countries?.join(",") || "", trademarkType, isTrademarkTypeConfirmed, trademarkImageUrl || "", sessionMessages.length, openAccordion]);

  // Trigger-Erkennung für RECHERCHE (jetzt auch sessionMessages)
  const lastProcessedRechercheMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionMessages.length === 0) return;
    const lastMsg = sessionMessages[sessionMessages.length - 1];
    if (lastMsg?.role !== "assistant") return;
    if (lastMsg.id === lastProcessedRechercheMsgIdRef.current) return;
    
    const content = lastMsg.content || "";
    let hasAction = false;
    
    // [MARKE:Name] - Markenname ändern
    const markeMatch = content.match(/\[MARKE:([^\]]+)\]/);
    if (markeMatch?.[1]) {
      hasAction = true;
      const name = markeMatch[1].trim();
      setManualNameInput(name);
      setRechercheForm(prev => ({ ...prev, trademarkName: name }));
    }
    
    // [KLASSEN:01,03,09] - Klassen ändern
    const klassenMatch = content.match(/\[KLASSEN:([^\]]+)\]/);
    if (klassenMatch?.[1]) {
      hasAction = true;
      const classes = klassenMatch[1].split(",").map((c: string) => parseInt(c.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 45);
      if (classes.length > 0) {
        setRechercheForm(prev => ({ ...prev, niceClasses: [...new Set(classes)] as number[] }));
      }
    }
    
    // [LAENDER:DE,US,EU] - Länder ändern
    const laenderMatch = content.match(/\[LAENDER:([^\]]+)\]/);
    if (laenderMatch?.[1]) {
      hasAction = true;
      const codes = laenderMatch[1].split(",").map((c: string) => c.trim().toUpperCase()).filter((c: string) => c.length >= 2);
      if (codes.length > 0) {
        setRechercheForm(prev => ({ ...prev, countries: [...new Set(codes)] as string[] }));
      }
    }
    
    // [RECHERCHE_STARTEN] - Recherche automatisch starten
    if (content.includes("[RECHERCHE_STARTEN]")) {
      hasAction = true;
      // Navigiere zum Recherche-Akkordeon
      setOpenAccordion("recherche");
      // NUR das Flag setzen - startLiveAnalysis() setzt isRunningLiveAnalysis selbst
      // und initialisiert die Schritte korrekt
      setAutoStartRecherche(true);
    }

    // [WEB_SUCHE:query] - Web-Suche über Tavily ausführen
    const webSearchMatch = content.match(/\[WEB_SUCHE:([^\]]+)\]/);
    if (webSearchMatch?.[1]) {
      hasAction = true;
      const searchQuery = webSearchMatch[1].trim();
      console.log("[Web-Suche] Trigger erkannt:", searchQuery);
      
      // Zeige Ladeanimation
      setIsRunningWebSearch(true);
      
      // Füge sofort eine "Suche läuft" Nachricht hinzu
      const searchingMsgId = `web-search-loading-${Date.now()}`;
      setSessionMessages(prev => [...prev, {
        id: searchingMsgId,
        role: "assistant" as const,
        content: `🔍 **Web-Suche läuft...**\n\n_Suche nach: "${searchQuery}"_`
      }]);
      
      // Web-Suche ausführen und Ergebnis in Chat einfügen
      (async () => {
        try {
          const res = await fetch("/api/web-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery })
          });
          const data = await res.json();
          
          // Entferne "Suche läuft" Nachricht
          setSessionMessages(prev => prev.filter(m => m.id !== searchingMsgId));
          
          if (data.success) {
            // Quellen als klickbare Markdown-Links extrahieren
            const sourcesFormatted = data.sources?.slice(0, 3).map((s: { title: string; url: string }) => {
              try {
                const domain = new URL(s.url).hostname.replace("www.", "");
                return `[${domain}](${s.url})`;
              } catch {
                return s.title;
              }
            }).join(" · ") || "keine";
            
            // Kurze Domain-Liste für Claude
            const sourcesDomains = data.sources?.slice(0, 3).map((s: { title: string; url: string }) => {
              try {
                return new URL(s.url).hostname.replace("www.", "");
              } catch {
                return s.title;
              }
            }).join(", ") || "keine";
            
            // Ergebnis an Claude senden (als System-Nachricht, nicht sichtbar)
            // Claude liest das Ergebnis und fasst es auf Deutsch zusammen
            const targetRef = openAccordion === "beratung" 
              ? voiceAssistantRef 
              : openAccordion === "markenname" 
                ? markennameVoiceRef 
                : rechercheVoiceRef;
            
            targetRef.current?.sendQuestion(
              `[SYSTEM: Web-Recherche Ergebnis für "${searchQuery}":\n${data.answer || "Keine Informationen gefunden."}\nQuellen: ${sourcesDomains}\nQuellen-Links: ${sourcesFormatted}\n\nBitte fasse das Ergebnis KURZ auf Deutsch zusammen und gib dem Kunden eine klare Empfehlung. Zeige die Quellen-Links am Ende deiner Antwort an! Zeige NICHT den englischen Text!]`
            );
          } else {
            console.error("[Web-Suche] Fehler:", data.error);
            // Zeige Fehlermeldung
            setSessionMessages(prev => [...prev, {
              id: `web-search-error-${Date.now()}`,
              role: "assistant" as const,
              content: `❌ **Web-Suche fehlgeschlagen**\n\n${data.error || "Unbekannter Fehler"}`
            }]);
          }
        } catch (err) {
          console.error("[Web-Suche] Fetch error:", err);
          // Entferne "Suche läuft" Nachricht bei Fehler
          setSessionMessages(prev => prev.filter(m => m.id !== searchingMsgId));
          setSessionMessages(prev => [...prev, {
            id: `web-search-error-${Date.now()}`,
            role: "assistant" as const,
            content: `❌ **Web-Suche fehlgeschlagen**\n\nNetzwerkfehler - bitte erneut versuchen.`
          }]);
        } finally {
          setIsRunningWebSearch(false);
        }
      })();
    }
    
    if (hasAction) {
      lastProcessedRechercheMsgIdRef.current = lastMsg.id;
    }
  }, [sessionMessages]);

  // Trigger-Erkennung für MARKENNAME (jetzt auch sessionMessages)
  const lastProcessedMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionMessages.length === 0) return;
    const lastMsg = sessionMessages[sessionMessages.length - 1];
    if (lastMsg?.role !== "assistant") return;
    if (lastMsg.id === lastProcessedMsgIdRef.current) return; // Bereits verarbeitet
    
    const content = lastMsg.content || "";
    let hasAction = false;
    
    // [LOGO_GENERIEREN:prompt] - Logo generieren mit Prompt aus Claude
    const logoMatch = content.match(/\[LOGO_GENERIEREN:([^\]]+)\]/);
    if (logoMatch?.[1] || content.includes("[LOGO_GENERIEREN]")) {
      hasAction = true;
      const brandName = manualNameInput || "Marke";
      // Extrahiere Prompt aus Trigger oder verwende Default
      const customPrompt = logoMatch?.[1]?.trim() || `Professional logo for "${brandName}", modern minimalist, clean vector style, white background`;
      
      // Starte Lade-Animation
      setIsGeneratingLogo(true);
      setLogoGenerationError(null);
      
      (async () => {
        try {
          console.log("=== LOGO GENERATION DEBUG ===");
          console.log("Custom prompt from Claude:", customPrompt);
          console.log("Trademark type:", trademarkType);
          console.log("Brand name:", brandName);
          console.log("==============================");
          
          // Generiere Logo mit fal.ai NanoBanana
          const logoResponse = await fetch("/api/generate-logo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: customPrompt,
              trademarkType,
              brandName,
            }),
          });
          
          const logoResult = await logoResponse.json();
          if (logoResult.imageUrl) {
            setTrademarkImageUrl(logoResult.imageUrl);
            // Zur Logo-Galerie hinzufügen
            const newLogoItem = {
              id: `logo-${Date.now()}`,
              url: logoResult.imageUrl,
              timestamp: new Date(),
              source: "generated" as const,
              prompt: customPrompt
            };
            setLogoGallery(prev => [newLogoItem, ...prev]);
            setSelectedLogoId(newLogoItem.id);
            // Lösche Referenzbild nach erfolgreicher Generierung
            setReferenceImageUrl(null);
          } else if (logoResult.error) {
            setLogoGenerationError(logoResult.error);
            // Bei Fehler: Claude informieren
            markennameVoiceRef.current?.sendQuestion(
              `[SYSTEM: Logo-Generierung fehlgeschlagen: ${logoResult.error}. Informiere den User und biete an, es nochmal zu versuchen.]`
            );
          }
        } catch (err) {
          console.error("Logo generation failed:", err);
          setLogoGenerationError("Logo-Generierung fehlgeschlagen");
        } finally {
          setIsGeneratingLogo(false);
        }
      })();
    }

    // [LOGO_BEARBEITEN:prompt] - Bestehendes Logo bearbeiten mit Flux Kontext
    const editMatch = content.match(/\[LOGO_BEARBEITEN:([^\]]+)\]/);
    console.log("LOGO_BEARBEITEN check:", { found: !!editMatch, prompt: editMatch?.[1], hasImage: !!trademarkImageUrl, content: content.substring(0, 200) });
    if (editMatch?.[1] && trademarkImageUrl) {
      hasAction = true;
      const editPrompt = editMatch[1].trim();
      const brandName = manualNameInput || "Marke";
      
      setIsGeneratingLogo(true);
      setLogoGenerationError(null);
      
      (async () => {
        try {
          console.log("=== LOGO EDIT DEBUG ===");
          console.log("Edit prompt:", editPrompt);
          console.log("Current image URL:", trademarkImageUrl);
          console.log("========================");
          
          const editResponse = await fetch("/api/edit-logo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: trademarkImageUrl,
              editPrompt,
              brandName,
            }),
          });
          
          const editResult = await editResponse.json();
          if (editResult.imageUrl) {
            setTrademarkImageUrl(editResult.imageUrl);
            // Bearbeitetes Logo zur Galerie hinzufügen
            const editedLogoItem = {
              id: `logo-${Date.now()}`,
              url: editResult.imageUrl,
              timestamp: new Date(),
              source: "edited" as const,
              prompt: editPrompt
            };
            setLogoGallery(prev => [editedLogoItem, ...prev]);
            setSelectedLogoId(editedLogoItem.id);
          } else if (editResult.error) {
            setLogoGenerationError(editResult.error);
          }
        } catch (err) {
          console.error("Logo edit failed:", err);
          setLogoGenerationError("Logo-Bearbeitung fehlgeschlagen");
        } finally {
          setIsGeneratingLogo(false);
        }
      })();
    }
    
    // [MARKE:Name] - Markenname ändern
    const markeMatch = content.match(/\[MARKE:([^\]]+)\]/);
    if (markeMatch?.[1]) {
      hasAction = true;
      setManualNameInput(markeMatch[1].trim());
    }
    
    // [KLASSEN:01,03,09] - Klassen ändern
    const klassenMatch = content.match(/\[KLASSEN:([^\]]+)\]/);
    if (klassenMatch?.[1]) {
      hasAction = true;
      const classes = klassenMatch[1].split(",").map((c: string) => parseInt(c.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 45);
      if (classes.length > 0) {
        setRechercheForm(prev => ({ ...prev, niceClasses: [...new Set(classes)] as number[] }));
      }
    }
    
    // [LAENDER:DE,US,EU] - Länder ändern
    const laenderMatch = content.match(/\[LAENDER:([^\]]+)\]/);
    if (laenderMatch?.[1]) {
      hasAction = true;
      const codes = laenderMatch[1].split(",").map((c: string) => c.trim().toUpperCase()).filter((c: string) => c.length === 2);
      if (codes.length > 0) {
        setRechercheForm(prev => ({ ...prev, countries: [...new Set(codes)] as string[] }));
      }
    }
    
    // [ART:wortmarke] - Markenart ändern
    const artMatch = content.match(/\[ART:(wortmarke|bildmarke|wort-bildmarke)\]/i);
    if (artMatch?.[1]) {
      hasAction = true;
      const art = artMatch[1].toLowerCase() as "wortmarke" | "bildmarke" | "wort-bildmarke";
      setTrademarkType(art);
      setIsTrademarkTypeConfirmed(true);
    }
    
    if (hasAction) {
      lastProcessedMsgIdRef.current = lastMsg.id;
    }
  }, [sessionMessages, manualNameInput, trademarkType]);

  // Auto-Complete: Beratung als abgeschlossen markieren wenn alle Kriterien erfüllt
  // (ohne Ref - prüft bei jeder Änderung und setzt Status nur wenn nötig)
  useEffect(() => {
    // Berücksichtigt State-Variablen UND Daten aus decisions (wie Banner)
    const decision = data?.decisions as any;
    const hasNameFromState = !!manualNameInput?.trim();
    const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
    const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
    
    const hasClassesFromState = (rechercheForm.niceClasses?.length ?? 0) > 0;
    const hasClassesFromDecisions = Array.isArray(decision?.niceClasses) && decision.niceClasses.length > 0;
    const hasClasses = hasClassesFromState || hasClassesFromDecisions;
    
    const hasCountriesFromState = (rechercheForm.countries?.length ?? 0) > 0;
    const hasCountriesFromDecisions = Array.isArray(decision?.countries) && decision.countries.length > 0;
    const hasCountries = hasCountriesFromState || hasCountriesFromDecisions;
    
    const allCriteriaFulfilled = hasName && hasClasses && hasCountries;
    const currentStatus = data?.steps?.beratung?.status;
    
    // Setze auf "completed" wenn alle Kriterien erfüllt und noch nicht completed
    if (allCriteriaFulfilled && currentStatus !== "completed") {
      void fetch(`/api/cases/${caseId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "beratung", status: "completed" }),
      }).then(() => mutate());
    }
  }, [manualNameInput, rechercheForm.niceClasses?.length, rechercheForm.countries?.length, data?.steps?.beratung?.status, data?.decisions, data?.case, caseId, mutate]);

  // Auto-Complete: Markenname als abgeschlossen markieren wenn Kriterien erfüllt
  useEffect(() => {
    // Berücksichtigt State-Variablen UND Daten aus decisions (wie Banner)
    const decision = data?.decisions as any;
    const hasNameFromState = !!manualNameInput?.trim();
    const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
    const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
    const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
    const hasLogo = !!trademarkImageUrl;
    
    // Wortmarke: nur Name nötig | Bild/Wort-Bild: Name + Logo nötig
    const isComplete = hasName && (!needsLogo || hasLogo);
    const currentStatus = data?.steps?.markenname?.status;
    
    // Setze auf "completed" wenn alle Kriterien erfüllt und noch nicht completed
    if (isComplete && currentStatus !== "completed") {
      void fetch(`/api/cases/${caseId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "markenname", status: "completed" }),
      }).then(() => mutate());
    }
  }, [manualNameInput, trademarkType, trademarkImageUrl, data?.steps?.markenname?.status, data?.decisions, data?.case, caseId, mutate]);

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
      const blacklist = ["markenrecht", "markenanmeldung", "markenschutz", "nizza", "klasse", "recherche", "beratung", "anmeldung", "namensfindung", "wortmarke", "bildmarke", "marke", "logo", "schutz"];
      
      // Einfach: Finde JEDEN Namen in Anführungszeichen
      const allQuoted = Array.from(summaryText.matchAll(/["'„""‚'']([^"'„""‚''\n\r]{2,40})["'„""‚'']/gi));
      for (const match of allQuoted) {
        const name = match[1].trim();
        if (name.length >= 2 && !blacklist.some(b => name.toLowerCase().includes(b))) {
          return name;
        }
      }
      
      // Fallback: Namen in Klammern
      const inParens = summaryText.match(/\(([A-Z][a-zA-ZäöüÄÖÜß]{2,30})\)/);
      if (inParens?.[1]) {
        const name = inParens[1].trim();
        if (!blacklist.some(b => name.toLowerCase().includes(b))) return name;
      }
      
      return "";
    };

    const extractClassesFromSummary = (): number[] => {
      const m = summaryText.match(/\bklasse(?:n)?\s*:?\s*([^\n\r]{1,80})/i);
      if (!m?.[1]) return [];
      const nums = Array.from(m[1].matchAll(/\b(\d{1,2})\b/g)).map((x) => Number(x[1]));
      const valid = nums.filter((n) => Number.isFinite(n) && n >= 1 && n <= 45);
      return [...new Set(valid)]; // Duplikate entfernen
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
    // Priorität: React State > Decisions > Case > Summary
    const name = manualNameInput || nameFromDecisions || nameFromCase || extractNameFromSummary();

    const classesFromDecisions = Array.isArray(decision?.niceClasses)
      ? decision.niceClasses
          .map((n: any) => Number(n))
          .filter((n: any) => Number.isFinite(n) && n >= 1 && n <= 45)
      : [];

    // Priorität: React State > Decisions (kein Summary-Fallback mehr)
    const classes = rechercheForm.niceClasses.length > 0 
      ? rechercheForm.niceClasses 
      : classesFromDecisions;

    const countriesFromDecisions = Array.isArray(decision?.countries)
      ? decision.countries.map((c: any) => String(c || "").trim()).filter(Boolean)
      : [];

    // Priorität: React State > Decisions (kein Summary-Fallback mehr)
    const countries = rechercheForm.countries.length > 0 
      ? rechercheForm.countries 
      : countriesFromDecisions;

    const countryLabelByCode = new Map(
      COUNTRY_OPTIONS.map((c) => [String(c.code || "").toUpperCase(), String(c.label || "")])
    );

    const countriesLabel = countries
      .map((c: string) => {
        const upper = String(c || "").toUpperCase();
        return countryLabelByCode.get(upper) || upper;
      })
      .filter(Boolean);

    // Markenart extrahieren - einfache Logik
    const extractTrademarkTypeFromSummary = (): string => {
      // Prüfe ob es nur eine Frage ist (endet mit ? oder enthält "ob", "soll", "möchtest")
      const isQuestion = /\?\s*$/.test(summaryText) || 
        /\b(ob|soll|möchtest|welche variante)\b.*\b(wortmarke|bildmarke)/i.test(summaryLower);
      
      // Wenn Frage und keine klare Entscheidung, ignorieren
      if (isQuestion && !/\b(entscheid|gewählt|gehen wir mit|möchte die|möchte)\b/i.test(summaryLower)) {
        return "";
      }
      
      // Priorität: Wort-/Bildmarke zuerst
      if (/wort-?\/?\s*bildmarke/i.test(summaryLower)) return "wort-bildmarke";
      
      // Zähle Vorkommen - die häufigere gewinnt
      const bildCount = (summaryLower.match(/\bbildmarke\b/gi) || []).length;
      const wortCount = (summaryLower.match(/\bwortmarke\b/gi) || []).length;
      
      if (bildCount > 0 && wortCount > 0) {
        // Beide erwähnt - prüfe welche zuerst in "Marke/Thema:" steht
        const themaLine = summaryLower.match(/marke\/thema[^-\n]*/i)?.[0] || "";
        if (themaLine.includes("bildmarke")) return "bildmarke";
        if (themaLine.includes("wortmarke")) return "wortmarke";
        // Fallback: die häufigere
        return bildCount >= wortCount ? "bildmarke" : "wortmarke";
      }
      
      if (bildCount > 0) return "bildmarke";
      if (wortCount > 0) return "wortmarke";
      
      return "";
    };

    const typeFromDecisions = String(decision?.trademarkType || "").trim();
    const typeFromSummary = extractTrademarkTypeFromSummary();
    
    // Markenart gilt nur als "erfüllt" wenn:
    // 1. Aus Decisions vorhanden ODER
    // 2. User hat explizit gewählt (isTrademarkTypeConfirmed) ODER
    // 3. Aus Zusammenfassung erkannt
    const isTypeConfirmed = !!typeFromDecisions || isTrademarkTypeConfirmed || !!typeFromSummary;
    const detectedType = typeFromDecisions || (isTrademarkTypeConfirmed ? trademarkType : "") || typeFromSummary;
    
    const typeLabel = isTypeConfirmed 
      ? (detectedType === "wortmarke" ? "Wortmarke" 
        : detectedType === "bildmarke" ? "Bildmarke" 
        : detectedType === "wort-bildmarke" ? "Wort-/Bildmarke" 
        : "")
      : "";

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
        {chip("Art", typeLabel, !typeLabel)}
        {chip(
          "Klassen",
          classes.length === 45 
            ? "Alle" 
            : classes.length > 0 
              ? formatList(classes.map((n: number) => n < 10 ? `0${n}` : String(n)), 5) 
              : "",
          classes.length === 0
        )}
        {chip(
          "Länder",
          countries.length > 0 ? formatList(countries.map((c: string) => c.toUpperCase()), 4) : "",
          countries.length === 0
        )}
      </div>
    );
  }, [data?.case, data?.consultation?.summary, data?.decisions, sessionSummary, trademarkType, isTrademarkTypeConfirmed, manualNameInput, rechercheForm.niceClasses, rechercheForm.countries]);

  const renderMarkennameHeaderMeta = useCallback(() => {
    const hasName = !!manualNameInput?.trim();
    const hasType = isTrademarkTypeConfirmed;
    const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
    const hasLogo = !!trademarkImageUrl;
    
    const typeLabel = trademarkType === "wortmarke" ? "Wortmarke" 
      : trademarkType === "bildmarke" ? "Bildmarke" 
      : "Wort-/Bildmarke";

    const chip = (label: string, value: string, missing: boolean) => (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium max-w-[200px] ${
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
        {chip("Name", manualNameInput || "", !hasName)}
        {chip("Art", hasType ? typeLabel : "", !hasType)}
        {needsLogo && chip("Logo", "", !hasLogo)}
      </div>
    );
  }, [manualNameInput, trademarkType, isTrademarkTypeConfirmed, trademarkImageUrl]);

  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash || "";
      const hash = raw.startsWith("#") ? raw.slice(1) : raw;
      if (!hash) return;

      const map: Record<string, WorkflowStepId> = {
        beratung: "beratung",
        markenname: "markenname",
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

        // Daten werden jetzt automatisch übernommen (useEffect), kein Pop-up mehr nötig
        // Wenn noch keine Entscheidung gespeichert, automatisch als "accepted" markieren
        if (beratungDone && (hasUsefulDecisions || hasSummaryData) && !transferChoice) {
          void persistRechercheTransferChoice("accepted").catch(() => {});
        }
      }

      // Mark previous pending steps as skipped
      const stepOrder: WorkflowStepId[] = ["beratung", "markenname", "recherche", "ueberpruefung", "anmeldung", "kommunikation", "ueberwachung", "fristen"];
      const currentIndex = stepOrder.indexOf(next);
      if (currentIndex > 0) {
        for (let i = 0; i < currentIndex; i++) {
          const prevStepId = stepOrder[i];
          const prevStatus = data?.steps?.[prevStepId];
          if (prevStatus?.status === "pending" || !prevStatus) {
            void setStepStatus(prevStepId, "completed", { skipped: true, skippedAt: new Date().toISOString() });
          }
        }
      }

      // Set current step to in_progress if pending
      const currentStatus = data?.steps?.[next];
      if (currentStatus?.status === "pending" || !currentStatus) {
        void setStepStatus(next, "in_progress");
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
    if (!data || messagesLoaded) return;
    
    // Daten wurden geladen - messagesLoaded auf true setzen (auch wenn keine Nachrichten)
    setMessagesLoaded(true);
    
    // Falls Nachrichten vorhanden, diese laden
    if (data.consultation?.messages) {
      setSessionMessages(data.consultation.messages);
      if (data.consultation.summary) {
        setSessionSummary(data.consultation.summary);
        lastSummarySavedAtRef.current = Date.now();
        lastSummarySavedMessageCountRef.current = data.consultation.messages.length;
      }
    }
  }, [data, messagesLoaded]);

  // Recherche-Historie aus DB laden beim Start
  const rechercheHistoryLoadedRef = useRef(false);
  useEffect(() => {
    if (rechercheHistoryLoadedRef.current) return;
    if (!data?.case?.id) return;
    
    rechercheHistoryLoadedRef.current = true;
    
    fetch(`/api/cases/${data.case.id}/recherche-history`)
      .then(res => res.json())
      .then(historyData => {
        if (historyData.history && historyData.history.length > 0) {
          const loadedHistory = historyData.history.map((h: any) => ({
            id: h.id,
            keyword: h.keyword,
            riskScore: h.riskScore || 0,
            riskLevel: h.riskLevel || "low",
            trademarkType: h.trademarkType,
            classes: h.niceClasses || [],
            countries: h.countries || [],
            result: h.result
          }));
          setRechercheHistory(loadedHistory);
          
          // Letzte Recherche automatisch anzeigen (jetzt sortiert nach createdAt ASC, also letztes Element ist das neueste)
          const latest = loadedHistory[loadedHistory.length - 1];
          if (latest?.result) {
            setLiveAnalysisResult(latest.result);
            setActiveRechercheId(latest.id);
            setShowRechercheAnalysis(true);
            // Schritte aus result laden (falls vorhanden)
            if (latest.result?.steps && Array.isArray(latest.result.steps)) {
              setRechercheSteps(latest.result.steps);
            }
          }
        }
      })
      .catch(err => console.error("Failed to load recherche history:", err));
  }, [data?.case?.id]);

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
    
    // Event-Log: User- oder AI-Nachricht (vollständiger Text)
    if (message.role === "user") {
      logEvent("user_message", "User-Nachricht", message.content || "");
    } else if (message.role === "assistant") {
      logEvent("ai_message", "KI-Antwort", message.content || "");
    }
  }, [logEvent]);

  const handleDeleteConsultation = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/consultation`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Chat-Nachrichten und Zusammenfassung löschen
        setSessionMessages([]);
        setSessionSummary(null);
        setMessagesLoaded(false);
        lastSummarySavedAtRef.current = 0;
        lastSummarySavedMessageCountRef.current = 0;
        if (summaryDebounceTimeoutRef.current) {
          clearTimeout(summaryDebounceTimeoutRef.current);
          summaryDebounceTimeoutRef.current = null;
        }
        
        // Alle Beratungs-relevanten States zurücksetzen
        setManualNameInput("");
        setTrademarkType("");
        setIsTrademarkTypeConfirmed(false);
        setRechercheForm({
          trademarkName: "",
          countries: [],
          niceClasses: [],
          includeRelatedNiceClasses: true,
        });
        
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

  // Auto-Start Recherche wenn durch Claude getriggert
  // HINWEIS: Die Logik wurde in den Render-Block verschoben (siehe startLiveAnalysis)
  // Dieser useEffect ist nicht mehr notwendig, da die Live-Analyse direkt im Render gestartet wird

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
    if (!logoPrompt.trim() && !manualNameInput?.trim()) {
      setLogoGenerationError("Bitte gib einen Prompt oder Markennamen ein");
      return;
    }
    setIsGeneratingLogo(true);
    setLogoGenerationError(null);
    try {
      const brandName = manualNameInput || "Marke";
      
      // Call gpt-image-1 API - the API handles prompt optimization
      const response = await fetch("/api/generate-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: logoPrompt.trim() || "Modern, minimalist logo design",
          trademarkType,
          brandName,
          quality: "high",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Bildgenerierung fehlgeschlagen" }));
        throw new Error(err.error || "Bildgenerierung fehlgeschlagen");
      }

      const result = await response.json();
      if (result.imageUrl) {
        setTrademarkImageUrl(result.imageUrl);
        // Zur Logo-Galerie hinzufügen
        const newLogoItem = {
          id: `logo-${Date.now()}`,
          url: result.imageUrl,
          timestamp: new Date(),
          source: "generated" as const,
          prompt: logoPrompt.trim()
        };
        setLogoGallery(prev => [newLogoItem, ...prev]);
        setSelectedLogoId(newLogoItem.id);
        setShowLogoGeneratorModal(false);
        setLogoPrompt("");
        // Event-Log: KI-Logo generiert
        logEvent("logo_generate", "KI-Logo generiert", logoPrompt.trim() || "Automatisch generiert");
      } else {
        throw new Error("Kein Bild generiert");
      }
    } catch (e: unknown) {
      console.error("Failed to generate logo:", e);
      const message = e instanceof Error ? e.message : "Logo-Generierung fehlgeschlagen";
      setLogoGenerationError(message);
    } finally {
      setIsGeneratingLogo(false);
    }
  }, [logoPrompt, trademarkType, manualNameInput, logEvent]);

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

  async function setStepStatus(
    stepId: WorkflowStepId,
    status: "pending" | "in_progress" | "completed",
    metadata?: Record<string, any>
  ) {
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
  }

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

    if (!isOpening) {
      // When closing, clear the hash
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    // When opening, set the hash to sync sidebar and progress bar
    window.location.hash = `#${stepId}`;

    // Mark previous pending steps as skipped
    const stepOrder: WorkflowStepId[] = ["beratung", "markenname", "recherche", "ueberpruefung", "anmeldung", "kommunikation", "ueberwachung", "fristen"];
    const stepLabels: Record<WorkflowStepId, string> = {
      beratung: "Beratung", markenname: "Markenname", recherche: "Recherche",
      ueberpruefung: "Checkliste", anmeldung: "Anmeldung", kommunikation: "Kommunikation",
      ueberwachung: "Überwachung", fristen: "Fristen", analyse: "Analyse"
    };
    const currentIndex = stepOrder.indexOf(stepId);
    const skippedNames: string[] = [];
    if (currentIndex > 0) {
      for (let i = 0; i < currentIndex; i++) {
        const prevStepId = stepOrder[i];
        const prevStatus = getStepStatus(prevStepId);
        if (prevStatus.status === "pending") {
          skippedNames.push(stepLabels[prevStepId]);
          void setStepStatus(prevStepId, "completed", { skipped: true, skippedAt: new Date().toISOString() });
        }
      }
    }
    if (skippedNames.length > 0) {
      setSkippedStepsNotice(skippedNames);
      setTimeout(() => setSkippedStepsNotice(null), 5000);
    }

    const current = getStepStatus(stepId);
    if (current.status === "pending") {
      void setStepStatus(stepId, "in_progress");
    }

    // Scroll to accordion after it opens
    setTimeout(() => {
      const element = document.getElementById(`accordion-${stepId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
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
          {messagesLoaded ? (
            <ClaudeAssistant
              ref={voiceAssistantRef}
              caseId={caseId}
              onMessageSent={handleMessageSent}
              previousMessages={sessionMessages}
              previousSummary={(sessionSummary || consultation?.summary) || undefined}
              onDelete={handleDeleteConsultation}
              title="KI-Markenberater"
              subtitle="Erstberatung für deine Marke"
              alwaysShowMessages={sessionMessages.length > 0}
              systemPromptAddition={getBeratungPrompt({
                markenname: manualNameInput || "❌ fehlt",
                markenart: isTrademarkTypeConfirmed ? (trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke") : "❌ fehlt",
                klassen: rechercheForm.niceClasses?.length > 0 ? (rechercheForm.niceClasses.length === 45 ? "ALLE (1-45)" : rechercheForm.niceClasses.join(", ")) : "❌ fehlt",
                laender: rechercheForm.countries?.length > 0 ? rechercheForm.countries.join(", ") : "❌ fehlt",
                isTrademarkTypeConfirmed,
                trademarkType,
              })}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:h-[560px] flex items-center justify-center">
              <div className="text-gray-400 text-sm">Lade Beratung...</div>
            </div>
          )}
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
                  <div className="font-semibold text-sm truncate">Zusammenfassung</div>
                  <div className="text-xs text-white/85 truncate">Aktueller Stand der Beratung</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar p-4 space-y-4">
              {/* Markenname */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Markenname</label>
                <input
                  type="text"
                  value={manualNameInput}
                  onChange={(e) => {
                    setManualNameInput(e.target.value);
                    setRechercheForm(prev => ({ ...prev, trademarkName: e.target.value }));
                  }}
                  placeholder="Markenname eingeben..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Länder / Register */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Länder / Register</label>
                <button
                  type="button"
                  onClick={() => setCountriesOpen(true)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-left flex items-center justify-between hover:border-gray-300"
                >
                  <span className={rechercheForm.countries.length ? "text-gray-900" : "text-gray-400"}>
                    {rechercheForm.countries.length ? `${rechercheForm.countries.length} ausgewählt` : "Auswählen..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {rechercheForm.countries.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {rechercheForm.countries.slice(0, 4).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded border border-teal-200">
                        {c}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechercheForm(prev => ({
                              ...prev,
                              countries: prev.countries.filter(country => country !== c)
                            }));
                          }}
                          className="hover:text-teal-900 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {rechercheForm.countries.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{rechercheForm.countries.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Nizza-Klassen */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nizza-Klassen</label>
                <button
                  type="button"
                  onClick={() => setClassesOpen(true)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-left flex items-center justify-between hover:border-gray-300"
                >
                  <span className={rechercheForm.niceClasses.length ? "text-gray-900" : "text-gray-400"}>
                    {rechercheForm.niceClasses.length === 45 
                      ? "Alle Klassen" 
                      : rechercheForm.niceClasses.length 
                        ? `${rechercheForm.niceClasses.length} Klassen` 
                        : "Auswählen..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {rechercheForm.niceClasses.length > 0 && rechercheForm.niceClasses.length < 45 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {rechercheForm.niceClasses.slice(0, 6).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded border border-teal-200">
                        {c < 10 ? `0${c}` : c}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechercheForm(prev => ({
                              ...prev,
                              niceClasses: prev.niceClasses.filter(cls => cls !== c)
                            }));
                          }}
                          className="hover:text-teal-900 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {rechercheForm.niceClasses.length > 6 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{rechercheForm.niceClasses.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Markenart */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Markenart</label>
                <select
                  value={trademarkType}
                  onChange={(e) => {
                    const val = e.target.value as "" | "wortmarke" | "bildmarke" | "wort-bildmarke";
                    setTrademarkType(val);
                    setIsTrademarkTypeConfirmed(val !== "");
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Auswählen...</option>
                  <option value="wortmarke">Wortmarke</option>
                  <option value="bildmarke">Bildmarke</option>
                  <option value="wort-bildmarke">Wort-/Bildmarke</option>
                </select>
              </div>

            </div>
            
            {/* Weiter-Button - außerhalb des scrollbaren Bereichs */}
            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const targetAccordion = (trademarkType === "bildmarke" || trademarkType === "wort-bildmarke") 
                    ? "markenname" 
                    : "recherche";
                  setOpenAccordion(targetAccordion);
                  window.location.hash = `#${targetAccordion}`;
                  setTimeout(() => {
                    const el = document.getElementById(`accordion-${targetAccordion}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                className="w-full px-4 py-3 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Weiter</span>
              </button>
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

    const openTMSearchDebug = async () => {
      const keyword = (rechercheForm.trademarkName || "").trim();
      setShowTMSearchDebugModal(true);
      setTMSearchDebugLoading(true);
      setTMSearchDebugError(null);
      setTMSearchDebugPayload(null);

      if (!keyword) {
        setTMSearchDebugError("Bitte zuerst einen Markennamen eingeben.");
        setTMSearchDebugLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/tmsearch/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword }),
        });

        const json = await res.json().catch(() => null);
        setTMSearchDebugPayload(json);
        if (!res.ok) {
          setTMSearchDebugError((json && (json.error || json.message)) || `HTTP ${res.status}`);
        }
      } catch (e) {
        setTMSearchDebugError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setTMSearchDebugLoading(false);
      }
    };

    const startLiveAnalysis = async () => {
      // Falls durch Chat getriggert, Flag zurücksetzen
      if (autoStartRecherche) {
        setAutoStartRecherche(false);
      }
      
      const keyword = (rechercheForm.trademarkName || "").trim();
      const countries = rechercheForm.countries || [];
      const classes = (rechercheForm.niceClasses || []).filter((n: number) => Number.isFinite(n));
      const relatedClassesForAnalysis = rechercheForm.includeRelatedNiceClasses ? getRelatedNiceClasses(classes) : [];

      if (!keyword) {
        setLiveAnalysisError("Bitte zuerst einen Markennamen eingeben.");
        return;
      }
      if (countries.length === 0) {
        setLiveAnalysisError("Bitte mindestens ein Land/Register auswählen.");
        return;
      }
      if (classes.length === 0) {
        setLiveAnalysisError("Bitte mindestens eine Nizza-Klasse auswählen.");
        return;
      }

      setIsRunningLiveAnalysis(true);
      setLiveAnalysisError(null);
      setLiveAnalysisResult(null);
      // Alle 5 Schritte als "pending" initialisieren
      const initialSteps: RechercheStep[] = [
        { id: "search", name: "TMSearch API", status: "pending" },
        { id: "filter", name: "Filter anwenden", status: "pending" },
        { id: "details", name: "Details laden", status: "pending" },
        { id: "ai-analysis", name: "AI Analyse", status: "pending" },
        { id: "summary", name: "Zusammenfassung", status: "pending" },
      ];
      setRechercheSteps(initialSteps);
      rechercheStepsRef.current = initialSteps; // Ref auch initialisieren
      
      // Event-Log: Recherche gestartet
      logEvent("recherche_start", `Recherche gestartet für "${keyword}"`, `Klassen: ${classes.join(", ")} · Länder: ${countries.join(", ")}`);

      try {
        const res = await fetch("/api/tmsearch/analyze-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            countries,
            classes,
            includeRelatedClasses: rechercheForm.includeRelatedNiceClasses,
            relatedClasses: relatedClassesForAnalysis,
            trademarkType: "word",
            fetchDetailsTopN: 15,
          }),
        });

        if (!res.ok) {
          setLiveAnalysisError(`HTTP ${res.status}`);
          setIsRunningLiveAnalysis(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setLiveAnalysisError("Stream nicht verfügbar");
          setIsRunningLiveAnalysis(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === "step") {
                  setRechercheSteps(prev => {
                    const existing = prev.findIndex(s => s.id === data.step.id);
                    let updated: RechercheStep[];
                    if (existing >= 0) {
                      updated = [...prev];
                      updated[existing] = { ...updated[existing], ...data.step };
                    } else {
                      updated = [...prev, data.step];
                    }
                    // Ref synchron halten für Closure-Fix
                    rechercheStepsRef.current = updated;
                    return updated;
                  });
                }
                
                if (data.type === "result") {
                  const json = data.result;
                  setTMSearchDebugPayload(json);
                  
                  // Alle Steps auf "done" setzen (Recherche ist abgeschlossen)
                  const finalSteps = rechercheStepsRef.current.map(step => ({
                    ...step,
                    status: "done" as const
                  }));
                  rechercheStepsRef.current = finalSteps;
                  setRechercheSteps(finalSteps);
                  
                  // Schritte zum Result hinzufügen (für lokale UND DB-Speicherung)
                  const resultWithSteps = {
                    ...json,
                    steps: finalSteps
                  };
                  
                  setLiveAnalysisResult(resultWithSteps);
                  
                  const newId = `recherche-${Date.now()}`;
                  const newEntry = {
                    id: newId,
                    keyword: json.query.keyword,
                    riskScore: json.analysis.overallRiskScore,
                    riskLevel: json.analysis.overallRiskLevel,
                    trademarkType: json.query.trademarkType,
                    classes: json.query.classes,
                    countries: json.query.countries,
                    result: resultWithSteps // Mit Steps speichern!
                  };
                  setRechercheHistory(prev => [...prev, newEntry]);
                  setActiveRechercheId(newId);
                  setShowRechercheAnalysis(true);
                  
                  logEvent("recherche_complete", `Recherche abgeschlossen: ${json.analysis.overallRiskScore}% Risiko`, `${json.conflicts?.length || 0} Konflikte gefunden`);
                  
                  // KI-Berater: Analyse-Zusammenfassung mit Streaming anzeigen
                  const riskEmoji = json.analysis.overallRiskScore >= 80 ? "🔴" : json.analysis.overallRiskScore >= 50 ? "🟡" : "🟢";
                  const decisionText = json.analysis.decision === "go" ? "**Anmeldung empfohlen**" 
                    : json.analysis.decision === "go_with_changes" ? "**Anmeldung mit Anpassungen möglich**" 
                    : "**Anmeldung nicht empfohlen**";
                  
                  const topConflictNames = json.conflicts?.slice(0, 3).map((c: { name: string }) => c.name).join(", ") || "";
                  
                  const analyseMessage = `${riskEmoji} **Recherche für "${json.query.keyword}" abgeschlossen**

**Risiko:** ${json.analysis.overallRiskScore}% (${json.analysis.overallRiskLevel === "high" ? "Hoch" : json.analysis.overallRiskLevel === "medium" ? "Mittel" : "Niedrig"})
**Empfehlung:** ${decisionText}

${json.analysis.executiveSummary || ""}

${json.conflicts?.length > 0 ? `**Top-Konflikte:** ${topConflictNames}` : "Keine kritischen Konflikte gefunden."}

${json.analysis.recommendation || ""}

*Klicke auf einen Konflikt rechts für Details oder frag mich!*`;

                  // Streaming im KI-Berater
                  rechercheVoiceRef.current?.simulateStreaming(analyseMessage);
                  
                  // DEBUG: Logging für Recherche-Speicherung
                  console.log("[RECHERCHE-SAVE] Checking caseId:", caseId);
                  
                  if (caseId) {
                    console.log("[RECHERCHE-SAVE] Saving to DB:", json.query.keyword);
                    fetch(`/api/cases/${caseId}/recherche-history`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        keyword: json.query.keyword,
                        trademarkType: json.query.trademarkType,
                        countries: json.query.countries,
                        niceClasses: json.query.classes,
                        riskScore: json.analysis.overallRiskScore,
                        riskLevel: json.analysis.overallRiskLevel,
                        result: resultWithSteps
                      })
                    }).then(saveRes => {
                      console.log("[RECHERCHE-SAVE] Response status:", saveRes.status);
                      return saveRes.json();
                    }).then(saveData => {
                      console.log("[RECHERCHE-SAVE] Response data:", saveData);
                      if (saveData.entry?.id) {
                        setRechercheHistory(prev => prev.map(r => 
                          r.id === newId ? { ...r, id: saveData.entry.id } : r
                        ));
                        setActiveRechercheId(saveData.entry.id);
                      } else if (saveData.error === "Fall nicht gefunden") {
                        // Fall existiert noch nicht in DB - ignorieren (lokaler State reicht)
                        console.log("[RECHERCHE-SAVE] Case not in DB yet, keeping local state");
                      } else if (saveData.error) {
                        console.error("[RECHERCHE-SAVE] Server error:", saveData.error);
                      }
                    }).catch(err => console.error("[RECHERCHE-SAVE] Failed:", err));
                  } else {
                    console.warn("[RECHERCHE-SAVE] SKIPPED - No caseId available!");
                  }
                }
                
                if (data.type === "error") {
                  setLiveAnalysisError(data.error || "Unbekannter Fehler");
                }
                
                if (data.type === "done") {
                  setIsRunningLiveAnalysis(false);
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
          }
        }
      } catch (e) {
        setLiveAnalysisError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setIsRunningLiveAnalysis(false);
      }
    };

    // Auto-Start: Wenn durch Chat getriggert, Live-Analyse starten
    if (autoStartRecherche && !isRunningLiveAnalysis) {
      startLiveAnalysis();
    }

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

    // Handler für Recherche-Historie
    const handleSelectRecherche = (id: string) => {
      const selected = rechercheHistory.find(r => r.id === id);
      if (selected) {
        setLiveAnalysisResult(selected.result);
        setActiveRechercheId(id);
        setShowRechercheAnalysis(true);
        // Schritte aus result laden (falls vorhanden)
        if (selected.result?.steps && Array.isArray(selected.result.steps)) {
          setRechercheSteps(selected.result.steps);
        } else {
          setRechercheSteps([]); // Keine Schritte vorhanden (alte Recherchen)
        }
      }
    };
    const handleNewRecherche = () => {
      // Nur Markenname leeren, Rest beibehalten (Markenart, Klassen, Land)
      setRechercheForm(prev => ({
        ...prev,
        trademarkName: "", // Nur Markenname leeren
      }));
      setManualNameInput("");
      // trademarkType, countries, niceClasses bleiben erhalten
      setShowRechercheAnalysis(false);
      setActiveRechercheId(null);
      setRechercheFormValidationAttempted(false);
      setLiveAnalysisError(null);
    };
    const handleDeleteRecherche = async (id: string) => {
      setRechercheHistory(prev => prev.filter(r => r.id !== id));
      if (activeRechercheId === id) {
        setActiveRechercheId(null);
        setLiveAnalysisResult(null);
        setShowRechercheAnalysis(false);
      }
      // Aus DB löschen
      if (caseId) {
        try {
          await fetch(`/api/cases/${caseId}/recherche-history?id=${id}`, { method: "DELETE" });
        } catch (e) {
          console.error("Failed to delete recherche from DB:", e);
        }
      }
    };

    // ANALYSE-ANSICHT
    if (showRechercheAnalysis && liveAnalysisResult) {
      const { analysis, conflicts, query } = liveAnalysisResult;
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-full">
            <RechercheHistoryBanner history={rechercheHistory} activeId={activeRechercheId} showingAnalysis={true} onSelectRecherche={handleSelectRecherche} onDeleteRecherche={handleDeleteRecherche} onNewRecherche={handleNewRecherche} />
            {/* Recherche-Schritte auch in der Analyse-Ansicht anzeigen */}
            {rechercheSteps.length > 0 && (
              <div className="mt-2">
                <RechercheSteps steps={rechercheSteps} isRunning={false} />
              </div>
            )}
          </div>
                    <ClaudeAssistant ref={rechercheVoiceRef} caseId={caseId} onMessageSent={(msg) => setSessionMessages((prev) => [...prev, msg])} previousMessages={sessionMessages} title="KI-Analyseberater" subtitle="Fragen zur Analyse" alwaysShowMessages={sessionMessages.length > 0} systemPromptAddition={`Die Recherche für "${query.keyword}" ist abgeschlossen. Risiko: ${analysis.overallRiskScore}%. Hilf dem Kunden die Ergebnisse zu verstehen.`} />
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-white" /></div>
                  <div className="min-w-0"><div className="font-semibold text-sm truncate">Kollisionsrisiko</div><div className="text-xs text-white/85 truncate">KI-Bewertung</div></div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
                {/* Parameter-Übersicht */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3 pb-3 border-b border-gray-200">
                  <div><span className="text-gray-500 font-medium">Marke:</span> <span className="font-semibold text-gray-900">&quot;{query.keyword}&quot;</span></div>
                  <div><span className="text-gray-500 font-medium">Art:</span> <span className="font-semibold text-gray-900">{query.trademarkType === "wortmarke" || query.trademarkType === "word" ? "Wort" : query.trademarkType === "bildmarke" || query.trademarkType === "image" ? "Bild" : "Wort-/Bild"}</span></div>
                  <div><span className="text-gray-500 font-medium">Klassen:</span> <span className="font-semibold text-gray-900">{query.classes?.join(", ") || "-"}</span></div>
                  <div><span className="text-gray-500 font-medium">Länder:</span> <span className="font-semibold text-gray-900">{query.countries?.join(", ") || "-"}</span></div>
                </div>
                <div className={`p-4 rounded-lg border mb-4 ${analysis.decision === "no_go" ? "bg-red-50 border-red-200" : analysis.decision === "go_with_changes" ? "bg-orange-50 border-orange-200" : "bg-teal-50 border-teal-200"}`}>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${analysis.decision === "no_go" ? "bg-red-100 text-red-700 border-red-300" : analysis.decision === "go_with_changes" ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-teal-100 text-teal-700 border-teal-300"}`}>
                    {analysis.decision === "no_go" ? "NO-GO" : analysis.decision === "go_with_changes" ? "GO MIT ANPASSUNG" : "GO"}
                  </span>
                  <div className={`text-base font-semibold mt-2 ${analysis.decision === "no_go" ? "text-red-900" : analysis.decision === "go_with_changes" ? "text-orange-900" : "text-teal-900"}`}>
                    {analysis.decision === "no_go" ? "Aktuell nicht empfohlen" : analysis.decision === "go_with_changes" ? "Mit Anpassungen empfohlen" : "Anmeldung wahrscheinlich sinnvoll"}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <AnimatedRiskScore score={analysis.overallRiskScore} risk={analysis.overallRiskLevel} size="large" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">Konflikte</div>
                    <div className="text-3xl font-bold text-gray-900">{conflicts.length}</div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{analysis.executiveSummary}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-white" /></div>
                  <div className="min-w-0"><div className="font-semibold text-sm truncate">Top Konflikte</div><div className="text-xs text-white/85 truncate">{conflicts.length} Treffer</div></div>
                </div>
              </div>
              <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {conflicts.slice(0, 8).map((c, idx) => (
                    <div key={c.id || idx} className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${c.riskLevel === "high" ? "bg-red-50 border-red-200" : c.riskLevel === "medium" ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}
                      onClick={() => setSelectedConflict({ id: String(c.id || idx), name: c.name, register: c.office, applicationNumber: c.applicationNumber, registrationNumber: c.registrationNumber, status: c.status === "LIVE" ? "active" : "expired", classes: c.classes.map(Number), accuracy: c.accuracy || c.riskScore, applicationDate: c.dates?.applied || null, registrationDate: c.dates?.granted || null, holder: c.owner?.name, isFamousMark: false, reasoning: c.reasoning, riskLevel: c.riskLevel })}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">{c.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{c.office} · Kl. {c.classes.join(", ")}</div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${c.riskLevel === "high" ? "bg-red-100 text-red-700" : c.riskLevel === "medium" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>{c.riskScore}%</div>
                      </div>
                      {c.reasoning && <div className="text-xs text-gray-600 mt-2 line-clamp-2">{c.reasoning}</div>}
                    </div>
                  ))}
                  {conflicts.length === 0 && <div className="text-center py-8 text-gray-500"><Check className="w-8 h-8 mx-auto mb-2 text-teal-500" /><p className="text-sm">Keine kritischen Konflikte</p></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // EINGABE-ANSICHT
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Historie-Banner und Recherche-Schritte oben */}
        <div className="col-span-full space-y-2">
          {rechercheHistory.length > 0 && (
            <RechercheHistoryBanner history={rechercheHistory} activeId={activeRechercheId} showingAnalysis={false} onSelectRecherche={handleSelectRecherche} onDeleteRecherche={handleDeleteRecherche} onNewRecherche={handleNewRecherche} />
          )}
          {/* Recherche-Schritte - auch während der Recherche sichtbar */}
          {(isRunningLiveAnalysis || rechercheSteps.length > 0) && (
            <RechercheSteps steps={rechercheSteps} isRunning={isRunningLiveAnalysis} />
          )}
        </div>
        {/* Widget 1: KI-Berater (globaler Chat wie in Beratung/Markenname) */}
        {messagesLoaded ? (
        <ClaudeAssistant
          ref={rechercheVoiceRef}
          caseId={caseId}
          onMessageSent={(msg) => {
            setSessionMessages((prev) => [...prev, msg]);
          }}
          previousMessages={sessionMessages}
          title="KI-Rechercheberater"
          subtitle="Hilfe bei der Markenrecherche"
          alwaysShowMessages={sessionMessages.length > 0}
          autoConnect={sessionMessages.length > 0}
          systemPromptAddition={`
DU BIST: Ein Markenrechts-Experte mit 40 Jahren Erfahrung. Du weißt ALLES über Markenrecht. Sprich per DU.

AKTUELLER STAND:
- Markenname: ${rechercheForm.trademarkName || "❌ fehlt"}
- Klassen: ${baseNiceClasses.length > 0 ? baseNiceClasses.join(", ") : "❌ fehlt"}
- Länder: ${rechercheForm.countries?.length > 0 ? rechercheForm.countries.join(", ") : "❌ fehlt"}
- Art: ${trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke"}
- Recherche-Status: ${isRunningLiveAnalysis ? "⏳ LÄUFT GERADE" : "⚪ Nicht gestartet / bereit"}

Wir sind im RECHERCHE-Bereich. Hilf dem Kunden bei der Markenrecherche.

TRIGGER-SYSTEM (IMMER VERWENDEN!):
- Name ändern: [MARKE:Name]
- Klassen ändern: [KLASSEN:01,02,09]
- Länder ändern: [LAENDER:DE,EU,US]
- Recherche starten: [RECHERCHE_STARTEN]
- Web-Suche: [WEB_SUCHE:deine Suchanfrage]

═══════════════════════════════════════════════════════════
WEB-SUCHE (NEU!) - Für aktuelle Informationen aus dem Internet
═══════════════════════════════════════════════════════════

Du kannst im Internet recherchieren mit [WEB_SUCHE:query].

WANN WEB-SUCHE ANBIETEN:
1. Kunde nennt ein "exotisches" Land (CA, JP, CN, AU, etc.)
   → "Kanada hat besondere Anforderungen. Soll ich die aktuellen CIPO-Richtlinien recherchieren?"
   
2. Kunde fragt nach Gebühren/Kosten
   → "Ich kann die aktuellen Gebühren recherchieren. Soll ich das tun?"
   
3. Kunde fragt nach Fristen/Dauer
   → "Ich recherchiere die aktuellen Bearbeitungszeiten..."

4. Kunde will wissen, wie Klassenbeschreibung formuliert werden muss
   → "Jedes Amt hat eigene Anforderungen. Soll ich recherchieren?"

WANN NICHT SUCHEN:
- Bei DE, EU, US → Du kennst die Grundregeln bereits
- Wenn Kunde nur allgemeine Infos will
- Wenn Recherche bereits läuft

BEISPIEL-DIALOG:
User: "Ich will in Kanada anmelden"
Du: "Kanada (CIPO) hat strenge Anforderungen an Klassenbeschreibungen. 
     Soll ich eine Web-Recherche zu den aktuellen CIPO-Anforderungen machen?"

User: "Ja bitte"
Du: "Ich recherchiere die aktuellen CIPO-Anforderungen... 
     [WEB_SUCHE:CIPO Canada trademark class description requirements 2024]"

→ Das Ergebnis erscheint automatisch mit Quellen!

═══════════════════════════════════════════════════════════
MARKENRECHERCHE (Konflikte in Datenbanken prüfen)
═══════════════════════════════════════════════════════════

Wenn der Kunde die Recherche starten will (sagt "ja", "starten", "los", "ok", "recherchieren", "prüfen"):
1. Sage kurz was du tust
2. IMMER am Ende den Trigger setzen: [RECHERCHE_STARTEN]
3. Der Button zeigt dann automatisch den Ladekreis!

BEISPIEL:
User: "Ja, starte die Recherche"
Du: "Ich starte die Recherche für '${rechercheForm.trademarkName}' in ${rechercheForm.countries?.join(", ") || "DE"}... [RECHERCHE_STARTEN]"

❌ FALSCH: "Die Recherche läuft..." (ohne Trigger - Button reagiert nicht!)
✅ RICHTIG: "Ich starte die Recherche... [RECHERCHE_STARTEN]" (Button zeigt Ladekreis!)

═══════════════════════════════════════════════════════════
UNTERSCHIED WICHTIG:
- [RECHERCHE_STARTEN] → Sucht Konflikte in Markendatenbanken
- [WEB_SUCHE:...] → Sucht Infos im Internet (Anforderungen, Gebühren, etc.)
═══════════════════════════════════════════════════════════

NAVIGATION-TRIGGER (um zu anderem Bereich zu wechseln):
[WEITER:beratung]    → Zurück zur Beratung
[WEITER:markenname]  → Zum Logo-Bereich
[WEITER:checkliste]  → Zur Checkliste
[WEITER:anmeldung]   → Zur Anmeldung

NACH RECHERCHE-ERGEBNIS:
- Bei GO: "Sehr gut! Die Marke ist frei. Soll ich zur Checkliste weiterleiten? [WEITER:checkliste]"
- Bei NO-GO: Alternativen vorschlagen, NICHT automatisch weiterleiten

SELBST-CHECK: "Habe ich den Kunden richtig verstanden?" Bei Unsicherheit nachfragen.
`}
        />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-center h-[400px]">
            <div className="text-gray-400 text-sm">Lade Beratung...</div>
          </div>
        )}

        {/* Widget 2: Schnellfragen */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">Schnellfragen</div>
                <div className="text-xs text-white/85 truncate">Hilfe zur Recherche</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[
              { category: "RECHERCHE", questions: [
                "Was ist eine Markenrecherche?",
                "Warum sollte ich recherchieren?",
                "Was kostet eine Recherche?",
              ]},
              { category: "LÄNDER", questions: [
                "Welche Länder sollte ich wählen?",
                "Was ist der Unterschied EU vs. national?",
                "Wann brauche ich WIPO?",
              ]},
              { category: "KLASSEN", questions: [
                "Wie finde ich die richtige Klasse?",
                "Was sind verwandte Klassen?",
                "Wie viele Klassen brauche ich?",
              ]},
            ].map((cat) => (
              <div key={cat.category}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {cat.category}
                </div>
                <div className="space-y-1">
                  {cat.questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => rechercheVoiceRef.current?.sendQuestion(q)}
                      className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: Recherche-Felder */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">Recherche</div>
                <div className="text-xs text-white/85 truncate">Parameter festlegen</div>
              </div>
            </div>
            {/* API Debug Button */}
            <button
              type="button"
              onClick={() => {
                setShowTMSearchDebugModal(true);
                setTMSearchDebugTab("request");
              }}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors"
              title="API Debug anzeigen"
            >
              API
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Markenname */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Markenname</label>
              <input
                value={rechercheForm.trademarkName}
                onChange={(e) => {
                  const name = e.target.value;
                  setRechercheForm((prev) => ({ ...prev, trademarkName: name }));
                  setManualNameInput(name);
                }}
                placeholder="z.B. TechFlow, BrandX..."
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 ${
                  trademarkNameMissing ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-teal-100"
                }`}
              />
            </div>

            {/* Länder */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Länder / Register</label>
              <button
                type="button"
                onClick={() => setCountriesOpen(true)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-left flex items-center justify-between ${
                  countriesMissing ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={rechercheForm.countries.length ? "text-gray-900" : "text-gray-400"}>
                  {rechercheForm.countries.length ? `${rechercheForm.countries.length} ausgewählt` : "Auswählen..."}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {rechercheForm.countries.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {rechercheForm.countries.slice(0, 4).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded border border-teal-200">
                      {c}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRechercheForm(prev => ({
                            ...prev,
                            countries: prev.countries.filter(country => country !== c)
                          }));
                        }}
                        className="hover:text-teal-900 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {rechercheForm.countries.length > 4 && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      +{rechercheForm.countries.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Nizza-Klassen */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nizza-Klassen</label>
              <button
                type="button"
                onClick={() => setClassesOpen(true)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-left flex items-center justify-between ${
                  classesMissing ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={baseNiceClasses.length ? "text-gray-900" : "text-gray-400"}>
                  {baseNiceClasses.length ? (isAllClassesSelected ? "Alle Klassen" : `${baseNiceClasses.length} Klassen`) : "Auswählen..."}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {baseNiceClasses.length > 0 && !isAllClassesSelected && (
                <>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {baseNiceClasses.slice(0, 6).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded border border-teal-200">
                        {c < 10 ? `0${c}` : c}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechercheForm(prev => ({
                              ...prev,
                              niceClasses: prev.niceClasses.filter(cls => cls !== c)
                            }));
                          }}
                          className="hover:text-teal-900 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {baseNiceClasses.length > 6 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{baseNiceClasses.length - 6}
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!rechercheForm.includeRelatedNiceClasses}
                      onChange={(e) => setRechercheForm((prev) => ({ ...prev, includeRelatedNiceClasses: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
                    />
                    <span className="text-xs text-gray-600">Verwandte Klassen prüfen</span>
                  </label>
                  {rechercheForm.includeRelatedNiceClasses && relatedClasses.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {relatedClasses.slice(0, 8).map((c) => (
                        <span key={c} className="inline-flex items-center px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-300">
                          {c < 10 ? `0${c}` : c}
                        </span>
                      ))}
                      {relatedClasses.length > 8 && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                          +{relatedClasses.length - 8}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Markenart */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Markenart</label>
              <select
                value={trademarkType}
                onChange={(e) => { 
                  const val = e.target.value as "" | "wortmarke" | "bildmarke" | "wort-bildmarke";
                  setTrademarkType(val); 
                  setIsTrademarkTypeConfirmed(val !== ""); 
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Auswählen...</option>
                <option value="wortmarke">Wortmarke</option>
                <option value="wort-bildmarke">Wort-/Bildmarke</option>
                <option value="bildmarke">Bildmarke</option>
              </select>
            </div>
          </div>

          {/* Footer: Buttons */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
            {(liveAnalysisError || rechercheStartError) && (
              <div className="px-2 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {liveAnalysisError || rechercheStartError}
              </div>
            )}
            {isRunningLiveAnalysis ? (
              <div className="flex gap-2">
                <div className="flex-1 py-2.5 px-4 bg-teal-100 text-teal-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-teal-700 rounded-full animate-spin" />
                  <span>Analysiere...</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRunningLiveAnalysis(false)}
                  className="px-4 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void startLiveAnalysis()}
                disabled={isSavingRechercheForm || isStartingRecherche}
                className="w-full py-2.5 px-4 s-gradient-button text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Recherche starten</span>
              </button>
            )}
          </div>
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

        {/* Tab 1: Markenname - 3-Widget Layout */}
        {markennameTab === "markenname" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Widget 1: KI-Berater */}
            <ClaudeAssistant
              ref={markennameVoiceRef}
              caseId={caseId}
              onMessageSent={(msg) => {
                setSessionMessages((prev) => [...prev, msg]);
              }}
              onImageUploaded={(url) => setTrademarkImageUrl(url)}
              showImageUpload={true}
              previousMessages={sessionMessages}
              title="KI-Namensberater"
              subtitle="Beratung zu Markenname & -art"
              alwaysShowMessages={sessionMessages.length > 0}
              autoConnect={sessionMessages.length > 0}
              systemPromptAddition={`
DU BIST: Ein erfahrener LOGO-DESIGNER und Markenrechts-Experte mit 20+ Jahren Erfahrung. Sprich per DU.

AKTUELLER STAND:
- Markenname: ${manualNameInput || "❌ fehlt"}
- Markenart: ${trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke"}
- Klassen: ${rechercheForm.niceClasses?.length > 0 ? rechercheForm.niceClasses.map((n: number) => n < 10 ? `0${n}` : n).join(", ") : "❌ fehlt"}
- Länder: ${rechercheForm.countries.length > 0 ? rechercheForm.countries.join(", ") : "❌ fehlt"}
- Logo: ${trademarkImageUrl ? "✅ vorhanden" : "❌ fehlt"}

🎨 LOGO-DESIGN-EXPERTISE:

GUTE MARKENLOGOS müssen:
- Einfach & einprägsam (in 2 Sekunden erkennbar)
- In klein (Favicon) UND groß funktionieren
- In Schwarz/Weiß noch erkennbar sein
- Zeitlos sein (keine kurzlebigen Trends)
- Zur Branche passen

WENN USER EIN REFERENZBILD HOCHLÄDT - STRUKTURIERTE ANALYSE:
1. **STIL:** Minimalistisch/Vintage/Modern/Abstrakt/Handgezeichnet
2. **FARBEN:** Hauptfarben + Palette (warm/kalt/monochrom) - WICHTIG für Logo-Prompt!
3. **FORMEN:** Geometrisch/Organisch, Linien, Symmetrie
4. **STIMMUNG:** Professionell/Verspielt/Luxuriös/Bodenständig

⚠️ FARBEN AUS REFERENZBILD ÜBERNEHMEN:
Wenn User ein Referenzbild hochlädt und die Farben übernehmen will:
- Analysiere die EXAKTEN Farben im Bild (z.B. "sky blue #87CEEB", "sunset orange #FF6B35")
- Nenne diese Farben EXPLIZIT im Logo-Prompt!
- Beispiel: Bild zeigt Sonnenuntergang → Prompt: "...sky blue and warm sunset orange colors..."

WENN REFERENZBILD UNGEEIGNET FÜR LOGO (z.B. Foto, zu detailliert):
→ Erkläre freundlich WARUM es als Logo nicht optimal ist
→ Schlage vor, die STIMMUNG/FARBEN zu übernehmen, aber logo-gerecht umzusetzen
→ Beispiel: "Das Foto hat tolle Farben! Ich übernehme das Himmelblau und das warme Orange für dein Logo."

TRIGGER-SYSTEM:
- Name ändern: [MARKE:Name]
- Art ändern: [ART:bildmarke] oder [ART:wortmarke] oder [ART:wort-bildmarke]
- Logo NEU generieren: [LOGO_GENERIEREN:dein detaillierter prompt hier]
- Logo BEARBEITEN: [LOGO_BEARBEITEN:was soll geändert werden]
- Klassen: [KLASSEN:01,02]
- Länder: [LAENDER:DE,EU]

🔄 WANN BEARBEITEN vs. NEU GENERIEREN:
- User will KLEINES Element ändern (Farbe, Form, Element entfernen) → [LOGO_BEARBEITEN:...]
- User will KOMPLETT neues Design → [LOGO_GENERIEREN:...]

LOGO_BEARBEITEN Format (nur die Änderung beschreiben!):
[LOGO_BEARBEITEN:remove the person, keep everything else]
[LOGO_BEARBEITEN:change the color to blue]
[LOGO_BEARBEITEN:make the text bigger]

LOGO-PROMPT FORMAT (englisch, für KI-Bildgenerator):
⚠️⚠️⚠️ KRITISCH: Der Prompt im Trigger bestimmt das Logo! Nur was IM TRIGGER steht, wird generiert!
⚠️ FARBEN: Wenn User bestimmte Farben will → MUSS im Trigger stehen: "sky blue color", "orange tones" etc.
⚠️ MOTIV: Beschreibe NUR das gewünschte Logo-Motiv, KEINE Personen/Kameras/etc. es sei denn explizit gewünscht!

PFLICHT-ELEMENTE im Trigger:
1. Markenname: "${manualNameInput || "Brand"}"
2. Stil: minimalist/modern/vintage/etc.
3. FARBEN: Die gewünschten Farben EXPLIZIT nennen!
4. Form: geometric/organic/abstract

[LOGO_GENERIEREN:Logo for "${manualNameInput || "Brand"}", [stil], [FARBE 1] and [FARBE 2] colors, [form], vector style, clean design]

BEISPIELE:
- [LOGO_GENERIEREN:Logo for "Akasiel", modern minimalist, bright sky blue and white colors, abstract geometric shape, vector style, clean design]
- [LOGO_GENERIEREN:Logo for "Brand", elegant, deep ocean blue color, flowing wave shape, vector style]
- [LOGO_GENERIEREN:Logo for "TechCo", futuristic, electric blue and silver metallic colors, angular geometric, vector style]

UI-HINWEISE für den Kunden:
- Rechts: Eingabefeld für Namen + Dropdown für Markenart
- Buttons: "KI-Logo", "Referenz", "Logo hochladen"

WORKFLOW:
1. User beschreibt Logo-Wunsch ODER lädt Referenzbild hoch
2. Du analysierst und fragst nach Anpassungswünschen
3. Du sagst NUR: "Ich generiere dein Logo... 🎨" und setzt [LOGO_GENERIEREN:prompt]
4. ⚠️ STOPP! Schreibe NICHTS mehr nach dem Trigger! Das System generiert das Logo und zeigt es dem User.
5. Frage ob es gefällt oder Änderungen gewünscht sind
6. Wenn User sagt es gefällt → Frage "Sollen wir zur Recherche?" → Bei JA: [GOTO:recherche]
7. Wenn User kleine Änderung will (entferne X, ändere Farbe) → [LOGO_BEARBEITEN:remove X] oder [LOGO_BEARBEITEN:change color to blue]
8. Wenn User komplett neues Design will → [LOGO_GENERIEREN:...]

🛑 BLEIBE IM MARKENNAME-BEREICH! Gehe NIEMALS zu [GOTO:beratung]!
⚠️ Nach [LOGO_GENERIEREN:...] oder [LOGO_BEARBEITEN:...] KEINE weiteren Sätze - das System zeigt das Ergebnis!

⚠️ RECHTLICHER HINWEIS bei KI-Logos:
"KI-generierte Logos können als Marke geschützt werden. Für zusätzlichen Urheberrechtsschutz empfehle ich, das Logo nach der Generierung leicht anzupassen."
`}
            />

            {/* Widget 2: Schnellfragen */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">Schnellfragen</div>
                    <div className="text-xs text-white/85 truncate">Häufige Fragen zu Markennamen</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[
                  { category: "SCHUTZFÄHIGKEIT", questions: [
                    "Ist mein Name schutzfähig?",
                    "Was macht einen Namen schutzfähig?",
                    "Welche Namen sind nicht erlaubt?",
                  ]},
                  { category: "MARKENART", questions: [
                    "Welche Markenart passt zu mir?",
                    "Was ist der Unterschied?",
                    "Wann brauche ich eine Bildmarke?",
                  ]},
                  { category: "TIPPS", questions: [
                    "Wie finde ich einen starken Namen?",
                    "Was sind typische Fehler?",
                    "Fantasiename vs. beschreibend?",
                  ]},
                ].map((cat) => (
                  <div key={cat.category}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {cat.category}
                    </div>
                    <div className="space-y-1">
                      {cat.questions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => markennameVoiceRef.current?.sendQuestion(q)}
                          className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Markenname + Vorschau */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
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

              {/* Oben: Name + Dropdown */}
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualNameInput}
                    onChange={(e) => {
                      const name = e.target.value;
                      setManualNameInput(name);
                      setRechercheForm((prev) => ({ ...prev, trademarkName: name }));
                    }}
                    placeholder="Markenname eingeben"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                  />
                  <select
                    value={trademarkType}
                    onChange={(e) => { 
                      const val = e.target.value as "" | "wortmarke" | "bildmarke" | "wort-bildmarke";
                      setTrademarkType(val); 
                      setIsTrademarkTypeConfirmed(val !== ""); 
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                  >
                    <option value="">Auswählen...</option>
                    <option value="wortmarke">Wortmarke</option>
                    <option value="wort-bildmarke">Wort-/Bildmarke</option>
                    <option value="bildmarke">Bildmarke</option>
                  </select>
                </div>
              </div>

              {/* Mitte: Vorschau */}
              <div className="flex-1 min-h-[200px] flex items-center justify-center p-6 bg-white">
                {/* Lade-Animation bei Logo-Generierung */}
                {isGeneratingLogo ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      {/* Äußerer rotierender Ring */}
                      <div className="w-20 h-20 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
                      {/* Inneres pulsierendes Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-teal-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">Logo wird generiert...</div>
                      <div className="text-xs text-gray-500 mt-1">KI analysiert und gestaltet dein Design</div>
                    </div>
                  </div>
                ) : (
                <div className="text-center">
                  {trademarkType === "wortmarke" && (
                    <div className="text-3xl font-bold text-gray-900">
                      {manualNameInput || "Markenname"}
                    </div>
                  )}

                  {trademarkType === "bildmarke" && (
                    <>
                      {trademarkImageUrl ? (
                        <img
                          src={trademarkImageUrl}
                          alt="Bildmarke preview"
                          className="max-w-full max-h-64 object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-gray-400 text-sm">
                          Bild hochladen um Vorschau zu sehen
                        </div>
                      )}
                    </>
                  )}

                  {trademarkType === "wort-bildmarke" && (
                    <div className="flex flex-col items-center gap-2">
                      {trademarkImageUrl ? (
                        <img
                          src={trademarkImageUrl}
                          alt="Logo preview"
                          className="max-w-full max-h-64 object-contain"
                        />
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-300">
                            Logo
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {manualNameInput || "Markenname"}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Logo-Galerie - OBEN (direkt unter Vorschau) */}
              {logoGallery.length > 0 && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  {/* Header mit Aktionen */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Logo-Galerie ({logoGallery.length})</span>
                      {/* Alle auswählen Checkbox */}
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        <input
                          type="checkbox"
                          checked={checkedLogoIds.size === logoGallery.length && logoGallery.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedLogoIds(new Set(logoGallery.map(l => l.id)));
                            } else {
                              setCheckedLogoIds(new Set());
                            }
                          }}
                          className="w-3 h-3 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        Alle
                      </label>
                    </div>
                    {/* Aktions-Buttons */}
                    <div className="flex items-center gap-2">
                      {checkedLogoIds.size > 0 && (
                        <>
                          <button
                            onClick={() => {
                              // Download alle ausgewählten
                              checkedLogoIds.forEach(id => {
                                const logo = logoGallery.find(l => l.id === id);
                                if (logo) {
                                  const link = document.createElement("a");
                                  link.href = logo.url;
                                  link.download = `logo-${id}.png`;
                                  link.click();
                                }
                              });
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors"
                            title="Ausgewählte herunterladen"
                          >
                            <Download className="w-3 h-3" />
                            {checkedLogoIds.size}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`${checkedLogoIds.size} Logo(s) löschen?`)) {
                                setLogoGallery(prev => prev.filter(l => !checkedLogoIds.has(l.id)));
                                // Wenn aktuell ausgewähltes Logo gelöscht wird
                                if (selectedLogoId && checkedLogoIds.has(selectedLogoId)) {
                                  const remaining = logoGallery.filter(l => !checkedLogoIds.has(l.id));
                                  if (remaining.length > 0) {
                                    setSelectedLogoId(remaining[0].id);
                                    setTrademarkImageUrl(remaining[0].url);
                                  } else {
                                    setSelectedLogoId(null);
                                    setTrademarkImageUrl(null);
                                  }
                                }
                                setCheckedLogoIds(new Set());
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Ausgewählte löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                            {checkedLogoIds.size}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Logo Thumbnails */}
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {logoGallery.map((logo) => (
                      <div
                        key={logo.id}
                        className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedLogoId === logo.id 
                            ? "border-teal-500 ring-2 ring-teal-200" 
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        onClick={() => {
                          setSelectedLogoId(logo.id);
                          setTrademarkImageUrl(logo.url);
                        }}
                      >
                        <img 
                          src={logo.url} 
                          alt="Logo" 
                          className="w-full h-full object-contain bg-white"
                        />
                        {/* Checkbox oben rechts */}
                        <div 
                          className="absolute top-0.5 right-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedLogoIds.has(logo.id)}
                            onChange={(e) => {
                              const newSet = new Set(checkedLogoIds);
                              if (e.target.checked) {
                                newSet.add(logo.id);
                              } else {
                                newSet.delete(logo.id);
                              }
                              setCheckedLogoIds(newSet);
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500 cursor-pointer bg-white/80"
                          />
                        </div>
                        {/* Source Badge */}
                        <div className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-medium ${
                          logo.source === "generated" ? "bg-teal-500 text-white" :
                          logo.source === "edited" ? "bg-blue-500 text-white" :
                          "bg-gray-500 text-white"
                        }`}>
                          {logo.source === "generated" ? "KI" : logo.source === "edited" ? "Edit" : "↑"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unten: Buttons für Bild-Upload (nur bei Bild-/Wort-Bildmarke) */}
              {(trademarkType === "wort-bildmarke" || trademarkType === "bildmarke") && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  {imageUploadError && (
                    <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                      {imageUploadError}
                    </div>
                  )}
                  {/* Referenzbild Anzeige */}
                  {referenceImageUrl && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                      <img src={referenceImageUrl} alt="Referenz" className="w-10 h-10 object-cover rounded" />
                      <span className="text-xs text-blue-700 flex-1">Referenzbild für Logo-Generierung</span>
                      <button
                        type="button"
                        onClick={() => setReferenceImageUrl(null)}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Prüfe ob im Chat schon Logo-Wünsche besprochen wurden
                        const hasLogoContext = sessionMessages.some((m: any) => 
                          m.content?.toLowerCase().includes("logo") || 
                          m.content?.toLowerCase().includes("design") ||
                          m.content?.toLowerCase().includes("stil")
                        );
                        
                        if (hasLogoContext || referenceImageUrl) {
                          // Direkt generieren - KI hat schon Kontext oder Referenzbild
                          const refMsg = referenceImageUrl ? " Nutze das hochgeladene Referenzbild als Stilvorlage." : "";
                          markennameVoiceRef.current?.sendQuestion("Bitte generiere jetzt das Logo basierend auf unserer Besprechung." + refMsg);
                        } else {
                          // KI fragen was generiert werden soll
                          markennameVoiceRef.current?.sendQuestion("Ich möchte ein Logo generieren lassen. Wie soll es aussehen? Ich kann auch ein Referenzbild hochladen wenn ich einen bestimmten Stil möchte.");
                        }
                      }}
                      className="flex-1 px-3 py-2.5 s-gradient-button text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      KI-Logo
                    </button>
                    <label className="flex-1">
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
                          const url = URL.createObjectURL(file);
                          setReferenceImageUrl(url);
                          // Event-Log: Referenzbild hochgeladen
                          logEvent("logo_reference", "Referenzbild hochgeladen", file.name);
                          // Informiere KI-Assistent über das Referenzbild
                          markennameVoiceRef.current?.sendQuestion("Ich habe ein Referenzbild hochgeladen. Bitte nutze diesen Stil als Inspiration für mein Logo.");
                        }}
                        className="hidden"
                      />
                      <div className="cursor-pointer px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-700 text-center transition-colors flex items-center justify-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Referenz
                      </div>
                    </label>
                    <label className="flex-1">
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
                          // Hochgeladenes Logo zur Galerie hinzufügen
                          const uploadedLogoItem = {
                            id: `logo-${Date.now()}`,
                            url: url,
                            timestamp: new Date(),
                            source: "uploaded" as const
                          };
                          setLogoGallery(prev => [uploadedLogoItem, ...prev]);
                          setSelectedLogoId(uploadedLogoItem.id);
                          // Event-Log: Logo hochgeladen
                          logEvent("logo_upload", "Logo hochgeladen", file.name);
                          // Informiere KI-Assistent über das hochgeladene Logo
                          markennameVoiceRef.current?.sendQuestion("Ich habe mein eigenes Logo hochgeladen. Es ist jetzt in der Vorschau zu sehen.");
                        }}
                        className="hidden"
                      />
                      <div className="cursor-pointer px-3 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 text-center transition-colors flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Logo
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Markengenerator - 3-Widget Layout */}
        {markennameTab === "generator" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Widget 1: KI-Berater */}
            <ClaudeAssistant
              ref={markennameVoiceRef}
              caseId={caseId}
              onMessageSent={(msg) => {
                setSessionMessages((prev) => [...prev, msg]);
              }}
              previousMessages={sessionMessages}
              title="KI-Namensberater"
              subtitle="Hilfe beim Generieren"
              alwaysShowMessages={sessionMessages.length > 0}
              autoConnect={sessionMessages.length > 0}
              systemPromptAddition={`
DU BIST: Ein Markenrechts-Experte mit 40 Jahren Erfahrung. Du weißt ALLES über Markenrecht. Sprich per DU.

Wir sind im MARKENGENERATOR. Hilf dem Kunden kreative Namen zu finden.

AKTUELLER STAND:
- Basis-Name: ${manualNameInput || "❌ fehlt"}
- Stil: ${generatorStyle === "similar" ? "Ähnlich" : generatorStyle === "modern" ? "Modern" : generatorStyle === "creative" ? "Kreativ" : "Seriös"}
- Keywords: ${generatorKeywords || "keine"}
- Shortlist: ${shortlist.length} Namen

TRIGGER-SYSTEM:
- Wenn Kunde einen Namen wählt → [MARKE:Name]
- Web-Suche: [WEB_SUCHE:Suchanfrage]

🔍 WEB-SUCHE - PROAKTIV NUTZEN!
Wenn der Kunde einen Namen nennt/wählt, prüfe SOFORT ob Firmen/Marken existieren:
User: "Ich möchte Accelari nehmen"
Du: "Gute Wahl! Ich prüfe kurz ob es schon Firmen mit diesem Namen gibt... [MARKE:Accelari] [WEB_SUCHE:Accelari company brand products Germany Europe]"

🛑 KRITISCH: Wenn du "Ich prüfe/schaue..." sagst, MUSST du [WEB_SUCHE:...] setzen!

SELBST-CHECK: "Habe ich den Kunden richtig verstanden?" Bei Unsicherheit nachfragen.
`}
            />

            {/* Widget 2: Schnellfragen */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">Schnellfragen</div>
                    <div className="text-xs text-white/85 truncate">Tipps für den Generator</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[
                  { category: "STIL", questions: [
                    "Welcher Stil passt zu meiner Branche?",
                    "Was ist der Unterschied zwischen den Stilen?",
                    "Wann sollte ich 'Ähnlich' wählen?",
                  ]},
                  { category: "KEYWORDS", questions: [
                    "Welche Keywords sind sinnvoll?",
                    "Wie viele Keywords sollte ich eingeben?",
                    "Kann ich mehrere Sprachen mischen?",
                  ]},
                  { category: "AUSWAHL", questions: [
                    "Wie wähle ich den besten Namen?",
                    "Was macht einen Namen einzigartig?",
                    "Sollte ich mehrere Namen testen?",
                  ]},
                ].map((cat) => (
                  <div key={cat.category}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {cat.category}
                    </div>
                    <div className="space-y-1">
                      {cat.questions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => markennameVoiceRef.current?.sendQuestion(q)}
                          className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Generator + Shortlist */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">Generator</div>
                    <div className="text-xs text-white/85 truncate">KI-Namensvorschläge</div>
                  </div>
                </div>
                {shortlist.length > 0 && (
                  <span className="text-xs font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                    {shortlist.length} in Shortlist
                  </span>
                )}
              </div>

              {/* Oben: Stil-Dropdown + Keywords */}
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-2 mb-2">
                  <select
                    value={generatorStyle}
                    onChange={(e) => setGeneratorStyle(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="similar">Ähnlich</option>
                    <option value="modern">Modern</option>
                    <option value="creative">Kreativ</option>
                    <option value="serious">Seriös</option>
                  </select>
                  <button
                    type="button"
                    onClick={generateSuggestions}
                    disabled={isGeneratingNames || !manualNameInput.trim()}
                    className="px-4 py-2 s-gradient-button text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingNames ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generieren
                  </button>
                </div>
                <input
                  value={generatorKeywords}
                  onChange={(e) => setGeneratorKeywords(e.target.value)}
                  placeholder="Keywords eingeben (optional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Mitte: Vorschläge + Shortlist */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                {nameGenError && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{nameGenError}</span>
                  </div>
                )}

                {/* Vorschläge */}
                {nameSuggestions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>Vorschläge</span>
                      <span className="text-teal-600">{nameSuggestions.length}</span>
                    </div>
                    <div className="space-y-1">
                      {nameSuggestions.slice(0, 5).map((s) => {
                        const isInShortlist = shortlist.some((x) => x.name === s.name);
                        return (
                          <div
                            key={s.name}
                            className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                              isInShortlist ? "bg-teal-50 border border-teal-200" : "bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <span className="font-medium text-gray-900 truncate">{s.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isInShortlist) return;
                                setShortlist((prev) => [
                                  { name: s.name, riskLevel: "unknown" as const, riskScore: 0, conflicts: 0, criticalCount: 0 },
                                  ...prev,
                                ].slice(0, 10));
                              }}
                              disabled={isInShortlist}
                              className={`ml-2 px-2 py-1 rounded text-xs ${
                                isInShortlist ? "text-teal-600" : "text-gray-500 hover:text-teal-600"
                              }`}
                            >
                              {isInShortlist ? <Check className="w-3 h-3" /> : "+"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shortlist */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                    <span>Shortlist</span>
                    <span className="text-gray-400">{shortlist.length}/10</span>
                  </div>
                  {shortlist.length > 0 ? (
                    <div className="space-y-1">
                      {shortlist.map((item) => (
                        <div
                          key={item.name}
                          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                            item.riskLevel === "low" ? "bg-green-50" :
                            item.riskLevel === "medium" ? "bg-orange-50" :
                            item.riskLevel === "high" ? "bg-red-50" : "bg-white border border-gray-200"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            {item.riskLevel !== "unknown" && (
                              <span className={`ml-2 text-xs ${
                                item.riskLevel === "low" ? "text-green-600" :
                                item.riskLevel === "medium" ? "text-orange-600" : "text-red-600"
                              }`}>
                                {item.riskScore}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {item.riskLevel === "unknown" && (
                              <button
                                type="button"
                                onClick={() => quickCheckName(item.name)}
                                disabled={isCheckingManualName}
                                className="px-2 py-1 text-xs text-teal-600 hover:bg-teal-50 rounded"
                              >
                                Prüfen
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShortlist((prev) => prev.filter((x) => x.name !== item.name))}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-gray-400">
                      Füge Namen zur Shortlist hinzu
                    </div>
                  )}
                </div>
              </div>

              {/* Unten: Manuell hinzufügen + Weiter */}
              <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name manuell eingeben..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.currentTarget;
                        const name = input.value.trim();
                        if (!name || shortlist.some((x) => x.name === name)) return;
                        setShortlist((prev) => [
                          { name, riskLevel: "unknown" as const, riskScore: 0, conflicts: 0, criticalCount: 0 },
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
                      if (!name || shortlist.some((x) => x.name === name)) return;
                      setShortlist((prev) => [
                        { name, riskLevel: "unknown" as const, riskScore: 0, conflicts: 0, criticalCount: 0 },
                        ...prev,
                      ].slice(0, 10));
                      input.value = "";
                    }}
                    className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAccordion("recherche")}
                  disabled={shortlist.length === 0}
                  className="w-full py-2.5 px-4 s-gradient-button text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Zur Recherche
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalyseContent = () => {
    // Prioritize live analysis results if available
    if (liveAnalysisResult) {
      const { analysis, conflicts, stats, query } = liveAnalysisResult;
      const effectiveRiskScore = analysis.overallRiskScore;
      const effectiveRiskLevel = analysis.overallRiskLevel;
      const conflictCount = conflicts.length;

      const decisionTier = analysis.decision === "no_go" ? "no_go" : analysis.decision === "go_with_changes" ? "adjust" : "go";

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

      const riskLevelLabel = effectiveRiskLevel === "high" ? "Hohes Risiko" : effectiveRiskLevel === "medium" ? "Mittleres Risiko" : "Geringes Risiko";
      const riskLevelColor = effectiveRiskLevel === "high" ? "text-red-600" : effectiveRiskLevel === "medium" ? "text-orange-600" : "text-teal-600";

      return (
        <>
        <div className="space-y-6">
          {/* Live Analysis Banner */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div>
                <div className="font-semibold">Live KI-Analyse</div>
                <div className="text-sm text-white/80">
                  Keyword: &quot;{query.keyword}&quot; · {stats.totalFiltered} Treffer analysiert · {liveAnalysisResult.isTestMode ? "Demo-Modus" : "Produktiv"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveAnalysisResult(null)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Zurücksetzen
            </button>
          </div>

          {/* Three Widget Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget 1: KI-Berater */}
            <ClaudeAssistant
              ref={analyseVoiceRef}
              caseId={caseId}
              onMessageSent={handleMessageSent}
              previousMessages={sessionMessages}
              title="KI-Analyseberater"
              subtitle="Fragen zur Markenrecherche"
              alwaysShowMessages={sessionMessages.length > 0}
              systemPromptAddition={`
Du bist ein Markenrechts-Experte und erklärst dem Kunden die Analyse-Ergebnisse.

AKTUELLER ANALYSE-STAND:
- Keyword: "${query.keyword}"
- Risiko-Score: ${effectiveRiskScore}%
- Risiko-Level: ${riskLevelLabel}
- Anzahl Konflikte: ${conflictCount}
- Entscheidung: ${decisionConfig.badge}

TOP KONFLIKTE:
${conflicts.slice(0, 5).map(c => `- "${c.name}" (${c.office}, ${c.riskScore}% Risiko)`).join("\n")}

DEINE AUFGABEN:
1. Erkläre die Analyse verständlich
2. Beantworte Fragen zu einzelnen Konflikten
3. Schlage Alternativen vor wenn nötig
4. Empfehle nächste Schritte

Antworte kurz und prägnant. Per DU.
`}
            />

            {/* Widget 2: Kollisionsrisiko */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Kollisionsrisiko</div>
                      <div className="text-xs text-white/85 truncate">KI-Bewertung</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
                  <div className={`p-4 rounded-lg border ${decisionConfig.bgColor} ${decisionConfig.borderColor} mb-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${decisionConfig.badgeColor}`}>
                        {decisionConfig.badge}
                      </span>
                      <span className="text-xs text-gray-500">Risiko: {effectiveRiskScore}%</span>
                    </div>
                    <div className={`text-base font-semibold ${decisionConfig.titleColor}`}>{decisionConfig.title}</div>
                    <div className={`text-sm mt-1 ${decisionConfig.subtitleColor}`}>{decisionConfig.subtitle}</div>
                  </div>

                  <div className="flex items-center gap-6">
                    <AnimatedRiskScore score={effectiveRiskScore} risk={effectiveRiskLevel} size="large" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Konflikte analysiert</div>
                      <div className="text-3xl font-bold text-gray-900">{conflictCount}</div>
                      <p className="text-sm text-gray-600 mt-2">{analysis.executiveSummary || "KI-Analyse abgeschlossen."}</p>
                    </div>
                  </div>
                  <div className={`text-center mt-4 text-sm font-semibold ${riskLevelColor}`}>{riskLevelLabel}</div>
                  
                  {/* Bericht erstellen Button */}
                  <button
                    onClick={() => setShowReportGenerator(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Gutachten erstellen
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 3: Top Konflikte */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:h-[560px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">Top Konflikte</div>
                      <div className="text-xs text-white/85 truncate">{conflicts.length} Treffer</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    {conflicts.slice(0, 10).map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                          c.riskLevel === "high" ? "bg-red-50 border-red-200" :
                          c.riskLevel === "medium" ? "bg-orange-50 border-orange-200" :
                          "bg-gray-50 border-gray-200"
                        }`}
                        onClick={() => setSelectedConflict({
                          id: String(c.id),
                          name: c.name,
                          register: c.office,
                          protection: c.protection, // Schutzländer
                          applicationNumber: c.applicationNumber,
                          registrationNumber: c.registrationNumber,
                          status: c.status === "LIVE" ? "active" : "expired",
                          classes: c.classes.map(Number),
                          accuracy: c.accuracy,
                          applicationDate: c.dates?.applied || null,
                          registrationDate: c.dates?.granted || null,
                          holder: c.owner?.name || undefined,
                          isFamousMark: false,
                          reasoning: c.reasoning,
                          riskLevel: c.riskLevel,
                          goodsServices: c.goodsServices,
                          image: c.image,
                        })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{c.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {c.office} · Kl. {c.classes.join(", ")}
                            </div>
                          </div>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${
                            c.riskLevel === "high" ? "bg-red-100 text-red-700" :
                            c.riskLevel === "medium" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {c.riskScore}%
                          </div>
                        </div>
                        {c.reasoning && (
                          <div className="text-xs text-gray-600 mt-2 line-clamp-2">{c.reasoning}</div>
                        )}
                      </div>
                    ))}
                    {conflicts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Check className="w-8 h-8 mx-auto mb-2 text-teal-500" />
                        <p className="text-sm">Keine kritischen Konflikte gefunden</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Report Generator Modal */}
          {showReportGenerator && (
            <ReportGenerator
              isOpen={showReportGenerator}
              onClose={() => setShowReportGenerator(false)}
              reportData={{
                trademarkName: query.keyword || rechercheForm.trademarkName || manualNameInput || "Unbekannt",
                trademarkType: trademarkType || "Wortmarke",
                niceClasses: rechercheForm.niceClasses,
                countries: rechercheForm.countries,
                riskScore: effectiveRiskScore,
                riskLevel: effectiveRiskLevel,
                conflicts: conflicts.map((c: { id?: string | number; name: string; office?: string; classes: (string | number)[]; riskLevel?: "high" | "medium" | "low"; riskScore?: number; accuracy?: number; reasoning?: string; status?: string; applicationNumber?: string; registrationNumber?: string; dates?: { applied?: string; granted?: string }; owner?: { name?: string } }) => ({
                  id: String(c.id || ""),
                  name: c.name,
                  office: c.office,
                  classes: c.classes,
                  riskLevel: c.riskLevel,
                  riskScore: c.riskScore,
                  accuracy: c.accuracy,
                  reasoning: c.reasoning,
                  status: c.status,
                  applicationNumber: c.applicationNumber,
                  registrationNumber: c.registrationNumber,
                  dates: c.dates,
                  owner: c.owner,
                })),
                summary: analysis.executiveSummary,
              }}
              caseNumber={data?.case?.caseNumber}
            />
          )}
        </>
      );
    }

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

    // Auto-check items based on completed steps
    const hasTrademarkName = Boolean(data?.case?.trademarkName || manualNameInput);
    const hasTrademarkType = Boolean(trademarkType);
    const hasNiceClasses = (rechercheForm.niceClasses?.length ?? 0) > 0;
    const hasCountries = (rechercheForm.countries?.length ?? 0) > 0;
    const rechercheStatus = getStepStatus("recherche");
    const hasRecherche = rechercheStatus.status === "completed" || rechercheStatus.status === "in_progress";
    const analyseStatus = getStepStatus("analyse");
    const hasAnalyse = analyseStatus.status === "completed" || (analysesData?.analyses?.length ?? 0) > 0;

    const checklistItems = [
      { key: "trademark_name", label: "Markenname festgelegt", auto: hasTrademarkName, detail: hasTrademarkName ? (data?.case?.trademarkName || manualNameInput) : "Noch nicht festgelegt" },
      { key: "trademark_type", label: "Markenart gewählt", auto: hasTrademarkType, detail: hasTrademarkType ? (trademarkType === "wortmarke" ? "Wortmarke" : trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke") : "Noch nicht gewählt" },
      { key: "nice_classes", label: "Nizza-Klassen ausgewählt", auto: hasNiceClasses, detail: hasNiceClasses ? `${rechercheForm.niceClasses?.length ?? 0} Klassen` : "Noch keine Klassen" },
      { key: "countries", label: "Länder/Regionen festgelegt", auto: hasCountries, detail: hasCountries ? `${rechercheForm.countries?.length ?? 0} Länder` : "Noch keine Länder" },
      { key: "recherche", label: "Markenrecherche durchgeführt", auto: hasRecherche, detail: hasRecherche ? "Recherche abgeschlossen" : "Noch nicht durchgeführt" },
      { key: "analyse", label: "Risikobewertung eingesehen", auto: hasAnalyse, detail: hasAnalyse ? "Analyse verfügbar" : "Noch keine Analyse" },
    ];

    const completedCount = checklistItems.filter(item => item.auto).length;
    const allCompleted = completedCount === checklistItems.length;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Checkliste */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Finale Checkliste</div>
                  <div className="text-xs text-white/85 truncate">Vor der Anmeldung prüfen</div>
                </div>
              </div>
              <div className="text-white text-sm font-medium">
                {completedCount}/{checklistItems.length}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {stepUpdateError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {stepUpdateError}
                </div>
              )}

              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    item.auto
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    item.auto ? "bg-green-500" : "bg-gray-300"
                  }`}>
                    {item.auto ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${item.auto ? "text-green-800" : "text-gray-600"}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs mt-0.5 ${item.auto ? "text-green-600" : "text-gray-400"}`}>
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Status & Aktion */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Bereit zur Anmeldung?</div>
                  <div className="text-xs text-white/85 truncate">Status & nächster Schritt</div>
                </div>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-4">
              {/* Status */}
              <div className={`p-4 rounded-lg border ${
                allCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center gap-3">
                  {allCompleted ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-800">Alles erledigt!</div>
                        <div className="text-sm text-green-600">Du kannst zur Anmeldung fortfahren.</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-800">Noch {checklistItems.length - completedCount} Punkte offen</div>
                        <div className="text-sm text-yellow-600">Bitte alle Punkte abhaken vor der Anmeldung.</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Hinweis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    Die Checkliste wird automatisch aktualisiert, wenn du die vorherigen Schritte abschließt. So behältst du den Überblick.
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                {allCompleted && s.status !== "completed" && (
                  <button
                    onClick={() => {
                      void setStepStatus("ueberpruefung", "completed");
                      setTimeout(() => handleToggleAccordion("anmeldung"), 300);
                    }}
                    disabled={isBusy}
                    className={
                      isBusy
                        ? "w-full px-4 py-3 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                        : "w-full px-4 py-3 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    }
                  >
                    {isBusy ? "Speichere…" : "Weiter zur Anmeldung →"}
                  </button>
                )}

                {!allCompleted && (
                  <button
                    onClick={() => handleToggleAccordion("beratung")}
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Offene Schritte nachholen
                  </button>
                )}

                {s.status !== "skipped" && s.status !== "completed" && (
                  <button
                    onClick={() => skipStep("ueberpruefung")}
                    disabled={isBusy}
                    className="w-full px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                  >
                    Überspringen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnmeldungContent = () => {
    const s = getStepStatus("anmeldung");
    const isBusy = isUpdatingStep === "anmeldung";

    // Schnellfragen für Anmeldung
    const anmeldungQuickQuestions = [
      { category: "EUIPO (EU-MARKE)", questions: [
        "Was ist eine EU-Marke?",
        "Kann ich beim EUIPO selbst anmelden?",
        "Was kostet eine EU-Marke?",
        "Welche Länder deckt die EU-Marke ab?",
      ]},
      { category: "WIPO / MADRID", questions: [
        "Was ist das Madrid-System?",
        "Wann lohnt sich eine WIPO-Anmeldung?",
        "Brauche ich eine Basismarke?",
        "Welche Länder sind Mitglied?",
      ]},
      { category: "BENELUX (BOIP)", questions: [
        "Was ist die Benelux-Marke?",
        "Deckt sie BE, NL, LU ab?",
        "Kann ich dort selbst anmelden?",
      ]},
      { category: "VERTRETER", questions: [
        "Wann brauche ich einen Vertreter?",
        "Was kostet ein Vertreter?",
        "Kann ich trotzdem selbst anmelden?",
      ]},
      { category: "KOSTEN", questions: [
        "Was kostet die Anmeldung insgesamt?",
        "Welche Gebühren gibt es?",
        "Wie berechnen sich Klassengebühren?",
      ]},
      { category: "MÄNGELBESCHEIDE", questions: [
        "Was ist ein Mängelbescheid?",
        "Wie vermeide ich Mängelbescheide?",
        "Was passiert bei Ablehnung?",
      ]},
    ];

    // Kontext für KI-Anmeldungsberater
    const anmeldungContext = {
      trademarkName: data?.case?.trademarkName || manualNameInput || "",
      trademarkType: trademarkType,
      niceClasses: rechercheForm.niceClasses || [],
      selectedCountries: rechercheForm.countries || [],
      hasConflicts: false, // TODO: aus Recherche-Ergebnissen
    };

    return (
      <div className="space-y-4">
        {/* 3-Widget Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Widget 1: KI-Anmeldungsberater */}
          <ClaudeAssistant
            ref={anmeldungVoiceRef}
            caseId={caseId}
            onMessageSent={(msg) => setAnmeldungMessages((prev) => [...prev, msg])}
            previousMessages={anmeldungMessages}
            title="KI-Anmeldungsberater"
            subtitle="Sprachgesteuerte Anmeldeberatung"
            systemPromptAddition={`
Du bist ein freundlicher KI-Anmeldungsberater für Markenanmeldungen. Sprich den Kunden per DU an.

KONTEXT DES KUNDEN:
- Markenname: ${anmeldungContext.trademarkName || "noch nicht festgelegt"}
- Markentyp: ${anmeldungContext.trademarkType === "wortmarke" ? "Wortmarke" : anmeldungContext.trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke"}
- Nizza-Klassen: ${anmeldungContext.niceClasses.length > 0 ? anmeldungContext.niceClasses.join(", ") : "noch nicht festgelegt"}
- Gewünschte Länder: ${anmeldungContext.selectedCountries.length > 0 ? anmeldungContext.selectedCountries.join(", ") : "noch nicht festgelegt"}

DEINE AUFGABEN:
1. Berate den Kunden zur optimalen Anmeldestrategie
2. Erkläre die Unterschiede zwischen nationaler Anmeldung, EUIPO (EU-Marke), WIPO Madrid (internationale Registrierung), Benelux (BOIP)
3. Informiere über Vertreter-Pflicht: 
   - Selbstanmeldung möglich bei: EUIPO, WIPO, Schweiz, UK, Australien, Kanada, Norwegen, EU-Länder (für EU-Bürger)
   - Vertreter erforderlich bei: USA (für Ausländer), China, Russland, Indien, und viele andere
4. Berechne ungefähre Kosten und empfehle die günstigste Route
5. Warne vor Mängelbescheiden und erkläre, wie man sie vermeidet (präzise Klassifizierung)

WICHTIGE REGELN:
- Bei mehreren Ländern: Prüfe ob WIPO Madrid sinnvoller ist als einzelne nationale Anmeldungen
- WIPO braucht eine Basismarke (z.B. DE oder EU)
- Erkläre immer die Vor- und Nachteile jeder Option
- Gib konkrete Kostenbeispiele
`}
          />

          {/* Widget 2: Schnellfragen */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Schnellfragen</div>
                  <div className="text-xs text-white/85 truncate">Häufige Fragen sofort beantwortet</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
              {anmeldungQuickQuestions.map((cat) => (
                <div key={cat.category}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {cat.category}
                  </div>
                  <div className="space-y-1">
                    {cat.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => anmeldungVoiceRef.current?.sendQuestion(q)}
                        className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Anmeldestrategie */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 s-gradient-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Anmeldestrategie</div>
                  <div className="text-xs text-white/85 truncate">Automatisch aus dem Gespräch erstellt</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[400px]">
              {/* Placeholder, Lade-Indikator oder Strategie */}
              {isGeneratingStrategy ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4 animate-pulse">
                    <BarChart3 className="w-8 h-8 text-teal-600" />
                  </div>
                  <p className="text-sm text-teal-600 font-medium">
                    Strategie wird generiert...
                  </p>
                </div>
              ) : !anmeldungStrategy ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 max-w-[200px]">
                    Starte ein Gespräch. Die Zusammenfassung wird automatisch erstellt.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-teal-800 mb-2">EMPFOHLENE ROUTE</div>
                    <div className="text-sm font-medium text-teal-900">{anmeldungStrategy.route}</div>
                  </div>

                  <div className="space-y-2">
                    {anmeldungStrategy.steps.map((step, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{step.icon}</span>
                          <span className="text-sm font-medium">Schritt {idx + 1}: {step.country}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {step.office} • {step.selfRegister ? "Selbstanmeldung" : "Vertreter"} • {step.cost} €
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-teal-100 border border-teal-300 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-teal-800">Geschätzte Gesamtkosten</span>
                      <span className="text-lg font-bold text-teal-900">~{anmeldungStrategy.totalCost} €</span>
                    </div>
                  </div>

                  {anmeldungStrategy.hints.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700 space-y-1">
                          {anmeldungStrategy.hints.map((hint, idx) => (
                            <div key={idx}><strong>Hinweis:</strong> {hint}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Als PDF exportieren
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-3 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      Anmeldung starten →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Abschließen Button */}
        {s.status !== "completed" && (
          <div className="flex justify-end">
            <button
              onClick={() => setStepStatus("anmeldung", "completed")}
              disabled={isBusy}
              className={
                isBusy
                  ? "px-6 py-3 bg-teal-200 text-white rounded-lg text-sm font-medium cursor-not-allowed"
                  : "px-6 py-3 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              }
            >
              {isBusy ? "Speichere…" : "Anmeldung abschließen ✓"}
            </button>
          </div>
        )}
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
    { hash: "markenname", label: "Markenname", stepId: "markenname" as WorkflowStepId, icon: Type },
    { hash: "recherche", label: "Recherche", stepId: "recherche" as WorkflowStepId, icon: Search },
    { hash: "ueberpruefung", label: "Checkliste", stepId: "ueberpruefung" as WorkflowStepId, icon: CheckCircle },
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
      {/* Toast for skipped steps notification */}
      {skippedStepsNotice && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {skippedStepsNotice.length === 1 ? "Schritt übersprungen" : "Schritte übersprungen"}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {skippedStepsNotice.join(" & ")} {skippedStepsNotice.length === 1 ? "wurde" : "wurden"} als übersprungen markiert. Du kannst {skippedStepsNotice.length === 1 ? "ihn" : "sie"} jederzeit nachholen.
                </p>
              </div>
              <button
                onClick={() => setSkippedStepsNotice(null)}
                className="text-yellow-600 hover:text-yellow-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                      const stepStatus = getStepStatus(s.stepId);
                      const status = stepStatus.status;
                      
                      // Dynamische Prüfung ob Kriterien fehlen (für Beratung & Markenname)
                      // Berücksichtigt auch Daten aus decisions/summary (wie Banner)
                      let hasMissingCriteria = false;
                      if (s.stepId === "beratung") {
                        const decision = data?.decisions as any;
                        const hasNameFromState = !!manualNameInput?.trim();
                        const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                        const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                        
                        const hasClassesFromState = (rechercheForm.niceClasses?.length ?? 0) > 0;
                        const hasClassesFromDecisions = Array.isArray(decision?.niceClasses) && decision.niceClasses.length > 0;
                        const hasClasses = hasClassesFromState || hasClassesFromDecisions;
                        
                        const hasCountriesFromState = (rechercheForm.countries?.length ?? 0) > 0;
                        const hasCountriesFromDecisions = Array.isArray(decision?.countries) && decision.countries.length > 0;
                        const hasCountries = hasCountriesFromState || hasCountriesFromDecisions;
                        
                        hasMissingCriteria = !hasName || !hasClasses || !hasCountries;
                      } else if (s.stepId === "markenname") {
                        const decision = data?.decisions as any;
                        const hasNameFromState = !!manualNameInput?.trim();
                        const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                        const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                        const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
                        const hasLogo = !!trademarkImageUrl;
                        hasMissingCriteria = !hasName || (needsLogo && !hasLogo);
                      }
                      
                      // Für Beratung/Markenname: Grün wenn alle Kriterien erfüllt (unabhängig vom DB-Status)
                      // Für andere Schritte: Grün nur wenn DB-Status "completed"
                      const wasSkipped = status === "skipped" || (status === "completed" && stepStatus.metadata?.skipped === true);
                      const isSkipped = wasSkipped || ((status === "completed" || status === "in_progress") && hasMissingCriteria);
                      const isCompleted = (s.stepId === "beratung" || s.stepId === "markenname")
                        ? !hasMissingCriteria && !wasSkipped
                        : status === "completed" && !isSkipped && !hasMissingCriteria;
                      const isCurrentlyOpen = openAccordion === s.stepId;

                      const Icon = s.icon;

                      const circleClass = isCurrentlyOpen
                        ? "bg-white border border-primary text-primary ring-1 ring-primary/20 shadow-sm"
                        : isSkipped
                          ? "bg-yellow-100 border-yellow-400 text-yellow-600 shadow-sm"
                          : isCompleted
                            ? "bg-primary border-primary text-white shadow-sm"
                            : "bg-white border-gray-300 text-gray-500 group-hover:border-gray-400 group-hover:text-gray-600";

                      const labelClass = isCurrentlyOpen
                        ? "text-primary font-semibold"
                        : isSkipped
                          ? "text-yellow-600"
                          : isCompleted
                            ? "text-primary"
                            : "text-gray-500";

                      return (
                        <button
                          key={s.hash}
                          type="button"
                          onClick={() => {
                            handleToggleAccordion(s.stepId);
                          }}
                          className="group relative min-w-[68px] flex flex-col items-center"
                        >
                          <span
                            className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${circleClass}`}
                          >
                            {isCurrentlyOpen && (
                              <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                            )}
                            {isSkipped && !isCurrentlyOpen && (
                              <span
                                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow-sm cursor-help"
                                title="Übersprungen – klicke hier, um diesen Schritt nachzuholen"
                              >
                                <span className="text-white text-[9px] font-bold leading-none">!</span>
                              </span>
                            )}
                            <Icon className="w-4 h-4 relative z-10" />
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventLogModal(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                    title="Beratungs-Protokoll anzeigen"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Protokoll
                    {eventLog.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                        {eventLog.length}
                      </span>
                    )}
                  </button>
                  <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${getStatusBadge(caseInfo.status)}`}>
                    {getStatusLabel(caseInfo.status)}
                  </span>
                </div>
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
              isCompleted={(() => {
                const s = getStepStatus(step.id);
                const skipped = s.status === "skipped" || (s.status === "completed" && s.metadata?.skipped === true);
                
                // Dynamische Prüfung ob Kriterien fehlen (berücksichtigt auch decisions)
                let hasMissingCriteria = false;
                if (step.id === "beratung") {
                  const decision = data?.decisions as any;
                  const hasNameFromState = !!manualNameInput?.trim();
                  const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                  const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                  
                  const hasClassesFromState = (rechercheForm.niceClasses?.length ?? 0) > 0;
                  const hasClassesFromDecisions = Array.isArray(decision?.niceClasses) && decision.niceClasses.length > 0;
                  const hasClasses = hasClassesFromState || hasClassesFromDecisions;
                  
                  const hasCountriesFromState = (rechercheForm.countries?.length ?? 0) > 0;
                  const hasCountriesFromDecisions = Array.isArray(decision?.countries) && decision.countries.length > 0;
                  const hasCountries = hasCountriesFromState || hasCountriesFromDecisions;
                  
                  hasMissingCriteria = !hasName || !hasClasses || !hasCountries;
                } else if (step.id === "markenname") {
                  const decision = data?.decisions as any;
                  const hasNameFromState = !!manualNameInput?.trim();
                  const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                  const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                  const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
                  const hasLogo = !!trademarkImageUrl;
                  hasMissingCriteria = !hasName || (needsLogo && !hasLogo);
                }
                
                // Für Beratung/Markenname: Grün wenn Kriterien erfüllt (unabhängig vom DB-Status)
                const wasSkipped = skipped;
                return (step.id === "beratung" || step.id === "markenname")
                  ? !hasMissingCriteria && !wasSkipped
                  : s.status === "completed" && !skipped && !hasMissingCriteria;
              })()}
              isSkipped={(() => {
                const s = getStepStatus(step.id);
                const skipped = s.status === "skipped" || (s.status === "completed" && s.metadata?.skipped === true);
                
                // Dynamische Prüfung ob Kriterien fehlen (berücksichtigt auch decisions)
                let hasMissingCriteria = false;
                if (step.id === "beratung") {
                  const decision = data?.decisions as any;
                  const hasNameFromState = !!manualNameInput?.trim();
                  const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                  const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                  
                  const hasClassesFromState = (rechercheForm.niceClasses?.length ?? 0) > 0;
                  const hasClassesFromDecisions = Array.isArray(decision?.niceClasses) && decision.niceClasses.length > 0;
                  const hasClasses = hasClassesFromState || hasClassesFromDecisions;
                  
                  const hasCountriesFromState = (rechercheForm.countries?.length ?? 0) > 0;
                  const hasCountriesFromDecisions = Array.isArray(decision?.countries) && decision.countries.length > 0;
                  const hasCountries = hasCountriesFromState || hasCountriesFromDecisions;
                  
                  hasMissingCriteria = !hasName || !hasClasses || !hasCountries;
                } else if (step.id === "markenname") {
                  const decision = data?.decisions as any;
                  const hasNameFromState = !!manualNameInput?.trim();
                  const hasNameFromDecisions = Array.isArray(decision?.trademarkNames) && decision.trademarkNames.some((n: any) => typeof n === "string" && n.trim().length > 0);
                  const hasName = hasNameFromState || hasNameFromDecisions || !!(data?.case as any)?.trademarkName;
                  const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
                  const hasLogo = !!trademarkImageUrl;
                  hasMissingCriteria = !hasName || (needsLogo && !hasLogo);
                }
                
                // Gelb wenn: übersprungen ODER Kriterien fehlen bei Beratung/Markenname
                return skipped || ((step.id === "beratung" || step.id === "markenname") && hasMissingCriteria);
              })()}
              status={getStepStatus(step.id).status}
              isOpen={openAccordion === step.id}
              onToggle={() => handleToggleAccordion(step.id)}
              headerMeta={step.id === "beratung" ? renderBeratungHeaderMeta() : step.id === "markenname" ? renderMarkennameHeaderMeta() : undefined}
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

        
        {showTMSearchDebugModal && (() => {
          // Parse raw data for structured view
          let parsedData: { keyword?: string; isTestMode?: boolean; total?: number; result?: Array<{
            mid?: string | number;
            verbal?: string;
            status?: string;
            submition?: string;
            protection?: string[];
            class?: string[];
            accuracy?: string | number;
            app?: string;
            reg?: string;
            img?: string;
            date?: { applied?: string; granted?: string; expiration?: string };
          }> } | null = null;
          
          if (tmsearchDebugPayload && typeof tmsearchDebugPayload === "object") {
            const payload = tmsearchDebugPayload as { raw?: string; keyword?: string; isTestMode?: boolean };
            if (payload.raw && typeof payload.raw === "string") {
              try {
                parsedData = { ...JSON.parse(payload.raw), keyword: payload.keyword, isTestMode: payload.isTestMode };
              } catch { /* ignore */ }
            } else if ((tmsearchDebugPayload as { result?: unknown[] }).result) {
              parsedData = tmsearchDebugPayload as unknown as typeof parsedData;
            }
          }
          
          const results = parsedData?.result || [];
          const selectedCountries = (rechercheForm.countries || []).map((c) => String(c || "").trim()).filter(Boolean);
          const filteredResults = selectedCountries.length
            ? results.filter((r) => {
                const office = (r.submition || "").trim();
                const protection = (r.protection || []).map((p) => String(p || "").trim()).filter(Boolean);
                return (office && selectedCountries.includes(office)) || protection.some((p) => selectedCountries.includes(p));
              })
            : results;

          const liveOnlyResults = filteredResults.filter((r) => r.status === "LIVE");
          const excludedNotLiveCount = filteredResults.length - liveOnlyResults.length;
          
          // Group by office
          const byOffice: Record<string, number> = {};
          liveOnlyResults.forEach(r => {
            const office = r.submition || "UNKN";
            byOffice[office] = (byOffice[office] || 0) + 1;
          });
          
          // Group by class
          const byClass: Record<string, number> = {};
          liveOnlyResults.forEach(r => {
            (r.class || []).forEach(c => {
              byClass[c] = (byClass[c] || 0) + 1;
            });
          });
          
          const formatDate = (d?: string) => {
            if (!d || d === "99999999") return "–";
            if (d.length === 8) return `${d.slice(6,8)}.${d.slice(4,6)}.${d.slice(0,4)}`;
            return d;
          };
          
          return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-2 sm:p-4"
            onClick={() => setShowTMSearchDebugModal(false)}
          >
            <div
              className="bg-white rounded-2xl w-[98vw] max-w-[98vw] h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">tmsearch API Antwort</div>
                  <div className="text-xs text-gray-500 truncate">
                    {parsedData?.keyword ? `Keyword: "${parsedData.keyword}"` : ""}
                    {parsedData?.isTestMode ? " · Demo-Modus" : ""}
                    {tmsearchDebugLoading ? " · lädt…" : ""}
                    {tmsearchDebugError ? " · Fehler" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTMSearchDebugModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 pt-3 pb-0 border-b border-gray-200 flex gap-1 overflow-x-auto">
                {[
                  { id: "request" as const, label: "📤 Request" },
                  { id: "response" as const, label: "📥 Response" },
                  { id: "filter" as const, label: "🔍 Filter" },
                  { id: "analysis" as const, label: "🤖 Analyse" },
                  { id: "raw" as const, label: "{ } Raw" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTMSearchDebugTab(tab.id)}
                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                      tmsearchDebugTab === tab.id
                        ? "bg-teal-50 text-teal-700 border border-b-0 border-gray-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5 overflow-auto flex-1 custom-scrollbar">
                {tmsearchDebugError && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {tmsearchDebugError}
                  </div>
                )}

                {tmsearchDebugLoading ? (
                  <div className="text-center py-8 text-gray-500">Lade Daten…</div>
                ) : tmsearchDebugTab === "request" ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-blue-800 mb-1">📤 API Request</div>
                      <div className="text-xs text-blue-700">Was wir an tmsearch.ai gesendet haben</div>
                    </div>
                    <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[60vh]">
                      {JSON.stringify((tmsearchDebugPayload as Record<string, unknown>)?.debug_request || {}, null, 2)}
                    </pre>
                  </div>
                ) : tmsearchDebugTab === "response" ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-green-800 mb-1">📥 API Response</div>
                      <div className="text-xs text-green-700">Rohe Antwort von tmsearch.ai</div>
                    </div>
                    <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[60vh]">
                      {JSON.stringify((tmsearchDebugPayload as Record<string, unknown>)?.debug_response || {}, null, 2)}
                    </pre>
                  </div>
                ) : tmsearchDebugTab === "filter" ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-amber-800 mb-1">🔍 Filterung</div>
                      <div className="text-xs text-amber-700">So wurden die Ergebnisse gefiltert</div>
                    </div>
                    <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[60vh]">
                      {JSON.stringify((tmsearchDebugPayload as Record<string, unknown>)?.debug_filter || {}, null, 2)}
                    </pre>
                  </div>
                ) : tmsearchDebugTab === "analysis" ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-purple-800 mb-1">🤖 Claude Analyse</div>
                      <div className="text-xs text-purple-700">KI-Bewertung mit Waren/Dienstleistungen und Abgrenzungsvorschlägen</div>
                    </div>
                    {(() => {
                      const analysis = (tmsearchDebugPayload as Record<string, unknown>)?.debug_analysis as Record<string, unknown> || {};
                      const conflicts = (analysis?.perConflictAnalysis as Array<Record<string, unknown>>) || [];
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <div className="text-xl font-bold">{analysis?.analyzedCount as number || 0}</div>
                              <div className="text-xs text-gray-500">Analysiert</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <div className="text-xs font-mono">{analysis?.modelUsed as string || "–"}</div>
                              <div className="text-xs text-gray-500">KI-Modell</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <div className="text-xl font-bold">{((analysis?.overallSummary as Record<string, unknown>)?.overallRiskScore as number) || 0}%</div>
                              <div className="text-xs text-gray-500">Gesamtrisiko</div>
                            </div>
                          </div>
                          {conflicts.map((c, idx) => (
                            <div key={idx} className={`border rounded-lg p-4 ${c.riskLevel === "high" ? "border-red-300 bg-red-50" : c.riskLevel === "medium" ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold">{c.name as string}</div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${c.riskLevel === "high" ? "bg-red-200 text-red-800" : c.riskLevel === "medium" ? "bg-amber-200 text-amber-800" : "bg-green-200 text-green-800"}`}>
                                  {c.riskScore as number}% Risiko
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                Amt: {c.office as string} · Ähnlichkeit: {c.accuracy as string}% · 
                                Klassen-Überschneidung: <span className="font-medium">{c.classOverlap as string || "?"}</span> · 
                                Waren-Überschneidung: <span className="font-medium">{c.goodsOverlap as string || "?"}</span>
                              </div>
                              <div className="text-sm bg-white/50 rounded p-2 mb-2">
                                <strong>Begründung:</strong> {c.reasoning as string || "–"}
                              </div>
                              {(c.differentiation as string) && (
                                <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                                  <strong>💡 Abgrenzungsvorschlag:</strong> {c.differentiation as string}
                                </div>
                              )}
                              {((c.goodsServices as string[]) || []).length > 0 && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Waren/Dienstleistungen anzeigen</summary>
                                  <div className="mt-2 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                                    {(c.goodsServices as string[]).map((gs, i) => (
                                      <div key={i} className="mb-1">{gs}</div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : tmsearchDebugTab === "raw" ? (
                  <div>
                    <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[60vh]">
                      {JSON.stringify(tmsearchDebugPayload, null, 2)}
                    </pre>
                  </div>
                ) : parsedData ? (
                  <div className="space-y-6">
                    {selectedCountries.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="text-sm font-semibold text-blue-800">Filter aktiv</div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          Länder/Register: {selectedCountries.join(", ")} · Status: LIVE · Angezeigt: {liveOnlyResults.length} von {filteredResults.length} (gesamt: {parsedData.total || results.length})
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{liveOnlyResults.length}</div>
                        <div className="text-xs text-gray-500">Treffer (LIVE)</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-700">{Object.keys(byClass).length}</div>
                        <div className="text-xs text-green-600">Klassen</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">{excludedNotLiveCount}</div>
                        <div className="text-xs text-red-600">Ausgeblendet (nicht LIVE)</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-700">{Object.keys(byOffice).length}</div>
                        <div className="text-xs text-blue-600">Ämter/Register</div>
                      </div>
                    </div>

                    {/* By Office */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Nach Amt/Register</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(byOffice).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([office, count]) => (
                          <span key={office} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {office}: {count}
                          </span>
                        ))}
                        {Object.keys(byOffice).length > 15 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">+{Object.keys(byOffice).length - 15} weitere</span>
                        )}
                      </div>
                    </div>

                    {/* By Class */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Nach Nizza-Klasse</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(byClass).sort((a,b) => b[1] - a[1]).slice(0, 20).map(([cls, count]) => (
                          <span key={cls} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                            Kl. {cls}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Results Table - ALLE FELDER */}
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        Trefferliste – ALLE FELDER (nur LIVE) (Top 50 von {liveOnlyResults.length})
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="text-xs whitespace-nowrap min-w-max">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">mid</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">verbal (Name)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">status</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">accuracy</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">submition (Amt)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">protection (Länder)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">class (Nizza)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">app (Anmelde-Nr.)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">reg (Register-Nr.)</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">date.applied</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">date.granted</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">date.expiration</th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-600">img (Bild-Pfad)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {liveOnlyResults.slice(0, 50).map((r, idx) => (
                                <tr key={r.mid || idx} className={r.status === "LIVE" ? "bg-green-50/50" : ""}>
                                  <td className="px-2 py-2 font-mono text-[10px] text-gray-500 sticky left-0 bg-white z-10">
                                    {r.mid || "–"}
                                  </td>
                                  <td className="px-2 py-2 font-medium text-gray-900">
                                    {r.verbal || "–"}
                                  </td>
                                  <td className="px-2 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      r.status === "LIVE" ? "bg-green-100 text-green-700" :
                                      r.status === "DEAD" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-600"
                                    }`}>
                                      {r.status || "?"}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2">
                                    <span className={`font-semibold ${
                                      Number(r.accuracy) >= 95 ? "text-red-600" :
                                      Number(r.accuracy) >= 85 ? "text-amber-600" :
                                      "text-gray-600"
                                    }`}>
                                      {r.accuracy || "–"}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-gray-600 font-medium">{r.submition || "–"}</td>
                                  <td className="px-2 py-2 text-gray-500 max-w-[200px] truncate" title={(r.protection || []).join(", ")}>
                                    {(r.protection || []).join(", ") || "–"}
                                  </td>
                                  <td className="px-2 py-2 text-amber-700 font-medium">
                                    {(r.class || []).join(", ") || "–"}
                                  </td>
                                  <td className="px-2 py-2 text-gray-500 font-mono text-[10px]">
                                    {r.app || "–"}
                                  </td>
                                  <td className="px-2 py-2 text-gray-500 font-mono text-[10px]">
                                    {r.reg || "–"}
                                  </td>
                                  <td className="px-2 py-2 text-gray-500">{formatDate(r.date?.applied)}</td>
                                  <td className="px-2 py-2 text-gray-500">{formatDate(r.date?.granted)}</td>
                                  <td className="px-2 py-2 text-gray-500">{formatDate(r.date?.expiration)}</td>
                                  <td className="px-2 py-2 text-blue-600 font-mono text-[10px] max-w-[150px] truncate" title={r.img}>
                                    {r.img ? (
                                      <a href={`https://img.tmsearch.ai/img/210/${r.img}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                        {r.img}
                                      </a>
                                    ) : "–"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Raw JSON View */
                  <div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-end mb-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const text = typeof tmsearchDebugPayload === "string" ? tmsearchDebugPayload : JSON.stringify(tmsearchDebugPayload, null, 2);
                          try {
                            await navigator.clipboard.writeText(text);
                          } catch { /* ignore */ }
                        }}
                        className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        disabled={tmsearchDebugPayload === null}
                      >
                        Kopieren
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = typeof tmsearchDebugPayload === "string" ? tmsearchDebugPayload : JSON.stringify(tmsearchDebugPayload, null, 2);
                          const blob = new Blob([text], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          const keyword = (rechercheForm.trademarkName || "").trim().replace(/\s+/g, "_") || "tmsearch";
                          a.href = url;
                          a.download = `${keyword}_tmsearch.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                        disabled={tmsearchDebugPayload === null}
                      >
                        Download .json
                      </button>
                    </div>
                    <pre className="text-xs leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[60vh]">
                      {tmsearchDebugPayload === null
                        ? "(keine Daten)"
                        : typeof tmsearchDebugPayload === "string"
                        ? tmsearchDebugPayload
                        : JSON.stringify(tmsearchDebugPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowTMSearchDebugModal(false)}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
          );
        })()}

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

        {/* Floating Protokoll-Button - immer sichtbar */}
        <button
          type="button"
          onClick={() => setShowEventLogModal(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all group"
          title="Session-Protokoll öffnen"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">Protokoll</span>
          {eventLog.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-teal-600 text-xs font-bold">
              {eventLog.length}
            </span>
          )}
        </button>

        {/* Event-Protokoll Modal - Professionelles Design */}
        {showEventLogModal && (
          <div
            className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-6"
            onClick={() => setShowEventLogModal(false)}
          >
            <div
              className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Session-Protokoll</div>
                    <div className="text-sm text-white/80">{eventLog.length} Ereignisse · Alle Aktivitäten dieser Beratung</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
                  onClick={() => setShowEventLogModal(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Legende */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Session</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> User</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500"></span> KI</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-500"></span> Navigation</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Änderung</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Recherche</span>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {eventLog.length === 0 ? (
                  <div className="text-center text-gray-400 py-16">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <div className="text-lg font-medium">Noch keine Ereignisse</div>
                    <div className="text-sm mt-1">Aktivitäten werden hier protokolliert</div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {eventLog.map((event) => {
                      const typeLabel = 
                        event.type === "session_start" ? "Session gestartet" :
                        event.type === "user_message" ? "User-Nachricht" :
                        event.type === "ai_message" ? "KI-Antwort" :
                        event.type === "ai_greeting" ? "KI-Begrüßung" :
                        event.type === "accordion_greeting" ? "Bereichs-Begrüßung" :
                        event.type === "accordion_change" ? "Navigation" :
                        event.type === "field_change" ? "Feldänderung" :
                        event.type === "trigger" ? "Trigger" :
                        event.type === "recherche_start" ? "Recherche gestartet" :
                        event.type === "recherche_complete" ? "Recherche abgeschlossen" :
                        event.type;
                      
                      const bgColor = 
                        event.type === "session_start" ? "bg-emerald-50 border-emerald-200" :
                        event.type === "user_message" ? "bg-blue-50 border-blue-200" :
                        event.type === "ai_message" || event.type === "ai_greeting" || event.type === "accordion_greeting" ? "bg-teal-50 border-teal-200" :
                        event.type === "accordion_change" ? "bg-violet-50 border-violet-200" :
                        event.type === "field_change" || event.type === "trigger" ? "bg-amber-50 border-amber-200" :
                        event.type === "recherche_start" || event.type === "recherche_complete" ? "bg-rose-50 border-rose-200" :
                        "bg-white border-gray-200";

                      return (
                        <div key={event.id} className="relative flex items-start gap-4 pb-4">
                          {/* Timeline dot */}
                          <div className="relative z-10 w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center text-2xl shadow-sm">
                            {event.icon}
                          </div>
                          
                          {/* Content card */}
                          <div className={`flex-1 p-4 rounded-xl border-2 ${bgColor}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">{typeLabel}</span>
                              <span className="text-xs text-gray-500 font-mono bg-white/60 px-2 py-1 rounded">
                                {event.timestamp.toLocaleTimeString("de-DE")}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">{event.description}</div>
                            {event.details && (
                              <div className="text-sm text-gray-600 mt-3 bg-white/50 rounded-lg px-3 py-2 border border-gray-100">
                                {event.details}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {eventLog.length > 0 && `Erstes Ereignis: ${eventLog[0]?.timestamp.toLocaleTimeString("de-DE")}`}
                </span>
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"
                  onClick={() => setShowEventLogModal(false)}
                >
                  Schließen
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
                          // Event-Log: Referenzbild im Generator hochgeladen
                          logEvent("logo_reference", "Referenzbild für KI-Generator hochgeladen", file.name);
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
