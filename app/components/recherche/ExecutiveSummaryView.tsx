"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, List } from "lucide-react";
import { useState } from "react";
import {
  RiskAmpel,
  ConflictSummaryCards,
  AIExecutiveSummary,
  RecommendedAction,
} from "./results";
import { AlternativeGeneratorModal } from "./alternatives";
import { ShortlistComparison } from "./shortlist";
import { useAlternativeSearch } from "@/app/hooks/useAlternativeSearch";
import type { ConflictingMark } from "./ConflictCard";

interface ExecutiveSummaryViewProps {
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
  onContactLawyer?: () => void;
  onDownloadPDF?: () => void;
  onProceedToRegistration?: () => void;
  onConflictClick?: (conflict: ConflictingMark) => void;
  onFullAnalysis?: (name: string) => void;
}

export function ExecutiveSummaryView({
  brandName,
  selectedClasses,
  analysis,
  conflicts,
  onContactLawyer,
  onDownloadPDF,
  onProceedToRegistration,
  onConflictClick,
  onFullAnalysis,
}: ExecutiveSummaryViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [detailsCategory, setDetailsCategory] = useState<"critical" | "review" | "okay" | null>(null);

  const {
    isGeneratorOpen,
    isShortlistOpen,
    shortlist,
    recommendation,
    selectedName,
    suggestions,
    isGenerating,
    generatorSettings,
    checkedNames,
    initializeSearch,
    openGenerator,
    closeGenerator,
    openShortlist,
    closeShortlist,
    generateAlternatives,
    quickCheck,
    quickCheckManual,
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
    setGeneratorSettings,
    selectName,
    confirmSelection,
    downloadPDF,
  } = useAlternativeSearch();

  // Track if we've initialized to prevent infinite loops
  const initializedRef = useRef(false);
  const lastBrandRef = useRef(brandName);

  // Initialize the search data - only when brand name changes
  useEffect(() => {
    if (!initializedRef.current || lastBrandRef.current !== brandName) {
      initializeSearch(brandName, selectedClasses, analysis.overallRisk);
      initializedRef.current = true;
      lastBrandRef.current = brandName;
    }
  }, [brandName, selectedClasses, analysis.overallRisk]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate risk score based on conflicts
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

  // Get short explanation based on risk level
  const shortExplanation = useMemo(() => {
    if (analysis.overallRisk === "high") {
      return "Die Marke kollidiert wahrscheinlich mit bestehenden Marken. Eine Anmeldung wird voraussichtlich abgelehnt oder angefochten.";
    } else if (analysis.overallRisk === "medium") {
      return "Es gibt potenzielle Konflikte, die von einem Experten geprüft werden sollten. Eine Anmeldung ist möglich, aber mit Risiko verbunden.";
    } else {
      return "Die Marke scheint verfügbar zu sein. Es wurden keine kritischen Konflikte gefunden.";
    }
  }, [analysis.overallRisk]);

  // Count conflicts by category
  const conflictCounts = useMemo(() => {
    return {
      critical: conflicts.filter((c) => c.accuracy >= 80).length,
      review: conflicts.filter((c) => c.accuracy >= 60 && c.accuracy < 80).length,
      okay: conflicts.filter((c) => c.accuracy < 60).length,
    };
  }, [conflicts]);

  // Get top conflicts for AI summary
  const topConflicts = useMemo(() => {
    return conflicts
      .filter((c) => c.accuracy >= 60)
      .slice(0, 3)
      .map((c) => ({
        name: c.name,
        office: c.register,
        classes: c.classes,
        similarity: c.accuracy,
        similarityType: "phonetic" as const, // Simplified
      }));
  }, [conflicts]);

  // Get critical classes
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

  // Handle category click
  const handleCategoryClick = (category: "critical" | "review" | "okay") => {
    if (detailsCategory === category) {
      setShowDetails(!showDetails);
    } else {
      setDetailsCategory(category);
      setShowDetails(true);
    }
  };

  // Filter conflicts by category
  const filteredConflicts = useMemo(() => {
    if (!detailsCategory) return conflicts;
    switch (detailsCategory) {
      case "critical":
        return conflicts.filter((c) => c.accuracy >= 80);
      case "review":
        return conflicts.filter((c) => c.accuracy >= 60 && c.accuracy < 80);
      case "okay":
        return conflicts.filter((c) => c.accuracy < 60);
      default:
        return conflicts;
    }
  }, [conflicts, detailsCategory]);

  // Handle alternative generator callbacks
  const handleGenerateAlternatives = async () => {
    return generateAlternatives(generatorSettings);
  };

  const handleQuickCheck = async (name: string) => {
    const result = await quickCheck(name);
    return result;
  };

  const handleAddToShortlist = (name: string, data: { riskScore: number; riskLevel: string }) => {
    addToShortlist(name, data);
  };

  // Extract shortlist names for the modal (which expects string[])
  const shortlistNames = useMemo(() => {
    return shortlist.map((item) => item.name);
  }, [shortlist]);

  // Shortlist items for comparison modal - already in the correct format
  const shortlistItems = shortlist;

  return (
    <div className="space-y-6">
      {/* Risk Ampel */}
      <RiskAmpel
        riskLevel={analysis.overallRisk}
        riskScore={riskScore}
        brandName={brandName}
        shortExplanation={shortExplanation}
      />

      {/* Conflict Summary Cards */}
      <ConflictSummaryCards
        critical={conflictCounts.critical}
        review={conflictCounts.review}
        okay={conflictCounts.okay}
        onCategoryClick={handleCategoryClick}
      />

      {/* AI Executive Summary */}
      <AIExecutiveSummary
        summary={analysis.riskAssessment}
        topConflicts={topConflicts}
        criticalClasses={criticalClasses}
        famousMarkDetected={analysis.famousMarkDetected}
        famousMarkNames={analysis.famousMarkNames}
      />

      {/* Recommended Action */}
      <RecommendedAction
        riskLevel={analysis.overallRisk}
        onGenerateAlternatives={openGenerator}
        onEnterOwn={() => {
          openGenerator();
          // Switch to manual tab after opening
        }}
        onContactLawyer={onContactLawyer || (() => {})}
        onDownloadPDF={onDownloadPDF || (() => {})}
        onProceedToRegistration={onProceedToRegistration}
      />

      {/* Shortlist Badge (if items exist) */}
      {shortlistItems.length > 0 && (
        <button
          onClick={openShortlist}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors"
        >
          <List className="w-5 h-5" />
          <span className="font-medium">Shortlist anzeigen ({shortlistItems.length} Namen)</span>
        </button>
      )}

      {/* Expandable Details */}
      {conflicts.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-700">
              Details anzeigen ({conflicts.length} Konflikte)
            </span>
            {showDetails ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {showDetails && (
            <div className="p-5 bg-white space-y-3 max-h-96 overflow-y-auto">
              {filteredConflicts.map((conflict, idx) => (
                <button
                  key={idx}
                  onClick={() => onConflictClick?.(conflict)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-sm ${
                    conflict.riskLevel === "high"
                      ? "border-red-200 bg-red-50"
                      : conflict.riskLevel === "medium"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{conflict.name}</span>
                    <span className="text-sm font-medium">
                      {conflict.riskLevel === "high" ? "🔴" : conflict.riskLevel === "medium" ? "🟡" : "🟢"}{" "}
                      {conflict.accuracy}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {conflict.register} • Klasse {conflict.classes.join(", ")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alternative Generator Modal */}
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

      {/* Shortlist Comparison Modal */}
      <ShortlistComparison
        isOpen={isShortlistOpen}
        onClose={closeShortlist}
        items={shortlistItems}
        recommendation={recommendation}
        selectedName={selectedName}
        onSelectName={selectName}
        onConfirmSelection={confirmSelection}
        onRemoveFromShortlist={removeFromShortlist}
        onClearShortlist={clearShortlist}
        onFullAnalysis={(name) => {
          closeShortlist();
          closeGenerator();
          if (onFullAnalysis) {
            onFullAnalysis(name);
          }
        }}
        onAddMore={() => {
          closeShortlist();
          openGenerator();
        }}
        onDownloadPDF={downloadPDF}
      />
    </div>
  );
}

export default ExecutiveSummaryView;
