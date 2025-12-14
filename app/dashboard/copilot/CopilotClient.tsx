"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mic, FileText, Clock, Check, MessageSquare, MessageCircle, Sparkles, Info, Loader2, X, Save, FolderOpen, Lightbulb, ChevronDown, HelpCircle, ArrowRight, Search, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import VoiceAssistant, { VoiceAssistantHandle } from "../../components/VoiceAssistant";
import WorkflowProgress from "../../components/WorkflowProgress";
import HelpDrawer from "../../components/HelpDrawer";
import GuidedTour from "../../components/GuidedTour";
import { useUnsavedData } from "@/app/contexts/UnsavedDataContext";

interface CopilotClientProps {
  accessToken: string;
  hasVoiceAssistant: boolean;
}

interface MeetingNote {
  id: string;
  timestamp: Date;
  content: string;
  type: "user" | "assistant" | "system";
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

const topicLabels: Record<string, string> = {
  beratung: "Markenberatung",
  recherche: "Markenrecherche",
  risikoanalyse: "Risikoanalyse",
  anmeldung: "Markenanmeldung",
  watchlist: "Watchlist"
};

export default function CopilotClient({ accessToken, hasVoiceAssistant }: CopilotClientProps) {
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const [meetingDurationSeconds, setMeetingDurationSeconds] = useState(0);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryStep, setSummaryStep] = useState(0);
  const [meetingSummary, setMeetingSummary] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionAnalyzed, setSessionAnalyzed] = useState(false);
  const [contextTopic, setContextTopic] = useState<string | null>(null);
  const [contextPrompt, setContextPrompt] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [autoStartConsultation, setAutoStartConsultation] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [currentCaseNumber, setCurrentCaseNumber] = useState<string | null>(null);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const caseCreatedRef = useRef(false);
  const [analysisResults, setAnalysisResults] = useState<{
    trademarkName: string | null;
    niceClasses: string[];
    targetCountries: string[];
    suggestedCountries: string[];
    missingFields: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualTrademarkName, setManualTrademarkName] = useState("");
  const [manualNiceClasses, setManualNiceClasses] = useState("");
  const [manualCountriesText, setManualCountriesText] = useState("");
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [catchUpCaseId, setCatchUpCaseId] = useState<string | null>(null);
  const [catchUpCaseInfo, setCatchUpCaseInfo] = useState<{ 
    caseNumber: string; 
    trademarkName: string;
    previousSummary?: string;
    extractedData?: {
      trademarkName?: string;
      countries?: string[];
      niceClasses?: number[];
    };
  } | null>(null);
  const [showInsufficientInfoModal, setShowInsufficientInfoModal] = useState(false);
  const [insufficientInfoData, setInsufficientInfoData] = useState<{
    extractedData: { trademarkName: string; countries: string[]; niceClasses: number[] };
    caseId: string | null;
    caseNumber: string | null;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const meetingNotesRef = useRef<MeetingNote[]>([]);
  const inputModeRef = useRef<"sprache" | "text">("sprache");
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const hasUnsavedData = meetingNotes.length > 1 && !savedSuccessfully && !sessionAnalyzed;

  // Global UnsavedDataContext integration for sidebar navigation interception
  const { 
    setHasUnsavedData: setGlobalHasUnsavedData, 
    setOnSaveBeforeLeave,
    setCheckUnsavedDataRef
  } = useUnsavedData();

  // Register ref-based check function for real-time detection (fixes race condition)
  useEffect(() => {
    const checkUnsavedData = () => {
      const hasNotes = meetingNotesRef.current.length > 1;
      console.log("[CopilotClient] Ref check - meetingNotesRef.length:", meetingNotesRef.current.length, "| hasNotes:", hasNotes);
      return hasNotes && !savedSuccessfully && !sessionAnalyzed;
    };
    setCheckUnsavedDataRef(checkUnsavedData);
    return () => setCheckUnsavedDataRef(null);
  }, [setCheckUnsavedDataRef, savedSuccessfully, sessionAnalyzed]);

  // Sync local hasUnsavedData with global context
  useEffect(() => {
    console.log("[CopilotClient] Syncing hasUnsavedData:", hasUnsavedData, "| meetingNotes.length:", meetingNotes.length, "| savedSuccessfully:", savedSuccessfully, "| sessionAnalyzed:", sessionAnalyzed);
    setGlobalHasUnsavedData(hasUnsavedData);
  }, [hasUnsavedData, setGlobalHasUnsavedData, meetingNotes.length, savedSuccessfully, sessionAnalyzed]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData) {
        e.preventDefault();
        e.returnValue = "Sie haben ungespeicherte Beratungsdaten. Möchten Sie die Seite wirklich verlassen?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedData]);

  const stopVoiceSession = useCallback(() => {
    if (voiceAssistantRef.current) {
      voiceAssistantRef.current.stopSession();
    }
  }, []);

  const runConsultationAnalysisAndSave = useCallback(async (): Promise<{
    success: boolean;
    extractedData?: { trademarkName: string | null; countries: string[]; niceClasses: number[] };
  }> => {
    if (meetingNotesRef.current.length <= 1) return { success: false };
    
    stopVoiceSession();
    
    const currentNotes = meetingNotesRef.current;
    const notesText = currentNotes
      .filter(n => n.type !== "system")
      .map(n => `${n.type === "user" ? "Frage" : "Antwort"}: ${n.content}`)
      .join("\n\n");

    const sessionProtocol = currentNotes
      .map(n => {
        const time = n.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        const role = n.type === "user" ? "BENUTZER" : n.type === "assistant" ? "BERATER" : "SYSTEM";
        return `[${time}] ${role}: ${n.content}`;
      })
      .join("\n");

    let extractedData = { trademarkName: null as string | null, countries: [] as string[], niceClasses: [] as number[] };
    try {
      const analysisResponse = await fetch("/api/ai/analyze-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNotes: notesText })
      });
      
      if (analysisResponse.ok) {
        const data = await analysisResponse.json();
        extractedData = {
          trademarkName: data.result?.trademarkName || null,
          countries: data.result?.targetCountries || [],
          niceClasses: (data.result?.niceClasses || []).map((c: string) => parseInt(c)).filter((c: number) => !isNaN(c))
        };
      }
    } catch (e) {
      console.error("Analysis error:", e);
    }

    let summary = `Markenberatung - ${new Date().toLocaleDateString("de-DE")}`;
    try {
      const summaryResponse = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Erstelle eine kurze Zusammenfassung (3-5 Sätze) dieser Markenberatung auf Deutsch. Gib NUR die Zusammenfassung zurück.\n\nGespräch:\n${notesText}`,
          history: []
        })
      });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summary = summaryData.response?.trim() || summary;
      }
    } catch (e) {}

    const title = extractedData.trademarkName 
      ? `Marke "${extractedData.trademarkName}"` 
      : `Markenberatung - ${new Date().toLocaleDateString("de-DE")}`;

    const caseId = catchUpCaseId || currentCaseId;
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          transcript: notesText,
          sessionProtocol,
          duration: meetingDurationSeconds,
          mode: inputModeRef.current,
          extractedData,
          caseId,
          sendEmail: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (caseId) {
          await fetch("/api/cases/save-decisions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId,
              consultationId: data.consultation?.id,
              trademarkName: extractedData.trademarkName,
              countries: extractedData.countries,
              niceClasses: extractedData.niceClasses
            })
          });
          
          if (extractedData.trademarkName) {
            await fetch(`/api/cases/${caseId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trademarkName: extractedData.trademarkName })
            });
          }
        }
        
        setSavedSuccessfully(true);
        return { success: true, extractedData };
      }
    } catch (e) {
      console.error("Save error:", e);
    }
    
    return { success: false };
  }, [meetingDurationSeconds, catchUpCaseId, currentCaseId, stopVoiceSession]);

  // Set up save callback for sidebar navigation (must be after runConsultationAnalysisAndSave definition)
  useEffect(() => {
    if (hasUnsavedData) {
      setOnSaveBeforeLeave(runConsultationAnalysisAndSave);
    } else {
      setOnSaveBeforeLeave(null);
    }
    return () => setOnSaveBeforeLeave(null);
  }, [hasUnsavedData, runConsultationAnalysisAndSave, setOnSaveBeforeLeave]);

  useEffect(() => {
    return () => {
      if (voiceAssistantRef.current) {
        voiceAssistantRef.current.stopSession();
      }
    };
  }, []);

  const handleNavigationWithCheck = (path: string) => {
    if (hasUnsavedData) {
      stopVoiceSession();
      setPendingNavigation(path);
      setShowLeaveModal(true);
    } else {
      stopVoiceSession();
      router.push(path);
    }
  };

  const confirmLeaveWithoutSaving = () => {
    setShowLeaveModal(false);
    stopVoiceSession();
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const confirmLeaveAndSave = async () => {
    setShowLeaveModal(false);
    setIsAnalyzing(true);
    setToast({ message: "Analysiere und speichere Beratung...", visible: true });
    
    const result = await runConsultationAnalysisAndSave();
    
    setIsAnalyzing(false);
    
    if (result.success) {
      setToast({ message: "Beratung erfolgreich gespeichert!", visible: true });
      if (pendingNavigation) {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }
    } else {
      setToast({ message: "Fehler beim Speichern", visible: true });
    }
  };

  useEffect(() => {
    const topic = searchParams.get("topic");
    const prompt = searchParams.get("prompt");
    const showConsultations = searchParams.get("consultations");
    const catchUpCase = searchParams.get("catchUpCase");
    if (topic) {
      setContextTopic(topic);
      setContextPrompt(prompt ? decodeURIComponent(prompt) : null);
    }
    if (showConsultations === "true") {
      setShowConsultationsModal(true);
    }
    if (catchUpCase) {
      setCatchUpCaseId(catchUpCase);
      fetch(`/api/cases/${catchUpCase}`)
        .then(res => res.json())
        .then(data => {
          if (data.case) {
            const lastConsultation = data.case.consultations?.[0];
            const extractedData = lastConsultation?.extractedData as {
              trademarkName?: string;
              countries?: string[];
              niceClasses?: number[];
            } | undefined;
            
            const trademarkName = data.case.trademarkName || extractedData?.trademarkName || "Unbekannt";
            const countries = extractedData?.countries || [];
            const niceClasses = extractedData?.niceClasses || [];
            const previousSummary = lastConsultation?.summary || "";
            
            setCatchUpCaseInfo({
              caseNumber: data.case.caseNumber,
              trademarkName,
              previousSummary,
              extractedData: {
                trademarkName: extractedData?.trademarkName,
                countries,
                niceClasses,
              }
            });
            
            const missingInfo: string[] = [];
            if (!extractedData?.trademarkName) missingInfo.push("Markenname");
            if (!countries.length) missingInfo.push("Zielländer");
            if (!niceClasses.length) missingInfo.push("Nizza-Klassen");
            
            let systemContext = `[SYSTEM-KONTEXT]
Dies ist eine Fortsetzung einer vorherigen Beratung für Fall ${data.case.caseNumber}.`;

            if (previousSummary) {
              systemContext += `

VORHERIGE BERATUNG:
${previousSummary}`;
            }

            systemContext += `

BEREITS BEKANNT:
- Markenname: ${extractedData?.trademarkName || "(noch nicht festgelegt)"}
- Länder: ${countries.length > 0 ? countries.join(", ") : "(noch nicht festgelegt)"}
- Nizza-Klassen: ${niceClasses.length > 0 ? niceClasses.join(", ") : "(noch nicht festgelegt)"}`;

            if (missingInfo.length > 0) {
              systemContext += `

FEHLENDE INFORMATIONEN:
${missingInfo.map(info => `- ${info} muss noch bestimmt werden`).join("\n")}

Bitte führe das Gespräch fort und hilf dem Kunden, die fehlenden Informationen zu ergänzen.`;
            } else {
              systemContext += `

Alle wichtigen Informationen sind bereits vorhanden. Der Kunde kann zur Recherche fortfahren oder weitere Details besprechen.`;
            }
            
            setContextMessage(systemContext);
          }
        })
        .catch(err => console.error("Error fetching case info:", err));
    }
  }, [searchParams]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setShowGuidedTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    meetingNotesRef.current = meetingNotes;
  }, [meetingNotes]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ message: "", visible: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  useEffect(() => {
    if (!meetingStartTime) {
      setMeetingStartTime(new Date());
      setMeetingNotes([{
        id: `system-${Date.now()}`,
        timestamp: new Date(),
        content: "Beratung gestartet",
        type: "system"
      }]);
    }
  }, [meetingStartTime]);

  // Update meeting notes with context when catching up on a case
  useEffect(() => {
    if (catchUpCaseInfo && meetingNotes.length === 1 && meetingNotes[0]?.content === "Beratung gestartet") {
      const contextNote: MeetingNote = {
        id: `system-context-${Date.now()}`,
        timestamp: new Date(),
        type: "system",
        content: `Fortsetzung der Beratung für Fall ${catchUpCaseInfo.caseNumber}${catchUpCaseInfo.trademarkName && catchUpCaseInfo.trademarkName !== "Unbekannt" ? ` (Marke: ${catchUpCaseInfo.trademarkName})` : ""}`
      };
      
      const detailNotes: MeetingNote[] = [];
      
      if (catchUpCaseInfo.previousSummary) {
        detailNotes.push({
          id: `system-summary-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: `Vorherige Beratung: ${catchUpCaseInfo.previousSummary}`
        });
      }
      
      const extracted = catchUpCaseInfo.extractedData;
      const knownInfo: string[] = [];
      const missingInfo: string[] = [];
      
      if (extracted?.trademarkName) {
        knownInfo.push(`Markenname: ${extracted.trademarkName}`);
      } else {
        missingInfo.push("Markenname");
      }
      
      if (extracted?.countries && extracted.countries.length > 0) {
        knownInfo.push(`Länder: ${extracted.countries.join(", ")}`);
      } else {
        missingInfo.push("Zielländer");
      }
      
      if (extracted?.niceClasses && extracted.niceClasses.length > 0) {
        knownInfo.push(`Nizza-Klassen: ${extracted.niceClasses.join(", ")}`);
      } else {
        missingInfo.push("Nizza-Klassen");
      }
      
      if (knownInfo.length > 0 || missingInfo.length > 0) {
        let statusContent = "";
        if (knownInfo.length > 0) {
          statusContent += `Bereits bekannt: ${knownInfo.join(" | ")}`;
        }
        if (missingInfo.length > 0) {
          statusContent += statusContent ? ` | Noch offen: ${missingInfo.join(", ")}` : `Noch offen: ${missingInfo.join(", ")}`;
        }
        
        detailNotes.push({
          id: `system-status-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: statusContent
        });
      }
      
      setMeetingNotes([contextNote, ...detailNotes]);
    }
  }, [catchUpCaseInfo, meetingNotes]);

  useEffect(() => {
    if (meetingStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - meetingStartTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        setMeetingDuration(`${minutes}:${seconds}`);
        setMeetingDurationSeconds(diff);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [meetingStartTime]);

  // Beim Verlassen der Seite: Sitzung analysieren falls noch nicht geschehen
  const sessionAnalyzedRef = useRef(false);
  
  useEffect(() => {
    sessionAnalyzedRef.current = sessionAnalyzed;
  }, [sessionAnalyzed]);


  // Automatisch einen neuen Case erstellen beim Start einer Beratung
  // NICHT wenn catchUpCaseId gesetzt ist (Beratung nachholen)
  useEffect(() => {
    const createCase = async () => {
      // Skip if we're catching up on an existing case
      if (catchUpCaseId) {
        // Use the catch-up case info instead
        if (catchUpCaseInfo && !currentCaseNumber) {
          setCurrentCaseNumber(catchUpCaseInfo.caseNumber);
          setCurrentCaseId(catchUpCaseId);
          caseCreatedRef.current = true;
        }
        return;
      }
      
      if (meetingNotes.length >= 2 && !caseCreatedRef.current && !currentCaseNumber) {
        caseCreatedRef.current = true;
        try {
          const res = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentCaseNumber(data.case.caseNumber);
            setCurrentCaseId(data.case.id);
          }
        } catch (error) {
          console.error("Error creating case:", error);
        }
      }
    };
    createCase();
  }, [meetingNotes.length, currentCaseNumber, catchUpCaseId, catchUpCaseInfo]);

  const loadConsultations = async () => {
    setLoadingConsultations(true);
    try {
      const res = await fetch("/api/consultations");
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
      }
    } catch (error) {
      console.error("Error loading consultations:", error);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const handleOpenConsultations = () => {
    setShowConsultationsModal(true);
    loadConsultations();
  };

  const handleDeleteConsultation = async (id: string) => {
    setDeletingId(id);
    try {
      let endpoint: string;
      let successMessage: string;
      
      if (id.startsWith("case-")) {
        const caseId = id.replace("case-", "");
        endpoint = `/api/cases/${caseId}`;
        successMessage = "Fall gelöscht";
      } else {
        endpoint = `/api/consultations/${id}`;
        successMessage = "Beratung gelöscht";
      }
      
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        setConsultations(prev => prev.filter(c => c.id !== id));
        if (selectedConsultation?.id === id) {
          setSelectedConsultation(null);
        }
        setToast({ message: successMessage, visible: true });
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Delete failed:", errorData);
        setToast({ message: "Fehler beim Löschen", visible: true });
      }
    } catch (error) {
      console.error("Error deleting:", error);
      setToast({ message: "Fehler beim Löschen", visible: true });
    } finally {
      setDeletingId(null);
    }
  };

  const SUMMARY_STEPS = [
    { id: 1, label: "Transkript wird analysiert...", icon: "📝" },
    { id: 2, label: "Korrigiere Fachbegriffe...", icon: "✏️" },
    { id: 3, label: "Überprüfe Fakten...", icon: "🔍" },
    { id: 4, label: "Strukturiere Zusammenfassung...", icon: "📋" },
    { id: 5, label: "Erstelle Empfehlungen...", icon: "💡" },
  ];

  const ANALYSIS_STEPS = [
    { id: 1, label: "Analysiere Beratungsgespräch...", icon: "🔍" },
    { id: 2, label: "Extrahiere Markenname...", icon: "📝" },
    { id: 3, label: "Identifiziere Nizza-Klassen...", icon: "🏷️" },
    { id: 4, label: "Bestimme Zielländer...", icon: "🌍" },
    { id: 5, label: "Analyse abgeschlossen", icon: "✅" },
  ];

  const startAnalysis = async () => {
    if (meetingNotes.length <= 1) {
      setToast({ message: "Keine Notizen zum Analysieren vorhanden", visible: true });
      return;
    }

    // Stop voice assistant immediately when starting analysis
    stopVoiceSession();
    
    setShowAnalysisModal(true);
    setIsAnalyzing(true);
    setAnalysisStep(1);
    setAnalysisResults(null);
    setManualTrademarkName("");
    setManualNiceClasses("");
    setManualCountriesText("");

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev >= 4) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    try {
      const notesText = meetingNotes
        .filter(n => n.type !== "system")
        .map(n => `${n.type === "user" ? "Frage" : "Antwort"}: ${n.content}`)
        .join("\n\n");

      const response = await fetch("/api/ai/analyze-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNotes: notesText })
      });

      clearInterval(stepInterval);
      setAnalysisStep(5);

      if (!response.ok) throw new Error("Fehler bei der Analyse");

      const data = await response.json();
      setAnalysisResults(data.result);
      
      if (data.result.trademarkName) {
        setManualTrademarkName(data.result.trademarkName);
      }
      if (data.result.niceClasses.length > 0) {
        setManualNiceClasses(data.result.niceClasses.join(", "));
      }
      if (data.result.targetCountries.length > 0) {
        setManualCountriesText(data.result.targetCountries.join(", "));
      }
    } catch (error) {
      clearInterval(stepInterval);
      console.error("Analysis error:", error);
      setToast({ message: "Fehler bei der Analyse", visible: true });
      setAnalysisResults({
        trademarkName: null,
        niceClasses: [],
        targetCountries: [],
        suggestedCountries: [],
        missingFields: ["trademarkName", "niceClasses", "targetCountries"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNavigateToRecherche = async () => {
    const trademark = manualTrademarkName.trim();
    const classes = manualNiceClasses.split(",").map(c => c.trim()).filter(c => c).join(",");
    const countries = manualCountriesText.split(",").map(c => c.trim()).filter(c => c).join(",");
    
    if (!trademark || !classes || !countries) {
      setToast({ message: "Bitte füllen Sie alle Pflichtfelder aus", visible: true });
      return;
    }

    setIsAnalyzing(true);
    setToast({ message: "Erstelle Bericht und navigiere zur Recherche...", visible: true });

    try {
      if (!savedSuccessfully && meetingNotes.length > 1) {
        const result = await runConsultationAnalysisAndSave();
        if (!result.success) {
          console.warn("Failed to save consultation, continuing with navigation");
        }
      }

      const targetCaseId = catchUpCaseId || currentCaseId;
      
      if (targetCaseId) {
        const message = catchUpCaseId 
          ? `Beratung für ${catchUpCaseInfo?.caseNumber} gespeichert!`
          : `Bericht erstellt!`;
        setToast({ message, visible: true });
        setShowAnalysisModal(false);
        if (catchUpCaseId) {
          setCatchUpCaseId(null);
          setCatchUpCaseInfo(null);
        }
        router.push(`/dashboard/recherche?caseId=${targetCaseId}`);
      } else {
        const params = new URLSearchParams({ trademark, classes, countries });
        setShowAnalysisModal(false);
        router.push(`/dashboard/recherche?${params.toString()}`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      const params = new URLSearchParams({ trademark, classes, countries });
      setShowAnalysisModal(false);
      router.push(`/dashboard/recherche?${params.toString()}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isAnalysisFormComplete = () => {
    const hasName = manualTrademarkName.trim().length > 0;
    const hasClasses = manualNiceClasses.trim().length > 0;
    const hasCountries = manualCountriesText.trim().length > 0;
    return hasName && hasClasses && hasCountries;
  };

  const handleReturnToConsultation = () => {
    const missingFields: string[] = [];
    if (!manualTrademarkName.trim()) missingFields.push("Markenname");
    if (!manualNiceClasses.trim()) missingFields.push("Nizza-Klassen");
    if (!manualCountriesText.trim()) missingFields.push("Zielländer");
    
    const protocolSummary = meetingNotes
      .filter(n => n.type !== "system")
      .map(n => `${n.type === "user" ? "Kunde" : "Berater"}: ${n.content}`)
      .join("\n");
    
    const alreadyKnown: string[] = [];
    if (manualTrademarkName.trim()) alreadyKnown.push(`Markenname: "${manualTrademarkName.trim()}"`);
    if (manualNiceClasses.trim()) alreadyKnown.push(`Nizza-Klassen: ${manualNiceClasses.trim()}`);
    if (manualCountriesText.trim()) alreadyKnown.push(`Zielländer: ${manualCountriesText.trim()}`);
    
    let contextMsg = `[SYSTEM-KONTEXT FÜR KLAUS - Der Kunde kommt vom Recherche-Formular zurück]

WICHTIG: Der Kunde nutzt das TrademarkIQ-Formular für die Recherche. Du sollst NICHT nach einer E-Mail-Adresse fragen und KEINEN Bericht per E-Mail anbieten! Der Kunde wird die Recherche über das Formular starten, nicht per E-Mail.

BISHERIGES GESPRÄCH:
${protocolSummary}

`;
    
    if (alreadyKnown.length > 0) {
      contextMsg += `BEREITS ERFASST:
${alreadyKnown.join("\n")}

`;
    }
    
    if (missingFields.length > 0) {
      contextMsg += `FEHLENDE INFORMATIONEN für die Recherche:
${missingFields.join(", ")}

Bitte frage NUR nach den fehlenden Informationen. Wenn du alle Infos hast, sage dem Kunden, dass er jetzt auf "Weiter zur Recherche" klicken kann, um die Recherche zu starten. NICHT nach E-Mail fragen!`;
    } else {
      contextMsg += `Alle Informationen sind vorhanden. Sage dem Kunden, dass er jetzt auf "Weiter zur Recherche" klicken kann, um die Recherche zu starten.`;
    }
    
    setShowAnalysisModal(false);
    setContextMessage(contextMsg);
  };

  const generateMeetingSummary = async () => {
    if (meetingNotes.length <= 1) {
      setToast({ message: "Keine Notizen zum Zusammenfassen vorhanden", visible: true });
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryStep(1);
    setSavedSuccessfully(false);
    
    // Starte Schritt-Animation
    const stepInterval = setInterval(() => {
      setSummaryStep(prev => {
        if (prev >= SUMMARY_STEPS.length) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    
    try {
      const notesText = meetingNotes
        .filter(n => n.type !== "system")
        .map(n => `${n.type === "user" ? "Frage" : "Antwort"}: ${n.content}`)
        .join("\n\n");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Du bist ein Experte für Markenrecht. Analysiere diese Markenberatungs-Sitzung und erstelle eine TABELLARISCHE Zusammenfassung.

WICHTIG - Korrektur:
- Korrigiere Transkriptionsfehler (z.B. "Nissa" → "Nizza", "DBMA" → "DPMA")
- Überprüfe Fakten auf Richtigkeit

AUSGABEFORMAT (exakt einhalten):

## Fakten

| Feld | Wert |
|------|------|
| Markenname | [Name oder "Noch zu klären"] |
| Zielländer | [Länder, kommagetrennt] |
| Nizza-Klassen | [Klassennummern, kommagetrennt] |
| Markenart | [Wort/Bild/Wort-Bild/3D/Klang] |
| Geschäftsbereich | [Kurzbeschreibung] |
| Geschätztes Budget | [Falls genannt] |

## Status

| Aspekt | Status |
|--------|--------|
| Markenname definiert | ✅ Ja / ⚠️ Offen |
| Länder festgelegt | ✅ Ja / ⚠️ Offen |
| Klassen bestimmt | ✅ Ja / ⚠️ Offen |

## Nächste Schritte

1. [Erster konkreter Schritt]
2. [Zweiter konkreter Schritt]
3. [Dritter konkreter Schritt]

## Offene Fragen

- [Falls vorhanden, sonst weglassen]

Gespräch:
${notesText}`,
          history: []
        })
      });

      clearInterval(stepInterval);
      setSummaryStep(SUMMARY_STEPS.length);

      if (!response.ok) throw new Error("Fehler bei der Zusammenfassung");
      
      const data = await response.json();
      const summaryText = data.response;
      setMeetingSummary(summaryText);

      // Automatisch speichern via session-end API
      const saveResponse = await fetch("/api/session-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: notesText,
          source: inputMode === "sprache" ? "voice" : "text",
          duration: meetingDurationSeconds
        })
      });

      if (saveResponse.ok) {
        setSavedSuccessfully(true);
      }

      setShowSummaryModal(true);
      setSessionAnalyzed(true);
    } catch (error) {
      clearInterval(stepInterval);
      console.error("Summary error:", error);
      setToast({ message: "Fehler beim Erstellen der Zusammenfassung", visible: true });
    } finally {
      setIsGeneratingSummary(false);
      setSummaryStep(0);
    }
  };


  const generateSmartTitle = async (): Promise<string> => {
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Erstelle einen kurzen, prägnanten Titel (max 50 Zeichen) für diese Markenberatung. Der Titel soll das Hauptthema der Beratung widerspiegeln. Gib NUR den Titel zurück, ohne Anführungszeichen oder zusätzlichen Text.\n\nZusammenfassung:\n${meetingSummary}`,
          history: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const title = data.response.trim().replace(/^["']|["']$/g, '');
        return title.substring(0, 60);
      }
    } catch (error) {
      console.error("Title generation error:", error);
    }
    return `Markenberatung ${new Date().toLocaleDateString("de-DE")}`;
  };

  const handleSaveConsultation = async (navigateToRecherche: boolean = true) => {
    if (!meetingSummary) return;

    setIsSaving(true);

    try {
      const title = await generateSmartTitle();
      
      const transcript = meetingNotes
        .filter(n => n.type !== "system")
        .map(n => `${n.type === "user" ? "Frage" : "Antwort"}: ${n.content}`)
        .join("\n\n");

      const sessionProtocol = meetingNotes
        .map(n => {
          const time = n.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
          const role = n.type === "user" ? "BENUTZER" : n.type === "assistant" ? "BERATER" : "SYSTEM";
          return `[${time}] ${role}: ${n.content}`;
        })
        .join("\n");

      const extractResponse = await fetch("/api/ai/analyze-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: meetingSummary })
      });
      
      let extractedData = { trademarkName: "", countries: [] as string[], niceClasses: [] as number[] };
      if (extractResponse.ok) {
        const extractResult = await extractResponse.json();
        extractedData = {
          trademarkName: extractResult.trademarkName || "",
          countries: extractResult.countries || [],
          niceClasses: extractResult.niceClasses || [],
        };
      }

      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary: meetingSummary,
          transcript,
          sessionProtocol,
          duration: meetingDurationSeconds,
          mode: inputMode,
          extractedData,
          sendEmail: false
        })
      });

      if (!response.ok) throw new Error("Fehler beim Speichern");

      const consultationData = await response.json();
      const consultationId = consultationData.consultation?.id;
      const consultationStatus = consultationData.consultation?.status;

      setSavedSuccessfully(true);
      setToast({ message: "Bericht erstellt!", visible: true });

      if (consultationId && meetingSummary) {
        if (catchUpCaseId) {
          const catchUpResponse = await fetch(`/api/cases/${catchUpCaseId}/catch-up-beratung`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId,
              summary: meetingSummary,
              extractedData,
            })
          });

          if (catchUpResponse.ok) {
            const catchUpData = await catchUpResponse.json();
            setToast({ 
              message: `Beratung für ${catchUpData.caseNumber || catchUpCaseInfo?.caseNumber} nachgeholt!`, 
              visible: true 
            });
            setCatchUpCaseId(null);
            setCatchUpCaseInfo(null);

            if (navigateToRecherche) {
              // Intelligente Prüfung: Hat die Beratung genug Informationen für die Recherche?
              const hasTrademarkName = extractedData.trademarkName && extractedData.trademarkName.trim().length > 0;
              
              if (!hasTrademarkName) {
                // Nicht genug Informationen - Modal zeigen
                setInsufficientInfoData({
                  extractedData,
                  caseId: catchUpCaseId,
                  caseNumber: catchUpCaseInfo?.caseNumber || null
                });
                setShowSummaryModal(false);
                setShowInsufficientInfoModal(true);
                return;
              }
              
              setShowSummaryModal(false);
              router.push(`/dashboard/recherche?caseId=${catchUpCaseId}`);
              return;
            }
          }
        } else {
          const caseResponse = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId,
              trademarkName: extractedData.trademarkName,
            })
          });

          if (caseResponse.ok) {
            const caseData = await caseResponse.json();
            const caseId = caseData.case?.id;
            const caseNumber = caseData.case?.caseNumber;

            if (caseId) {
              await fetch("/api/cases/extract-decisions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  caseId,
                  consultationId,
                  summary: meetingSummary,
                })
              });

              setToast({ 
                message: `Bericht ${caseNumber} erstellt! Status: ${consultationStatus === "ready_for_research" ? "Bereit für Recherche" : "Unvollständig"}`, 
                visible: true 
              });

              if (navigateToRecherche) {
                // Intelligente Prüfung: Hat die Beratung genug Informationen für die Recherche?
                const hasTrademarkName = extractedData.trademarkName && extractedData.trademarkName.trim().length > 0;
                
                if (!hasTrademarkName) {
                  // Nicht genug Informationen - Modal zeigen
                  setInsufficientInfoData({
                    extractedData,
                    caseId,
                    caseNumber
                  });
                  setShowSummaryModal(false);
                  setShowInsufficientInfoModal(true);
                  return;
                }
                
                setShowSummaryModal(false);
                router.push(`/dashboard/recherche?caseId=${caseId}`);
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      setToast({ message: "Fehler beim Speichern", visible: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueConsultation = () => {
    // Schließe das Modal und bleibe auf der Beratungsseite mit bestehendem Kontext
    setShowInsufficientInfoModal(false);
    setInsufficientInfoData(null);
    // Setze savedSuccessfully zurück, damit der Benutzer weiter arbeiten kann
    setSavedSuccessfully(false);
    // Schließe auch das Summary-Modal falls es noch offen ist
    setShowSummaryModal(false);
  };

  const handleJustSave = () => {
    // Nur speichern ohne Weiterleitung - bereits gespeichert, also nur Modal schließen
    setShowInsufficientInfoModal(false);
    setInsufficientInfoData(null);
    setToast({ message: "Beratung wurde gespeichert. Sie können später zur Recherche wechseln.", visible: true });
  };

  const handleNewSession = () => {
    // Neue Sitzung starten
    setMeetingStartTime(new Date());
    setMeetingNotes([{
      id: `system-${Date.now()}`,
      timestamp: new Date(),
      content: "Neue Beratung gestartet",
      type: "system"
    }]);
    setMeetingSummary(null);
    setSavedSuccessfully(false);
    setShowSummaryModal(false);
    setMeetingDuration("00:00");
    setMeetingDurationSeconds(0);
    setSessionAnalyzed(false);
  };

  const handleMessageSent = (content: string, type: "user" | "assistant") => {
    console.log("[CopilotClient] handleMessageSent called:", type, content.substring(0, 50));
    setMeetingNotes(prev => {
      const newNotes = [...prev, {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        content,
        type
      }];
      // Synchron die Ref aktualisieren, um Race Conditions zu vermeiden
      meetingNotesRef.current = newNotes;
      console.log("[CopilotClient] meetingNotes updated, new length:", newNotes.length);
      return newNotes;
    });
  };

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

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep={1} onHelpClick={() => setShowHelpDrawer(true)} />
      
      {catchUpCaseInfo && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">Beratung nachholen</h3>
              <p className="text-sm text-amber-700">
                Sie holen die Beratung für Fall <strong>{catchUpCaseInfo.caseNumber}</strong> ({catchUpCaseInfo.trademarkName}) nach. 
                Nach Abschluss wird der Beratungsschritt als erledigt markiert.
              </p>
            </div>
            <button
              onClick={() => {
                setCatchUpCaseId(null);
                setCatchUpCaseInfo(null);
                router.push("/dashboard/copilot");
              }}
              className="text-amber-600 hover:text-amber-800 p-1"
              title="Abbrechen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Markenberatung</h1>
            <p className="text-gray-600 mt-1">
              Ihr KI-gestützter Assistent für internationales Markenrecht
            </p>
          </div>
          <button
            onClick={() => setShowHelpDrawer(true)}
            className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-colors"
            title="Hilfe & Anleitungen"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGuidedTour(true)}
            className="text-xs text-primary hover:text-primary/80 underline transition-colors"
            title="Tour starten"
          >
            Tour starten
          </button>
        </div>
        <button
          onClick={handleOpenConsultations}
          data-tour="my-consultations"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FolderOpen className="w-5 h-5 text-primary" />
          <span className="font-medium text-gray-700">Meine Markenfälle</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Eingabemethode</span>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 cursor-help hover:text-gray-700 transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                  Wählen Sie, wie Sie mit dem Berater kommunizieren möchten.
                </div>
              </div>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit" data-tour="input-mode">
              <button
                onClick={() => setInputMode("sprache")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "sprache" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Mic className="w-4 h-4" />
                Sprechen
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "text" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Tippen
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentCaseNumber && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{currentCaseNumber}</span>
              </div>
            )}
            <div className="group relative">
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing || meetingNotes.length <= 1}
                data-tour="go-to-recherche"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isAnalyzing || meetingNotes.length <= 1
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Weiter zur Recherche
                  </>
                )}
              </button>
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                {meetingNotes.length <= 1 
                  ? "Starten Sie zuerst eine Beratung, um zur Recherche weiterzugehen."
                  : "KI analysiert das Gespräch und bereitet die Markenrecherche vor."
                }
              </div>
            </div>
          </div>
        </div>
        
        {/* Transparente Schrittanzeige während Berichtserstellung */}
        {isGeneratingSummary && summaryStep > 0 && (
          <div className="mt-4 bg-gradient-to-br from-primary/5 to-teal-50 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">KI erstellt Bericht...</h4>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {SUMMARY_STEPS.map((step) => {
                const isActive = summaryStep === step.id;
                const isCompleted = summaryStep > step.id;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 p-1.5 rounded transition-all duration-300 ${
                      isActive ? 'bg-white shadow-sm' : isCompleted ? 'opacity-60' : 'opacity-30'
                    }`}
                  >
                    <span className={`text-sm ${isActive ? 'animate-bounce' : ''}`}>
                      {isCompleted ? '✓' : step.icon}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                    {isActive && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(summaryStep / SUMMARY_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 order-1">
          {hasVoiceAssistant ? (
            <VoiceProvider>
              <VoiceAssistant 
                ref={voiceAssistantRef}
                accessToken={accessToken} 
                inputMode={inputMode} 
                onMessageSent={handleMessageSent}
                autoStart={autoStartConsultation}
                onAutoStartConsumed={() => setAutoStartConsultation(false)}
                contextMessage={contextMessage}
                onContextMessageConsumed={() => setContextMessage(null)}
              />
            </VoiceProvider>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">
                Der Sprachassistent ist derzeit nicht verfügbar.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Bitte stellen Sie sicher, dass die Hume AI Zugangsdaten konfiguriert sind.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 order-2">
          {meetingNotes.length > 1 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Sitzungsprotokoll
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {meetingNotes.filter(n => n.type !== "system").slice(-10).map((note) => (
                  <div key={note.id} className={`text-sm p-3 rounded-lg ${
                    note.type === "user"
                      ? "bg-primary/10 text-gray-800"
                      : "bg-gray-50 text-gray-700"
                  }`}>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {note.type === "user" ? "Frage:" : "Antwort:"}
                    </span>
                    <span className="whitespace-pre-wrap">{note.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-primary to-teal-600 rounded-xl overflow-hidden text-white">
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                So funktioniert's
              </h3>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showHowItWorks ? 'rotate-180' : ''}`} />
            </button>
            {showHowItWorks && (
              <ul className="text-sm text-white/90 space-y-2 px-5 pb-5">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  {inputMode === "sprache" 
                    ? "Klicken Sie auf 'Starten' und sprechen Sie Ihre Fragen"
                    : "Tippen Sie Ihre Fragen ins Textfeld"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  Stellen Sie alle Fragen, die Sie haben
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  Klicken Sie auf "Bericht erstellen" - die Beratung wird automatisch gespeichert
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {showSummaryModal && meetingSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSummaryModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-teal-500 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Zusammenfassung</h2>
                    <p className="text-white/80 text-sm">
                      {new Date().toLocaleDateString("de-DE", { 
                        weekday: "long", 
                        day: "numeric", 
                        month: "long" 
                      })} · {meetingDuration}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-white/80 hover:text-white p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2.5 first:mt-0 text-gray-900">{children}</h2>,
                    h2: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 first:mt-0 text-primary flex items-center gap-2">{children}</h3>,
                    h3: ({ children }) => <h4 className="text-sm font-semibold mt-4 mb-2 first:mt-0 text-gray-800">{children}</h4>,
                    p: ({ children }) => <p className="mb-3 last:mb-0 text-gray-700 leading-relaxed text-sm">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-700 text-sm">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    table: ({ children }) => <table className="w-full border-collapse mb-4 text-sm">{children}</table>,
                    thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                    th: ({ children }) => <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase">{children}</th>,
                    td: ({ children }) => <td className="py-2 px-3 text-gray-800">{children}</td>,
                  }}
                >
                  {meetingSummary}
                </ReactMarkdown>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50">
              {savedSuccessfully ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Erfolgreich gespeichert</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleNewSession}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                    >
                      Neue Beratung
                    </button>
                    <button
                      onClick={() => setShowSummaryModal(false)}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowSummaryModal(false)}
                    className="flex-1 px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleSaveConsultation(true)}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Bericht erstellen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showConsultationsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowConsultationsModal(false); setSelectedConsultation(null); }}>
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
                  onClick={() => {
                    setShowConsultationsModal(false);
                    setSelectedConsultation(null);
                  }}
                  className="text-white/80 hover:text-white p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingConsultations ? (
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
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(selectedConsultation.createdAt)} · {formatDuration(selectedConsultation.duration)}
                    </p>
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
                    const journeySteps = ["beratung", "recherche", "risikoanalyse", "anmeldung", "watchlist"];
                    const stepLabels: Record<string, string> = {
                      beratung: "Beratung",
                      recherche: "Recherche",
                      risikoanalyse: "Risiko",
                      anmeldung: "Anmeldung",
                      watchlist: "Watchlist",
                    };
                    const getStepStatus = (stepName: string) => {
                      const step = consultation.caseSteps?.find(s => s.step === stepName);
                      if (!step) return "pending";
                      if (step.skippedAt || step.status === "skipped") return "skipped";
                      if (step.completedAt || step.status === "completed") return "completed";
                      if (step.status === "in_progress") return "in_progress";
                      return "pending";
                    };
                    
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
                                {formatDate(consultation.createdAt)} · {formatDuration(consultation.duration)}
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
                                    const status = getStepStatus(step);
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
                                  {journeySteps.filter(s => getStepStatus(s) === "completed").length} von {journeySteps.length} Schritten abgeschlossen
                                </p>
                              </div>
                            )}
                            
                            {consultation.caseId && (
                              <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                {(() => {
                                  const beratungStatus = getStepStatus("beratung");
                                  const nextStep = journeySteps.find((s, i) => i > 0 && getStepStatus(s) !== "completed" && getStepStatus(s) !== "skipped");
                                  const stepRoutes: Record<string, string> = {
                                    recherche: `/dashboard/recherche?caseId=${consultation.caseId}`,
                                    risikoanalyse: `/dashboard/risikoanalyse?caseId=${consultation.caseId}`,
                                    anmeldung: `/dashboard/anmeldung?caseId=${consultation.caseId}`,
                                    watchlist: `/dashboard/watchlist?caseId=${consultation.caseId}`,
                                  };
                                  
                                  // Prüfe ob die Beratung unvollständig ist
                                  const isIncomplete = consultation.extractedData && !(consultation.extractedData as any).isComplete;
                                  
                                  return (
                                    <>
                                      {beratungStatus === "skipped" && (
                                        <button
                                          onClick={() => {
                                            setShowConsultationsModal(false);
                                            router.push(`/dashboard/copilot?catchUpCase=${consultation.caseId}`);
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
                                            setShowConsultationsModal(false);
                                            router.push(`/dashboard/copilot?catchUpCase=${consultation.caseId}`);
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
                                            setShowConsultationsModal(false);
                                            router.push(stepRoutes[nextStep]);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                          Weiter: {stepLabels[nextStep]}
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      
                                      {journeySteps.slice(1).filter(s => getStepStatus(s) !== "completed").length > 1 && (
                                        <div className="flex gap-1">
                                          {journeySteps.slice(1).filter(s => s !== nextStep && getStepStatus(s) !== "completed").slice(0, 2).map(step => (
                                            <button
                                              key={step}
                                              onClick={() => {
                                                setShowConsultationsModal(false);
                                                router.push(stepRoutes[step]);
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
                            onClick={() => handleDeleteConsultation(consultation.id)}
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
                onClick={() => {
                  setShowConsultationsModal(false);
                  setSelectedConsultation(null);
                }}
                className="w-full px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAnalysisModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">KI-Analyse</h2>
                    <p className="text-white/80 text-sm">Vorbereitung der Markenrecherche</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="text-white/80 hover:text-white p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isAnalyzing ? (
                <div className="space-y-3">
                  {ANALYSIS_STEPS.map((step) => {
                    const isActive = analysisStep === step.id;
                    const isCompleted = analysisStep > step.id;
                    
                    return (
                      <div 
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                          isActive ? 'bg-teal-50 border border-teal-200' : isCompleted ? 'bg-gray-50' : 'opacity-40'
                        }`}
                      >
                        <span className={`text-xl ${isActive ? 'animate-pulse' : ''}`}>
                          {isCompleted ? '✓' : step.icon}
                        </span>
                        <span className={`text-sm ${isActive ? 'text-teal-800 font-medium' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        {isActive && <Loader2 className="w-4 h-4 animate-spin text-teal-600 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              ) : analysisResults && (
                <div className="space-y-6">
                  {analysisResults.missingFields.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Analyse abgeschlossen</p>
                        <p className="text-sm text-green-600">Alle Informationen wurden gefunden</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Info className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Fehlende Informationen</p>
                        <p className="text-sm text-amber-600">Bitte ergänzen Sie die markierten Felder</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Markenname <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualTrademarkName}
                        onChange={(e) => setManualTrademarkName(e.target.value)}
                        placeholder="z.B. TechBrand Pro"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                          !manualTrademarkName.trim() ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                      {analysisResults.trademarkName && (
                        <p className="text-xs text-green-600 mt-1">✓ Aus Gespräch extrahiert</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nizza-Klassen <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualNiceClasses}
                        onChange={(e) => setManualNiceClasses(e.target.value)}
                        placeholder="z.B. 9, 35, 42"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                          !manualNiceClasses.trim() ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Mehrere Klassen mit Komma trennen (1-45)</p>
                      {analysisResults.niceClasses.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">✓ Aus Gespräch extrahiert</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Zielländer/-regionen <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualCountriesText}
                        onChange={(e) => setManualCountriesText(e.target.value)}
                        placeholder="z.B. Deutschland, Europäische Union, USA"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                          !manualCountriesText.trim() ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Mehrere Länder mit Komma trennen. WIPO ist kein Land.</p>
                      {analysisResults.targetCountries.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">✓ Aus Gespräch extrahiert</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50">
              {!isAnalysisFormComplete() && !isAnalyzing && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💬 <strong>Sie wissen nicht weiter?</strong> Kehren Sie zur Beratung zurück und klären Sie die offenen Fragen mit Klaus.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                {!isAnalysisFormComplete() && !isAnalyzing && (
                  <button
                    onClick={handleReturnToConsultation}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Zurück zur Beratung
                  </button>
                )}
                <button
                  onClick={handleNavigateToRecherche}
                  disabled={isAnalyzing || !isAnalysisFormComplete()}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                    isAnalyzing || !isAnalysisFormComplete()
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  Zur Recherche
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowLeaveModal(false); setPendingNavigation(null); }}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Beratung nicht gespeichert</h2>
                  <p className="text-white/80 text-sm">Möchten Sie die Ergebnisse speichern?</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-gray-600 mb-4">
                Sie haben eine laufende Beratung mit <strong>{meetingNotes.length - 1} Nachrichten</strong>. 
                Wenn Sie jetzt die Seite verlassen, gehen diese Informationen verloren.
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <p className="text-sm text-gray-700">
                  <strong>Tipp:</strong> Speichern Sie die Beratung, um später zur Markenrecherche fortzufahren.
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col gap-2">
              <button
                onClick={confirmLeaveAndSave}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                Beratung speichern
              </button>
              <button
                onClick={confirmLeaveWithoutSaving}
                className="w-full px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                Ohne Speichern verlassen
              </button>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setPendingNavigation(null);
                }}
                className="w-full px-5 py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showInsufficientInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowInsufficientInfoModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Unvollständige Beratung</h2>
                  <p className="text-white/80 text-sm">Informationen für Recherche fehlen</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-gray-600 mb-4">
                Die Beratung wurde gespeichert, enthält aber noch <strong>keinen Markennamen</strong>. 
                Für eine sinnvolle Markenrecherche werden mindestens folgende Informationen benötigt:
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={insufficientInfoData?.extractedData.trademarkName ? "text-green-500" : "text-amber-500"}>
                    {insufficientInfoData?.extractedData.trademarkName ? "✓" : "○"}
                  </span>
                  <span className="text-sm text-gray-700">
                    Markenname {insufficientInfoData?.extractedData.trademarkName ? `(${insufficientInfoData.extractedData.trademarkName})` : "(fehlt)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={insufficientInfoData?.extractedData.countries?.length ? "text-green-500" : "text-gray-400"}>
                    {insufficientInfoData?.extractedData.countries?.length ? "✓" : "○"}
                  </span>
                  <span className="text-sm text-gray-700">
                    Zielländer {insufficientInfoData?.extractedData.countries?.length ? `(${insufficientInfoData.extractedData.countries.join(", ")})` : "(optional)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={insufficientInfoData?.extractedData.niceClasses?.length ? "text-green-500" : "text-gray-400"}>
                    {insufficientInfoData?.extractedData.niceClasses?.length ? "✓" : "○"}
                  </span>
                  <span className="text-sm text-gray-700">
                    Nizza-Klassen {insufficientInfoData?.extractedData.niceClasses?.length ? `(${insufficientInfoData.extractedData.niceClasses.join(", ")})` : "(optional)"}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Sie können die Beratung fortsetzen, um die fehlenden Informationen zu klären, oder später zur Recherche wechseln.
              </p>
            </div>
            
            <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col gap-2">
              <button
                onClick={handleContinueConsultation}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Beratung fortsetzen
              </button>
              <button
                onClick={handleJustSave}
                className="w-full px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                Nur speichern (ohne Recherche)
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      <HelpDrawer 
        isOpen={showHelpDrawer} 
        onClose={() => setShowHelpDrawer(false)} 
        onStartConsultation={() => {
          setAutoStartConsultation(true);
        }}
      />
      
      <GuidedTour 
        isOpen={showGuidedTour} 
        onClose={() => setShowGuidedTour(false)} 
        onComplete={() => {
          setShowGuidedTour(false);
          localStorage.setItem("hasSeenTour", "true");
        }} 
      />
    </div>
  );
}
