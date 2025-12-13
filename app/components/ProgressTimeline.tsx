"use client";

import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export interface ProgressStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "error";
  startedAt?: number;
  endedAt?: number;
  details?: string;
}

interface ProgressTimelineProps {
  steps: ProgressStep[];
  isDeepSearch?: boolean;
  onCancel?: () => void;
  elapsedTime?: number;
}

const ESTIMATED_TIMES: Record<string, number> = {
  step1: 40000,
  step2: 1000,
  step3: 70000,
  step4: 45000,
};

export default function ProgressTimeline({ 
  steps, 
  isDeepSearch = false, 
  onCancel,
  elapsedTime 
}: ProgressTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const hasRunning = steps.some(s => s.status === "running");

  useEffect(() => {
    if (!hasRunning) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);
    
    return () => clearInterval(interval);
  }, [hasRunning]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const renderStepIcon = (status: ProgressStep["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const formatDuration = (step: ProgressStep) => {
    if (step.startedAt && step.endedAt) {
      const ms = step.endedAt - step.startedAt;
      return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
    }
    if (step.status === "running" && step.startedAt) {
      const ms = Date.now() - step.startedAt;
      return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
    }
    return null;
  };

  const getProgressPercent = (step: ProgressStep): number => {
    if (step.status === "completed") return 100;
    if (step.status === "error") return 100;
    if (step.status === "pending") return 0;
    if (step.status === "running" && step.startedAt) {
      const elapsed = Date.now() - step.startedAt;
      const estimated = ESTIMATED_TIMES[step.id] || 10000;
      const progress = Math.min((elapsed / estimated) * 100, 95);
      return progress;
    }
    return 0;
  };

  const currentStepMessage = steps.find(s => s.status === "running")?.title || "Warte...";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {isDeepSearch ? "Tiefenanalyse" : "Markenrecherche"}
              </p>
              <p className="text-sm text-primary">{currentStepMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {elapsedTime !== undefined && (
              <span className="text-sm text-gray-500">{elapsedTime}s</span>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {steps.map((step, index) => {
          const duration = formatDuration(step);
          const hasDetails = !!step.details;
          const isExpanded = expandedSteps.has(step.id);
          const progressPercent = getProgressPercent(step);

          return (
            <div key={step.id} className="transition-colors">
              <button
                onClick={() => hasDetails && toggleStep(step.id)}
                disabled={!hasDetails}
                className={`w-full px-4 py-2 flex flex-col gap-1 transition-colors ${
                  hasDetails ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                } ${step.status === "running" ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-3 w-full">
                  {renderStepIcon(step.status)}
                  <span className={`font-medium text-sm flex-1 text-left ${
                    step.status === "pending" ? "text-gray-400" :
                    step.status === "error" ? "text-red-600" :
                    "text-gray-900"
                  }`}>
                    {index + 1}. {step.title}
                  </span>
                  {duration && (
                    <span className="text-xs text-gray-500 font-mono">{duration}</span>
                  )}
                  {hasDetails && (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )
                  )}
                </div>
                
                <div className="ml-8 w-full pr-4">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-150 ${
                        step.status === "completed" ? "bg-primary" :
                        step.status === "error" ? "bg-red-400" :
                        step.status === "running" ? "bg-primary/70" :
                        "bg-gray-200"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </button>

              {hasDetails && isExpanded && (
                <div className="px-4 pb-3 pl-12">
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {step.details}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getInitialProgressSteps(isDeepSearch: boolean = false): ProgressStep[] {
  return [
    {
      id: "step1",
      title: isDeepSearch ? "Erweiterte Suchstrategie" : "Suchvarianten generieren",
      status: "pending",
    },
    {
      id: "step2",
      title: "Markenämter festlegen",
      status: "pending",
    },
    {
      id: "step3",
      title: "Markenregister durchsuchen",
      status: "pending",
    },
    {
      id: "step4",
      title: "Konflikte analysieren",
      status: "pending",
    },
  ];
}
