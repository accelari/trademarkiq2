"use client";

import { useState, useEffect, useCallback } from "react";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { Volume2, Loader2, Play, X } from "lucide-react";

interface VoiceExplanationProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  recommendation: string;
  overallScore: number;
  overallRisk: "high" | "medium" | "low";
  markenname: string;
  totalConflicts: number;
}

function VoicePlayerInner({
  summary,
  recommendation,
  overallScore,
  overallRisk,
  markenname,
  totalConflicts,
  onClose,
}: Omit<VoiceExplanationProps, "isOpen">) {
  const { status, connect, disconnect, sendUserInput } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasExplained, setHasExplained] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRiskLabel = useCallback(() => {
    switch (overallRisk) {
      case "high": return "ein hohes Risiko";
      case "medium": return "ein mittleres Risiko";
      case "low": return "ein niedriges Risiko";
    }
  }, [overallRisk]);

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch("/api/token");
        const data = await response.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
        } else if (data.error) {
          setError("Sprachfunktion nicht verfügbar");
        }
      } catch (err) {
        setError("Konnte keine Verbindung herstellen");
      }
    }
    fetchToken();
  }, []);

  useEffect(() => {
    if (status.value === "connected" && !hasExplained) {
      setHasExplained(true);
      
      const explanationText = `
        Ich erkläre dir jetzt die Risiko-Analyse für die Marke ${markenname}.
        Der Gesamtrisiko-Score beträgt ${overallScore} Prozent. Das bedeutet ${getRiskLabel()}.
        Bei der Analyse wurden ${totalConflicts} potenzielle Konflikte gefunden.
        ${summary}
        Meine Empfehlung lautet: ${recommendation}
      `;
      
      setTimeout(() => {
        sendUserInput(explanationText);
      }, 500);
    }
  }, [status.value, hasExplained, markenname, overallScore, totalConflicts, summary, recommendation, sendUserInput, getRiskLabel]);

  const handleStart = async () => {
    if (!accessToken) {
      setError("Kein Zugangstoken verfügbar");
      return;
    }
    
    try {
      await connect({
        auth: {
          type: "accessToken" as const,
          value: accessToken,
        },
        hostname: "api.hume.ai",
        configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
      });
    } catch (err) {
      console.error("Voice connection error:", err);
      setError("Verbindung fehlgeschlagen");
    }
  };

  const handleStop = async () => {
    await disconnect();
    onClose();
  };

  const isConnected = status.value === "connected";
  const isConnecting = status.value === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Sprach-Erklärung</h3>
                <p className="text-white/80 text-sm">KI erklärt Ihre Risikoanalyse</p>
              </div>
            </div>
            <button
              onClick={handleStop}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
              isConnected 
                ? "bg-teal-100" 
                : "bg-gray-100"
            }`}>
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              ) : isConnected ? (
                <div className="relative">
                  <Volume2 className="w-10 h-10 text-teal-600" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <Play className="w-10 h-10 text-gray-400" />
              )}
            </div>
            
            <p className="text-gray-600 text-sm">
              {isConnecting 
                ? "Verbinde mit Sprachassistent..."
                : isConnected 
                  ? "Sprachassistent aktiv - erklärt Ihre Analyse..."
                  : "Klicken Sie auf Start, um die Erklärung zu hören"
              }
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Was erklärt wird:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Risiko-Score: <strong>{overallScore}%</strong></li>
              <li>• Gefundene Konflikte: <strong>{totalConflicts}</strong></li>
              <li>• Zusammenfassung der Analyse</li>
              <li>• Handlungsempfehlungen</li>
            </ul>
          </div>

          <div className="flex gap-3">
            {!isConnected ? (
              <button
                onClick={handleStart}
                disabled={isConnecting || !accessToken}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verbinde...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Erklärung starten
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                <X className="w-5 h-5" />
                Beenden
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VoiceExplanation(props: VoiceExplanationProps) {
  if (!props.isOpen) return null;

  return (
    <VoiceProvider>
      <VoicePlayerInner {...props} />
    </VoiceProvider>
  );
}
