"use client";

import { useState, useEffect } from "react";
import { Coins, AlertTriangle, RefreshCw } from "lucide-react";

interface CreditInfo {
  credits: number;
  warningThreshold: number;
  isLow: boolean;
  isEmpty: boolean;
}

interface CreditDisplayProps {
  className?: string;
  showRefresh?: boolean;
  compact?: boolean;
}

export function CreditDisplay({ className = "", showRefresh = false, compact = false }: CreditDisplayProps) {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/credits?type=balance");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      if (data.success) {
        setCreditInfo({
          credits: data.credits,
          warningThreshold: data.warningThreshold,
          isLow: data.isLow,
          isEmpty: data.isEmpty,
        });
      }
    } catch (err) {
      setError("Credits konnten nicht geladen werden");
      console.error("[CreditDisplay] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    // Alle 60 Sekunden aktualisieren
    const interval = setInterval(fetchCredits, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !creditInfo) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <Coins className="w-4 h-4 animate-pulse" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  if (error || !creditInfo) {
    return null; // Fehler still ignorieren
  }

  const getColorClass = () => {
    if (creditInfo.isEmpty) return "text-red-500";
    if (creditInfo.isLow) return "text-yellow-500";
    return "text-green-500";
  };

  const getBgClass = () => {
    if (creditInfo.isEmpty) return "bg-red-500/10";
    if (creditInfo.isLow) return "bg-yellow-500/10";
    return "bg-green-500/10";
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${getColorClass()} ${className}`}>
        <Coins className="w-4 h-4" />
        <span className="text-sm font-medium">{creditInfo.credits.toFixed(0)}</span>
        {creditInfo.isLow && <AlertTriangle className="w-3 h-3" />}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${getBgClass()} ${className}`}>
      <div className={`flex items-center gap-2 ${getColorClass()}`}>
        <Coins className="w-5 h-5" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{creditInfo.credits.toFixed(2)} Credits</span>
          {creditInfo.isEmpty && (
            <span className="text-xs text-red-400">Guthaben aufgebraucht</span>
          )}
          {creditInfo.isLow && !creditInfo.isEmpty && (
            <span className="text-xs text-yellow-400">Niedriges Guthaben</span>
          )}
        </div>
      </div>
      
      {showRefresh && (
        <button
          onClick={fetchCredits}
          disabled={loading}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}

// Hook für programmatischen Zugriff auf Credits
export function useCredits() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isLow, setIsLow] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/credits?type=balance");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCredits(data.credits);
          setIsLow(data.isLow);
          setIsEmpty(data.isEmpty);
        }
      }
    } catch (err) {
      console.error("[useCredits] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { credits, loading, isLow, isEmpty, refresh };
}
