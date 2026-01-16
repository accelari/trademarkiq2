"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Undo2, X } from "lucide-react";
import { TRIGGER_FEEDBACK } from "@/lib/config";

/**
 * TriggerFeedback - Zeigt visuelles Feedback wenn KI-Trigger Felder ändern
 * 
 * Features:
 * - Animierte Einblendung bei Trigger-Verarbeitung
 * - Zeigt welches Feld geändert wurde und den neuen Wert
 * - Undo-Button zum Rückgängigmachen der Änderung
 * - Auto-Hide nach konfigurierbarer Zeit (default: 5 Sekunden)
 */

export interface TriggerChange {
  id: string;
  field: string;
  label: string;
  oldValue: string | string[] | number[];
  newValue: string | string[] | number[];
  timestamp: number;
}

interface TriggerFeedbackProps {
  changes: TriggerChange[];
  onUndo: (change: TriggerChange) => void;
  onDismiss: (id: string) => void;
}

export function TriggerFeedback({ changes, onUndo, onDismiss }: TriggerFeedbackProps) {
  if (changes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {changes.map((change) => (
        <TriggerFeedbackItem
          key={change.id}
          change={change}
          onUndo={onUndo}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface TriggerFeedbackItemProps {
  change: TriggerChange;
  onUndo: (change: TriggerChange) => void;
  onDismiss: (id: string) => void;
}

function TriggerFeedbackItem({ change, onUndo, onDismiss }: TriggerFeedbackItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Einblenden
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-Hide nach konfigurierbarer Zeit
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(change.id), TRIGGER_FEEDBACK.ANIMATION_DURATION);
    }, TRIGGER_FEEDBACK.AUTO_DISMISS_DELAY);

    return () => clearTimeout(timer);
  }, [change.id, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(change.id), TRIGGER_FEEDBACK.ANIMATION_DURATION);
  }, [change.id, onDismiss]);

  const handleUndo = useCallback(() => {
    onUndo(change);
    handleDismiss();
  }, [change, onUndo, handleDismiss]);

  const formatValue = (value: string | string[] | number[]): string => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "(leer)";
    }
    return value || "(leer)";
  };

  return (
    <div
      className={`
        bg-white border border-teal-200 rounded-lg shadow-lg p-3
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {change.label} aktualisiert
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {formatValue(change.newValue)}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            onClick={handleUndo}
            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
            title="Rückgängig"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook für Trigger-Feedback-Management
 * Verwaltet die Liste der Änderungen und bietet Undo-Funktionalität
 */
export function useTriggerFeedback() {
  const [changes, setChanges] = useState<TriggerChange[]>([]);

  const addChange = useCallback((
    field: string,
    label: string,
    oldValue: string | string[] | number[],
    newValue: string | string[] | number[]
  ) => {
    const change: TriggerChange = {
      id: `${field}-${Date.now()}`,
      field,
      label,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };
    setChanges((prev) => [...prev, change]);
    return change;
  }, []);

  const dismissChange = useCallback((id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setChanges([]);
  }, []);

  return {
    changes,
    addChange,
    dismissChange,
    clearAll,
  };
}

export default TriggerFeedback;
