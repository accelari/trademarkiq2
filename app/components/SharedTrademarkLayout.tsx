"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { MessageCircle, Search, ChevronDown } from "lucide-react";
import WorkflowProgress from "./WorkflowProgress";

interface SharedTrademarkLayoutProps {
  activeSection: "copilot" | "recherche";
  children: React.ReactNode;
  onOpenConsultations: () => void;
  onHelpClick?: () => void;
  onNavigateToRecherche?: () => void;
  copilotSubtitle?: string;
  rechercheSubtitle?: string;
  stepStatuses?: Record<string, "pending" | "in_progress" | "completed" | "skipped">;
}

export default function SharedTrademarkLayout({
  activeSection,
  children,
  onOpenConsultations,
  onHelpClick,
  onNavigateToRecherche,
  copilotSubtitle,
  rechercheSubtitle,
  stepStatuses = {},
}: SharedTrademarkLayoutProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const isCopilot = activeSection === "copilot";
  const isRecherche = activeSection === "recherche";

  useEffect(() => {
    if (isRecherche && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isRecherche]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-gray-50 -mx-6 px-6 pb-4 -mt-4 pt-4">
        <WorkflowProgress 
          currentStep={isCopilot ? 1 : 2} 
          stepStatuses={stepStatuses}
          onHelpClick={onHelpClick}
          onOpenConsultations={onOpenConsultations}
        />
      </div>

      {isCopilot ? (
        <>
          {children}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={() => onNavigateToRecherche ? onNavigateToRecherche() : router.push('/dashboard/recherche')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Recherche</h3>
                  <p className="text-sm text-gray-500">
                    {rechercheSubtitle || "Markenrecherche starten"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">Aufklappen</span>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={() => router.push('/dashboard/copilot')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">KI-Markenberater</h3>
                  <p className="text-sm text-gray-500">
                    {copilotSubtitle || "Sprachgesteuerte Beratung"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">Aufklappen</span>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </button>
          </div>

          <div ref={contentRef}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
