"use client";
import { createContext, useContext, useState, ReactNode, useCallback, useRef, MutableRefObject } from "react";

interface UnsavedDataContextType {
  hasUnsavedData: boolean;
  setHasUnsavedData: (value: boolean) => void;
  pendingNavigation: string | null;
  setPendingNavigation: (path: string | null) => void;
  showLeaveModal: boolean;
  setShowLeaveModal: (value: boolean) => void;
  onSaveBeforeLeave: (() => Promise<unknown>) | null;
  setOnSaveBeforeLeave: (fn: (() => Promise<unknown>) | null) => void;
  checkUnsavedDataRef: MutableRefObject<(() => boolean) | null>;
  setCheckUnsavedDataRef: (fn: (() => boolean) | null) => void;
}

const UnsavedDataContext = createContext<UnsavedDataContextType | null>(null);

export function UnsavedDataProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [onSaveBeforeLeave, setOnSaveBeforeLeaveState] = useState<(() => Promise<unknown>) | null>(null);
  const checkUnsavedDataRef = useRef<(() => boolean) | null>(null);

  const setOnSaveBeforeLeave = useCallback((fn: (() => Promise<unknown>) | null) => {
    setOnSaveBeforeLeaveState(() => fn);
  }, []);

  const setCheckUnsavedDataRef = useCallback((fn: (() => boolean) | null) => {
    checkUnsavedDataRef.current = fn;
  }, []);

  return (
    <UnsavedDataContext.Provider value={{
      hasUnsavedData, setHasUnsavedData,
      pendingNavigation, setPendingNavigation,
      showLeaveModal, setShowLeaveModal,
      onSaveBeforeLeave, setOnSaveBeforeLeave,
      checkUnsavedDataRef, setCheckUnsavedDataRef
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
