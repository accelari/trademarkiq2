"use client";

import { useState, useEffect } from "react";
import { X, Wand2, PenLine, List } from "lucide-react";
import { AIGeneratorTab, type GeneratorSettings, type NameSuggestion } from "./AIGeneratorTab";
import { ManualEntryTab } from "./ManualEntryTab";

type TabId = "ai" | "manual";

interface CheckedName {
  name: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  timestamp: Date;
}

interface AlternativeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalBrand: string;
  selectedClasses: number[];
  shortlist: string[];
  onOpenShortlist: () => void;
  // Callbacks
  onGenerateAlternatives: (settings: GeneratorSettings) => Promise<NameSuggestion[]>;
  onQuickCheck: (name: string) => Promise<{ riskLevel: "low" | "medium" | "high"; riskScore: number; conflicts: number }>;
  onAddToShortlist: (name: string, data: { riskScore: number; riskLevel: string; conflicts?: number; criticalCount?: number }) => void;
  onRemoveFromShortlist: (name: string) => void;
}

export function AlternativeGeneratorModal({
  isOpen,
  onClose,
  originalBrand,
  selectedClasses,
  shortlist,
  onOpenShortlist,
  onGenerateAlternatives,
  onQuickCheck,
  onAddToShortlist,
  onRemoveFromShortlist,
}: AlternativeGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const [settings, setSettings] = useState<GeneratorSettings>({
    style: "similar",
    keywords: [],
    language: "de",
  });
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkedNames, setCheckedNames] = useState<CheckedName[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSuggestions([]);
      setSettings({
        style: "similar",
        keywords: [],
        language: "de",
      });
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newSuggestions = await onGenerateAlternatives(settings);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error generating alternatives:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setSuggestions([]);
    await handleGenerate();
  };

  const handleQuickCheckSuggestion = async (name: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.name === name ? { ...s, quickCheckStatus: "checking" as const } : s
      )
    );

    try {
      const result = await onQuickCheck(name);
      setSuggestions((prev) =>
        prev.map((s) =>
          s.name === name
            ? {
                ...s,
                quickCheckStatus: result.riskLevel,
                quickCheckScore: result.riskScore,
                quickCheckConflicts: result.conflicts,
              }
            : s
        )
      );
    } catch (error) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.name === name ? { ...s, quickCheckStatus: "error" as const } : s
        )
      );
    }
  };

  const handleQuickCheckManual = async (name: string) => {
    setIsChecking(true);
    try {
      const result = await onQuickCheck(name);
      setCheckedNames((prev) => [
        { name, riskLevel: result.riskLevel, riskScore: result.riskScore, timestamp: new Date() },
        ...prev,
      ]);
    } catch (error) {
      console.error("Error checking name:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleShortlist = (name: string) => {
    if (shortlist.includes(name)) {
      onRemoveFromShortlist(name);
    } else {
      const suggestion = suggestions.find((s) => s.name === name);
      if (suggestion) {
        onAddToShortlist(name, {
          riskScore: suggestion.quickCheckScore || 0,
          riskLevel: suggestion.quickCheckStatus || "idle",
          conflicts: suggestion.quickCheckConflicts || 0,
        });
      }
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "ai" as const, label: "KI-Vorschläge", icon: Wand2 },
    { id: "manual" as const, label: "Eigener Name", icon: PenLine },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Alternative Namen finden</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Ursprünglicher Name: <span className="font-medium">{originalBrand}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shortlist.length > 0 && (
              <button
                onClick={onOpenShortlist}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <List className="w-4 h-4" />
                Shortlist ({shortlist.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "ai" && (
            <AIGeneratorTab
              originalBrand={originalBrand}
              selectedClasses={selectedClasses}
              settings={settings}
              onSettingsChange={setSettings}
              suggestions={suggestions}
              isGenerating={isGenerating}
              shortlist={shortlist}
              onGenerate={handleGenerate}
              onRegenerate={handleRegenerate}
              onQuickCheck={handleQuickCheckSuggestion}
              onToggleShortlist={handleToggleShortlist}
            />
          )}
          {activeTab === "manual" && (
            <ManualEntryTab
              selectedClasses={selectedClasses}
              checkedNames={checkedNames}
              isChecking={isChecking}
              shortlist={shortlist}
              onQuickCheck={handleQuickCheckManual}
              onAddToShortlist={onAddToShortlist}
              onRemoveFromShortlist={onRemoveFromShortlist}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AlternativeGeneratorModal;
