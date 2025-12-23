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
    <div className="w-full">
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
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    status === "completed"
                      ? "bg-teal-600 text-white"
                      : status === "current"
                      ? "bg-teal-100 text-teal-600 ring-2 ring-teal-600 ring-offset-2"
                      : "bg-gray-100 text-gray-400"
                  } ${isClickable ? "group-hover:scale-105" : ""}`}
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : status === "current" ? (
                    <Icon className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    status === "completed"
                      ? "text-teal-600"
                      : status === "current"
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {step.name}
                </span>
              </button>

              {!isLast && (
                <div
                  className={`flex-1 h-1 mx-4 rounded ${
                    status === "completed" ? "bg-teal-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
