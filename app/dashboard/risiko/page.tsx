"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Globe,
  Tag,
  Sparkles,
  Volume2,
  Mail,
  FilePlus,
  Eye,
  ChevronDown,
  Check,
  X,
  Lightbulb,
  Handshake,
} from "lucide-react";
import WorkflowProgress from "@/app/components/WorkflowProgress";
import { NICE_CLASSES, formatClassLabel } from "@/lib/nice-classes";
import dynamic from "next/dynamic";

const VoiceExplanation = dynamic(() => import("./VoiceExplanation"), { ssr: false });

interface DimensionalScore {
  phonetic: number;
  visual: number;
  conceptual: number;
  industry: number;
}

interface ConflictingMark {
  id: string;
  name: string;
  register: string;
  holder: string;
  classes: number[];
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
}

interface ConflictByOffice {
  office: string;
  officeName: string;
  count: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  conflicts: ConflictingMark[];
}

interface AlternativeName {
  name: string;
  riskScore: number;
  reasoning: string;
}

interface RiskAnalysis {
  success: boolean;
  overallScore: number;
  overallRisk: "high" | "medium" | "low";
  dimensionalScores: DimensionalScore;
  analysis: {
    phonetic: string;
    visual: string;
    conceptual: string;
    industry: string;
    summary: string;
    recommendation: string;
  };
  conflictsByOffice: ConflictByOffice[];
  totalConflicts: number;
  alternatives: AlternativeName[];
  searchTermsUsed: string[];
  totalResultsAnalyzed: number;
}

const LAENDER_OPTIONS = [
  { value: "DE", label: "Deutschland (DPMA)" },
  { value: "EU", label: "Europäische Union (EUIPO)" },
  { value: "WO", label: "International (WIPO)" },
  { value: "US", label: "USA (USPTO)" },
  { value: "GB", label: "Großbritannien (UKIPO)" },
  { value: "CH", label: "Schweiz (IGE)" },
  { value: "AT", label: "Österreich (ÖPA)" },
];

