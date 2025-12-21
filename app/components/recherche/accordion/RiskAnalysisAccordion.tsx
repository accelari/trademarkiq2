"use client";

import { useMemo, useRef, useEffect, ReactNode } from "react";
import {
  AlertTriangle,
  Shield,
  Sparkles,
  FileText,
  Lightbulb,
  Mic,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { AccordionSection } from "./AccordionSection";
import { RiskBadge } from "../RiskBadge";
import { ConflictCard, type ConflictingMark } from "../ConflictCard";
import { useAlternativeSearch } from "@/app/hooks/useAlternativeSearch";
import { AlternativeGeneratorModal } from "../alternatives";
import { ShortlistComparison } from "../shortlist";

interface RiskAnalysisAccordionProps {
  brandName: string;
  selectedClasses: number[];
  analysis: {
    overallRisk: "high" | "medium" | "low";
    riskAssessment: string;
    recommendation: string;
    famousMarkDetected: boolean;
    famousMarkNames: string[];
  };
  conflicts: ConflictingMark[];
  totalResultsAnalyzed?: number;
  searchTermsUsed?: string[];
  includeRelatedClasses?: boolean;
  onConflictClick?: (conflict: ConflictingMark) => void;
  onContactLawyer?: () => void;
  onDownloadPDF?: () => void;
  onProceedToRegistration?: () => void;
  // Voice assistant section (pass as children or render prop)
  voiceAssistantContent?: ReactNode;
}

export function RiskAnalysisAccordion({
  brandName,
  selectedClasses,
  analysis,
  conflicts,
  totalResultsAnalyzed = 0,
  searchTermsUsed = [],
  includeRelatedClasses = false,
  onConflictClick,
  onContactLawyer,
  onDownloadPDF,
  onProceedToRegistration,
  voiceAssistantContent,
}: RiskAnalysisAccordionProps) {
  const {
    isGeneratorOpen,
    isShortlistOpen,
    shortlist,
    recommendation,
    generatorSettings,
    openGenerator,
    closeGenerator,
    openShortlist,
    closeShortlist,
    generateAlternatives,
    quickCheck,
    addToShortlist,
    removeFromShortlist,
    selectName,
    downloadPDF,
    startFullAnalysis,
    initializeSearch,
  } = useAlternativeSearch();

  // Track initialization
  const initializedRef = useRef(false);
  const lastBrandRef = useRef(brandName);

  useEffect(() => {
    if (!initializedRef.current || lastBrandRef.current !== brandName) {
      initializeSearch(brandName, selectedClasses, analysis.overallRisk);
      initializedRef.current = true;
      lastBrandRef.current = brandName;
    }
  }, [brandName, selectedClasses, analysis.overallRisk]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate risk score
  const riskScore = useMemo(() => {
    const criticalCount = conflicts.filter((c) => c.riskLevel === "high").length;
    const mediumCount = conflicts.filter((c) => c.riskLevel === "medium").length;

    if (analysis.overallRisk === "high") {
      return Math.min(100, 70 + criticalCount * 5);
    } else if (analysis.overallRisk === "medium") {
      return Math.min(69, 40 + mediumCount * 5);
    } else {
      return Math.min(39, 10 + conflicts.length * 2);
    }
  }, [conflicts, analysis.overallRisk]);

  // Conflict counts
  const conflictCounts = useMemo(() => ({
    critical: conflicts.filter((c) => c.accuracy >= 80).length,
    review: conflicts.filter((c) => c.accuracy >= 60 && c.accuracy < 80).length,
    okay: conflicts.filter((c) => c.accuracy < 60).length,
  }), [conflicts]);

  // Top conflicts for summary
  const topConflicts = useMemo(() => {
    return conflicts
      .filter((c) => c.accuracy >= 60)
      .slice(0, 3);
  }, [conflicts]);

  // Critical classes
  const criticalClasses = useMemo(() => {
    const classConflicts = new Map<number, number>();
    conflicts
      .filter((c) => c.accuracy >= 80)
      .forEach((c) => {
        c.classes.forEach((cls) => {
          classConflicts.set(cls, (classConflicts.get(cls) || 0) + 1);
        });
      });
    return Array.from(classConflicts.entries())
      .filter(([, count]) => count >= 2)
      .map(([cls]) => cls);
  }, [conflicts]);

  // Cross-class conflicts
  const crossClassConflicts = useMemo(() => {
    if (!includeRelatedClasses) return [];
    return conflicts.filter(c =>
      !c.classes.some(cls => selectedClasses.includes(cls))
    );
  }, [conflicts, selectedClasses, includeRelatedClasses]);

  // Risk color config
  const riskConfig = {
    high: {
      color: "red",
      bg: "bg-gradient-to-br from-red-500 to-red-600",
      lightBg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: XCircle,
      label: "Hohes Risiko",
      description: "Die Marke kollidiert wahrscheinlich mit bestehenden Marken.",
    },
    medium: {
      color: "yellow",
      bg: "bg-gradient-to-br from-yellow-500 to-orange-500",
      lightBg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      icon: AlertCircle,
      label: "Mittleres Risiko",
      description: "Es gibt potenzielle Konflikte, die geprüft werden sollten.",
    },
    low: {
      color: "green",
      bg: "bg-gradient-to-br from-green-500 to-emerald-500",
      lightBg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      icon: CheckCircle2,
      label: "Niedriges Risiko",
      description: "Die Marke scheint verfügbar zu sein.",
    },
  };

  const config = riskConfig[analysis.overallRisk];
  const RiskIcon = config.icon;

  // Shortlist names for modal
  const shortlistNames = useMemo(() => shortlist.map((item) => item.name), [shortlist]);

  // Handler functions
  const handleGenerateAlternatives = async () => {
    return generateAlternatives(generatorSettings);
  };

  const handleQuickCheck = async (name: string) => {
    return quickCheck(name);
  };

  const handleAddToShortlist = (name: string, data: { riskScore: number; riskLevel: string }) => {
    addToShortlist(name, data);
  };

  return (
    <div className="space-y-4">
      {/* Risk Score Header - Always visible */}
      <div className={`${config.lightBg} ${config.border} border rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`${config.bg} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg`}>
              <RiskIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{brandName}</h2>
                <RiskBadge risk={analysis.overallRisk} />
              </div>
              <p className={`text-sm ${config.text} mt-1`}>{config.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${config.text}`}>{riskScore}</div>
            <div className="text-sm text-gray-500">Risiko-Score</div>
          </div>
        </div>

      </div>

      {/* Famous Mark Warning */}
      {analysis.famousMarkDetected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Bekannte Marke erkannt</p>
            <p className="text-sm text-amber-700">
              {analysis.famousMarkNames.join(", ")} - Bekannte Marken haben erweiterten Schutz.
            </p>
          </div>
        </div>
      )}

      {/* Accordion Sections */}

      {/* 1. Conflict Overview */}
      <AccordionSection
        title="Konfliktübersicht"
        icon={BarChart3}
        badge={conflicts.length}
        badgeColor={analysis.overallRisk === "high" ? "red" : analysis.overallRisk === "medium" ? "yellow" : "green"}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* All Conflicts */}
          {conflicts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Alle Konflikte ({conflicts.length}):</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conflicts.map((conflict, idx) => (
                  <button
                    key={idx}
                    onClick={() => onConflictClick?.(conflict)}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{conflict.name}</span>
                      <span className="text-sm text-gray-500 ml-2">• {conflict.register}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        conflict.accuracy >= 80
                          ? "bg-red-100 text-red-700"
                          : conflict.accuracy >= 60
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {conflict.accuracy}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* 2. AI Analysis */}
      <AccordionSection
        title="KI-Risikoanalyse"
        icon={Sparkles}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {analysis.riskAssessment}
            </p>
          </div>

          {criticalClasses.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h4 className="text-sm font-medium text-red-800 mb-2">Kritische Klassen:</h4>
              <div className="flex flex-wrap gap-2">
                {criticalClasses.map((cls) => (
                  <span key={cls} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                    Klasse {cls}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Empfehlung
            </h4>
            <p className="text-sm text-blue-700">{analysis.recommendation}</p>
          </div>
        </div>
      </AccordionSection>

      {/* 3. All Conflicts */}
      {conflicts.length > 0 && (
        <AccordionSection
          title="Alle Konflikte"
          icon={AlertTriangle}
          badge={conflicts.length}
          badgeColor="gray"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {crossClassConflicts.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">
                    {crossClassConflicts.length} Marke{crossClassConflicts.length !== 1 ? 'n' : ''} in anderen Klassen
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Diese könnten trotzdem relevant sein bei überschneidenden Waren/Dienstleistungen.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {conflicts.map((conflict, idx) => (
                <ConflictCard
                  key={idx}
                  conflict={conflict}
                  selectedClasses={selectedClasses}
                  includeRelatedClasses={includeRelatedClasses}
                  onClick={() => onConflictClick?.(conflict)}
                />
              ))}
            </div>
          </div>
        </AccordionSection>
      )}

      {/* 4. Alternative Names */}
      <AccordionSection
        title="Alternative Namen"
        icon={Lightbulb}
        badge={shortlist.length > 0 ? shortlist.length : undefined}
        badgeColor="blue"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {analysis.overallRisk === "high"
              ? "Bei hohem Risiko empfehlen wir, alternative Markennamen zu prüfen."
              : analysis.overallRisk === "medium"
              ? "Prüfen Sie alternative Namen, um Ihr Risiko weiter zu minimieren."
              : "Ihre Marke sieht gut aus! Optional können Sie weitere Namen vergleichen."
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openGenerator}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              KI-Namensvorschläge generieren
            </button>
            {shortlist.length > 0 && (
              <button
                onClick={openShortlist}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Shortlist anzeigen ({shortlist.length})
              </button>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* 5. Voice Assistant (Klaus) */}
      {voiceAssistantContent && (
        <AccordionSection
          title="KI-Markenberater Klaus"
          icon={Mic}
          defaultOpen={false}
        >
          {voiceAssistantContent}
        </AccordionSection>
      )}

      {/* 6. Actions */}
      <AccordionSection
        title="Nächste Schritte"
        icon={Shield}
        defaultOpen={analysis.overallRisk === "low"}
      >
        <div className="space-y-3">
          {analysis.overallRisk === "high" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>Achtung:</strong> Bei hohem Risiko empfehlen wir dringend eine professionelle Beratung
                vor der Markenanmeldung.
              </p>
            </div>
          )}

          <button
            onClick={onContactLawyer}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Rechtsberatung anfragen
          </button>

          <button
            onClick={onDownloadPDF}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Analysebericht herunterladen (PDF)
          </button>

          {analysis.overallRisk === "low" && onProceedToRegistration && (
            <button
              onClick={onProceedToRegistration}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 className="w-5 h-5" />
              Zur Markenanmeldung
            </button>
          )}
        </div>
      </AccordionSection>

      {/* Modals */}
      <AlternativeGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={closeGenerator}
        originalBrand={brandName}
        selectedClasses={selectedClasses}
        shortlist={shortlistNames}
        onOpenShortlist={openShortlist}
        onGenerateAlternatives={handleGenerateAlternatives}
        onQuickCheck={handleQuickCheck}
        onAddToShortlist={handleAddToShortlist}
        onRemoveFromShortlist={removeFromShortlist}
      />

      <ShortlistComparison
        isOpen={isShortlistOpen}
        onClose={closeShortlist}
        items={shortlist}
        recommendation={recommendation}
        onSelectName={selectName}
        onRemoveFromShortlist={removeFromShortlist}
        onFullAnalysis={startFullAnalysis}
        onAddMore={() => {
          closeShortlist();
          openGenerator();
        }}
        onDownloadPDF={downloadPDF}
      />
    </div>
  );
}

export default RiskAnalysisAccordion;
