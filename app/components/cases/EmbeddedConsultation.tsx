"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Mic, 
  MessageSquare, 
  Loader2, 
  Info, 
  Check,
  FileText,
  Sparkles,
  ChevronDown,
  MessageCircle
} from "lucide-react";
import VoiceAssistant, { VoiceAssistantHandle } from "@/app/components/VoiceAssistant";
import QuickQuestions from "@/app/components/QuickQuestions";

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
  caseNumber?: string;
}

export function EmbeddedConsultation({ caseId, accessToken, onComplete, caseNumber }: EmbeddedConsultationProps) {
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([
    {
      id: "system-start",
      timestamp: new Date(),
      content: "Beratung gestartet",
      type: "system"
    }
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  
  const displayCaseNumber = caseNumber || `TM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  
  const meetingNotesRef = useRef<MeetingNote[]>([]);
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    meetingNotesRef.current = meetingNotes;
  }, [meetingNotes]);

  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setMeetingDuration(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime]);

  const handleMessageSent = useCallback((message: string, type: "user" | "assistant") => {
    const newNote: MeetingNote = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      content: message,
      type,
    };
    setMeetingNotes(prev => [...prev, newNote]);
    if (!startTime) {
      setStartTime(new Date());
    }
  }, [startTime]);

  const handleQuestionClick = useCallback((question: string) => {
    setContextMessage(question);
  }, []);

  const handleContextMessageConsumed = useCallback(() => {
    setContextMessage(null);
  }, []);

  const handleEndConsultation = async () => {
    const currentNotes = meetingNotesRef.current;
    
    if (currentNotes.filter(n => n.type !== "system").length === 0) {
      onComplete();
      return;
    }

    setIsAnalyzing(true);

    if (voiceAssistantRef.current) {
      voiceAssistantRef.current.stopSession();
    }

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
      ? `Beratung: ${extractedData.trademarkName}`
      : `Markenberatung ${new Date().toLocaleDateString("de-DE")}`;

    const durationSeconds = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;

    try {
      await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          title,
          summary,
          sessionProtocol,
          duration: durationSeconds,
          mode: inputMode === "sprache" ? "voice" : "text",
          extractedData: {
            trademarkNames: extractedData.trademarkName ? [extractedData.trademarkName] : [],
            countries: extractedData.countries,
            niceClasses: extractedData.niceClasses
          }
        })
      });
    } catch (e) {
      console.error("Save error:", e);
    }

    if (extractedData.trademarkName || extractedData.countries.length > 0 || extractedData.niceClasses.length > 0) {
      try {
        await fetch(`/api/cases/${caseId}/decisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trademarkNames: extractedData.trademarkName ? [extractedData.trademarkName] : undefined,
            countries: extractedData.countries.length > 0 ? extractedData.countries : undefined,
            niceClasses: extractedData.niceClasses.length > 0 ? extractedData.niceClasses : undefined
          })
        });
      } catch (e) {
        console.error("Decision update error:", e);
      }
    }

    setIsAnalyzing(false);
    onComplete();
  };

  const userNotes = meetingNotes.filter(n => n.type !== "system");

  return (
    <VoiceProvider>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Eingabemethode</span>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 cursor-help hover:text-gray-700 transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                  Wählen Sie, wie Sie mit dem Berater kommunizieren möchten.
                </div>
              </div>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setInputMode("sprache")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "sprache" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Mic className="w-4 h-4" />
                Sprechen
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "text" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Tippen
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{displayCaseNumber}</span>
            </div>
            
            <button
              onClick={handleEndConsultation}
              disabled={isAnalyzing || meetingNotes.length <= 1}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isAnalyzing || meetingNotes.length <= 1
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysiere...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Beratung beenden
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">KI-Markenberater</h3>
                    <p className="text-white/80 text-sm">
                      {inputMode === "text" ? "Schriftliche Beratung" : "Sprachgesteuerte Beratung"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                      Bereit
                    </span>
                  </div>
                </div>
              </div>
              
              <VoiceAssistant 
                ref={voiceAssistantRef}
                accessToken={accessToken} 
                inputMode={inputMode} 
                onMessageSent={handleMessageSent}
                contextMessage={contextMessage}
                onContextMessageConsumed={handleContextMessageConsumed}
                embedded={true}
              />
            </div>
          </div>

          <div className="space-y-4">
            <QuickQuestions onQuestionClick={handleQuestionClick} />

            {userNotes.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Sitzungsprotokoll
                  <span className="ml-auto text-xs text-gray-500">{meetingDuration}</span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userNotes.slice(-6).map((note) => (
                    <div key={note.id} className={`text-sm p-3 rounded-lg ${
                      note.type === "user"
                        ? "bg-teal-50 text-gray-800"
                        : "bg-gray-50 text-gray-700"
                    }`}>
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        {note.type === "user" ? "Frage:" : "Antwort:"}
                      </span>
                      <span className="whitespace-pre-wrap line-clamp-3">{note.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl overflow-hidden text-white">
              <button 
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  So funktioniert's
                </h3>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showHowItWorks ? 'rotate-180' : ''}`} />
              </button>
              <div 
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: showHowItWorks ? '1fr' : '0fr' }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <ul className="text-sm text-white/90 space-y-2 px-5 pb-5">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      Stellen Sie dem KI-Berater Ihre Fragen zur Marke
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      Klären Sie Markennamen, Klassen und Länder
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      Beenden Sie die Beratung, um die Daten zu speichern
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VoiceProvider>
  );
}
