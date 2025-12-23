import { MessageCircle, Search, BarChart3, FileText, Eye, LucideIcon } from "lucide-react";

export type WorkflowStepId = "beratung" | "recherche" | "analyse" | "anmeldung" | "watchlist";

export interface WorkflowStep {
  id: WorkflowStepId;
  name: string;
  description: string;
  icon: LucideIcon;
  route: string;
  enabled: boolean;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "beratung",
    name: "Beratung",
    description: "KI-Markenberater für erste Orientierung",
    icon: MessageCircle,
    route: "/dashboard/copilot",
    enabled: true,
  },
  {
    id: "recherche",
    name: "Recherche",
    description: "Markenrecherche durchführen",
    icon: Search,
    route: "/dashboard/recherche",
    enabled: true,
  },
  {
    id: "analyse",
    name: "Analyse",
    description: "Risikoanalyse und Empfehlungen",
    icon: BarChart3,
    route: "",
    enabled: true,
  },
  {
    id: "anmeldung",
    name: "Anmeldung",
    description: "Marke beim Amt anmelden",
    icon: FileText,
    route: "/dashboard/anmeldung",
    enabled: false,
  },
  {
    id: "watchlist",
    name: "Überwachung",
    description: "Marke auf Watchlist setzen",
    icon: Eye,
    route: "/dashboard/watchlist",
    enabled: false,
  },
];

export const ACTIVE_STEPS = WORKFLOW_STEPS.filter((step) => step.enabled);

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface StepState {
  status: StepStatus;
  completedAt: Date | null;
  skippedAt: Date | null;
}

export function getStepIndex(stepId: WorkflowStepId): number {
  return ACTIVE_STEPS.findIndex((s) => s.id === stepId);
}

export function getNextStep(currentStepId: WorkflowStepId): WorkflowStep | null {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex === -1 || currentIndex >= ACTIVE_STEPS.length - 1) {
    return null;
  }
  return ACTIVE_STEPS[currentIndex + 1];
}

export function getPreviousStep(currentStepId: WorkflowStepId): WorkflowStep | null {
  const currentIndex = getStepIndex(currentStepId);
  if (currentIndex <= 0) {
    return null;
  }
  return ACTIVE_STEPS[currentIndex - 1];
}
