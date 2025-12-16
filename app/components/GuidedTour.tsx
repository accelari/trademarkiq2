"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Mic, MessageSquare, FileText, Zap, FolderOpen, ArrowRight } from "lucide-react";

interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: "input-mode",
    target: "[data-tour='input-mode']",
    title: "Eingabemethode",
    content: "Wählen Sie hier, ob Sie per Sprache oder Text mit dem KI-Berater kommunizieren möchten.",
    icon: <Mic className="w-5 h-5" />,
    position: "bottom",
  },
  {
    id: "start-button",
    target: "[data-tour='start-button']",
    title: "Beratung starten",
    content: "Klicken Sie auf den Start-Button, um die Beratung zu beginnen.",
    icon: <MessageSquare className="w-5 h-5" />,
    position: "right",
  },
  {
    id: "quick-questions",
    target: "[data-tour='quick-questions']",
    title: "Schnellfragen",
    content: "Klicken Sie auf eine Frage, um sie automatisch zu stellen.",
    icon: <Zap className="w-5 h-5" />,
    position: "left",
  },
  {
    id: "create-report",
    target: "[data-tour='create-report']",
    title: "Bericht erstellen",
    content: "Am Ende Ihrer Beratung können Sie hier einen strukturierten Bericht erstellen lassen.",
    icon: <FileText className="w-5 h-5" />,
    position: "left",
  },
  {
    id: "go-to-recherche",
    target: "[data-tour='go-to-recherche']",
    title: "Weiter zur Recherche",
    content: "Wenn Sie alle Informationen besprochen haben, klicken Sie hier um zur Markenrecherche zu gelangen. Die KI analysiert das Gespräch und füllt das Formular automatisch aus.",
    icon: <ArrowRight className="w-5 h-5" />,
    position: "left",
  },
  {
    id: "my-consultations",
    target: "[data-tour='my-consultations']",
    title: "Meine Markenfälle",
    content: "Alle Ihre gespeicherten Markenfälle finden Sie hier.",
    icon: <FolderOpen className="w-5 h-5" />,
    position: "left",
  },
];

export default function GuidedTour({ isOpen, onClose, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;
    
    const step = tourSteps[currentStep];
    const target = document.querySelector(step.target);
    
    if (target) {
      const rect = target.getBoundingClientRect();
      
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      
      if (!isInViewport) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          const newRect = target.getBoundingClientRect();
          setTargetRect(newRect);
        }, 350);
      } else {
        setTargetRect(rect);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTargetPosition);
    };

    const timer = setTimeout(handleUpdate, 100);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isOpen, updateTargetPosition]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(updateTargetPosition, 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveTourStatus = async () => {
    try {
      await fetch("/api/user/tour-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourCompleted: true }),
      });
    } catch (error) {
      console.error("Failed to save tour status:", error);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      saveTourStatus();
    }
    onComplete();
    setCurrentStep(0);
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      saveTourStatus();
    }
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen || !mounted) return null;

  const step = tourSteps[currentStep];
  const padding = 8;
  const isRoundButton = step.id === "start-button";
  const borderRadius = isRoundButton ? 9999 : 12;
  
  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const tooltipWidth = 300;
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let style: React.CSSProperties = {};

    switch (step.position) {
      case "top":
        style = {
          bottom: `${viewportHeight - targetRect.top + margin}px`,
          left: `${Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - margin))}px`,
        };
        break;
      case "bottom":
        style = {
          top: `${targetRect.bottom + margin}px`,
          left: `${Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - margin))}px`,
        };
        break;
      case "left":
        style = {
          top: `${Math.max(margin, targetRect.top)}px`,
          right: `${viewportWidth - targetRect.left + margin}px`,
        };
        break;
      case "right":
        style = {
          top: `${Math.max(margin, targetRect.top)}px`,
          left: `${targetRect.right + margin}px`,
        };
        break;
    }

    return style;
  };

  const spotlightStyle: React.CSSProperties = targetRect ? {
    position: "fixed",
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: borderRadius,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 0 3px #0D9488, 0 0 15px rgba(13, 148, 136, 0.5)",
    zIndex: 10000,
    pointerEvents: "none" as const,
  } : {};

  const content = (
    <>
      {targetRect && <div style={spotlightStyle} />}

      <div
        className="fixed bg-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ 
          ...getTooltipPosition(), 
          width: "300px",
          maxHeight: "calc(100vh - 40px)",
          zIndex: 10001,
        }}
      >
        <div className="p-3 bg-gradient-to-r from-primary to-teal-600 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white">
                {step.icon}
              </div>
              <span className="font-semibold text-white text-sm">{step.title}</span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Schließen"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-500">Nicht mehr anzeigen</span>
            </label>
            <span className="text-xs text-gray-400 font-medium">
              {currentStep + 1} / {tourSteps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Zurück
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors ml-auto"
            >
              Überspringen
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? "Fertig" : "Weiter"}
              {currentStep < tourSteps.length - 1 && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-1 py-2 bg-gray-50 rounded-b-xl">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
