"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Search, Lightbulb, Globe, Brain, Sparkles, X } from "lucide-react";

interface ProgressData {
  step1: "pending" | "started" | "completed";
  step2: "pending" | "started" | "completed";
  step3: "pending" | "started" | "completed";
  step4: "pending" | "started" | "completed";
  step1Data?: { queryTerms?: string[] };
  step3Data?: { resultsCount?: number };
  currentMessage?: string;
  lastActivity?: number;
  searchDetails?: { termIndex: number; totalTerms: number; resultsFound: number };
}

interface MinimalProgressIndicatorProps {
  progress: ProgressData;
  searchTerm: string;
  onCancel?: () => void;
  startTime?: number;
}

export function MinimalProgressIndicator({ progress, searchTerm, onCancel, startTime }: MinimalProgressIndicatorProps) {
  const [currentTypingStep, setCurrentTypingStep] = useState("");
  const [completedStepsInPhase, setCompletedStepsInPhase] = useState<Record<number, string[]>>({0: [], 1: [], 2: [], 3: []});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  
  const phases = [
    {
      title: "Namensanalyse",
      icon: "search",
      progressKey: "step1" as const,
      steps: [
        `Analysiere "${searchTerm}"`,
        "Identifiziere phonetische Muster",
        "Prüfe Sprach-Varianten",
      ]
    },
    {
      title: "Suchstrategie",
      icon: "strategy",
      progressKey: "step2" as const,
      steps: [
        "Generiere Schreibweisen-Varianten",
        "Erstelle phonetische Varianten",
        "Kombiniere Suchbegriffe",
      ]
    },
    {
      title: "Registersuche",
      icon: "database",
      progressKey: "step3" as const,
      steps: [
        "Durchsuche nationale Register",
        "Durchsuche EUIPO & WIPO",
        "Prüfe internationale Marken",
      ]
    },
    {
      title: "Konfliktanalyse",
      icon: "analysis",
      progressKey: "step4" as const,
      steps: [
        "Berechne Ähnlichkeitswerte",
        "Identifiziere Konflikte",
        "Erstelle Zusammenfassung",
      ]
    }
  ];

  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      if (progress.lastActivity) {
        const secondsSinceActivity = Math.floor((Date.now() - progress.lastActivity) / 1000);
        setIdleSeconds(secondsSinceActivity);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [progress.lastActivity]);
  
  useEffect(() => {
    setIdleSeconds(0);
  }, [progress.lastActivity]);

  const getCurrentPhase = () => {
    if (progress.step4 === "started" || progress.step4 === "completed") return 3;
    if (progress.step3 === "started" || progress.step3 === "completed") return 2;
    if (progress.step2 === "started" || progress.step2 === "completed") return 1;
    return 0;
  };
  
  const currentPhase = getCurrentPhase();
  
  useEffect(() => {
    const phase = phases[currentPhase];
    if (!phase) return;
    
    const phaseStatus = progress[phase.progressKey];
    if (phaseStatus === "pending") return;
    
    let stepIndex = completedStepsInPhase[currentPhase]?.length || 0;
    let charIndex = 0;
    
    if (phaseStatus === "completed") {
      setCompletedStepsInPhase(prev => ({
        ...prev,
        [currentPhase]: phase.steps
      }));
      setCurrentTypingStep("");
      return;
    }
    
    if (stepIndex >= phase.steps.length) return;
    
    const interval = setInterval(() => {
      const currentStep = phase.steps[stepIndex];
      if (!currentStep) {
        clearInterval(interval);
        return;
      }
      
      if (charIndex < currentStep.length) {
        setCurrentTypingStep(currentStep.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setCompletedStepsInPhase(prev => ({
          ...prev,
          [currentPhase]: [...(prev[currentPhase] || []), currentStep]
        }));
        setCurrentTypingStep("");
        charIndex = 0;
        stepIndex++;
      }
    }, 40);
    
    return () => clearInterval(interval);
  }, [currentPhase, progress.step1, progress.step2, progress.step3, progress.step4]);
  
  const getPhaseIcon = (icon: string) => {
    switch(icon) {
      case "search": return <Search className="w-4 h-4" />;
      case "strategy": return <Lightbulb className="w-4 h-4" />;
      case "database": return <Globe className="w-4 h-4" />;
      case "analysis": return <Brain className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };
  
  const isPhaseComplete = (phaseIdx: number) => {
    const phase = phases[phaseIdx];
    return progress[phase.progressKey] === "completed";
  };
  
  const isPhaseActive = (phaseIdx: number) => {
    const phase = phases[phaseIdx];
    return progress[phase.progressKey] === "started";
  };

  const variants = progress.step1Data?.queryTerms?.length || (isPhaseComplete(1) ? 8 : currentPhase >= 1 ? Math.min(8, (completedStepsInPhase[1]?.length || 0) * 3) : 0);
  const searchProgress = progress.searchDetails;
  const registers = searchProgress?.termIndex || (isPhaseComplete(2) ? progress.step1Data?.queryTerms?.length || 8 : currentPhase >= 2 ? Math.min(5, (completedStepsInPhase[2]?.length || 0) * 2) : 0);
  const matches = searchProgress?.resultsFound || progress.step3Data?.resultsCount || (isPhaseComplete(2) ? 50 : 0);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className={`w-5 h-5 text-primary ${idleSeconds < 12 ? 'animate-pulse' : 'animate-bounce'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Markenrecherche für "{searchTerm}"</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-primary truncate max-w-[300px]">
                {progress.currentMessage || "KI analysiert..."}
              </p>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {elapsedTime > 0 && `${elapsedTime}s`}
              </span>
            </div>
            {idleSeconds >= 12 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Warten auf tmsearch.ai-Antwort...
              </p>
            )}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Suche abbrechen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">{variants}</p>
            <p className="text-xs text-gray-500">Schreibweisen</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">
              {searchProgress ? `${searchProgress.termIndex}/${searchProgress.totalTerms}` : registers}
            </p>
            <p className="text-xs text-gray-500">Suchen</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">{matches}</p>
            <p className="text-xs text-gray-500">Treffer</p>
          </div>
        </div>
        
        {progress.step3 === "started" && searchProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Registersuche</span>
              <span>{Math.round((searchProgress.termIndex / searchProgress.totalTerms) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(searchProgress.termIndex / searchProgress.totalTerms) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {phases.map((phase, phaseIdx) => (
            <div 
              key={phaseIdx}
              className={`rounded-lg border transition-all ${
                isPhaseComplete(phaseIdx) 
                  ? "border-primary/30 bg-primary/5" 
                  : isPhaseActive(phaseIdx)
                    ? "border-primary/50 bg-white"
                    : "border-gray-100 bg-gray-50/50 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isPhaseComplete(phaseIdx) 
                    ? "bg-primary text-white" 
                    : isPhaseActive(phaseIdx)
                      ? "bg-primary/20 text-primary"
                      : "bg-gray-200 text-gray-400"
                }`}>
                  {isPhaseComplete(phaseIdx) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    getPhaseIcon(phase.icon)
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isPhaseComplete(phaseIdx) || isPhaseActive(phaseIdx)
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}>{phase.title}</span>
                {isPhaseActive(phaseIdx) && (
                  <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />
                )}
              </div>
              
              {isPhaseActive(phaseIdx) && (
                <div className="px-3 pb-3 pt-0">
                  <div className="pl-8 space-y-1 text-sm font-mono">
                    {phase.steps.map((step, stepIdx) => {
                      const phaseCompleted = completedStepsInPhase[phaseIdx] || [];
                      const isCompleted = phaseCompleted.includes(step);
                      const isTyping = currentTypingStep && 
                        step.startsWith(currentTypingStep.slice(0, 5)) && 
                        !isCompleted;
                      
                      if (!isCompleted && !isTyping) return null;
                      
                      return (
                        <div key={stepIdx} className={`flex items-start gap-2 ${
                          isCompleted ? "text-gray-400" : "text-gray-700"
                        }`}>
                          {isCompleted ? (
                            <Check className="w-3 h-3 mt-1 text-primary flex-shrink-0" />
                          ) : (
                            <Loader2 className="w-3 h-3 mt-1 text-primary animate-spin flex-shrink-0" />
                          )}
                          <span>
                            {isTyping ? currentTypingStep : step}
                            {isTyping && <span className="animate-pulse text-primary">|</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThinkingStepProps {
  step: number;
  text: string;
  status: "pending" | "started" | "completed";
  extraInfo?: string;
}

export function ThinkingStep({ step, text, status, extraInfo }: ThinkingStepProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (status === "pending") {
      setDisplayText("");
      return;
    }
    
    if (status === "started" || status === "completed") {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 15);
      return () => clearInterval(typeInterval);
    }
  }, [status, text]);

  if (status === "pending") return null;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
        status === "completed" ? "bg-green-100" : "bg-primary/10"
      }`}>
        {status === "completed" ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <span className="text-xs font-semibold text-primary">{step}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${status === "completed" ? "text-gray-500" : "text-gray-700"}`}>
          {displayText}
          {status === "started" && displayText.length < text.length && (
            <span className="inline-block w-1 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          )}
        </p>
        {extraInfo && status === "completed" && (
          <p className="text-xs text-green-600 mt-0.5 font-medium">{extraInfo}</p>
        )}
      </div>
      {status === "started" && displayText.length === text.length && (
        <div className="flex-shrink-0">
          <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
        </div>
      )}
    </div>
  );
}
