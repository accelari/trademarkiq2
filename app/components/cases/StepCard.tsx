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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm">
          <Check className="w-3.5 h-3.5" />
          Abgeschlossen
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-400 to-teal-500 text-white shadow-sm animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          In Bearbeitung
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <Circle className="w-3 h-3" />
        Ausstehend
      </span>
    );
  };

  return (
    <div
      className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-300 ${
        isInProgress
          ? "shadow-xl shadow-teal-500/10 border-2 border-teal-400 transform hover:scale-[1.02]"
          : isCompleted
          ? "shadow-lg shadow-gray-200/50 border border-gray-200 hover:shadow-xl"
          : "shadow-md border border-gray-100 opacity-60 hover:opacity-80"
      }`}
    >
      {isInProgress && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600" />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600" />
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                isCompleted
                  ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
                  : isInProgress
                  ? "bg-gradient-to-br from-teal-400 to-teal-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {children && <div className="mt-4 text-gray-600">{children}</div>}

        {ctaLabel && onCtaClick && (
          <div className="mt-5">
            <button
              onClick={onCtaClick}
              disabled={isLoading}
              className={`w-full py-3.5 px-5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isCompleted
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  : "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transform hover:-translate-y-0.5"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {ctaLabel}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
