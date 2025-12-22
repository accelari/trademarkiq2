"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  MessageCircle, 
  Search, 
  ClipboardCheck, 
  FileText, 
  ChevronDown,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import BeratungAccordionContent from "./BeratungAccordionContent";

interface CaseStep {
  id: string;
  step: string;
  status: string;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: string | null;
  metadata?: Record<string, any>;
}

interface CaseDecision {
  id: string;
  trademarkNames: string[];
  countries: string[];
  niceClasses: number[];
  completenessScore: number;
}

interface Consultation {
  id: string;
  title: string;
  summary: string;
  duration: number | null;
  mode: string;
  createdAt: string;
  extractedData?: {
    trademarkName?: string;
    countries?: string[];
    niceClasses?: number[];
  };
}

interface CaseData {
  id: string;
  caseNumber: string;
  trademarkName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: CaseStep[];
  decisions: CaseDecision[];
  consultations: Consultation[];
}

interface CaseWorkspaceProps {
  caseData: CaseData;
  accessToken: string;
  hasVoiceAssistant: boolean;
}

type AccordionStep = "beratung" | "markenpruefung" | "anmeldungscheck" | "anmeldung";

const stepAliases: Record<string, AccordionStep> = {
  recherche: "markenpruefung",
};

const ACCORDION_SECTIONS: {
  id: AccordionStep;
  title: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    id: "beratung",
    title: "Beratung",
    icon: MessageCircle,
    description: "KI-Markenberater für Markennamen, Klassen & Länder",
  },
  {
    id: "markenpruefung",
    title: "Markenprüfung",
    icon: Search,
    description: "Ähnlichkeitsrecherche & Konflikterkennung",
  },
  {
    id: "anmeldungscheck",
    title: "Anmeldungs-Check",
    icon: ClipboardCheck,
    description: "Überprüfung der Anmeldungsvoraussetzungen",
  },
  {
    id: "anmeldung",
    title: "Markenanmeldung",
    icon: FileText,
    description: "Anmeldung beim Markenamt einreichen",
  },
];

function getStepStatus(
  stepId: AccordionStep,
  caseSteps: CaseStep[]
): "completed" | "in_progress" | "pending" | "skipped" {
  const stepMapping: Record<AccordionStep, string> = {
    beratung: "beratung",
    markenpruefung: "recherche",
    anmeldungscheck: "anmeldungs_check",
    anmeldung: "anmeldung",
  };

  const dbStepName = stepMapping[stepId];
  const step = caseSteps.find((s) => s.step === dbStepName);

  if (!step) return "pending";
  if (step.skippedAt) return "skipped";
  if (step.completedAt) return "completed";
  if (step.status === "in_progress") return "in_progress";
  return "pending";
}

function StatusBadge({ status }: { status: ReturnType<typeof getStepStatus> }) {
  const configs = {
    completed: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: Check,
      label: "Abgeschlossen",
    },
    in_progress: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      icon: Clock,
      label: "In Bearbeitung",
    },
    pending: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      icon: Clock,
      label: "Ausstehend",
    },
    skipped: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: AlertCircle,
      label: "Übersprungen",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function CaseWorkspace({
  caseData,
  accessToken,
  hasVoiceAssistant,
}: CaseWorkspaceProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const stepParam = searchParams.get("step");
  const resolvedStep = stepParam
    ? (stepAliases[stepParam] || stepParam) as AccordionStep
    : "beratung";

  const [openAccordion, setOpenAccordion] = useState<AccordionStep | null>(
    ACCORDION_SECTIONS.some((s) => s.id === resolvedStep) ? resolvedStep : "beratung"
  );

  useEffect(() => {
    if (stepParam) {
      const resolved = (stepAliases[stepParam] || stepParam) as AccordionStep;
      if (ACCORDION_SECTIONS.some((s) => s.id === resolved)) {
        setOpenAccordion(resolved);
      }
    }
  }, [stepParam]);

  const handleAccordionToggle = (sectionId: AccordionStep) => {
    const newOpen = openAccordion === sectionId ? null : sectionId;
    setOpenAccordion(newOpen);

    const params = new URLSearchParams(searchParams.toString());
    if (newOpen) {
      params.set("step", newOpen);
    } else {
      params.delete("step");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const latestDecision = caseData.decisions[caseData.decisions.length - 1];
  const extractedInfo = {
    trademarkName: caseData.trademarkName || latestDecision?.trademarkNames?.[0],
    countries: latestDecision?.countries || [],
    niceClasses: latestDecision?.niceClasses || [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              {caseData.caseNumber}
            </span>
            {caseData.status === "active" && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Aktiv
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {caseData.trademarkName || "Markenfall"}
          </h1>
          <p className="text-gray-600 mt-1">
            Bearbeiten Sie Ihren Markenfall Schritt für Schritt
          </p>
        </div>

        {(extractedInfo.countries.length > 0 || extractedInfo.niceClasses.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {extractedInfo.countries.length > 0 && (
              <div className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">
                🌍 {extractedInfo.countries.join(", ")}
              </div>
            )}
            {extractedInfo.niceClasses.length > 0 && (
              <div className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">
                📋 Klassen: {extractedInfo.niceClasses.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {ACCORDION_SECTIONS.map((section) => {
          const isOpen = openAccordion === section.id;
          const status = getStepStatus(section.id, caseData.steps);
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => handleAccordionToggle(section.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isOpen
                        ? "bg-primary text-white"
                        : status === "completed"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={status} />
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="border-t border-gray-200 p-5">
                  {section.id === "beratung" && (
                    <BeratungAccordionContent
                      caseData={caseData}
                      accessToken={accessToken}
                      hasVoiceAssistant={hasVoiceAssistant}
                    />
                  )}
                  {section.id === "markenpruefung" && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Markenprüfung
                      </h4>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Hier werden Sie Ihre Marke auf Konflikte prüfen können.
                        Schließen Sie zuerst die Beratung ab.
                      </p>
                    </div>
                  )}
                  {section.id === "anmeldungscheck" && (
                    <div className="text-center py-12">
                      <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Anmeldungs-Check
                      </h4>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Überprüfung der Voraussetzungen für die Markenanmeldung.
                      </p>
                    </div>
                  )}
                  {section.id === "anmeldung" && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Markenanmeldung
                      </h4>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Reichen Sie Ihre Markenanmeldung beim zuständigen Amt ein.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
