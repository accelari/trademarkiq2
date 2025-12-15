"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Globe,
  Tag,
  Sparkles,
  Mail,
  FileDown,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Lightbulb,
  Handshake,
  MapPin,
  Pencil,
  ArrowRight,
  ShieldAlert,
  Gavel,
  Building2,
  FileText,
  ExternalLink,
  Bookmark,
  User,
  MessageCircle,
  Mic,
  Type,
} from "lucide-react";
import WorkflowProgress from "@/app/components/WorkflowProgress";
import { NICE_CLASSES, formatClassLabel } from "@/lib/nice-classes";
import { VoiceProvider } from "@humeai/voice-react";
import VoiceAssistant from "@/app/components/VoiceAssistant";

interface Solution {
  type: "name_modification" | "class_change" | "mark_type" | "geographic" | "coexistence";
  title: string;
  description: string;
  suggestedValue: string;
  successProbability: number;
  effort: "low" | "medium" | "high";
  reasoning: string;
}

interface ExpertConflictAnalysis {
  conflictId: string;
  conflictName: string;
  conflictHolder: string;
  conflictClasses: number[];
  conflictOffice: string;
  similarity: number;
  legalAssessment: string;
  oppositionRisk: number;
  consequences: string;
  solutions: Solution[];
}

interface ExpertAnalysisResponse {
  success: boolean;
  trademarkName: string;
  overallRisk: "high" | "medium" | "low";
  conflictAnalyses: ExpertConflictAnalysis[];
  bestOverallSolution: Solution | null;
  summary: string;
}

interface SuggestedTerm {
  term: string;
  source: "TMclass" | "DPMA" | "EUIPO" | "Expert";
  confidence: number;
}

interface ClassRecommendation {
  classNumber: number;
  className: string;
  userDescription?: string;
  isCompliant: boolean;
  issues: string[];
  suggestedTerms: SuggestedTerm[];
  amtskonformeFormulierung: string;
}

interface GoodsServicesAnalysis {
  success: boolean;
  classRecommendations: ClassRecommendation[];
  overallCompliance: "compliant" | "needs_improvement" | "non_compliant";
  warnings: string[];
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

const OFFICE_NAMES: Record<string, string> = {
  "DE": "DPMA (Deutschland)",
  "EU": "EUIPO (EU)",
  "WO": "WIPO (International)",
  "US": "USPTO (USA)",
  "GB": "UKIPO (UK)",
  "CH": "IGE (Schweiz)",
  "AT": "ÖPA (Österreich)",
};

function AnimatedRiskScore({ score, risk }: { score: number; risk: "high" | "medium" | "low" }) {
  const getColor = () => {
    switch (risk) {
      case "high": return { ring: "stroke-red-500", text: "text-red-600", bg: "bg-red-50", label: "Hohes Risiko" };
      case "medium": return { ring: "stroke-orange-500", text: "text-orange-600", bg: "bg-orange-50", label: "Mittleres Risiko" };
      case "low": return { ring: "stroke-teal-500", text: "text-teal-600", bg: "bg-teal-50", label: "Niedriges Risiko" };
    }
  };
  
  const colors = getColor();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center`}>
      <div className={`relative w-36 h-36 ${colors.bg} rounded-full flex items-center justify-center`}>
        <svg className="absolute w-full h-full -rotate-90">
          <circle cx="72" cy="72" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200" />
          <circle
            cx="72"
            cy="72"
            r="54"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${colors.ring} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="text-center z-10">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}%</span>
        </div>
      </div>
      <span className={`mt-3 text-sm font-semibold ${colors.text}`}>{colors.label}</span>
    </div>
  );
}

function OppositionRiskBar({ risk }: { risk: number }) {
  const getColor = () => {
    if (risk > 70) return "bg-red-500";
    if (risk > 40) return "bg-orange-500";
    return "bg-teal-500";
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Widerspruchsrisiko</span>
        <span className={`font-bold ${risk > 70 ? 'text-red-600' : risk > 40 ? 'text-orange-600' : 'text-teal-600'}`}>
          {risk}%
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${risk}%` }}
        />
      </div>
    </div>
  );
}

function EffortIndicator({ effort }: { effort: "low" | "medium" | "high" }) {
  const config = {
    low: { filled: 1, color: "text-teal-600" },
    medium: { filled: 2, color: "text-orange-600" },
    high: { filled: 3, color: "text-red-600" },
  };
  const { filled, color } = config[effort];
  return (
    <span className={`flex items-center gap-0.5 ${color}`} title={effort === "low" ? "Gering" : effort === "medium" ? "Mittel" : "Hoch"}>
      {[1, 2, 3].map((n) => (
        <span key={n} className="text-sm">{n <= filled ? "●" : "○"}</span>
      ))}
    </span>
  );
}

