"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mic, FileText, Clock, Check, MessageSquare, MessageCircle, Sparkles, Info, Loader2, X, Save, FolderOpen, Lightbulb, ChevronDown, HelpCircle, ArrowRight, Search, AlertTriangle, Globe, Tag } from "lucide-react";
import { NICE_CLASSES } from "@/lib/nice-classes";
import ReactMarkdown from "react-markdown";
import VoiceAssistant, { VoiceAssistantHandle } from "../../components/VoiceAssistant";
import WorkflowProgress from "../../components/WorkflowProgress";
import HelpDrawer from "../../components/HelpDrawer";
import GuidedTour from "../../components/GuidedTour";
import ConsultationsModal from "../../components/ConsultationsModal";
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

const laenderOptions = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "AF", label: "Afghanistan" },
  { value: "AG", label: "Antigua and Barbuda" },
  { value: "AL", label: "Albania" },
  { value: "AM", label: "Armenia" },
  { value: "AT", label: "Austria" },
  { value: "AU", label: "Australia" },
  { value: "AZ", label: "Azerbaijan" },
  { value: "BA", label: "Bosnia and Herzegovina" },
  { value: "BG", label: "Bulgaria" },
  { value: "BH", label: "Bahrain" },
  { value: "BN", label: "Brunei Darussalam" },
  { value: "BQ", label: "Bonaire, Sint Eustatius and Saba" },
  { value: "BR", label: "Brazil" },
  { value: "BT", label: "Bhutan" },
  { value: "BW", label: "Botswana" },
  { value: "BX", label: "Benelux" },
  { value: "BY", label: "Belarus" },
  { value: "BZ", label: "Belize" },
  { value: "CA", label: "Canada" },
  { value: "CH", label: "Switzerland" },
  { value: "CL", label: "Chile" },
  { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" },
  { value: "CU", label: "Cuba" },
  { value: "CV", label: "Cabo Verde" },
  { value: "CW", label: "Curaçao" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DE", label: "Germany" },
  { value: "DK", label: "Denmark" },
  { value: "DZ", label: "Algeria" },
  { value: "EE", label: "Estonia" },
  { value: "EG", label: "Egypt" },
  { value: "EM", label: "European Union" },
  { value: "ES", label: "Spain" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "GE", label: "Georgia" },
  { value: "GG", label: "Guernsey" },
  { value: "GH", label: "Ghana" },
  { value: "GM", label: "Gambia" },
  { value: "GR", label: "Greece" },
  { value: "HR", label: "Croatia" },
  { value: "HU", label: "Hungary" },
  { value: "ID", label: "Indonesia" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IN", label: "India" },
  { value: "IR", label: "Islamic Republic of Iran" },
  { value: "IS", label: "Iceland" },
  { value: "IT", label: "Italy" },
  { value: "JM", label: "Jamaica" },
  { value: "JP", label: "Japan" },
  { value: "KE", label: "Kenya" },
  { value: "KG", label: "Kyrgyzstan" },
  { value: "KH", label: "Cambodia" },
  { value: "KP", label: "Democratic People's Republic of Korea" },
  { value: "KR", label: "Republic of Korea" },
  { value: "KZ", label: "Kazakhstan" },
  { value: "LA", label: "Lao People's Democratic Republic" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LR", label: "Liberia" },
  { value: "LS", label: "Lesotho" },
  { value: "LT", label: "Lithuania" },
  { value: "LV", label: "Latvia" },
  { value: "MA", label: "Morocco" },
  { value: "MC", label: "Monaco" },
  { value: "MD", label: "Republic of Moldova" },
  { value: "ME", label: "Montenegro" },
  { value: "MG", label: "Madagascar" },
  { value: "MK", label: "The Republic of North Macedonia" },
  { value: "MN", label: "Mongolia" },
  { value: "MU", label: "Mauritius" },
  { value: "MW", label: "Malawi" },
  { value: "MX", label: "Mexico" },
  { value: "MY", label: "Malaysia" },
  { value: "MZ", label: "Mozambique" },
  { value: "NA", label: "Namibia" },
  { value: "NO", label: "Norway" },
  { value: "NZ", label: "New Zealand" },
  { value: "OA", label: "African Intellectual Property Organization (OAPI)" },
  { value: "OM", label: "Oman" },
  { value: "PH", label: "Philippines" },
  { value: "PK", label: "Pakistan" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "QA", label: "Qatar" },
  { value: "RO", label: "Romania" },
  { value: "RS", label: "Serbia" },
  { value: "RU", label: "Russian Federation" },
  { value: "RW", label: "Rwanda" },
  { value: "SD", label: "Sudan" },
  { value: "SE", label: "Sweden" },
  { value: "SG", label: "Singapore" },
  { value: "SI", label: "Slovenia" },
  { value: "SK", label: "Slovakia" },
  { value: "SL", label: "Sierra Leone" },
  { value: "SM", label: "San Marino" },
  { value: "ST", label: "Sao Tome and Principe" },
  { value: "SX", label: "Sint Maarten (Dutch part)" },
  { value: "SY", label: "Syrian Arab Republic" },
  { value: "SZ", label: "Eswatini" },
  { value: "TH", label: "Thailand" },
  { value: "TJ", label: "Tajikistan" },
  { value: "TM", label: "Turkmenistan" },
  { value: "TN", label: "Tunisia" },
  { value: "TR", label: "Türkiye" },
  { value: "TT", label: "Trinidad and Tobago" },
  { value: "UA", label: "Ukraine" },
  { value: "US", label: "United States of America" },
  { value: "UZ", label: "Uzbekistan" },
  { value: "VN", label: "Viet Nam" },
  { value: "WS", label: "Samoa" },
  { value: "ZM", label: "Zambia" },
  { value: "ZW", label: "Zimbabwe" },
];

interface NiceClassDropdownProps {
  selectedClasses: number[];
  onToggleClass: (classId: number) => void;
  onClearAll: () => void;
}

function NiceClassDropdown({ selectedClasses, onToggleClass, onClearAll }: NiceClassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allClassesSorted = [...NICE_CLASSES].sort((a, b) => a.id - b.id);

  const filterClasses = (classes: typeof NICE_CLASSES) => {
    if (!searchTerm) return classes;
    const term = searchTerm.toLowerCase();
    return classes.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.description.toLowerCase().includes(term) ||
      c.id.toString().includes(term)
    );
  };

  const filteredClasses = filterClasses(allClassesSorted);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-all text-left ${
          selectedClasses.length > 0
            ? "bg-primary/5 border-primary text-gray-800"
            : "bg-white border-gray-200 text-gray-700 hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-medium truncate">
            {selectedClasses.length === 45
              ? "Alle Klassen"
              : selectedClasses.length > 0 
              ? `${selectedClasses.length} Nizza-Klasse${selectedClasses.length > 1 ? 'n' : ''} ausgewählt`
              : "Nizza-Klassen auswählen"
            }
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedClasses.length === 45 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg">
              Alle Klassen
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                }}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : (
            <>
              {selectedClasses.map(classId => (
                <span
                  key={classId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg"
                >
                  Klasse {classId}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleClass(classId);
                    }}
                    className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedClasses.length > 1 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-sm text-primary hover:text-primary/80 font-medium px-2"
                >
                  Alle entfernen
                </button>
              )}
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Klasse suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          <div className="max-h-[320px] overflow-y-auto">
            {!searchTerm && (
              <label
                className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-gray-100 bg-gray-50/50"
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedClasses.length === 45 
                    ? 'bg-primary border-primary' 
                    : 'border-gray-300 hover:border-primary'
                }`}>
                  {selectedClasses.length === 45 && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedClasses.length === 45}
                  onChange={() => {
                    if (selectedClasses.length === 45) {
                      onClearAll();
                    } else {
                      allClassesSorted.forEach(c => {
                        if (!selectedClasses.includes(c.id)) {
                          onToggleClass(c.id);
                        }
                      });
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    Alle Klassen auswählen
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Alle 45 Nizza-Klassen auf einmal auswählen
                  </div>
                </div>
              </label>
            )}
            {filteredClasses.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wide">
                  Alle 45 Nizza-Klassen
                </div>
                {filteredClasses.map(niceClass => (
                  <label
                    key={niceClass.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedClasses.includes(niceClass.id) 
                        ? 'bg-primary border-primary' 
                        : 'border-gray-300 hover:border-primary'
                    }`}>
                      {selectedClasses.includes(niceClass.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedClasses.includes(niceClass.id)}
                      onChange={() => onToggleClass(niceClass.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        Klasse {niceClass.id} – {niceClass.name}
                        {niceClass.popular && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">beliebt</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {niceClass.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {filteredClasses.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>Keine Klassen gefunden für "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LaenderDropdownProps {
  selectedLaender: string[];
  onToggleLand: (land: string) => void;
  onClearAll: () => void;
}

function LaenderDropdown({ selectedLaender, onToggleLand, onClearAll }: LaenderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLaender = laenderOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-all text-left ${
          selectedLaender.length > 0
            ? "bg-primary/5 border-primary text-gray-800"
            : "bg-white border-gray-200 text-gray-700 hover:border-primary"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-medium truncate">
            {selectedLaender.length > 0 
              ? `${selectedLaender.length} ${selectedLaender.length === 1 ? 'Land' : 'Länder'} ausgewählt`
              : "Länder / Register auswählen"
            }
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedLaender.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedLaender.map(land => {
            const option = laenderOptions.find(o => o.value === land);
            return (
              <span
                key={land}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg"
              >
                {option?.label || land}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLand(land);
                  }}
                  className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
          {selectedLaender.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm text-primary hover:text-primary/80 font-medium px-2"
            >
              Alle entfernen
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Land suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredLaender.length > 0 ? (
              filteredLaender.map(option => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedLaender.includes(option.value) 
                      ? 'bg-primary border-primary' 
                      : 'border-gray-300 hover:border-primary'
                  }`}>
                    {selectedLaender.includes(option.value) && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedLaender.includes(option.value)}
                    onChange={() => onToggleLand(option.value)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      {option.value} - {option.label}
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Keine Länder gefunden für "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionAnalyzed, setSessionAnalyzed] = useState(false);
  const [contextTopic, setContextTopic] = useState<string | null>(null);
  const [contextPrompt, setContextPrompt] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isVoiceAssistantExpanded, setIsVoiceAssistantExpanded] = useState(true);
  const [isRechercheExpanded, setIsRechercheExpanded] = useState(false);
  const [rechercheSearchQuery, setRechercheSearchQuery] = useState("");
  const [rechercheSelectedLaender, setRechercheSelectedLaender] = useState<string[]>([]);
  const [rechercheSelectedClasses, setRechercheSelectedClasses] = useState<number[]>([]);
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
  const [caseMemory, setCaseMemory] = useState<string | null>(null);
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
  const [welcomeMessage, setWelcomeMessage] = useState<{
    caseNumber: string;
    trademarkName: string | null;
    sessionCount: number;
    countries: string[];
    niceClasses: number[];
    missingInfo: string[];
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const meetingNotesRef = useRef<MeetingNote[]>([]);
  const inputModeRef = useRef<"sprache" | "text">("sprache");
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const userNotes = meetingNotes.filter(n => n.type !== "system");
  const hasUnsavedData = userNotes.length > 0 && !savedSuccessfully && !sessionAnalyzed;

  // Global UnsavedDataContext integration for sidebar navigation interception
  const { 
    setHasUnsavedData: setGlobalHasUnsavedData, 
    setOnSaveBeforeLeave,
    setCheckUnsavedDataRef
  } = useUnsavedData();

  // Register ref-based check function for real-time detection (fixes race condition)
  useEffect(() => {
    const checkUnsavedData = () => {
      const userNotesInRef = meetingNotesRef.current.filter(n => n.type !== "system");
      console.log("[CopilotClient] Ref check - userNotes:", userNotesInRef.length, "| total:", meetingNotesRef.current.length);
      return userNotesInRef.length > 0 && !savedSuccessfully && !sessionAnalyzed;
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
    const resumeCase = searchParams.get("resumeCase");
    const caseToResume = catchUpCase || resumeCase;
    
    if (topic) {
      setContextTopic(topic);
      setContextPrompt(prompt ? decodeURIComponent(prompt) : null);
    }
    if (showConsultations === "true") {
      setShowConsultationsModal(true);
    }
    if (caseToResume) {
      setCatchUpCaseId(caseToResume);
      
      const loadCaseData = async () => {
        try {
          const caseRes = await fetch(`/api/cases/${caseToResume}`);
          const data = await caseRes.json();
          
          if (!data.case) return;
          
          const allConsultations = data.case.consultations || [];
          const latestConsultation = allConsultations[allConsultations.length - 1];
          
          let mergedCountries: string[] = [];
          let mergedNiceClasses: number[] = [];
          let allSummaries: { date: string; summary: string }[] = [];
          
          allConsultations.forEach((consultation: any) => {
            const extracted = consultation.extractedData as {
              trademarkName?: string;
              countries?: string[];
              niceClasses?: number[];
            } | undefined;
            
            if (extracted?.countries) {
              mergedCountries = [...new Set([...mergedCountries, ...extracted.countries])];
            }
            if (extracted?.niceClasses) {
              mergedNiceClasses = [...new Set([...mergedNiceClasses, ...extracted.niceClasses])];
            }
            if (consultation.summary) {
              const consultationDate = new Date(consultation.createdAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              });
              allSummaries.push({ date: consultationDate, summary: consultation.summary });
            }
          });
          
          const latestExtracted = latestConsultation?.extractedData as {
            trademarkName?: string;
            countries?: string[];
            niceClasses?: number[];
          } | undefined;
          
          const trademarkName = data.case.trademarkName || latestExtracted?.trademarkName || "Unbekannt";
          const countries = mergedCountries.length > 0 ? mergedCountries : (latestExtracted?.countries || []);
          const niceClasses = mergedNiceClasses.length > 0 ? mergedNiceClasses : (latestExtracted?.niceClasses || []);
          
          setCatchUpCaseInfo({
            caseNumber: data.case.caseNumber,
            trademarkName,
            previousSummary: allSummaries.map(s => `[${s.date}] ${s.summary}`).join("\n\n"),
            extractedData: {
              trademarkName: data.case.trademarkName || latestExtracted?.trademarkName,
              countries,
              niceClasses,
            }
          });
          
          const missingInfo: string[] = [];
          const hasTrademarkName = data.case.trademarkName || latestExtracted?.trademarkName;
          if (!hasTrademarkName) missingInfo.push("Markenname");
          if (!countries.length) missingInfo.push("Zielländer");
          if (!niceClasses.length) missingInfo.push("Nizza-Klassen");
          
          let systemContext = `[SYSTEM-KONTEXT]
Dies ist eine Fortsetzung einer Beratung für Fall ${data.case.caseNumber}.
Der Kunde hat bereits ${allConsultations.length} Beratungssession(s) mit dir geführt.`;

          if (allSummaries.length > 0) {
            systemContext += `

GESPRÄCHSVERLAUF (chronologisch):`;
            allSummaries.forEach((s, i) => {
              systemContext += `

--- Session ${i + 1} (${s.date}) ---
${s.summary}`;
            });
          }

          const knownTrademarkName = data.case.trademarkName || latestExtracted?.trademarkName;
          console.log("[CopilotClient] resumeCase context:", {
            totalSessions: allConsultations.length,
            caseTrademarkName: data.case.trademarkName,
            knownTrademarkName,
            countries,
            niceClasses
          });
          
          systemContext += `

AKTUELLER STAND:
- Markenname: ${knownTrademarkName || "(noch nicht festgelegt)"}
- Länder: ${countries.length > 0 ? countries.join(", ") : "(noch nicht festgelegt)"}
- Nizza-Klassen: ${niceClasses.length > 0 ? niceClasses.join(", ") : "(noch nicht festgelegt)"}`;

          if (missingInfo.length > 0) {
            systemContext += `

FEHLENDE INFORMATIONEN:
${missingInfo.map(info => `- ${info} muss noch bestimmt werden`).join("\n")}

Bitte begrüße den Kunden herzlich zurück und fasse kurz zusammen, was ihr bereits besprochen habt. Hilf dann, die fehlenden Informationen zu ergänzen.`;
          } else {
            systemContext += `

Alle wichtigen Informationen sind bereits vorhanden. Begrüße den Kunden herzlich zurück, fasse kurz zusammen was ihr besprochen habt, und frage ob er zur Recherche fortfahren oder weitere Details besprechen möchte.`;
          }
          
          // Fetch case memory from the memory API
          try {
            const memoryRes = await fetch(`/api/cases/${caseToResume}/memory`);
            const memoryData = await memoryRes.json();
            console.log("[CopilotClient] Case Memory loaded:", !!memoryData.memory?.promptForAgent);
            
            if (memoryData.memory?.promptForAgent) {
              setCaseMemory(memoryData.memory.promptForAgent);
              // Append memory to system context
              systemContext += `

---

${memoryData.memory.promptForAgent}`;
            }
          } catch (memoryErr) {
            console.error("[CopilotClient] Error fetching case memory:", memoryErr);
          }
          
          setContextMessage(systemContext);
          
          setWelcomeMessage({
            caseNumber: data.case.caseNumber,
            trademarkName: knownTrademarkName || null,
            sessionCount: allConsultations.length,
            countries,
            niceClasses,
            missingInfo
          });
        } catch (err) {
          console.error("Error fetching case info:", err);
        }
      };
      
      loadCaseData();
    }
  }, [searchParams]);

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const response = await fetch("/api/user/tour-status");
        if (response.ok) {
          const data = await response.json();
          if (!data.tourCompleted) {
            const timer = setTimeout(() => {
              setShowGuidedTour(true);
            }, 1000);
            return () => clearTimeout(timer);
          }
        }
      } catch (error) {
        console.error("Error checking tour status:", error);
      }
    };
    checkTourStatus();
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
    const countriesArray = manualCountriesText.split(",").map(c => c.trim()).filter(c => c);
    const countries = countriesArray.join(",");
    
    if (!trademark || !manualNiceClasses.trim() || !countries) {
      setToast({ message: "Bitte füllen Sie alle Pflichtfelder aus", visible: true });
      return;
    }

    setIsAnalyzing(true);
    setToast({ message: "Analysiere Eingaben und navigiere zur Recherche...", visible: true });

    let classesArray: string[] = [];
    let numericClasses: number[] = [];
    
    try {
      const interpretResponse = await fetch("/api/ai/interpret-nice-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: manualNiceClasses.trim() })
      });
      
      if (interpretResponse.ok) {
        const interpretData = await interpretResponse.json();
        if (interpretData.classes && interpretData.classes.length > 0) {
          numericClasses = interpretData.classes;
          classesArray = numericClasses.map(n => n.toString());
          if (interpretData.interpreted) {
            setManualNiceClasses(classesArray.join(", "));
          }
        } else if (interpretData.error) {
          setToast({ message: interpretData.error, visible: true });
          setIsAnalyzing(false);
          return;
        }
      }
    } catch (interpretError) {
      console.error("Failed to interpret Nice classes:", interpretError);
    }
    
    if (classesArray.length === 0) {
      classesArray = manualNiceClasses.split(",").map(c => c.trim()).filter(c => c);
      numericClasses = classesArray.map(c => parseInt(c)).filter(n => !isNaN(n) && n >= 1 && n <= 45);
    }
    
    const classes = classesArray.join(",");
    
    if (numericClasses.length === 0) {
      setToast({ message: "Bitte geben Sie gültige Nizza-Klassen ein (1-45)", visible: true });
      setIsAnalyzing(false);
      return;
    }

    try {
      if (!savedSuccessfully && meetingNotes.length > 1) {
        const result = await runConsultationAnalysisAndSave();
        if (!result.success) {
          console.warn("Failed to save consultation, continuing with navigation");
        }
      }

      const targetCaseId = catchUpCaseId || currentCaseId;
      
      if (targetCaseId) {
        // Save manual data to caseDecisions and update trademarkCases before navigating
        try {
          // Save to caseDecisions
          await fetch("/api/cases/save-decisions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: targetCaseId,
              trademarkName: trademark,
              countries: countriesArray,
              niceClasses: numericClasses
            })
          });
          
          // Also update trademarkCases.trademarkName
          await fetch(`/api/cases/${targetCaseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trademarkName: trademark })
          });
        } catch (saveError) {
          console.error("Failed to save manual decisions:", saveError);
        }
        
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

  const toggleRechercheLand = (land: string) => {
    setRechercheSelectedLaender(prev => 
      prev.includes(land) ? prev.filter(l => l !== land) : [...prev, land]
    );
  };

  const toggleRechercheClass = (classId: number) => {
    setRechercheSelectedClasses(prev => 
      prev.includes(classId) ? prev.filter(c => c !== classId) : [...prev, classId]
    );
  };

  const handleStartRecherche = () => {
    const params = new URLSearchParams();
    if (rechercheSearchQuery.trim()) {
      params.set("query", rechercheSearchQuery.trim());
    }
    if (rechercheSelectedLaender.length > 0) {
      params.set("countries", rechercheSelectedLaender.join(","));
    }
    if (rechercheSelectedClasses.length > 0) {
      params.set("classes", rechercheSelectedClasses.join(","));
    }
    const queryString = params.toString();
    router.push(`/dashboard/recherche${queryString ? `?${queryString}` : ""}`);
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

      {welcomeMessage && (
        <div className="mb-6 bg-gradient-to-r from-primary/5 to-teal-50 border border-primary/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Willkommen zurück! 👋
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {welcomeMessage.sessionCount === 1 
                  ? `Sie setzen Ihre Beratung für Fall ${welcomeMessage.caseNumber} fort.`
                  : `Sie haben bereits ${welcomeMessage.sessionCount} Gespräche zu Fall ${welcomeMessage.caseNumber} geführt.`
                }
              </p>
              
              <div className="bg-white rounded-xl p-4 border border-gray-100 mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Markenname</span>
                    <span className={`font-medium ${welcomeMessage.trademarkName ? 'text-gray-900' : 'text-amber-600'}`}>
                      {welcomeMessage.trademarkName || "Noch offen"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Länder</span>
                    <span className={`font-medium ${welcomeMessage.countries.length > 0 ? 'text-gray-900' : 'text-amber-600'}`}>
                      {welcomeMessage.countries.length > 0 ? welcomeMessage.countries.join(", ") : "Noch offen"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Nizza-Klassen</span>
                    <span className={`font-medium ${welcomeMessage.niceClasses.length > 0 ? 'text-gray-900' : 'text-amber-600'}`}>
                      {welcomeMessage.niceClasses.length > 0 ? welcomeMessage.niceClasses.join(", ") : "Noch offen"}
                    </span>
                  </div>
                </div>
              </div>
              
              {welcomeMessage.missingInfo.length > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Noch zu klären: {welcomeMessage.missingInfo.join(", ")}
                </p>
              )}
              
              <button
                onClick={() => setWelcomeMessage(null)}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Verstanden, Beratung starten →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* Accordion Header */}
        <button
          onClick={() => setIsVoiceAssistantExpanded(!isVoiceAssistantExpanded)}
          className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${isVoiceAssistantExpanded ? 'rounded-t-2xl border-b border-gray-100' : 'rounded-2xl'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">KI-Markenberater</h3>
              <p className="text-sm text-gray-500">
                {inputMode === "sprache" ? "Sprachgesteuerte Beratung" : "Text-Beratung"} • {meetingDuration !== "00:00" ? meetingDuration : "Bereit"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {isVoiceAssistantExpanded ? 'Zuklappen' : 'Aufklappen'}
            </span>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isVoiceAssistantExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {/* Accordion Content */}
        <div 
          className="grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: isVoiceAssistantExpanded ? '1fr' : '0fr' }}
        >
          <div style={{ overflow: isVoiceAssistantExpanded ? 'visible' : 'hidden' }}>
            <div className="p-4 pt-4">
              {/* Eingabemethode Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
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
                <div className="mb-4 bg-gradient-to-br from-primary/5 to-teal-50 rounded-xl border border-primary/20 p-4">
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
                    <div 
                      className="grid transition-all duration-300 ease-in-out"
                      style={{ gridTemplateRows: showHowItWorks ? '1fr' : '0fr' }}
                    >
                      <div style={{ overflow: 'hidden' }}>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recherche Accordion */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${isRechercheExpanded ? 'border-b-2 border-b-primary/20' : ''}`}>
        <button
          onClick={() => setIsRechercheExpanded(!isRechercheExpanded)}
          className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${isRechercheExpanded ? 'rounded-t-2xl border-b border-gray-100' : 'rounded-2xl'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Recherche</h3>
              <p className="text-sm text-gray-500">
                {rechercheSearchQuery || rechercheSelectedLaender.length > 0 || rechercheSelectedClasses.length > 0 ? (
                  <>
                    {rechercheSearchQuery && <span>{rechercheSearchQuery}</span>}
                    {rechercheSearchQuery && (rechercheSelectedLaender.length > 0 || rechercheSelectedClasses.length > 0) && <span> • </span>}
                    {rechercheSelectedLaender.length > 0 && <span>{rechercheSelectedLaender.join(", ")}</span>}
                    {rechercheSelectedLaender.length > 0 && rechercheSelectedClasses.length > 0 && <span> • </span>}
                    {rechercheSelectedClasses.length > 0 && <span>Klasse {rechercheSelectedClasses.join(", ")}</span>}
                  </>
                ) : (
                  "Markenrecherche starten"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">
              {isRechercheExpanded ? 'Zuklappen' : 'Aufklappen'}
            </span>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isRechercheExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        <div 
          className="grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: isRechercheExpanded ? '1fr' : '0fr' }}
        >
          <div style={{ overflow: isRechercheExpanded ? 'visible' : 'hidden' }}>
            <div className="p-4 pt-4 space-y-4">
              {/* Markenname Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Markenname
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={rechercheSearchQuery}
                    onChange={(e) => setRechercheSearchQuery(e.target.value)}
                    placeholder="z.B. TechFlow, NovaBrand..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Two-column grid for dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Länder / Register
                  </label>
                  <LaenderDropdown
                    selectedLaender={rechercheSelectedLaender}
                    onToggleLand={toggleRechercheLand}
                    onClearAll={() => setRechercheSelectedLaender([])}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nizza-Klassifikation
                  </label>
                  <NiceClassDropdown
                    selectedClasses={rechercheSelectedClasses}
                    onToggleClass={toggleRechercheClass}
                    onClearAll={() => setRechercheSelectedClasses([])}
                  />
                </div>
              </div>

              {/* Start Recherche Button */}
              <button
                onClick={handleStartRecherche}
                disabled={!rechercheSearchQuery.trim()}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
                  rechercheSearchQuery.trim()
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Search className="w-5 h-5" />
                Recherche starten
              </button>
            </div>
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

      <ConsultationsModal
        isOpen={showConsultationsModal}
        onClose={() => setShowConsultationsModal(false)}
        consultations={consultations}
        isLoading={loadingConsultations}
        onDelete={handleDeleteConsultation}
        deletingId={deletingId}
        onNavigate={(path) => router.push(path)}
      />

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
                  {isAnalysisFormComplete() ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Bereit für Recherche</p>
                        <p className="text-sm text-green-600">Alle Informationen wurden erfasst</p>
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
        }} 
      />
    </div>
  );
}
