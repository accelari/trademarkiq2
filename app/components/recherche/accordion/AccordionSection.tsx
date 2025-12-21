"use client";

import { useState, useRef, useEffect, ReactNode, useId, createContext, useContext, KeyboardEvent } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

interface AccordionGroupContextType {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  registerAccordion: (id: string, hasDefaultOpen?: boolean) => void;
  unregisterAccordion: (id: string) => void;
  accordionIds: string[];
  focusNext: (currentId: string) => void;
  focusPrev: (currentId: string) => void;
}

const AccordionGroupContext = createContext<AccordionGroupContextType | null>(null);

interface AccordionGroupProps {
  children: ReactNode;
  singleOpen?: boolean;
}

export function AccordionGroup({ children, singleOpen = false }: AccordionGroupProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [accordionIds, setAccordionIds] = useState<string[]>([]);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const defaultOpenSeeded = useRef(false);

  const registerAccordion = (id: string, hasDefaultOpen?: boolean) => {
    setAccordionIds(prev => prev.includes(id) ? prev : [...prev, id]);
    if (hasDefaultOpen && !defaultOpenSeeded.current && openId === null) {
      setOpenId(id);
      defaultOpenSeeded.current = true;
    }
  };

  const unregisterAccordion = (id: string) => {
    setAccordionIds(prev => prev.filter(i => i !== id));
    buttonRefs.current.delete(id);
  };

  const focusNext = (currentId: string) => {
    const currentIndex = accordionIds.indexOf(currentId);
    const nextIndex = (currentIndex + 1) % accordionIds.length;
    const nextId = accordionIds[nextIndex];
    const nextButton = document.querySelector(`[data-accordion-id="${nextId}"]`) as HTMLButtonElement;
    nextButton?.focus();
  };

  const focusPrev = (currentId: string) => {
    const currentIndex = accordionIds.indexOf(currentId);
    const prevIndex = (currentIndex - 1 + accordionIds.length) % accordionIds.length;
    const prevId = accordionIds[prevIndex];
    const prevButton = document.querySelector(`[data-accordion-id="${prevId}"]`) as HTMLButtonElement;
    prevButton?.focus();
  };

  if (!singleOpen) {
    return <>{children}</>;
  }

  return (
    <AccordionGroupContext.Provider value={{ 
      openId, 
      setOpenId, 
      registerAccordion, 
      unregisterAccordion, 
      accordionIds,
      focusNext,
      focusPrev
    }}>
      {children}
    </AccordionGroupContext.Provider>
  );
}

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
  const uniqueId = useId();
  const panelId = `accordion-panel-${uniqueId}`;
  const buttonId = `accordion-button-${uniqueId}`;
  
  const groupContext = useContext(AccordionGroupContext);
  const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);
  
  const isOpen = groupContext ? groupContext.openId === uniqueId : localIsOpen;
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(defaultOpen);

  useEffect(() => {
    if (groupContext) {
      groupContext.registerAccordion(uniqueId, defaultOpen);
      return () => groupContext.unregisterAccordion(uniqueId);
    }
  }, [groupContext, uniqueId, defaultOpen]);

  useEffect(() => {
    if (scrollOnOpen && isOpen && !wasOpenRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, scrollOnOpen]);

  const handleToggle = () => {
    if (groupContext) {
      groupContext.setOpenId(isOpen ? null : uniqueId);
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (groupContext) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        groupContext.focusNext(uniqueId);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        groupContext.focusPrev(uniqueId);
      }
    }
    if (e.key === "Home") {
      e.preventDefault();
      const firstButton = document.querySelector('[data-accordion-id]') as HTMLButtonElement;
      firstButton?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const allButtons = document.querySelectorAll('[data-accordion-id]');
      const lastButton = allButtons[allButtons.length - 1] as HTMLButtonElement;
      lastButton?.focus();
    }
  };

  const badgeColors = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div 
      ref={sectionRef} 
      className={`border rounded-xl overflow-hidden transition-all duration-300 ${
        isOpen 
          ? "border-primary/30 shadow-lg shadow-primary/5" 
          : "border-gray-200"
      } ${className || ""}`}
    >
      <button
        id={buttonId}
        data-accordion-id={uniqueId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset"
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
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: isOpen 
            ? "grid-template-rows 300ms cubic-bezier(0.0, 0.0, 0.2, 1)" 
            : "grid-template-rows 250ms cubic-bezier(0.4, 0.0, 1, 1)",
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