function EffortBadge({ effort }: { effort: "low" | "medium" | "high" }) {
  const config = {
    low: { label: "Gering", bg: "bg-teal-100", text: "text-teal-700" },
    medium: { label: "Mittel", bg: "bg-orange-100", text: "text-orange-700" },
    high: { label: "Hoch", bg: "bg-red-100", text: "text-red-700" },
  };
  const { label, bg, text } = config[effort];
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${text}`}>{label}</span>;
}

function getCategoryLabel(type: Solution["type"]): { emoji: string; label: string } {
  switch (type) {
    case "name_modification":
      return { emoji: "🏷️", label: "Namensvariante" };
    case "mark_type":
    case "class_change":
      return { emoji: "🎨", label: "Anmeldestrategie" };
    case "geographic":
      return { emoji: "📍", label: "Territorium" };
    case "coexistence":
      return { emoji: "🤝", label: "Koexistenz" };
    default:
      return { emoji: "💡", label: "Strategie" };
  }
}

function SolutionTypeIcon({ type }: { type: Solution["type"] }) {
  const icons = {
    name_modification: <Pencil className="w-5 h-5" />,
    class_change: <Tag className="w-5 h-5" />,
    mark_type: <FileText className="w-5 h-5" />,
    geographic: <MapPin className="w-5 h-5" />,
    coexistence: <Handshake className="w-5 h-5" />,
  };
  return icons[type] || <Lightbulb className="w-5 h-5" />;
}

function SolutionCard({ 
  solution, 
  onAdopt, 
  laender, 
  klassen 
}: { 
  solution: Solution; 
  onAdopt?: (name: string) => void;
  laender: string[];
  klassen: number[];
}) {
  const isNameModification = solution.type === "name_modification";
  const category = getCategoryLabel(solution.type);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <span>{category.emoji}</span>
          {category.label}
        </span>
      </div>
      
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
          <SolutionTypeIcon type={solution.type} />
        </div>
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900">{solution.title}</h5>
          <p className="text-sm text-gray-600 mt-1">{solution.description}</p>
        </div>
      </div>
      
      {solution.suggestedValue && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium text-teal-800">{solution.suggestedValue}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex items-center gap-2 group relative">
          <span className="text-gray-500">Relative Anmeldechance (KI-basiert):</span>
          <span className={`font-bold ${
            solution.successProbability > 70 ? 'text-teal-600' : 
            solution.successProbability > 40 ? 'text-orange-600' : 'text-red-600'
          }`}>{solution.successProbability}%</span>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              Vergleichende Einschätzung – keine Rechtsberatung
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Aufwand:</span>
          <EffortIndicator effort={solution.effort} />
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">{solution.reasoning}</p>
      
      {isNameModification && solution.suggestedValue && onAdopt && (
        <button
          onClick={() => onAdopt(solution.suggestedValue)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          Übernehmen → neue Recherche
        </button>
      )}
    </div>
  );
}

function ConflictCard({ 
  conflict, 
  laender, 
  klassen,
  onAdoptAlternative 
}: { 
  conflict: ExpertConflictAnalysis;
  laender: string[];
  klassen: number[];
  onAdoptAlternative: (name: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getRiskStyles = () => {
    if (conflict.oppositionRisk > 70) return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" };
    if (conflict.oppositionRisk > 40) return { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" };
    return { bg: "bg-teal-50", border: "border-teal-200", badge: "bg-teal-100 text-teal-700" };
  };
  
  const styles = getRiskStyles();
  const emoji = conflict.oppositionRisk > 70 ? "🔴" : conflict.oppositionRisk > 40 ? "🟡" : "🟢";

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-2xl overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold text-gray-900">{conflict.conflictName}</h4>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
                {emoji} {conflict.similarity}% Ähnlichkeit
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{conflict.conflictHolder}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {OFFICE_NAMES[conflict.conflictOffice] || conflict.conflictOffice}
              </span>
              {conflict.conflictClasses.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Klassen: {conflict.conflictClasses.join(", ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-5 space-y-5">
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-teal-600" />
              Rechtliche Einschätzung
            </h5>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {conflict.legalAssessment}
            </p>
          </div>
          
          <OppositionRiskBar risk={conflict.oppositionRisk} />
          
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Konsequenzen bei Kollision
            </h5>
            <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-lg p-3">
              {conflict.consequences}
            </p>
          </div>
          
          {conflict.solutions.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Lösungsvorschläge ({conflict.solutions.length})
              </h5>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {conflict.solutions.map((solution, idx) => (
                  <SolutionCard 
                    key={idx} 
                    solution={solution} 
                    onAdopt={onAdoptAlternative}
                    laender={laender}
                    klassen={klassen}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClassComplianceCard({ recommendation }: { recommendation: ClassRecommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusConfig = () => {
    if (recommendation.isCompliant) {
      return { icon: <CheckCircle className="w-5 h-5" />, label: "Konform", bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" };
    }
    if (recommendation.issues.length <= 2) {
      return { icon: <AlertTriangle className="w-5 h-5" />, label: "Verbesserungsbedarf", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
    }
    return { icon: <XCircle className="w-5 h-5" />, label: "Nicht konform", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" };
  };
  
  const status = getStatusConfig();

  return (
    <div className={`${status.bg} border ${status.border} rounded-2xl overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-gray-900">Klasse {recommendation.classNumber}</span>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">{recommendation.className}</p>
            <p className="text-xs text-gray-500 mt-1">
              {NICE_CLASSES.find(c => c.id === recommendation.classNumber)?.description || recommendation.className}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-5 space-y-4">
          {recommendation.issues.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Probleme</h5>
              <ul className="space-y-1">
                {recommendation.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendation.amtskonformeFormulierung && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Amtskonforme Formulierung</h5>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-sm text-teal-800">{recommendation.amtskonformeFormulierung}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(recommendation.amtskonformeFormulierung);
                  }}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Übernehmen
                </button>
              </div>
            </div>
          )}
          
          {recommendation.suggestedTerms.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">TMclass-Begriffe</h5>
              <div className="flex flex-wrap gap-2">
                {recommendation.suggestedTerms.map((term, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-xs font-medium"
                    title={`Quelle: ${term.source}, Konfidenz: ${Math.round(term.confidence * 100)}%`}
                  >
                    <Bookmark className="w-3 h-3" />
                    {term.term}
                    <span className="text-teal-600 ml-1">({term.source})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LandSelector({ selectedLaender, onToggle }: { selectedLaender: string[]; onToggle: (land: string) => void }) {
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
              <label key={option.value} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedLaender.includes(option.value) ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                }`}>
                  {selectedLaender.includes(option.value) && <Check className="w-3.5 h-3.5 text-white" />}
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
            <button onClick={() => setIsOpen(false)} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium">
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassSelector({ selectedClasses, onToggle }: { selectedClasses: number[]; onToggle: (classNum: number) => void }) {
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
    c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toString().includes(searchTerm)
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
            {selectedClasses.length > 0 ? `${selectedClasses.length} Klassen` : "Klassen wählen"}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedClasses.map(cls => (
            <span key={cls} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
              {cls}
              <button onClick={() => onToggle(cls)} className="hover:text-teal-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white rounded-xl shadow-xl border-2 border-teal-200 overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredClasses.map(cls => (
              <label key={cls.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedClasses.includes(cls.id) ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                }`}>
                  {selectedClasses.includes(cls.id) && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedClasses.includes(cls.id)}
                  onChange={() => onToggle(cls.id)}
                />
                <div>
                  <span className="font-medium text-gray-900">Klasse {cls.id}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{cls.name}</p>
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
            <button onClick={() => setIsOpen(false)} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium text-sm">
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RisikoPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [markenname, setMarkenname] = useState("");
  const [isGoodsExpanded, setIsGoodsExpanded] = useState(false);
  const [selectedLaender, setSelectedLaender] = useState<string[]>(["DE", "EU"]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  
  const [isLoadingFromCase, setIsLoadingFromCase] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expertAnalysis, setExpertAnalysis] = useState<ExpertAnalysisResponse | null>(null);
  const [goodsAnalysis, setGoodsAnalysis] = useState<GoodsServicesAnalysis | null>(null);
  const [isLoadingGoods, setIsLoadingGoods] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [voicePromptSent, setVoicePromptSent] = useState(false);
  const [textPromptSent, setTextPromptSent] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [pendingQuickQuestion, setPendingQuickQuestion] = useState<string | null>(null);
  const technicalDetailsRef = useRef<HTMLDivElement>(null);
  
  const RISK_QUICK_QUESTIONS = [
    "Was bedeutet das Risiko für mich?",
    "Erkläre mir den Hauptkonflikt",
    "Welche Alternative empfiehlst du?",
    "Kann ich die Marke trotzdem anmelden?"
  ];
  
  const handleQuickQuestion = (question: string) => {
    setPendingQuickQuestion(question);
  };
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  useEffect(() => {
    const loadToken = async () => {
      setIsLoadingToken(true);
      try {
        const res = await fetch("/api/token");
        const data = await res.json();
        setAccessToken(data.accessToken);
      } catch (e) {
        console.error("Token error:", e);
      } finally {
        setIsLoadingToken(false);
      }
    };
    loadToken();
  }, []);
  
  useEffect(() => {
    if (expertAnalysis && accessToken && !isLoadingToken) {
      setAutoStartVoice(true);
    }
  }, [expertAnalysis, accessToken, isLoadingToken]);
  
  const generateAdvisorPrompt = (): string | null => {
    if (!expertAnalysis) return null;
    
    const conflicts = expertAnalysis.conflictAnalyses || [];
    
    const conflictDetails = conflicts.map((c, i) => `
Konflikt ${i+1}: "${c.conflictName}"
- Inhaber: ${c.conflictHolder}
- Ähnlichkeit: ${c.similarity}%
- Widerspruchsrisiko: ${c.oppositionRisk}%
- Rechtliche Einschätzung: ${c.legalAssessment}
- Konsequenzen: ${c.consequences}
- Lösungsvorschläge:
${c.solutions.map(s => `  • ${s.title}: ${s.description} (Erfolg: ${s.successProbability}%, Aufwand: ${s.effort})`).join('\n')}
`).join('\n');
    
    return `[SYSTEM-KONTEXT für Risikoberatung]

Du bist Klaus, Markenberater bei TrademarkIQ. Du hast gerade die Recherche-Ergebnisse analysiert.

MARKE: "${markenname}"
ZIELLÄNDER: ${selectedLaender.join(", ") || "nicht angegeben"}
NIZZA-KLASSEN: ${selectedClasses.join(", ") || "alle"}

GESAMTRISIKO: ${expertAnalysis.overallRisk === "high" ? "HOCH" : expertAnalysis.overallRisk === "medium" ? "MITTEL" : "NIEDRIG"}
ANZAHL KONFLIKTE: ${conflicts.length}

${conflictDetails || "Keine Konflikte gefunden."}

ZUSAMMENFASSUNG: ${expertAnalysis.summary}

${expertAnalysis.bestOverallSolution ? `
BESTE EMPFEHLUNG: ${expertAnalysis.bestOverallSolution.title}
- ${expertAnalysis.bestOverallSolution.description}
- Vorschlag: ${expertAnalysis.bestOverallSolution.suggestedValue}
- Erfolgswahrscheinlichkeit: ${expertAnalysis.bestOverallSolution.successProbability}%
` : ''}

GESPRÄCHSFÜHRUNG:
1. Begrüße den Kunden freundlich und nenne die untersuchte Marke
2. Erkläre das Hauptergebnis in einfachen Worten (z.B. "Leider gibt es ein Problem...")
3. Nenne den wichtigsten Konflikt und erkläre warum das problematisch ist
4. Stelle die beste Lösung vor
5. Frage ob der Kunde Fragen hat oder die technischen Details sehen möchte

WICHTIG: 
- Sprich in einfacher, verständlicher Sprache
- Erkläre Fachbegriffe wenn du sie verwendest
- Sei empathisch - der Kunde hat vielleicht viel Zeit in diesen Markennamen investiert
- Wenn der Kunde die Details sehen möchte, sage ihm dass er unten "Alle Konflikte im Detail anzeigen" aufklappen kann
- Du antwortest IMMER auf Deutsch.`;
  };

  const loadCaseDataAndAnalysis = async (caseIdToLoad: string) => {
    setIsLoadingFromCase(true);
    setError(null);
    
    try {
      const caseRes = await fetch(`/api/cases/${caseIdToLoad}`);
      if (!caseRes.ok) {
        throw new Error("Fall nicht gefunden");
      }
      
      const caseData = await caseRes.json();
      const caseRecord = caseData.case;
      
      if (caseRecord?.trademarkName) {
        setMarkenname(caseRecord.trademarkName);
      }
      
      if (caseRecord?.decisions && caseRecord.decisions.length > 0) {
        const sortedDecisions = [...caseRecord.decisions].sort((a: any, b: any) => 
          new Date(b.extractedAt || 0).getTime() - new Date(a.extractedAt || 0).getTime()
        );
        const latestDecision = sortedDecisions[0];
        if (latestDecision.countries && latestDecision.countries.length > 0) {
          setSelectedLaender(latestDecision.countries);
        }
        if (latestDecision.niceClasses && latestDecision.niceClasses.length > 0) {
          setSelectedClasses(latestDecision.niceClasses);
        }
      }
      
      const rechercheStep = caseRecord?.steps?.find((s: any) => s.step === "recherche");
      const stepConflicts = rechercheStep?.metadata?.analysis?.conflicts || rechercheStep?.metadata?.conflicts || [];
      if (stepConflicts.length > 0) {
        const conflicts = stepConflicts;
        const tmName = rechercheStep?.metadata?.trademarkName || caseRecord.trademarkName || "";
        
        const conflictAnalyses: ExpertConflictAnalysis[] = conflicts.map((c: any) => ({
          conflictId: c.id || c.applicationNumber || Math.random().toString(),
          conflictName: c.name,
          conflictHolder: c.holder || "Unbekannt",
          conflictClasses: c.classes || [],
          conflictOffice: c.register || "DE",
          similarity: c.accuracy || 0,
          legalAssessment: c.reasoning || "Keine detaillierte Bewertung verfügbar.",
          oppositionRisk: c.riskLevel === "high" ? 85 : c.riskLevel === "medium" ? 55 : 25,
          consequences: c.riskLevel === "high" 
            ? "Bei einer Anmeldung besteht ein hohes Risiko eines Widerspruchs durch den Inhaber dieser älteren Marke."
            : c.riskLevel === "medium"
            ? "Ein Widerspruch ist möglich. Die Ähnlichkeit könnte bei identischen Waren/Dienstleistungen zu Problemen führen."
            : "Das Risiko eines erfolgreichen Widerspruchs ist gering, aber eine Beobachtung wird empfohlen.",
          solutions: c.riskLevel === "high" || c.riskLevel === "medium" ? [
            {
              type: "name_modification" as const,
              title: "Wortmarke mit Alternativname",
              description: "Registrieren Sie eine leicht modifizierte Wortmarke",
              suggestedValue: `${tmName}is`,
              successProbability: 80,
              effort: "low" as const,
              reasoning: "Eine kreative Namensvariation kann die Verwechslungsgefahr erheblich reduzieren.",
            },
            {
              type: "mark_type" as const,
              title: "Wort-Bild-Marke registrieren",
              description: "Kombinieren Sie Ihren Markennamen mit einem einzigartigen Logo",
              suggestedValue: "Logo + Schriftzug als kombinierte Marke anmelden",
              successProbability: 75,
              effort: "medium" as const,
              reasoning: "Eine Wort-Bild-Marke reduziert die Verwechslungsgefahr mit reinen Wortmarken.",
            },
            {
              type: "class_change" as const,
              title: "Klassenbeschränkung",
              description: "Beschränken Sie Ihre Anmeldung auf konfliktfreie Nizza-Klassen",
              suggestedValue: "Nur konfliktfreie Klassen für Ihre Anmeldung auswählen",
              successProbability: 70,
              effort: "low" as const,
              reasoning: "Durch Vermeidung überlappender Klassen kann das Konfliktpotenzial eliminiert werden.",
            },
          ] : [],
        }));
        
        const overallRisk = conflictAnalyses.some(c => c.oppositionRisk > 70) ? "high" : 
          conflictAnalyses.some(c => c.oppositionRisk > 40) ? "medium" : "low";
        
        setExpertAnalysis({
          success: true,
          trademarkName: tmName,
          overallRisk: overallRisk as "high" | "medium" | "low",
          conflictAnalyses,
          bestOverallSolution: conflictAnalyses.length > 0 && conflictAnalyses[0].solutions.length > 0 
            ? conflictAnalyses[0].solutions[0] 
            : null,
          summary: `Die Analyse hat ${conflictAnalyses.length} potenzielle Konflikte identifiziert. ${
            overallRisk === "high" 
              ? "Es wird empfohlen, den Markennamen anzupassen oder rechtliche Beratung einzuholen."
              : overallRisk === "medium"
              ? "Eine sorgfältige Prüfung wird empfohlen."
              : "Die Marke scheint weitgehend frei von Konflikten zu sein."
          }`,
        });
        
        if (tmName) setMarkenname(tmName);
        setIsLoadingFromCase(false);
        return;
      }
      
      const response = await fetch("/api/risk-analysis/expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseIdToLoad }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setExpertAnalysis(data);
        if (data.trademarkName) setMarkenname(data.trademarkName);
      }
    } catch (err: any) {
      console.error("Error loading case data:", err);
      setError("Fehler beim Laden der Falldaten");
    } finally {
      setIsLoadingFromCase(false);
    }
  };

  useEffect(() => {
    const caseIdParam = searchParams.get("caseId") || searchParams.get("case");
    const markennameParam = searchParams.get("markenname");
    const laenderParam = searchParams.get("laender");
    const klassenParam = searchParams.get("klassen");
    const conflictsParam = searchParams.get("conflicts");
    
    if (markennameParam) setMarkenname(markennameParam);
    if (laenderParam) setSelectedLaender(laenderParam.split(",").filter(Boolean));
    if (klassenParam) setSelectedClasses(klassenParam.split(",").map(Number).filter(n => !isNaN(n)));
    
    if (caseIdParam) {
      setCaseId(caseIdParam);
      loadCaseDataAndAnalysis(caseIdParam);
      return;
    }
    
    const storedData = sessionStorage.getItem('risikoanalyse_conflicts');
    if (storedData && conflictsParam && parseInt(conflictsParam) > 0) {
      try {
        const parsed = JSON.parse(storedData);
        sessionStorage.removeItem('risikoanalyse_conflicts');
        
        const conflictAnalyses: ExpertConflictAnalysis[] = parsed.conflicts.map((c: any) => ({
          conflictId: c.id || c.applicationNumber || Math.random().toString(),
          conflictName: c.name,
          conflictHolder: c.holder || "Unbekannt",
          conflictClasses: c.classes || [],
          conflictOffice: c.register || "DE",
          similarity: c.accuracy || 0,
          legalAssessment: c.reasoning || "Keine detaillierte Bewertung verfügbar.",
          oppositionRisk: c.riskLevel === "high" ? 85 : c.riskLevel === "medium" ? 55 : 25,
          consequences: c.riskLevel === "high" 
            ? "Bei einer Anmeldung besteht ein hohes Risiko eines Widerspruchs durch den Inhaber dieser älteren Marke. Ein Rechtsstreit könnte zu erheblichen Kosten und einer Zurückweisung der Anmeldung führen."
            : c.riskLevel === "medium"
            ? "Ein Widerspruch ist möglich. Die Ähnlichkeit könnte bei identischen Waren/Dienstleistungen zu Problemen führen."
            : "Das Risiko eines erfolgreichen Widerspruchs ist gering, aber eine Beobachtung wird empfohlen.",
          solutions: c.riskLevel === "high" || c.riskLevel === "medium" ? [
            {
              type: "name_modification" as const,
              title: "Wortmarke mit Alternativname",
              description: "Registrieren Sie eine leicht modifizierte Wortmarke, die dennoch Ihre Markenidentität bewahrt",
              suggestedValue: (() => {
                const name = parsed.markenname || markennameParam || "Marke";
                const variants = [`${name}is`, `${name}o`, `Neo${name}`, `${name}X`, `i${name}`, `${name}Pro`];
                return variants[Math.floor(Math.random() * variants.length)];
              })(),
              successProbability: 80,
              effort: "low" as const,
              reasoning: "Eine kreative Namensvariation kann die Verwechslungsgefahr erheblich reduzieren, während der Wiedererkennungswert erhalten bleibt.",
            },
            {
              type: "mark_type" as const,
              title: "Wort-Bild-Marke registrieren",
              description: "Kombinieren Sie Ihren Markennamen mit einem einzigartigen Logo oder Designelement",
              suggestedValue: "Logo + Schriftzug als kombinierte Marke anmelden",
              successProbability: 75,
              effort: "medium" as const,
              reasoning: "Eine Wort-Bild-Marke hat einen größeren Schutzumfang durch das visuelle Element und reduziert die Verwechslungsgefahr mit reinen Wortmarken.",
            },
            {
              type: "class_change" as const,
              title: "Klassenbeschränkung",
              description: "Beschränken Sie Ihre Anmeldung auf Nizza-Klassen, die nicht mit der Konfliktmarke überlappen",
              suggestedValue: c.conflictClasses?.length > 0 
                ? `Klassen ${c.conflictClasses.join(", ")} meiden und alternative Klassen wählen`
                : "Nur konfliktfreie Klassen für Ihre Anmeldung auswählen",
              successProbability: 70,
              effort: "low" as const,
              reasoning: "Durch Vermeidung überlappender Waren- und Dienstleistungsklassen kann das Konfliktpotenzial vollständig eliminiert werden.",
            },
            {
              type: "coexistence" as const,
              title: "Koexistenzvereinbarung",
              description: "Schließen Sie eine Vereinbarung mit dem Inhaber der älteren Marke ab",
              suggestedValue: `Koexistenzvereinbarung mit ${c.holder || "dem Markeninhaber"} aushandeln`,
              successProbability: c.accuracy < 80 ? 65 : 45,
              effort: "high" as const,
              reasoning: "Bei ähnlichen, aber nicht identischen Marken kann eine Koexistenzvereinbarung beide Parteien rechtlich absichern und Konflikte vermeiden.",
            },
          ] : [],
        }));
        
        const overallRisk = parsed.analysis?.overallRisk || 
          (conflictAnalyses.some(c => c.oppositionRisk > 70) ? "high" : 
           conflictAnalyses.some(c => c.oppositionRisk > 40) ? "medium" : "low");
        
        setExpertAnalysis({
          success: true,
          trademarkName: parsed.markenname || markennameParam || "",
          overallRisk: overallRisk as "high" | "medium" | "low",
          conflictAnalyses,
          bestOverallSolution: conflictAnalyses.length > 0 && conflictAnalyses[0].solutions.length > 0 
            ? conflictAnalyses[0].solutions[0] 
            : null,
          summary: parsed.analysis?.recommendation || 
            `Die Analyse hat ${conflictAnalyses.length} potenzielle Konflikte identifiziert. ${
              overallRisk === "high" 
                ? "Es wird empfohlen, den Markennamen anzupassen oder rechtliche Beratung einzuholen."
                : overallRisk === "medium"
                ? "Eine sorgfältige Prüfung wird empfohlen."
                : "Die Marke scheint weitgehend frei von Konflikten zu sein."
            }`,
        });
      } catch (e) {
        console.error("Error parsing stored conflicts:", e);
      }
    }
  }, [searchParams]);
  
  const loadGoodsServicesAnalysis = async () => {
    if (!markenname.trim() || selectedClasses.length === 0) {
      setError("Bitte geben Sie einen Markennamen und mindestens eine Klasse an.");
      return;
    }
    
    setIsLoadingGoods(true);
    setError(null);
    
    try {
      const response = await fetch("/api/risk-analysis/goods-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trademarkName: markenname.trim(),
          selectedClasses,
          goodsServicesDescriptions: [],
          targetOffices: selectedLaender,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }
      
      setGoodsAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der W&D-Analyse");
    } finally {
      setIsLoadingGoods(false);
    }
  };
  
  const handleManualAnalysis = async () => {
    if (!markenname.trim() || selectedLaender.length === 0 || selectedClasses.length === 0) {
      setError("Bitte füllen Sie alle Felder aus.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
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
      
      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }
      
      const mockExpertResponse: ExpertAnalysisResponse = {
        success: true,
        trademarkName: markenname,
        overallRisk: data.overallRisk,
        conflictAnalyses: data.conflictsByOffice?.flatMap((office: any) => 
          office.conflicts?.map((c: any) => ({
            conflictId: c.id,
            conflictName: c.name,
            conflictHolder: c.holder || "Unbekannt",
            conflictClasses: c.classes || [],
            conflictOffice: office.office,
            similarity: c.accuracy || 0,
            legalAssessment: c.reasoning || "Keine Bewertung verfügbar",
            oppositionRisk: c.riskLevel === "high" ? 80 : c.riskLevel === "medium" ? 50 : 20,
            consequences: "Möglicher Widerspruch gegen Ihre Markenanmeldung.",
            solutions: [],
          })) || []
        ) || [],
        bestOverallSolution: null,
        summary: data.analysis?.summary || "Analyse abgeschlossen.",
      };
      
      setExpertAnalysis(mockExpertResponse);
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
  
  const handleAdoptAlternative = (newName: string) => {
    const params = new URLSearchParams();
    params.set("q", newName);
    if (selectedLaender.length > 0) params.set("laender", selectedLaender.join(","));
    if (selectedClasses.length > 0) params.set("klassen", selectedClasses.join(","));
    router.push(`/dashboard/recherche?${params.toString()}`);
  };

  const handleDownloadReport = async () => {
    if (!expertAnalysis) return;
    
    try {
      const response = await fetch("/api/risk-analysis/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId || undefined,
          analysisData: expertAnalysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download fehlgeschlagen");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "Markenrechts-Expertenbericht.txt";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Download error:", err);
      setError(err.message || "Fehler beim Herunterladen des Berichts");
    }
  };
  
  const getOverallRiskScore = () => {
    const conflicts = expertAnalysis?.conflictAnalyses || [];
    if (!expertAnalysis || conflicts.length === 0) return 0;
    const avgRisk = conflicts.reduce((sum, c) => sum + c.oppositionRisk, 0) / conflicts.length;
    return Math.round(avgRisk);
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
            <MessageCircle className="w-8 h-8 text-teal-600" />
            Risikoberatung
          </h1>
        </div>
      </div>

      {isLoadingFromCase && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 flex items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <div>
            <h3 className="font-semibold text-teal-900">Daten werden aus Recherche übernommen...</h3>
            <p className="text-sm text-teal-700">Die Konfliktanalyse wird vorbereitet</p>
          </div>
        </div>
      )}

      {!caseId && !expertAnalysis && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Zuerst eine Markenrecherche durchführen
            </h2>
            <p className="text-gray-600 mb-6">
              Um eine aussagekräftige Risikoanalyse zu erhalten, führen Sie bitte zuerst eine Markenrecherche durch. 
              Noch besser: Starten Sie mit einer persönlichen Beratung, um die optimale Markenstrategie zu entwickeln.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a 
                href="/dashboard/copilot"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Beratung starten
              </a>
              <a 
                href="/dashboard/recherche"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-teal-600 text-teal-700 font-medium rounded-xl hover:bg-teal-50 transition-colors"
              >
                <Search className="w-5 h-5" />
                Zur Markenrecherche
              </a>
            </div>
          </div>
        </div>
      )}

      {expertAnalysis && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Risikoanalyse: "{markenname}"</h2>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowRiskModal(true)}
                  className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform group"
                  title="Risikodetails anzeigen"
                >
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-white/40" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-white/30" style={{ animationDuration: '1.5s' }} />
                    <svg className="w-full h-full -rotate-90 relative z-10">
                      <circle cx="32" cy="32" r="26" stroke="white" strokeOpacity="0.3" strokeWidth="5" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        strokeWidth="5"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 - (getOverallRiskScore() / 100) * 2 * Math.PI * 26}
                        className={`${
                          expertAnalysis.overallRisk === "high" ? "stroke-red-400" :
                          expertAnalysis.overallRisk === "medium" ? "stroke-orange-400" : "stroke-green-400"
                        } transition-all duration-1000`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <span className="text-sm font-bold text-white">{getOverallRiskScore()}%</span>
                    </div>
                  </div>
                  <span className="block text-xs text-white/80 mt-1 text-center group-hover:text-white transition-colors">Details</span>
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setInputMode("sprache")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    inputMode === "sprache" 
                      ? "bg-white text-teal-700" 
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Sprache
                </button>
                <button
                  onClick={() => setInputMode("text")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    inputMode === "text" 
                      ? "bg-white text-teal-700" 
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Tippen
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  {isLoadingToken ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      <span className="ml-3 text-gray-600 text-sm">Verbindung wird hergestellt...</span>
                    </div>
                  ) : accessToken ? (
                    <VoiceProvider>
                      <VoiceAssistant 
                        accessToken={accessToken} 
                        inputMode={inputMode}
                        autoStart={inputMode === "sprache"}
                        onAutoStartConsumed={() => setAutoStartVoice(false)}
                        contextMessage={pendingQuickQuestion || (
                          inputMode === "sprache" 
                            ? (!voicePromptSent ? generateAdvisorPrompt() : null)
                            : (!textPromptSent ? generateAdvisorPrompt() : null)
                        )}
                        onContextMessageConsumed={() => {
                          setPendingQuickQuestion(null);
                          if (inputMode === "sprache") {
                            setVoicePromptSent(true);
                          } else {
                            setTextPromptSent(true);
                          }
                        }}
                        embedded={true}
                      />
                    </VoiceProvider>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center text-gray-500">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-orange-400" />
                        <p className="text-sm">Verbindung zum Berater konnte nicht hergestellt werden.</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                        >
                          Erneut versuchen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-full">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Schnellfragen</h4>
                    <div className="space-y-2">
                      {RISK_QUICK_QUESTIONS.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickQuestion(question)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-white rounded-lg border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div ref={technicalDetailsRef} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Alle Konflikte im Detail anzeigen</h3>
                  <p className="text-sm text-gray-500">Risiko-Details, Konfliktanalysen, Lösungsvorschläge</p>
                </div>
              </div>
              {showTechnicalDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {showTechnicalDetails && (
              <div className="border-t border-gray-200 p-6 space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <div className="text-center lg:text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Scale className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Risikoanalyse</h2>
                      </div>
                      <p className="text-gray-600 text-sm">Automatisierte Konfliktanalyse</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <AnimatedRiskScore 
                        score={getOverallRiskScore()} 
                        risk={expertAnalysis.overallRisk} 
                      />
                    </div>
                    
                    <div className="text-center lg:text-right">
                      <div className="text-3xl font-bold text-gray-900 mb-2">"{markenname}"</div>
                      <p className="text-gray-600">
                        {(expertAnalysis.conflictAnalyses || []).length} Konflikte analysiert
                      </p>
                    </div>
                  </div>
                  
                  {expertAnalysis.summary && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-gray-700 italic">"{expertAnalysis.summary}"</p>
                    </div>
                  )}
                </div>

                {expertAnalysis.bestOverallSolution && (
                  <div className="bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                        <Lightbulb className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-teal-800">Beste Gesamtlösung</h3>
                        <p className="text-teal-700 mt-1">{expertAnalysis.bestOverallSolution.title}</p>
                        <p className="text-sm text-teal-600 mt-2">{expertAnalysis.bestOverallSolution.description}</p>
                        {expertAnalysis.bestOverallSolution.suggestedValue && (
                          <div className="mt-3 bg-white rounded-lg p-3 border border-teal-200">
                            <span className="font-medium text-teal-800">{expertAnalysis.bestOverallSolution.suggestedValue}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="text-teal-600">
                            Erfolgswahrscheinlichkeit: <strong>{expertAnalysis.bestOverallSolution.successProbability}%</strong>
                          </span>
                          <EffortBadge effort={expertAnalysis.bestOverallSolution.effort} />
                        </div>
                        {expertAnalysis.bestOverallSolution.type === "name_modification" && expertAnalysis.bestOverallSolution.suggestedValue && (
                          <button
                            onClick={() => handleAdoptAlternative(expertAnalysis.bestOverallSolution!.suggestedValue)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Alternative übernehmen → neue Recherche
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(expertAnalysis.conflictAnalyses || []).length === 0 ? (
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-teal-800">Keine Konflikte gefunden!</h3>
                    <p className="text-teal-700 mt-2">
                      Die Marke "{markenname}" scheint frei von relevanten Kollisionen zu sein.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Analysierte Konflikte ({(expertAnalysis.conflictAnalyses || []).length})
                    </h3>
                    {(expertAnalysis.conflictAnalyses || []).map((conflict, idx) => (
                      <ConflictCard 
                        key={idx} 
                        conflict={conflict}
                        laender={selectedLaender}
                        klassen={selectedClasses}
                        onAdoptAlternative={handleAdoptAlternative}
                      />
                    ))}
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => {
                      setIsGoodsExpanded(!isGoodsExpanded);
                      if (!isGoodsExpanded && !goodsAnalysis && !isLoadingGoods) {
                        loadGoodsServicesAnalysis();
                      }
                    }}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Tag className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Waren & Dienstleistungen</h3>
                        <p className="text-sm text-gray-500">Diese Faktoren beeinflussen das Risiko</p>
                      </div>
                    </div>
                    {isGoodsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isGoodsExpanded && (
                    <div className="border-t border-gray-200 p-5 space-y-4">
                      {isLoadingGoods ? (
                        <div className="bg-gray-50 rounded-xl p-8 text-center">
                          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900">W&D-Analyse wird erstellt...</h3>
                          <p className="text-gray-600 mt-2">Prüfe Waren- und Dienstleistungsverzeichnis auf Amtskonformität</p>
                        </div>
                      ) : goodsAnalysis ? (
                        <>
                          <div className={`rounded-2xl p-6 ${
                            goodsAnalysis.overallCompliance === "compliant" 
                              ? "bg-teal-50 border border-teal-200" 
                              : goodsAnalysis.overallCompliance === "needs_improvement"
                                ? "bg-orange-50 border border-orange-200"
                                : "bg-red-50 border border-red-200"
                          }`}>
                            <div className="flex items-center gap-4">
                              {goodsAnalysis.overallCompliance === "compliant" ? (
                                <CheckCircle className="w-10 h-10 text-teal-600" />
                              ) : goodsAnalysis.overallCompliance === "needs_improvement" ? (
                                <AlertTriangle className="w-10 h-10 text-orange-600" />
                              ) : (
                                <XCircle className="w-10 h-10 text-red-600" />
                              )}
                              <div>
                                <h3 className={`text-lg font-semibold ${
                                  goodsAnalysis.overallCompliance === "compliant" ? "text-teal-800" :
                                  goodsAnalysis.overallCompliance === "needs_improvement" ? "text-orange-800" : "text-red-800"
                                }`}>
                                  {goodsAnalysis.overallCompliance === "compliant" 
                                    ? "Alle Waren & Dienstleistungen sind amtskonform"
                                    : goodsAnalysis.overallCompliance === "needs_improvement"
                                      ? "Einige Formulierungen benötigen Verbesserung"
                                      : "Erhebliche Überarbeitung erforderlich"}
                                </h3>
                                <p className={`text-sm mt-1 ${
                                  goodsAnalysis.overallCompliance === "compliant" ? "text-teal-700" :
                                  goodsAnalysis.overallCompliance === "needs_improvement" ? "text-orange-700" : "text-red-700"
                                }`}>
                                  {goodsAnalysis.classRecommendations.filter(c => c.isCompliant).length} von {goodsAnalysis.classRecommendations.length} Klassen konform
                                </p>
                              </div>
                            </div>
                            
                            {goodsAnalysis.warnings.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Wichtige Hinweise:</h4>
                                <ul className="space-y-1">
                                  {goodsAnalysis.warnings.map((warning, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {goodsAnalysis.classRecommendations.map((rec, idx) => (
                              <ClassComplianceCard key={idx} recommendation={rec} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-8 text-center">
                          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900">Keine W&D-Analyse verfügbar</h3>
                          <p className="text-gray-600 mt-2">
                            Bitte stellen Sie sicher, dass Markenname und Klassen ausgewählt sind.
                          </p>
                          <button
                            onClick={loadGoodsServicesAnalysis}
                            disabled={!markenname.trim() || selectedClasses.length === 0}
                            className="mt-4 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
                          >
                            W&D-Analyse starten
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 justify-center pt-4">
                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <FileDown className="w-5 h-5" />
                    Bericht herunterladen
                  </button>
                  <a
                    href={`/dashboard/anmeldung?markName=${encodeURIComponent(markenname)}`}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Marke anmelden
                  </a>
                </div>
              </div>
            )}
          </div>

          {showRiskModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRiskModal(false)}>
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AnimatedRiskScore 
                      score={getOverallRiskScore()} 
                      risk={expertAnalysis.overallRisk} 
                    />
                    <div>
                      <h2 className="text-xl font-bold">Risikodetails: "{markenname}"</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {(expertAnalysis.conflictAnalyses || []).length} Konflikte gefunden
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowRiskModal(false)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {expertAnalysis.summary && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-gray-700 italic">"{expertAnalysis.summary}"</p>
                    </div>
                  )}

                  {expertAnalysis.bestOverallSolution && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-teal-700 font-semibold mb-2">
                        <Lightbulb className="w-5 h-5" />
                        Empfohlene Lösung
                      </div>
                      <p className="text-teal-800">{expertAnalysis.bestOverallSolution.title}</p>
                      {expertAnalysis.bestOverallSolution.suggestedValue && (
                        <div className="mt-2 bg-white rounded-lg p-3 border border-teal-200">
                          <span className="font-medium text-teal-900">{expertAnalysis.bestOverallSolution.suggestedValue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-teal-600">
                          Erfolgswahrscheinlichkeit: <strong>{expertAnalysis.bestOverallSolution.successProbability}%</strong>
                        </span>
                        <EffortBadge effort={expertAnalysis.bestOverallSolution.effort} />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Gefundene Konflikte ({(expertAnalysis.conflictAnalyses || []).length})
                    </h3>
                    <div className="space-y-3">
                      {(expertAnalysis.conflictAnalyses || []).map((conflict, idx) => (
                        <ConflictCard
                          key={conflict.conflictId || idx}
                          conflict={conflict}
                          laender={selectedLaender}
                          klassen={selectedClasses}
                          onAdoptAlternative={handleAdoptAlternative}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowRiskModal(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Schließen
                  </button>
                  <a
                    href={`/dashboard/anmeldung?markName=${encodeURIComponent(markenname)}`}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marke anmelden
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default function RisikoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <RisikoPageContent />
    </Suspense>
  );
}
