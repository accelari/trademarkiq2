"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Keyboard, Loader2, Info, Lightbulb, Check } from "lucide-react";
import VoiceAssistant, { VoiceAssistantHandle } from "../VoiceAssistant";

interface MeetingNote {
  id: string;
  timestamp: Date;
  content: string;
  type: "user" | "assistant" | "system";
}

interface EmbeddedConsultationProps {
  caseId: string;
  accessToken: string;
  onComplete: () => void;
}

const QUICK_QUESTIONS = [
  "Wie wähle ich die richtigen Nizza-Klassen?",
  "In welchen Ländern sollte ich meine Marke schützen?",
  "Was ist der Unterschied zwischen Wortmarke und Bildmarke?",
  "Wie läuft die Markenrecherche ab?",
];

export function EmbeddedConsultation({ caseId, accessToken, onComplete }: EmbeddedConsultationProps) {
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [isEnding, setIsEnding] = useState(false);
  const [endingStep, setEndingStep] = useState(0);
  const [startTime] = useState<Date>(new Date());
  const meetingNotesRef = useRef<MeetingNote[]>([]);
  const inputModeRef = useRef<"sprache" | "text">("sprache");
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);

  useEffect(() => {
    meetingNotesRef.current = meetingNotes;
  }, [meetingNotes]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  const handleMessageSent = useCallback((message: string, type: "user" | "assistant") => {
    const newNote: MeetingNote = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      content: message,
      type,
    };
    setMeetingNotes(prev => [...prev, newNote]);
  }, []);

  const stopVoiceSession = useCallback(() => {
    if (voiceAssistantRef.current) {
      voiceAssistantRef.current.stopSession();
    }
  }, []);

  const handleEndConsultation = async () => {
    if (meetingNotesRef.current.length === 0) {
      onComplete();
      return;
    }

    setIsEnding(true);
    setEndingStep(1);
    stopVoiceSession();

    const currentNotes = meetingNotesRef.current;
    const notesText = currentNotes
      .filter(n => n.type !== "system")
      .map(n => `${n.type === "user" ? "Frage" : "Antwort"}: ${n.content}`)
      .join("\n\n");

    const sessionProtocol = currentNotes
      .map(n => {
        const time = n.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        const role = n.type === "user" ? "BENUTZER" : n.type === "assistant" ? "BERATER" : "SYSTEM";
        return `[${time}] ${role}: ${n.content}`;
      })
      .join("\n");

    let extractedData = { trademarkName: null as string | null, countries: [] as string[], niceClasses: [] as number[] };
    
    try {
      setEndingStep(2);
      const analysisResponse = await fetch("/api/ai/analyze-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNotes: notesText })
      });
      
      if (analysisResponse.ok) {
        const data = await analysisResponse.json();
        extractedData = {
          trademarkName: data.result?.trademarkName || null,
          countries: data.result?.targetCountries || [],
          niceClasses: (data.result?.niceClasses || []).map((c: string) => parseInt(c)).filter((c: number) => !isNaN(c))
        };
      }
    } catch (e) {
      console.error("Analysis error:", e);
    }

    let summary = `Markenberatung - ${new Date().toLocaleDateString("de-DE")}`;
    try {
      const summaryResponse = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Erstelle eine kurze Zusammenfassung (3-5 Sätze) dieser Markenberatung auf Deutsch. Gib NUR die Zusammenfassung zurück.\n\nGespräch:\n${notesText}`,
          history: []
        })
      });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summary = summaryData.response?.trim() || summary;
      }
    } catch (e) {}

    const title = extractedData.trademarkName 
      ? `Marke "${extractedData.trademarkName}"` 
      : `Markenberatung - ${new Date().toLocaleDateString("de-DE")}`;

    const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    setEndingStep(3);
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          transcript: notesText,
          sessionProtocol,
          duration: durationSeconds,
          mode: inputModeRef.current,
          extractedData,
          caseId,
          sendEmail: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        await fetch("/api/cases/save-decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            consultationId: data.consultation?.id,
            trademarkName: extractedData.trademarkName,
            countries: extractedData.countries,
            niceClasses: extractedData.niceClasses
          })
        });
        
        if (extractedData.trademarkName) {
          await fetch(`/api/cases/${caseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trademarkName: extractedData.trademarkName })
          });
        }
      }
    } catch (e) {
      console.error("Save error:", e);
    }

    setIsEnding(false);
    onComplete();
  };

  const hasNotes = meetingNotes.filter(n => n.type !== "system").length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          <button
            onClick={() => setInputMode("sprache")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === "sprache"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Mic className="w-4 h-4" />
            Sprechen
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === "text"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Tippen
          </button>
        </div>

        <button
          onClick={handleEndConsultation}
          disabled={isEnding}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isEnding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {endingStep === 1 && "Beenden..."}
              {endingStep === 2 && "Analysiere..."}
              {endingStep === 3 && "Speichere..."}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Beratung beenden
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <VoiceProvider>
              <VoiceAssistant 
                ref={voiceAssistantRef}
                accessToken={accessToken} 
                inputMode={inputMode} 
                onMessageSent={handleMessageSent}
                embedded={true}
              />
            </VoiceProvider>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h4 className="font-semibold text-gray-900 text-sm">Schnellfragen</h4>
            </div>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all border bg-gray-50 hover:bg-teal-50 text-gray-700 hover:text-teal-700 border-gray-200 hover:border-teal-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-teal-600" />
              <h4 className="font-semibold text-teal-900 text-sm">So funktioniert's</h4>
            </div>
            <ul className="space-y-2 text-sm text-teal-800">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                <span>Stellen Sie dem KI-Berater Ihre Fragen zur Marke</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                <span>Klären Sie Markennamen, Klassen und Länder</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                <span>Beenden Sie die Beratung, um die Daten zu speichern</span>
              </li>
            </ul>
          </div>

          {hasNotes && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 text-sm">Gesprächsverlauf</h4>
                <span className="text-xs text-gray-500">{meetingNotes.filter(n => n.type !== "system").length} Nachrichten</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {meetingNotes.filter(n => n.type !== "system").slice(-4).map((note) => (
                  <div key={note.id} className="text-xs text-gray-600 truncate">
                    <span className={note.type === "user" ? "text-teal-600 font-medium" : "text-gray-500"}>
                      {note.type === "user" ? "Sie: " : "Berater: "}
                    </span>
                    {note.content.substring(0, 50)}...
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmbeddedConsultation;
