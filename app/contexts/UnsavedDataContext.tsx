"use client";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface UnsavedDataContextType {
  hasUnsavedData: boolean;
  setHasUnsavedData: (value: boolean) => void;
  pendingNavigation: string | null;
  setPendingNavigation: (path: string | null) => void;
  showLeaveModal: boolean;
  setShowLeaveModal: (value: boolean) => void;
  onSaveBeforeLeave: (() => Promise<void>) | null;
  setOnSaveBeforeLeave: (fn: (() => Promise<void>) | null) => void;
}

const UnsavedDataContext = createContext<UnsavedDataContextType | null>(null);

export function UnsavedDataProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [onSaveBeforeLeave, setOnSaveBeforeLeaveState] = useState<(() => Promise<void>) | null>(null);

  const setOnSaveBeforeLeave = useCallback((fn: (() => Promise<void>) | null) => {
    setOnSaveBeforeLeaveState(() => fn);
  }, []);

  return (
    <UnsavedDataContext.Provider value={{
      hasUnsavedData, setHasUnsavedData,
      pendingNavigation, setPendingNavigation,
      showLeaveModal, setShowLeaveModal,
      onSaveBeforeLeave, setOnSaveBeforeLeave
    }}>
      {children}
    </UnsavedDataContext.Provider>
  );
}

export function useUnsavedData() {
  const context = useContext(UnsavedDataContext);
  if (!context) throw new Error("useUnsavedData must be used within UnsavedDataProvider");
  return context;
}
