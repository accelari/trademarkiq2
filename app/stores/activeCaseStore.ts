"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface StepStatus {
  beratung?: "pending" | "in_progress" | "completed" | "skipped";
  recherche?: "pending" | "in_progress" | "completed" | "skipped";
  risikoanalyse?: "pending" | "in_progress" | "completed" | "skipped";
  anmeldung?: "pending" | "in_progress" | "completed" | "skipped";
  watchlist?: "pending" | "in_progress" | "completed" | "skipped";
}

export interface CaseMetadata {
  trademarkName?: string;
  countries?: string[];
  niceClasses?: number[];
  lastConsultationDate?: string;
}

export interface ActiveCaseState {
  caseId: string | null;
  caseNumber: string | null;
  stepStatuses: StepStatus;
  metadata: CaseMetadata;
  isHydrated: boolean;

  setActiveCase: (caseId: string | null, caseNumber?: string | null) => void;
  updateStepStatus: (step: keyof StepStatus, status: StepStatus[keyof StepStatus]) => void;
  setStepStatuses: (statuses: StepStatus) => void;
  updateMetadata: (metadata: Partial<CaseMetadata>) => void;
  clearActiveCase: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const initialState = {
  caseId: null as string | null,
  caseNumber: null as string | null,
  stepStatuses: {} as StepStatus,
  metadata: {} as CaseMetadata,
  isHydrated: false,
};

export const useActiveCaseStore = create<ActiveCaseState>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveCase: (caseId, caseNumber = null) =>
        set({
          caseId,
          caseNumber,
        }),

      updateStepStatus: (step, status) =>
        set((state) => ({
          stepStatuses: { ...state.stepStatuses, [step]: status },
        })),

      setStepStatuses: (statuses) => set({ stepStatuses: statuses }),

      updateMetadata: (metadata) =>
        set((state) => ({
          metadata: { ...state.metadata, ...metadata },
        })),

      clearActiveCase: () =>
        set({
          caseId: null,
          caseNumber: null,
          stepStatuses: {},
          metadata: {},
        }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "trademark-active-case",
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        caseId: state.caseId,
        caseNumber: state.caseNumber,
        stepStatuses: state.stepStatuses,
        metadata: state.metadata,
      }),
    }
  )
);

export default useActiveCaseStore;
