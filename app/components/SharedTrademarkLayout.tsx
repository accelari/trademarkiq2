"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Search, ChevronDown, HelpCircle, FolderOpen } from "lucide-react";
import WorkflowProgress from "./WorkflowProgress";

interface SharedTrademarkLayoutProps {
  activeSection: "copilot" | "recherche";
  children: React.ReactNode;
  onOpenConsultations: () => void;
  onHelpClick?: () => void;
  onStartTour?: () => void;
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
  onStartTour,
  onNavigateToRecherche,
  copilotSubtitle,
  rechercheSubtitle,
  stepStatuses = {},
}: SharedTrademarkLayoutProps) {
  const router = useRouter();
  const isCopilot = activeSection === "copilot";
  const isRecherche = activeSection === "recherche";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-40 bg-gray-50 -mx-6 px-6 py-3 -mt-3 space-y-4 pb-4 border-b border-gray-200">
        <WorkflowProgress 
          currentStep={isCopilot ? 1 : 2} 
          stepStatuses={stepStatuses}
          onHelpClick={onHelpClick}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isCopilot ? "Markenberatung" : "Markenrecherche"}
              </h1>
              <p className="text-gray-600 mt-1">
                {isCopilot 
                  ? "Ihr KI-gestützter Assistent für internationales Markenrecht"
                  : "Prüfen Sie, ob Ihr gewünschter Markenname bereits registriert ist"
                }
              </p>
            </div>
            <button
              onClick={onHelpClick || (() => router.push(`/dashboard/copilot?topic=${isCopilot ? 'beratung' : 'recherche'}`))}
              className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-colors"
              title="Hilfe & Anleitungen"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => onStartTour ? onStartTour() : router.push(`/dashboard/copilot?topic=${isCopilot ? 'beratung' : 'recherche'}`)}
              className="text-xs text-primary hover:text-primary/80 underline transition-colors"
              title="Tour starten"
            >
              Tour starten
            </button>
          </div>
          <button
            onClick={onOpenConsultations}
            data-tour="my-consultations"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="font-medium text-gray-700">Meine Markenfälle</span>
          </button>
        </div>
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

          {children}
        </>
      )}
    </div>
  );
}
