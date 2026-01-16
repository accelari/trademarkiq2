"use client";

import { Check, Clock, AlertCircle } from "lucide-react";

interface ProgressBarProps {
  completed: number;
  total: number;
  nextStep?: string;
  className?: string;
}

export default function ProgressBar({ completed, total, nextStep, className = "" }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const getStatusColor = () => {
    if (percentage === 100) return "bg-teal-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-orange-500";
    if (percentage >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (percentage === 100) return "Abgeschlossen";
    if (percentage >= 75) return "Fast fertig";
    if (percentage >= 50) return "Halb fertig";
    if (percentage >= 25) return "In Arbeit";
    return "Gerade gestartet";
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {percentage === 100 ? (
            <Check className="w-5 h-5 text-teal-600" />
          ) : (
            <Clock className="w-5 h-5 text-blue-600" />
          )}
          <span className="font-semibold text-gray-900">
            Fortschritt: {completed}/{total} Schritte
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium px-2 py-1 rounded ${
            percentage === 100 
              ? "bg-teal-100 text-teal-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {percentage}%
          </span>
          <span className="text-sm text-gray-500">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Next Step */}
      {nextStep && percentage < 100 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-800">
            <strong>Nächster Schritt:</strong> {nextStep}
          </span>
        </div>
      )}

      {/* Success Message */}
      {percentage === 100 && (
        <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
          <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="text-sm text-teal-800">
            <strong>🎉 Alle Schritte abgeschlossen!</strong> Case kann finalisiert werden.
          </span>
        </div>
      )}
    </div>
  );
}
