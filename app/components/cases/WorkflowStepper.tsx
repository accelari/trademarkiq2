"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import { ACTIVE_STEPS, WorkflowStepId, StepState } from "@/lib/workflow-steps";

interface WorkflowStepperProps {
  steps: Record<WorkflowStepId, StepState>;
  currentStep?: WorkflowStepId;
  onStepClick?: (stepId: WorkflowStepId) => void;
}

export function WorkflowStepper({ steps, currentStep, onStepClick }: WorkflowStepperProps) {
  const getStepStatus = (stepId: WorkflowStepId): "completed" | "current" | "pending" => {
    const stepState = steps[stepId];
    if (!stepState) return "pending";
    
    if (stepState.status === "completed" || stepState.status === "skipped") {
      return "completed";
    }
    if (stepState.status === "in_progress" || stepId === currentStep) {
      return "current";
    }
    return "pending";
  };

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        {ACTIVE_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const isLast = index === ACTIVE_STEPS.length - 1;
          const isClickable = status === "completed" || status === "current";

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`flex flex-col items-center group ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    status === "completed"
                      ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30"
                      : status === "current"
                      ? "bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-xl shadow-teal-500/40 ring-4 ring-teal-100 scale-110"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  } ${isClickable ? "group-hover:scale-110 group-hover:shadow-xl" : ""}`}
                >
                  {status === "completed" ? (
                    <Check className="w-6 h-6" />
                  ) : status === "current" ? (
                    <Icon className="w-6 h-6" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`mt-3 text-sm font-semibold transition-colors ${
                    status === "completed"
                      ? "text-teal-600"
                      : status === "current"
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {step.name}
                </span>
                <span
                  className={`text-xs mt-0.5 ${
                    status === "current" ? "text-teal-600" : "text-gray-400"
                  }`}
                >
                  {status === "completed" ? "Erledigt" : status === "current" ? "Aktiv" : "Offen"}
                </span>
              </button>

              {!isLast && (
                <div className="flex-1 mx-6 relative">
                  <div className="h-1 rounded-full bg-gray-200" />
                  <div
                    className={`absolute top-0 left-0 h-1 rounded-full transition-all duration-500 ${
                      status === "completed" 
                        ? "w-full bg-gradient-to-r from-teal-500 to-teal-600" 
                        : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
