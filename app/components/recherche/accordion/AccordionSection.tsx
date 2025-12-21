"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: "red" | "yellow" | "green" | "blue" | "gray";
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  scrollOnOpen?: boolean;
}

export function AccordionSection({
  title,
  icon: Icon,
  badge,
  badgeColor = "gray",
  defaultOpen = false,
  children,
  className,
  scrollOnOpen = false,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(defaultOpen);

  useEffect(() => {
    if (scrollOnOpen && isOpen && !wasOpenRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, scrollOnOpen]);

  const badgeColors = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div ref={sectionRef} className={`border border-gray-200 rounded-xl overflow-hidden ${className || ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-600" />}
          <span className="font-medium text-gray-800">{title}</span>
          {badge !== undefined && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease-out",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="p-5 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccordionSection;
