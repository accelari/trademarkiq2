"use client";

import { useRouter } from "next/navigation";
import { Check, Search, AlertTriangle, FileText, Bell, MessageCircle, SkipForward, HelpCircle, FolderOpen } from "lucide-react";
import { useState } from "react";

type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

interface StepConfig {
  id: number;
  key: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  helpTopic: string;
  helpPrompt: string;
}

interface WorkflowProgressProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  searchName?: string;
  stepStatuses?: Record<string, StepStatus>;
  onHelpClick?: () => void;
  onOpenConsultations?: () => void;
}

const steps: StepConfig[] = [
  { 
    id: 1, 
    key: "beratung",
    name: "Beratung", 
    icon: MessageCircle,
    helpTopic: "beratung",
    helpPrompt: "Erkläre mir, wie die Markenberatung funktioniert und was ich beachten sollte."
  },
  { 
    id: 2, 
    key: "recherche",
    name: "Recherche", 
    icon: Search,
    helpTopic: "recherche",
    helpPrompt: "Hilf mir bei der Markenrecherche. Welche Suchstrategie empfiehlst du?"
  },
  { 
    id: 3, 
    key: "risikoanalyse",
    name: "Risikoanalyse", 
    icon: AlertTriangle,
    helpTopic: "risikoanalyse",
    helpPrompt: "Erkläre mir die Risikoanalyse. Worauf muss ich achten?"
  },
  { 
    id: 4, 
    key: "anmeldung",
    name: "Anmeldung", 
    icon: FileText,
    helpTopic: "anmeldung",
    helpPrompt: "Hilf mir bei der Markenanmeldung. Welche Schritte sind nötig?"
  },
  { 
    id: 5, 
    key: "watchlist",
    name: "Watchlist", 
    icon: Bell,
    helpTopic: "watchlist",
    helpPrompt: "Erkläre mir, wie die Watchlist funktioniert und wann ich Benachrichtigungen bekomme."
  },
];

const statusIdMap: Record<number, string> = {
  1: "beratung",
  2: "recherche", 
  3: "risikoanalyse",
  4: "anmeldung",
  5: "watchlist"
};

export default function WorkflowProgress({ currentStep, searchName, stepStatuses = {}, onHelpClick, onOpenConsultations }: WorkflowProgressProps) {
  const router = useRouter();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const getStepStatus = (stepId: number): StepStatus => {
    const key = statusIdMap[stepId];
    if (stepStatuses[key]) return stepStatuses[key];
    if (stepId === currentStep) return "in_progress";
    return "pending";
  };

  const getStatusStyles = (status: StepStatus, isCurrent: boolean) => {
    switch (status) {
      case "completed":
        return "bg-primary text-white border-2 border-primary";
      case "skipped":
        return "bg-amber-100 text-amber-600 border-2 border-dashed border-amber-400";
      case "in_progress":
        return `bg-primary text-white border-2 border-primary ${isCurrent ? "ring-4 ring-primary/20 animate-pulse" : ""}`;
      default:
        return "bg-gray-50 text-gray-400 border-2 border-gray-200";
    }
  };

  const getTextStyles = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return "text-primary font-medium";
      case "skipped":
        return "text-amber-600 font-medium";
      case "in_progress":
        return "text-primary font-medium";
      default:
        return "text-gray-400";
    }
  };

  const getLineColor = (stepStatus: StepStatus) => {
    if (stepStatus === "completed") return "bg-primary";
    if (stepStatus === "skipped") return "bg-amber-300";
    return "bg-gray-200";
  };

  const handleHelpClick = (step: StepConfig) => {
    if (step.id === currentStep && onHelpClick) {
      onHelpClick();
    } else {
      const encodedPrompt = encodeURIComponent(step.helpPrompt);
      router.push(`/dashboard/copilot?topic=${step.helpTopic}&prompt=${encodedPrompt}`);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      {searchName && (
        <p className="text-sm text-gray-600 mb-2 text-center">
          Marke: <span className="font-medium text-gray-900">{searchName}</span>
        </p>
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-between flex-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const status = getStepStatus(step.id);
          const isCurrent = currentStep === step.id;
          const showHelp = isCurrent || status === "skipped";
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className="flex flex-col items-center flex-1 relative"
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${getStatusStyles(status, isCurrent)}`}
                  >
                    {status === "completed" ? (
                      <Check className="w-5 h-5" />
                    ) : status === "skipped" ? (
                      <SkipForward className="w-4 h-4" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  
                  {showHelp && (
                    <button
                      onClick={() => handleHelpClick(step)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors shadow-sm"
                      title={`Hilfe zu ${step.name}`}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className={`mt-2 text-xs ${getTextStyles(status)}`}>
                  {step.name}
                </span>

                {status === "skipped" && hoveredStep === step.id && (
                  <div className="absolute top-full mt-1 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    Übersprungen – kann später nachgeholt werden
                  </div>
                )}

                {isCurrent && status === "in_progress" && hoveredStep === step.id && (
                  <div className="absolute top-full mt-1 bg-primary text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    Aktueller Schritt
                  </div>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 transition-colors ${getLineColor(status)}`} />
              )}
            </div>
          );
        })}
        </div>
        
        {onOpenConsultations && (
          <button
            onClick={onOpenConsultations}
            data-tour="my-consultations"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
          >
            <FolderOpen className="w-4 h-4 text-primary" />
            <span className="font-medium text-gray-700 text-sm">Meine Markenfälle</span>
          </button>
        )}
      </div>
    </div>
  );
}
