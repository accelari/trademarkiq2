"use client";

import { useRef } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface AccordionSectionProps {
  stepId: string;
  title: string;
  icon: React.ElementType;
  isCompleted: boolean;
  isSkipped: boolean;
  status: string;
  isOpen: boolean;
  onToggle: () => void;
  headerMeta?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wiederverwendbare Akkordeon-Komponente für den Case-Workflow
 * Zeigt einen zusammenklappbaren Abschnitt mit Status-Indikatoren
 */
export function AccordionSection({
  stepId,
  title,
  icon: Icon,
  isCompleted,
  isSkipped,
  status,
  isOpen,
  onToggle,
  headerMeta,
  children,
}: AccordionSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div
      id={`accordion-${stepId}`}
      ref={sectionRef}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden scroll-mt-28 lg:scroll-mt-32"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isCompleted ? (
            <Check className="w-4 h-4 text-teal-600" />
          ) : (
            <span className="w-4 h-4" />
          )}
          <Icon
            className={`w-5 h-5 ${
              isCompleted ? "text-teal-600" : isSkipped ? "text-yellow-600" : "text-gray-400"
            }`}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-gray-900 truncate">{title}</span>
            {headerMeta && (
              <div className="ml-auto mr-4 min-w-0 max-w-[720px]">
                {headerMeta}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSkipped && (
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 shadow-sm cursor-help"
              title="Übersprungen - du kannst diesen Schritt jederzeit nachholen"
            >
              <span className="text-white text-[10px] font-bold leading-none">!</span>
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

export default AccordionSection;