function ScoreCircle({ score, risk }: { score: number; risk: "high" | "medium" | "low" }) {
  const getColor = () => {
    switch (risk) {
      case "high": return { ring: "stroke-red-500", text: "text-red-600", bg: "bg-red-50" };
      case "medium": return { ring: "stroke-orange-500", text: "text-orange-600", bg: "bg-orange-50" };
      case "low": return { ring: "stroke-green-500", text: "text-green-600", bg: "bg-green-50" };
    }
  };
  
  const colors = getColor();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center w-40 h-40 ${colors.bg} rounded-full`}>
      <svg className="absolute w-full h-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="54"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx="80"
          cy="80"
          r="54"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={colors.ring}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="text-center z-10">
        <span className={`text-4xl font-bold ${colors.text}`}>{score}%</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const getColor = () => {
    if (score > 60) return "bg-red-500";
    if (score > 30) return "bg-orange-500";
    return "bg-green-500";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`text-sm font-semibold ${score > 60 ? 'text-red-600' : score > 30 ? 'text-orange-600' : 'text-green-600'}`}>
          {score}%
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: ConflictingMark }) {
  const getRiskStyles = () => {
    switch (conflict.riskLevel) {
      case "high": return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" };
      case "medium": return { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" };
      case "low": return { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" };
    }
  };
  
  const styles = getRiskStyles();
  const emoji = conflict.riskLevel === "high" ? "🔴" : conflict.riskLevel === "medium" ? "🟡" : "🟢";

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-900">{conflict.name}</h4>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
          {emoji} {conflict.accuracy}%
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{conflict.holder}</p>
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {conflict.register}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Klassen: {conflict.classes.join(", ") || "-"}
        </span>
      </div>
      <p className="text-sm text-gray-700">{conflict.reasoning}</p>
    </div>
  );
}

function AlternativeCard({ alternative, onCheck }: { alternative: AlternativeName; onCheck: (name: string) => void }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 hover:border-green-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-green-800 text-lg">{alternative.name}</h4>
        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-green-600 text-white">
          {alternative.riskScore}%
        </span>
      </div>
      <p className="text-sm text-green-700 mb-3">{alternative.reasoning}</p>
      <button
        onClick={() => onCheck(alternative.name)}
        className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
      >
        <Search className="w-4 h-4" />
        Diese Marke prüfen
      </button>
    </div>
  );
}

function LandSelector({ 
  selectedLaender, 
  onToggle 
}: { 
  selectedLaender: string[]; 
  onToggle: (land: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-teal-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-teal-600" />
          <span className="text-gray-700">
            {selectedLaender.length > 0 ? `${selectedLaender.length} ausgewählt` : "Länder wählen"}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {selectedLaender.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedLaender.map(land => (
            <span key={land} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
              {land}
              <button onClick={() => onToggle(land)} className="hover:text-teal-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white rounded-xl shadow-xl border-2 border-teal-200 overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            {LAENDER_OPTIONS.map(option => (
              <label
                key={option.value}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedLaender.includes(option.value) 
                    ? 'bg-teal-500 border-teal-500' 
                    : 'border-gray-300'
                }`}>
                  {selectedLaender.includes(option.value) && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedLaender.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium"
            >
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassSelector({
  selectedClasses,
  onToggle,
}: {
  selectedClasses: number[];
  onToggle: (classNum: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClasses = NICE_CLASSES.filter(
    c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         c.id.toString().includes(searchTerm)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-teal-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-teal-600" />
          <span className="text-gray-700">
            {selectedClasses.length > 0 ? `${selectedClasses.length} Klassen` : "Nizza-Klassen wählen"}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedClasses.slice(0, 8).map(cls => (
            <span key={cls} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
              Klasse {cls}
              <button onClick={() => onToggle(cls)} className="hover:text-teal-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedClasses.length > 8 && (
            <span className="px-3 py-1 text-teal-600 text-sm">+{selectedClasses.length - 8} weitere</span>
          )}
        </div>
      )}
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white rounded-xl shadow-xl border-2 border-teal-200 overflow-hidden">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Klasse suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredClasses.map(cls => (
              <label
                key={cls.id}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedClasses.includes(cls.id) 
                    ? 'bg-teal-500 border-teal-500' 
                    : 'border-gray-300'
                }`}>
                  {selectedClasses.includes(cls.id) && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedClasses.includes(cls.id)}
                  onChange={() => onToggle(cls.id)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Klasse {cls.id}</span>
                  <span className="text-sm text-gray-600 ml-2">{cls.name}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="p-3 border-t bg-gray-50 flex gap-2">
            <button
              onClick={() => { selectedClasses.forEach(c => onToggle(c)); }}
              className="flex-1 px-4 py-2 text-gray-600 bg-white border rounded-lg text-sm"
            >
              Alle entfernen
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium text-sm"
            >
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RisikoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [markenname, setMarkenname] = useState("");
  const [selectedLaender, setSelectedLaender] = useState<string[]>(["DE", "EU", "WO"]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  
  const [showVoiceExplanation, setShowVoiceExplanation] = useState(false);
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  
  const [isRequestingAnalysis, setIsRequestingAnalysis] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  
  const isFormComplete = markenname.trim() && selectedLaender.length > 0 && selectedClasses.length > 0;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const toggleLand = (land: string) => {
    setSelectedLaender(prev => 
      prev.includes(land) ? prev.filter(l => l !== land) : [...prev, land]
    );
  };

  const toggleClass = (cls: number) => {
    setSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const ANALYSIS_STEPS = [
    { id: 1, label: "Verbindung zu Markenregistern...", icon: "🔗" },
    { id: 2, label: "Durchsuche DPMA, EUIPO, WIPO...", icon: "🔍" },
    { id: 3, label: "Sammle ähnliche Marken...", icon: "📥" },
    { id: 4, label: "KI analysiert phonetische Ähnlichkeit...", icon: "🔊" },
    { id: 5, label: "KI analysiert visuelle Ähnlichkeit...", icon: "👁️" },
    { id: 6, label: "KI analysiert konzeptuelle Ähnlichkeit...", icon: "💭" },
    { id: 7, label: "Bewerte Branchenrelevanz...", icon: "🏢" },
    { id: 8, label: "Berechne Gesamtrisiko...", icon: "📊" },
    { id: 9, label: "Generiere Alternativvorschläge...", icon: "💡" },
    { id: 10, label: "Erstelle Bericht...", icon: "📝" },
  ];

  const handleAnalyze = async () => {
    if (!markenname.trim()) {
      setError("Bitte geben Sie einen Markennamen ein.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setError(null);
    setAnalysis(null);

    // Starte Schritt-Animation parallel zur API-Anfrage
    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev >= ANALYSIS_STEPS.length) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const response = await fetch("/api/ai/risk-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markenname: markenname.trim(),
          klassen: selectedClasses,
          laender: selectedLaender,
        }),
      });

      const data = await response.json();

      clearInterval(stepInterval);
      setAnalysisStep(ANALYSIS_STEPS.length);

      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }

      setAnalysis(data);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };


  const handleCheckAlternative = (name: string) => {
    setMarkenname(name);
    setAnalysis(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRequestAnalysis = async () => {
    setIsRequestingAnalysis(true);
    setError(null);

    try {
      const response = await fetch("/api/recherche-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markenname: markenname.trim(),
          laender: selectedLaender,
          klassen: selectedClasses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Anfrage");
      }

      setRequestSuccess(true);
      setShowRequestPopup(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRequestingAnalysis(false);
    }
  };

  const getRiskLabel = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high": return "Hohes Risiko";
      case "medium": return "Mittleres Risiko";
      case "low": return "Niedriges Risiko";
    }
  };

  const getRiskEmoji = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep={3} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-teal-600" />
            Risiko-Analyse
          </h1>
          <p className="text-gray-600 mt-1">
            Tiefgehende Multi-Dimensionale Risikoprüfung mit KI
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Markenname</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={markenname}
                onChange={(e) => setMarkenname(e.target.value)}
                placeholder="z.B. Altana, TechFlow, BioNova..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zielländer</label>
            <LandSelector selectedLaender={selectedLaender} onToggle={toggleLand} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nizza-Klassen</label>
            <ClassSelector selectedClasses={selectedClasses} onToggle={toggleClass} />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !markenname.trim() || selectedLaender.length === 0 || selectedClasses.length === 0}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Analysiere Multi-Dimensional...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Risiko-Analyse starten
            </>
          )}
        </button>
        
        {/* Transparente Analyse-Schritte */}
        {isAnalyzing && analysisStep > 0 && (
          <div className="mt-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="font-semibold text-teal-900">KI-Analyse läuft...</h4>
                <p className="text-sm text-teal-600">Bitte warten Sie einen Moment</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {ANALYSIS_STEPS.map((step, index) => {
                const isActive = analysisStep === step.id;
                const isCompleted = analysisStep > step.id;
                const isPending = analysisStep < step.id;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                      isActive ? 'bg-white shadow-sm border border-teal-200' :
                      isCompleted ? 'opacity-60' : 'opacity-40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                      isCompleted ? 'bg-teal-100' :
                      isActive ? 'bg-teal-600 animate-pulse' : 'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-teal-600" />
                      ) : isActive ? (
                        <span className="animate-bounce">{step.icon}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">{step.icon}</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      isActive ? 'text-teal-900' :
                      isCompleted ? 'text-teal-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600 ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-teal-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-teal-600">Fortschritt</span>
                <span className="font-medium text-teal-900">{Math.round((analysisStep / ANALYSIS_STEPS.length) * 100)}%</span>
              </div>
              <div className="mt-2 h-2 bg-teal-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${(analysisStep / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Fehlermeldung wenn Felder leer */}
        {!isAnalyzing && (!markenname.trim() || selectedLaender.length === 0 || selectedClasses.length === 0) && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Bitte füllen Sie alle Felder aus:</p>
                <ul className="mt-2 text-sm text-amber-700 space-y-1">
                  {!markenname.trim() && (
                    <li className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Markenname eingeben
                    </li>
                  )}
                  {selectedLaender.length === 0 && (
                    <li className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Mindestens ein Zielland auswählen
                    </li>
                  )}
                  {selectedClasses.length === 0 && (
                    <li className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Mindestens eine Nizza-Klasse auswählen
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleRequestAnalysis}
            disabled={!isFormComplete || isRequestingAnalysis}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestingAnalysis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Anfrage wird gesendet...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Gründliche Risiko-Analyse anfordern
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Unsere Experten erstellen einen detaillierten Bericht und kontaktieren Sie per E-Mail
          </p>
        </div>
      </div>

      {showRequestPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Anfrage gesendet!</h3>
                  <p className="text-white/80 text-sm">Wir haben Ihre Anfrage erhalten</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-teal-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-teal-800 mb-2">Was passiert jetzt?</h4>
                <ul className="text-sm text-teal-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Unsere Experten führen eine gründliche Recherche durch</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Sie erhalten einen detaillierten Bericht per E-Mail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Bei Fragen stehen wir Ihnen zur Verfügung</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h5 className="font-medium text-gray-700 mb-2">Ihre Anfrage:</h5>
                <p className="text-sm text-gray-600">
                  <strong>Marke:</strong> {markenname}<br />
                  <strong>Länder:</strong> {selectedLaender.join(", ")}<br />
                  <strong>Klassen:</strong> {selectedClasses.length > 0 ? selectedClasses.map(c => `Klasse ${c}`).join(", ") : "Alle"}
                </p>
              </div>
              <button
                onClick={() => setShowRequestPopup(false)}
                className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="text-center">
                <ScoreCircle score={analysis.overallScore} risk={analysis.overallRisk} />
                <p className="mt-4 text-xl font-bold" style={{
                  color: analysis.overallRisk === "high" ? "#dc2626" : 
                         analysis.overallRisk === "medium" ? "#d97706" : "#059669"
                }}>
                  {getRiskEmoji(analysis.overallRisk)} {getRiskLabel(analysis.overallRisk)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {analysis.totalResultsAnalyzed} Marken analysiert • {analysis.totalConflicts} Konflikte
                </p>
              </div>
              
              <div className="flex-1 w-full space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Dimensionale Bewertung</h3>
                <DimensionBar 
                  label="Phonetisch (Klang)" 
                  score={analysis.dimensionalScores.phonetic}
                  icon={<Volume2 className="w-4 h-4 text-gray-500" />}
                />
                <DimensionBar 
                  label="Visuell (Schriftbild)" 
                  score={analysis.dimensionalScores.visual}
                  icon={<Eye className="w-4 h-4 text-gray-500" />}
                />
                <DimensionBar 
                  label="Konzeptuell (Bedeutung)" 
                  score={analysis.dimensionalScores.conceptual}
                  icon={<Lightbulb className="w-4 h-4 text-gray-500" />}
                />
                <DimensionBar 
                  label="Branchenbezogen" 
                  score={analysis.dimensionalScores.industry}
                  icon={<Tag className="w-4 h-4 text-gray-500" />}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-600" />
              Konflikte nach Markenregister
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {analysis.conflictsByOffice.map(office => (
                <button
                  key={office.office}
                  onClick={() => setExpandedOffice(expandedOffice === office.office ? null : office.office)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    office.count === 0 
                      ? 'border-green-200 bg-green-50' 
                      : office.highRisk > 0 
                        ? 'border-red-200 bg-red-50 hover:border-red-300' 
                        : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{office.office}</span>
                    <span className={`text-2xl font-bold ${
                      office.count === 0 ? 'text-green-600' : 
                      office.highRisk > 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {office.count === 0 ? '🟢' : office.highRisk > 0 ? '🔴' : '🟡'} {office.count}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{office.officeName}</p>
                  {office.count > 0 && (
                    <div className="flex gap-2 mt-2 text-xs">
                      {office.highRisk > 0 && <span className="text-red-600">{office.highRisk} hoch</span>}
                      {office.mediumRisk > 0 && <span className="text-orange-600">{office.mediumRisk} mittel</span>}
                      {office.lowRisk > 0 && <span className="text-green-600">{office.lowRisk} niedrig</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {expandedOffice && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Konflikte in {analysis.conflictsByOffice.find(o => o.office === expandedOffice)?.officeName}
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {analysis.conflictsByOffice
                    .find(o => o.office === expandedOffice)
                    ?.conflicts.slice(0, 6).map((conflict, idx) => (
                      <ConflictCard key={idx} conflict={conflict} />
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Zusammenfassung</h3>
              <p className="text-gray-700 mb-4">{analysis.analysis.summary}</p>
              
              <div className={`p-4 rounded-xl ${
                analysis.overallRisk === "high" ? "bg-red-50 border border-red-200" :
                analysis.overallRisk === "medium" ? "bg-orange-50 border border-orange-200" :
                "bg-green-50 border border-green-200"
              }`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Empfehlung
                </h4>
                <p className="text-sm">{analysis.analysis.recommendation}</p>
              </div>
            </div>

            {analysis.alternatives.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  Alternative Markenvorschläge
                </h3>
                <div className="space-y-3">
                  {analysis.alternatives.slice(0, 3).map((alt, idx) => (
                    <AlternativeCard 
                      key={idx} 
                      alternative={alt} 
                      onCheck={handleCheckAlternative}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Detaillierte Analyse</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  Phonetische Analyse
                </h4>
                <p className="text-sm text-gray-700">{analysis.analysis.phonetic}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-600" />
                  Visuelle Analyse
                </h4>
                <p className="text-sm text-gray-700">{analysis.analysis.visual}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-teal-600" />
                  Konzeptuelle Analyse
                </h4>
                <p className="text-sm text-gray-700">{analysis.analysis.conceptual}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-600" />
                  Branchenanalyse
                </h4>
                <p className="text-sm text-gray-700">{analysis.analysis.industry}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nächste Schritte</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <button
                onClick={() => setShowVoiceExplanation(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
                Risiko erklären
              </button>
              
              <a
                href={`/dashboard/anmeldung?markName=${encodeURIComponent(markenname)}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <FilePlus className="w-5 h-5" />
                Marke anmelden
              </a>
              
              <a
                href="/dashboard/watchlist"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-5 h-5" />
                Zur Watchlist
              </a>
              
              <a
                href="/dashboard/experten"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Handshake className="w-5 h-5" />
                Mit Experten sprechen
              </a>
            </div>
          </div>
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-teal-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Multi-Dimensionale Risikoprüfung
          </h3>
          <p className="text-gray-600 max-w-lg mx-auto mb-6">
            Geben Sie oben einen Markennamen ein, um eine tiefgehende Analyse zu starten.
            Wir prüfen phonetische, visuelle, konzeptuelle und branchenbezogene Risiken.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Volume2 className="w-4 h-4 text-teal-600" />
              Phonetisch
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Eye className="w-4 h-4 text-teal-600" />
              Visuell
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Lightbulb className="w-4 h-4 text-teal-600" />
              Konzeptuell
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
              <Tag className="w-4 h-4 text-teal-600" />
              Branchenbezogen
            </span>
          </div>
        </div>
      )}

      {analysis && (
        <VoiceExplanation
          isOpen={showVoiceExplanation}
          onClose={() => setShowVoiceExplanation(false)}
          summary={analysis.analysis.summary}
          recommendation={analysis.analysis.recommendation}
          overallScore={analysis.overallScore}
          overallRisk={analysis.overallRisk}
          markenname={markenname}
          totalConflicts={analysis.totalConflicts}
        />
      )}
    </div>
  );
}
