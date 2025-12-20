// Existing exports
export { RiskBadge, StatusBadge, OfficeBadge, AccuracyBadge, getAccuracyColor } from "./RiskBadge";
export type { RiskLevel } from "./RiskBadge";
export { ConflictCard } from "./ConflictCard";
export type { ConflictingMark } from "./ConflictCard";
export { MinimalProgressIndicator, ThinkingStep } from "./ProgressSteps";
export { QuickCheckResult, NoResultsFound } from "./QuickCheckResult";
export { RiskScoreLegend, RiskScoreExplanation } from "./RiskScoreLegend";
export { SearchModeExplanation, SearchModeHint } from "./SearchModeExplanation";

// New Executive Summary components
export { RiskAmpel } from "./results/RiskAmpel";
export { ConflictSummaryCards } from "./results/ConflictSummaryCards";
export { AIExecutiveSummary } from "./results/AIExecutiveSummary";
export { RecommendedAction } from "./results/RecommendedAction";

// Alternative Generator components
export { AlternativeGeneratorModal } from "./alternatives/AlternativeGeneratorModal";
export { AIGeneratorTab } from "./alternatives/AIGeneratorTab";
export { ManualEntryTab } from "./alternatives/ManualEntryTab";
export { StyleSelector } from "./alternatives/StyleSelector";
export { NameSuggestionCard } from "./alternatives/NameSuggestionCard";
export type { GeneratorStyle } from "./alternatives/StyleSelector";
export type { GeneratorSettings, NameSuggestion, GeneratorLanguage } from "./alternatives/AIGeneratorTab";
export type { QuickCheckStatus } from "./alternatives/NameSuggestionCard";

// Shortlist components
export { ShortlistComparison } from "./shortlist/ShortlistComparison";
export { ComparisonTable } from "./shortlist/ComparisonTable";
export { MobileShortlistCarousel } from "./shortlist/MobileShortlistCarousel";
export { AIRecommendation } from "./shortlist/AIRecommendation";
export type { ShortlistItem } from "./shortlist/ComparisonTable";

// Main Executive Summary View
export { ExecutiveSummaryView } from "./ExecutiveSummaryView";
