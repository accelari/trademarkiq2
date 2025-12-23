"use client";

import { Check, Circle, Loader2, ArrowRight, LucideIcon } from "lucide-react";
import { StepState } from "@/lib/workflow-steps";

interface StepCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: StepState;
  ctaLabel?: string;
  onCtaClick?: () => void;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function StepCard({
  title,
  description,
  icon: Icon,
  status,
  ctaLabel,
  onCtaClick,
  children,
  isLoading,
}: StepCardProps) {
  const isCompleted = status.status === "completed" || status.status === "skipped";
  const isInProgress = status.status === "in_progress";
  const isPending = status.status === "pending";

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
          <Check className="w-3 h-3" />
          Abgeschlossen
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 className="w-3 h-3 animate-spin" />
          In Bearbeitung
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <Circle className="w-3 h-3" />
        Ausstehend
      </span>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        isInProgress
          ? "border-teal-200 ring-1 ring-teal-100"
          : isCompleted
          ? "border-gray-200"
          : "border-gray-200 opacity-75"
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isCompleted
                  ? "bg-teal-100 text-teal-600"
                  : isInProgress
                  ? "bg-teal-50 text-teal-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {children && <div className="mt-4">{children}</div>}

        {ctaLabel && onCtaClick && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={onCtaClick}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isCompleted
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
