"use client";

import { Check, MessageCircle, Search, AlertTriangle, FilePlus, Eye, SkipForward } from "lucide-react";

interface CaseTimelineProps {
  caseNumber: string;
  steps: {
    step: string;
    status: "pending" | "in_progress" | "completed" | "skipped";
  }[];
  currentStep?: string;
}

const stepConfig: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  beratung: { name: "Beratung", icon: MessageCircle },
  recherche: { name: "Recherche", icon: Search },
  risikoanalyse: { name: "Risikoanalyse", icon: AlertTriangle },
  anmeldung: { name: "Anmeldung", icon: FilePlus },
  watchlist: { name: "Watchlist", icon: Eye },
};

const stepOrder = ["beratung", "recherche", "risikoanalyse", "anmeldung", "watchlist"];

export default function CaseTimeline({ caseNumber, steps, currentStep }: CaseTimelineProps) {
  const getStepStatus = (stepKey: string) => {
    const stepData = steps.find((s) => s.step.toLowerCase() === stepKey);
    return stepData?.status || "pending";
  };

  const getStatusStyles = (status: string, isCurrentStep: boolean) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white border-green-500";
      case "skipped":
        return "bg-gray-200 text-gray-500 border-gray-400 border-dashed";
      case "in_progress":
        return `bg-primary text-white border-primary ${isCurrentStep ? "animate-subtle-pulse" : ""}`;
      default:
        return "bg-gray-100 text-gray-400 border-gray-200";
    }
  };

  const getLineColor = (index: number) => {
    const currentStepKey = stepOrder[index];
    const nextStepKey = stepOrder[index + 1];
    const currentStatus = getStepStatus(currentStepKey);
    const nextStatus = getStepStatus(nextStepKey);

    if (currentStatus === "completed" || currentStatus === "skipped") {
      if (nextStatus === "completed" || nextStatus === "in_progress" || nextStatus === "skipped") {
        return "bg-primary";
      }
    }
    return "bg-gray-200";
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-gray-500">Fall-Nr:</span>
        <span className="ml-2 text-sm font-semibold text-gray-900">{caseNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        {stepOrder.map((stepKey, index) => {
          const config = stepConfig[stepKey];
          const status = getStepStatus(stepKey);
          const isCurrentStep = currentStep?.toLowerCase() === stepKey;
          const Icon = config.icon;

          return (
            <div key={stepKey} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="relative group">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${getStatusStyles(
                      status,
                      isCurrentStep
                    )}`}
                  >
                    {status === "completed" ? (
                      <Check className="w-5 h-5" />
                    ) : status === "skipped" ? (
                      <SkipForward className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {status === "skipped" && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Übersprungen
                    </div>
                  )}
                </div>
                <span
                  className={`mt-3 text-xs font-medium text-center ${
                    status === "completed"
                      ? "text-green-600"
                      : status === "in_progress"
                      ? "text-primary"
                      : status === "skipped"
                      ? "text-gray-400"
                      : "text-gray-400"
                  }`}
                >
                  {config.name}
                </span>
              </div>
              {index < stepOrder.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mt-[-1.25rem] ${getLineColor(index)}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
