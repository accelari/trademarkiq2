"use client";

import { useState } from "react";
import {
  ChevronDown,
  Search,
  FileSearch,
  Shield,
  Lightbulb,
  Check,
  Clock,
  Loader2,
  Brain,
  Globe,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

interface SearchVariant {
  term: string;
  type: string;
  rationale: string;
}

interface Conflict {
  name: string;
  register: string;
  accuracy: number;
  riskLevel: "high" | "medium" | "low";
  reasoning: string;
}

interface AIProcessOverviewProps {
  searchTerm: string;
  progress: {
    step1: "pending" | "started" | "completed";
    step2: "pending" | "started" | "completed";
    step3: "pending" | "started" | "completed";
    step4: "pending" | "started" | "completed";
    step1Data?: { queryTerms?: string[] };
    step3Data?: { resultsCount?: number };
  };
  analysis?: {
    searchTermsUsed: string[];
    conflicts: Conflict[];
    totalResultsAnalyzed: number;
    analysis: {
      nameAnalysis: string;
      searchStrategy: string;
      riskAssessment: string;
      overallRisk: "high" | "medium" | "low";
      recommendation: string;
    };
  } | null;
  selectedCountries: string[];
  selectedClasses: number[];
}

interface StepSectionProps {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  status: "pending" | "started" | "completed";
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function StepSection({ stepNumber, title, icon, status, isOpen, onToggle, children }: StepSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        disabled={status === "pending"}
        className={`w-full flex items-center justify-between p-3 text-left ${
          status === "pending" ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <p className="font-medium text-gray-900 text-sm">Schritt {stepNumber}: {title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Abgeschlossen
          </span>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
          />
        </div>
      </button>
      
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease-out",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
            <div className="pt-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const getVariantTypeLabel = (type: string) => {
  switch (type) {
    case "exact": return "Exakte Schreibweise";
    case "phonetic": return "Ähnliche Aussprache";
    case "visual": return "Ähnliches Schriftbild";
    case "conceptual": return "Ähnliche Bedeutung";
    case "root": return "Wortstamm-Variante";
    case "misspelling": return "Häufige Schreibfehler";
    default: return "Suchvariante";
  }
};

export default function AIProcessOverview({
  searchTerm,
  progress,
  analysis,
  selectedCountries,
  selectedClasses,
}: AIProcessOverviewProps) {
  // Start with all steps collapsed for clean finished state
  const [openSteps, setOpenSteps] = useState<number[]>([]);

  const toggleStep = (step: number) => {
    setOpenSteps(prev =>
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const getCountryName = (code: string) => {
    const names: Record<string, string> = {
      DE: "Deutschland (DPMA)",
      EU: "Europa (EUIPO)",
      WO: "International (WIPO)",
      US: "USA (USPTO)",
      GB: "Großbritannien (UKIPO)",
      CH: "Schweiz (IGE)",
      AT: "Österreich (ÖPA)",
      FR: "Frankreich (INPI)",
      IT: "Italien (UIBM)",
      ES: "Spanien (OEPM)",
      CN: "China (CNIPA)",
      JP: "Japan (JPO)",
    };
    return names[code] || code;
  };

  // Calculate progress percentage
  const getProgressPercent = () => {
    let completed = 0;
    let inProgress = 0;
    
    if (progress.step1 === "completed") completed++;
    else if (progress.step1 === "started") inProgress = 0.5;
    
    if (progress.step2 === "completed") completed++;
    else if (progress.step2 === "started") inProgress = 0.5;
    
    if (progress.step3 === "completed") completed++;
    else if (progress.step3 === "started") inProgress = 0.5;
    
    if (progress.step4 === "completed") completed++;
    else if (progress.step4 === "started") inProgress = 0.5;
    
    return Math.round(((completed + inProgress) / 4) * 100);
  };

  const progressPercent = getProgressPercent();

  const allCompleted = progress.step1 === "completed" && 
                       progress.step2 === "completed" && 
                       progress.step3 === "completed" && 
                       progress.step4 === "completed";

  const anyStarted = progress.step1 !== "pending" ||
                     progress.step2 !== "pending" ||
                     progress.step3 !== "pending" ||
                     progress.step4 !== "pending";

  // Get currently active step description
  const getActiveStepText = () => {
    if (progress.step4 === "started") return "Risikobewertung wird erstellt...";
    if (progress.step3 === "started") return "Register werden durchsucht...";
    if (progress.step2 === "started") return "Suchstrategie wird entwickelt...";
    if (progress.step1 === "started") return "Markenname wird analysiert...";
    if (allCompleted) return "Analyse abgeschlossen!";
    return "Analyse wird vorbereitet...";
  };

  if (!anyStarted) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Clean header with page colors */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Analyse abgeschlossen</h3>
              <p className="text-sm text-gray-500">Markenprüfung für "{searchTerm}"</p>
            </div>
          </div>
          <span className="text-xl font-bold text-primary">100%</span>
        </div>
        
        {/* Completed progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-primary rounded-full w-full" />
        </div>
        
        {/* Simple step dots */}
        <div className="flex justify-between mt-3 px-2">
          {["Analyse", "Strategie", "Suche", "Bewertung"].map((label, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Section Title */}
      <div className="px-5 py-3 bg-gray-50/50">
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span>Details zur Markenprüfung <span className="text-gray-400">(zum Aufklappen anklicken)</span></span>
        </p>
      </div>

      <div className="p-4 space-y-3">
        <StepSection
          stepNumber={1}
          title="Markenname analysiert"
          icon={<Lightbulb className="w-5 h-5" />}
          status={progress.step1}
          isOpen={openSteps.includes(1)}
          onToggle={() => toggleStep(1)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Ihr Markenname <span className="font-semibold">"{searchTerm}"</span> wurde auf verschiedene Eigenschaften untersucht:
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5 ml-4">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Aussprache:</strong> Wie klingt der Name? Welche ähnlich klingenden Marken könnten verwechselt werden?</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Schriftbild:</strong> Wie sieht der Name geschrieben aus? Welche optisch ähnlichen Namen gibt es?</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Bedeutung:</strong> Was bedeutet der Name? Gibt es Marken mit ähnlicher Bedeutung?</span>
              </li>
            </ul>
            {analysis?.analysis?.nameAnalysis && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className="text-sm text-gray-700">{analysis.analysis.nameAnalysis}</p>
              </div>
            )}
          </div>
        </StepSection>

        <StepSection
          stepNumber={2}
          title="Suchstrategie entwickelt"
          icon={<Search className="w-5 h-5" />}
          status={progress.step2}
          isOpen={openSteps.includes(2)}
          onToggle={() => toggleStep(2)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Basierend auf der Analyse wurden <strong>{analysis?.searchTermsUsed?.length || progress.step1Data?.queryTerms?.length || 0} Suchbegriffe</strong> entwickelt, um alle potenziell konfligierenden Marken zu finden:
            </p>
            {(analysis?.searchTermsUsed || progress.step1Data?.queryTerms) && (
              <div className="flex flex-wrap gap-2">
                {(analysis?.searchTermsUsed || progress.step1Data?.queryTerms || []).slice(0, 15).map((term, idx) => (
                  <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-lg">
                    {term}
                  </span>
                ))}
                {(analysis?.searchTermsUsed || progress.step1Data?.queryTerms || []).length > 15 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-sm rounded-lg">
                    +{(analysis?.searchTermsUsed || progress.step1Data?.queryTerms || []).length - 15} weitere
                  </span>
                )}
              </div>
            )}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>Warum so viele Varianten?</strong> Bei der Markenprüfung werden nicht nur exakte Übereinstimmungen gesucht. 
                Auch ähnlich klingende oder aussehende Namen können zu Konflikten führen. Deshalb prüfen wir systematisch alle relevanten Variationen.
              </p>
            </div>
          </div>
        </StepSection>

        <StepSection
          stepNumber={3}
          title="Markenregister durchsucht"
          icon={<Globe className="w-5 h-5" />}
          status={progress.step3}
          isOpen={openSteps.includes(3)}
          onToggle={() => toggleStep(3)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Folgende Markenregister wurden durchsucht:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedCountries.map((code, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm text-gray-700">{getCountryName(code)}</span>
                </div>
              ))}
              {/* Always show WIPO as it's automatically included */}
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">+ WIPO (Internationale Marken)</span>
              </div>
              {/* Show EUIPO if any EU country is selected */}
              {selectedCountries.some(c => ['DE', 'FR', 'IT', 'ES', 'AT', 'NL', 'BE', 'PT', 'PL', 'SE', 'DK', 'FI', 'IE', 'GR', 'CZ', 'HU', 'RO', 'BG', 'SK', 'HR', 'SI', 'LT', 'LV', 'EE', 'CY', 'LU', 'MT', 'EU'].includes(c)) && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">+ EUIPO (EU-Marken)</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 italic">
              Internationale Marken (WIPO), die das ausgewählte Land designieren, werden automatisch einbezogen.
            </p>
            {selectedClasses.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">In folgenden Nizza-Klassen:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClasses.map((cls, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">
                      Klasse {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(analysis?.totalResultsAnalyzed !== undefined || progress.step3Data?.resultsCount !== undefined) && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <p className="text-sm text-gray-700">
                    <strong>{analysis?.totalResultsAnalyzed || progress.step3Data?.resultsCount || 0}</strong> existierende Marken gefunden und analysiert
                  </p>
                </div>
              </div>
            )}
          </div>
        </StepSection>

        <StepSection
          stepNumber={4}
          title="Risikobewertung erstellt"
          icon={<Shield className="w-5 h-5" />}
          status={progress.step4}
          isOpen={openSteps.includes(4)}
          onToggle={() => toggleStep(4)}
        >
          <div className="space-y-3">
            {analysis && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    analysis.analysis.overallRisk === "high" ? "bg-red-100" :
                    analysis.analysis.overallRisk === "medium" ? "bg-yellow-100" :
                    "bg-green-100"
                  }`}>
                    {analysis.analysis.overallRisk === "high" ? "🔴" :
                     analysis.analysis.overallRisk === "medium" ? "🟡" : "🟢"}
                  </div>
                  <div>
                    <p className={`font-semibold ${
                      analysis.analysis.overallRisk === "high" ? "text-red-700" :
                      analysis.analysis.overallRisk === "medium" ? "text-yellow-700" :
                      "text-green-700"
                    }`}>
                      {analysis.analysis.overallRisk === "high" ? "Hohes Risiko" :
                       analysis.analysis.overallRisk === "medium" ? "Mittleres Risiko" :
                       "Niedriges Risiko"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {analysis.conflicts.length} potenzielle Konflikte identifiziert
                    </p>
                  </div>
                </div>

                {analysis.conflicts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Gefundene Konflikte:</p>
                    {analysis.conflicts.slice(0, 5).map((conflict, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        conflict.riskLevel === "high" ? "border-red-200 bg-red-50" :
                        conflict.riskLevel === "medium" ? "border-yellow-200 bg-yellow-50" :
                        "border-green-200 bg-green-50"
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{conflict.name}</span>
                          <span className={`text-sm font-bold ${
                            conflict.riskLevel === "high" ? "text-red-600" :
                            conflict.riskLevel === "medium" ? "text-yellow-600" :
                            "text-green-600"
                          }`}>
                            {conflict.accuracy}% Ähnlichkeit
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{conflict.register}</p>
                        {conflict.reasoning && (
                          <p className="text-xs text-gray-500 mt-1">{conflict.reasoning}</p>
                        )}
                      </div>
                    ))}
                    {analysis.conflicts.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{analysis.conflicts.length - 5} weitere Konflikte
                      </p>
                    )}
                  </div>
                )}

                {analysis.analysis.recommendation && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-primary mb-1">Empfehlung:</p>
                    <p className="text-sm text-gray-700">{analysis.analysis.recommendation}</p>
                  </div>
                )}
              </>
            )}

            {!analysis && progress.step4 === "started" && (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Risikobewertung wird erstellt...</span>
              </div>
            )}
          </div>
        </StepSection>
      </div>
    </div>
  );
}
