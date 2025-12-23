"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, MessageCircle, Search, BarChart3, Clock, LucideIcon } from "lucide-react";
import { ACTIVE_STEPS, WorkflowStepId, StepState } from "@/lib/workflow-steps";

interface WorkflowAccordionProps {
  steps: Record<WorkflowStepId, StepState>;
  currentStep?: WorkflowStepId;
  onStepAction?: (stepId: WorkflowStepId) => void;
  stepContent?: Record<WorkflowStepId, React.ReactNode>;
  stepCta?: Record<WorkflowStepId, { label: string; onClick: () => void; loading?: boolean }>;
}

export function WorkflowAccordion({ 
  steps, 
  currentStep, 
  onStepAction,
  stepContent,
  stepCta 
}: WorkflowAccordionProps) {
  const [expandedStep, setExpandedStep] = useState<WorkflowStepId | null>(currentStep || null);

  const getStatusBadge = (stepId: WorkflowStepId) => {
    const stepState = steps[stepId];
    if (!stepState) {
      return (
        <span className="text-sm text-gray-400">Ausstehend</span>
      );
    }

    if (stepState.status === "completed" || stepState.status === "skipped") {
      return (
        <span className="text-sm font-medium text-teal-600">Abgeschlossen</span>
      );
    }
    if (stepState.status === "in_progress") {
      return (
        <span className="text-sm font-medium text-teal-600">In Bearbeitung</span>
      );
    }
    return (
      <span className="text-sm text-gray-400">Ausstehend</span>
    );
  };

  const getStepIcon = (stepId: WorkflowStepId): LucideIcon => {
    switch (stepId) {
      case "beratung":
        return MessageCircle;
      case "recherche":
        return Search;
      case "analyse":
        return BarChart3;
      default:
        return MessageCircle;
    }
  };

  const isStepCompleted = (stepId: WorkflowStepId) => {
    const stepState = steps[stepId];
    return stepState?.status === "completed" || stepState?.status === "skipped";
  };

  const isStepInProgress = (stepId: WorkflowStepId) => {
    const stepState = steps[stepId];
    return stepState?.status === "in_progress";
  };

  return (
    <div className="space-y-3">
      {ACTIVE_STEPS.map((step) => {
        const Icon = getStepIcon(step.id);
        const isExpanded = expandedStep === step.id;
        const isCompleted = isStepCompleted(step.id);
        const isInProgress = isStepInProgress(step.id);
        const cta = stepCta?.[step.id];
        const content = stepContent?.[step.id];

        return (
          <div
            key={step.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-teal-100 text-teal-600"
                      : isInProgress
                      ? "bg-teal-50 text-teal-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="font-medium text-gray-900">{step.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(step.id)}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="pt-4">
                  {content ? (
                    <div className="mb-4">{content}</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">
                        {step.id === "beratung" && "Noch keine Beratung durchgeführt"}
                        {step.id === "recherche" && "Noch keine Recherche durchgeführt"}
                        {step.id === "analyse" && "Wird nach der Recherche erstellt"}
                      </p>
                    </div>
                  )}

                  {cta && (
                    <button
                      onClick={cta.onClick}
                      disabled={cta.loading}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {cta.loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        cta.label
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
