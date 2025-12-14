"use client";

import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { Mic, FileText, Clock, MessageSquare, Sparkles, Info, Loader2, X, ChevronDown, HelpCircle, ArrowRight, AlertTriangle, FileCheck, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface KlassifizierungClientProps {
  accessToken: string;
  hasVoiceAssistant: boolean;
}

interface MeetingNote {
  id: string;
  timestamp: Date;
  content: string;
  type: "user" | "assistant" | "system";
}

interface TextMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const KLASSIFIZIERUNG_SYSTEM_PROMPT = `Du bist ein erfahrener DPMA/EUIPO-Klassifizierungsexperte bei TrademarkIQ.

Deine Hauptaufgabe ist die Optimierung von Waren- und Dienstleistungsverzeichnissen für Markenanmeldungen.

DEINE EXPERTISE:
- Nizza-Klassifikation (alle 45 Klassen) - Aktuelle Version
- TMclass-Datenbank und deren akzeptierte Begriffe
- DPMA-Praxis (Deutsche Markenanmeldungen)
- EUIPO-Praxis (EU-Markenanmeldungen)
- WIPO-Richtlinien für internationale Anmeldungen
- Typische Mängelgründe und wie man sie vermeidet

DEINE AUFGABE:
1. Frage nach dem Geschäftsmodell und den konkreten Produkten/Dienstleistungen
2. Identifiziere die passenden Nizza-Klassen
3. Formuliere amtskonforme Waren- und Dienstleistungsbeschreibungen
4. Erkläre, warum bestimmte Formulierungen wichtig sind
5. Warne vor typischen Fehlern, die zu Mängelbescheiden führen

WICHTIGE REGELN:
- Verwende nur TMclass-akzeptierte Begriffe wenn möglich
- Erkläre den Unterschied zwischen Oberbegriffen und spezifischen Begriffen
- Weise auf Klassengrenzen hin (z.B. Software in Klasse 9 vs. 42)
- Berücksichtige länderspezifische Besonderheiten (DPMA vs. EUIPO)
- Stelle NICHT alle Fragen auf einmal - führe ein natürliches Gespräch

TYPISCHE FEHLER, VOR DENEN DU WARNEN SOLLTEST:
- Zu breite Oberbegriffe (z.B. "Waren aus Metall")
- Unklare Formulierungen
- Fehlende Zweckangaben bei bestimmten Waren
- Vermischung von Waren und Dienstleistungen in einer Beschreibung
- Nicht-klassifizierbare Fantasiebegriffe

Dein Kommunikationsstil:
- Professionell und präzise
- Erkläre komplexe Sachverhalte verständlich
- Gib konkrete Formulierungsvorschläge
- Antworte IMMER auf Deutsch`;

const KLASSIFIZIERUNG_TEXT_CONTEXT = `KONTEXT: Du bist ein Klassifizierungsexperte für Markenanmeldungen. 
Deine Aufgabe ist es, dem Kunden zu helfen, amtskonforme Waren- und Dienstleistungsbeschreibungen zu erstellen.
Nutze TMclass-konforme Begriffe und erkläre die Nizza-Klassifikation.
Warne vor typischen Fehlern, die zu Mängelbescheiden führen können.`;

interface VoiceAssistantHandle {
  stopSession: () => void;
  isConnected: () => boolean;
}

const KlassifizierungVoiceAssistant = forwardRef<VoiceAssistantHandle, {
  accessToken: string;
  inputMode: "sprache" | "text";
  onMessageSent?: (message: string, type: "user" | "assistant") => void;
}>(({ accessToken, inputMode, onMessageSent }, ref) => {
  const { status, connect, disconnect, sendUserInput, sendSessionSettings, messages } = useVoice();
  const [error, setError] = useState<string | null>(null);
  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const textChatRef = useRef<HTMLDivElement>(null);
  const processedPairsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    stopSession: () => {
      if (status.value === "connected") {
        disconnect();
      }
    },
    isConnected: () => status.value === "connected",
  }));

  useEffect(() => {
    if (status.value === "connected" && pendingPrompt) {
      sendSessionSettings({
        systemPrompt: pendingPrompt
      });
      setPendingPrompt(null);
    }
  }, [status.value, pendingPrompt, sendSessionSettings]);

  useEffect(() => {
    if (inputMode !== "sprache" || messages.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const userMessages: { index: number; content: string }[] = [];
      const assistantMessages: { index: number; content: string }[] = [];

      messages.forEach((msg, index) => {
        if (msg.type === "user_message" && msg.message?.content) {
          userMessages.push({ index, content: msg.message.content });
        } else if (msg.type === "assistant_message" && msg.message?.content) {
          assistantMessages.push({ index, content: msg.message.content });
        }
      });

      assistantMessages.forEach((assistantMsg) => {
        const userMsgBefore = userMessages
          .filter(u => u.index < assistantMsg.index)
          .pop();

        if (userMsgBefore) {
          const pairId = `${userMsgBefore.index}-${assistantMsg.index}`;
          
          if (!processedPairsRef.current.has(pairId)) {
            const userAlreadySent = Array.from(processedPairsRef.current).some(
              id => id.startsWith(`${userMsgBefore.index}-`)
            );
            
            if (!userAlreadySent) {
              onMessageSent?.(userMsgBefore.content, "user");
            }
            onMessageSent?.(assistantMsg.content, "assistant");
            processedPairsRef.current.add(pairId);
          }
        }
      });
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messages, inputMode, onMessageSent]);

  const handleToggle = async () => {
    try {
      setError(null);
      
      if (status.value === "connected") {
        await disconnect();
      } else {
        setPendingPrompt(KLASSIFIZIERUNG_SYSTEM_PROMPT + "\n\nBEGRÜSSUNG: Beginne das Gespräch mit: 'Hallo, ich bin Ihr Klassifizierungsexperte. Ich helfe Ihnen dabei, amtskonforme Waren- und Dienstleistungsbeschreibungen für Ihre Markenanmeldung zu erstellen. Erzählen Sie mir von Ihrem Geschäft - welche Produkte oder Dienstleistungen bieten Sie an?'");
        await connect({
          auth: {
            type: "accessToken" as const,
            value: accessToken,
          },
          hostname: "api.hume.ai",
          configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
        });
      }
    } catch (err) {
      console.error("Connection error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Verbindung fehlgeschlagen. Bitte überprüfen Sie Ihre Mikrofonberechtigungen.");
    }
  };

  const sendMessageToAPI = async (message: string): Promise<string> => {
    const history = textMessages.map(m => ({
      role: m.type as "user" | "assistant",
      content: m.content
    }));

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message, 
        history,
        systemContext: KLASSIFIZIERUNG_TEXT_CONTEXT
      })
    });

    if (!response.ok) {
      throw new Error("Fehler bei der Kommunikation mit dem Berater");
    }

    const data = await response.json();
    return data.response;
  };

  const handleTextMessage = async (message: string) => {
    if (isLoading) return;

    const userMessage: TextMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    
    setTextMessages(prev => [...prev, userMessage]);
    onMessageSent?.(message, "user");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessageToAPI(message);
      
      const assistantMessage: TextMessage = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: response,
        timestamp: new Date(),
      };
      
      setTextMessages(prev => [...prev, assistantMessage]);
      onMessageSent?.(response, "assistant");
    } catch (err) {
      console.error("Chat error:", err);
      setError("Fehler bei der Kommunikation. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLoading) return;
    
    const message = textInput.trim();
    setTextInput("");
    await handleTextMessage(message);
  };

  useEffect(() => {
    if (textChatRef.current && textMessages.length > 0) {
      const lastMessage = textChatRef.current.lastElementChild as HTMLElement;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [textMessages]);

  if (inputMode === "text") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Klassifizierungs-Berater</h3>
              <p className="text-white/80 text-sm">TMclass-konforme Formulierungen</p>
            </div>
          </div>
        </div>

        <div ref={textChatRef} className="h-[400px] overflow-y-auto p-4 space-y-4">
          {textMessages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium mb-2">Willkommen zur Klassifizierungs-Beratung</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Beschreiben Sie Ihre Produkte oder Dienstleistungen, und ich helfe Ihnen bei der amtskonformen Formulierung.
              </p>
            </div>
          )}
          
          {textMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-3 ${
                  msg.type === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.type === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-gray-600 text-sm">Berater denkt nach...</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 text-red-700 p-2 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleTextSubmit} className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Beschreiben Sie Ihre Produkte oder Dienstleistungen..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Klassifizierungs-Berater</h3>
            <p className="text-white/80 text-sm">
              {status.value === "connected" ? "Aktiv - Sprechen Sie..." : "Klicken Sie auf Starten"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col items-center justify-center min-h-[350px]">
        {error && (
          <div className="mb-4 w-full max-w-md bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleToggle}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            status.value === "connected"
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {status.value === "connected" ? (
            <MicOff className="w-10 h-10 text-white" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </button>

        <p className="mt-4 text-gray-600 font-medium">
          {status.value === "connected" ? "Beratung aktiv" : "Klicken zum Starten"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {status.value === "connected" 
            ? "Sprechen Sie über Ihre Produkte und Dienstleistungen" 
            : "Starten Sie die Sprachberatung"}
        </p>
      </div>
    </div>
  );
});

KlassifizierungVoiceAssistant.displayName = "KlassifizierungVoiceAssistant";

const SUMMARY_STEPS = [
  { id: 1, label: "Gespräch analysieren", icon: "🔍" },
  { id: 2, label: "Nizza-Klassen identifizieren", icon: "📋" },
  { id: 3, label: "Formulierungen prüfen", icon: "✍️" },
  { id: 4, label: "Zusammenfassung erstellen", icon: "📄" },
];

export default function KlassifizierungClient({ accessToken, hasVoiceAssistant }: KlassifizierungClientProps) {
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const [meetingDurationSeconds, setMeetingDurationSeconds] = useState(0);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryStep, setSummaryStep] = useState(0);
  const [meetingSummary, setMeetingSummary] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);
  const router = useRouter();

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ message: "", visible: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  useEffect(() => {
    if (!meetingStartTime) {
      setMeetingStartTime(new Date());
      setMeetingNotes([{
        id: `system-${Date.now()}`,
        timestamp: new Date(),
        content: "Klassifizierungs-Beratung gestartet",
        type: "system"
      }]);
    }
  }, [meetingStartTime]);

  useEffect(() => {
    if (meetingStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - meetingStartTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        setMeetingDuration(`${minutes}:${seconds}`);
        setMeetingDurationSeconds(diff);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [meetingStartTime]);

  const handleMessageSent = (content: string, type: "user" | "assistant") => {
    setMeetingNotes(prev => [...prev, {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      content,
      type
    }]);
  };

  const generateSummary = async () => {
    if (meetingNotes.length <= 1) {
      setToast({ message: "Keine Beratungsinhalte vorhanden", visible: true });
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryStep(1);

    try {
      const notesText = meetingNotes
        .filter(n => n.type !== "system")
        .map(n => `${n.type === "user" ? "Kunde" : "Berater"}: ${n.content}`)
        .join("\n\n");

      await new Promise(r => setTimeout(r, 800));
      setSummaryStep(2);

      await new Promise(r => setTimeout(r, 800));
      setSummaryStep(3);

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Erstelle eine strukturierte Zusammenfassung dieser Klassifizierungs-Beratung auf Deutsch.

Die Zusammenfassung soll enthalten:

## Empfohlene Nizza-Klassen
- Liste alle besprochenen Klassen mit Nummer und Bezeichnung

## Amtskonforme Formulierungen
- Für jede Klasse: konkrete, TMclass-konforme Formulierungsvorschläge

## Warnungen und Hinweise
- Typische Mängelgründe, vor denen gewarnt wurde
- Begriffe, die vermieden werden sollten
- Länderspezifische Besonderheiten (falls besprochen)

## Nächste Schritte
- Empfehlungen für das weitere Vorgehen

Gespräch:
${notesText}`,
          history: [],
          systemContext: KLASSIFIZIERUNG_TEXT_CONTEXT
        })
      });

      setSummaryStep(4);

      if (!response.ok) throw new Error("Fehler bei der Zusammenfassung");

      const data = await response.json();
      setMeetingSummary(data.response);
      setShowSummaryModal(true);
    } catch (error) {
      console.error("Summary error:", error);
      setToast({ message: "Fehler beim Erstellen der Zusammenfassung", visible: true });
    } finally {
      setIsGeneratingSummary(false);
      setSummaryStep(0);
    }
  };

  const handleNavigateToAnmeldung = () => {
    if (voiceAssistantRef.current) {
      voiceAssistantRef.current.stopSession();
    }
    setShowSummaryModal(false);
    router.push("/dashboard/anmeldung");
  };

  return (
    <div className="space-y-6">
      {toast.visible && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Klassifizierungs-Beratung</h1>
            <p className="text-gray-600 mt-1">
              Optimieren Sie Ihre Waren- und Dienstleistungsbeschreibungen
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{meetingDuration}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Eingabemethode</span>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 cursor-help hover:text-gray-700 transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                  Wählen Sie, wie Sie mit dem Klassifizierungs-Berater kommunizieren möchten.
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

          <button
            onClick={generateSummary}
            disabled={isGeneratingSummary || meetingNotes.length <= 1}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isGeneratingSummary || meetingNotes.length <= 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            }`}
          >
            {isGeneratingSummary ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Erstelle Zusammenfassung...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Zusammenfassung erstellen
              </>
            )}
          </button>
        </div>

        {isGeneratingSummary && summaryStep > 0 && (
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">KI erstellt Klassifizierungs-Bericht...</h4>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {SUMMARY_STEPS.map((step) => {
                const isActive = summaryStep === step.id;
                const isCompleted = summaryStep > step.id;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 p-1.5 rounded transition-all duration-300 ${
                      isActive ? 'bg-white shadow-sm' : isCompleted ? 'opacity-60' : 'opacity-30'
                    }`}
                  >
                    <span className={`text-sm ${isActive ? 'animate-bounce' : ''}`}>
                      {isCompleted ? '✓' : step.icon}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                    {isActive && <Loader2 className="w-3 h-3 animate-spin text-blue-600 ml-auto" />}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(summaryStep / SUMMARY_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 order-1">
          {hasVoiceAssistant ? (
            <VoiceProvider>
              <KlassifizierungVoiceAssistant 
                ref={voiceAssistantRef}
                accessToken={accessToken} 
                inputMode={inputMode} 
                onMessageSent={handleMessageSent}
              />
            </VoiceProvider>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">
                Der Sprachassistent ist derzeit nicht verfügbar.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Bitte stellen Sie sicher, dass die Hume AI Zugangsdaten konfiguriert sind.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 order-2">
          {meetingNotes.length > 1 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Gesprächshistorie
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {meetingNotes.filter(n => n.type !== "system").slice(-10).map((note) => (
                  <div key={note.id} className={`text-sm p-3 rounded-lg ${
                    note.type === "user"
                      ? "bg-blue-50 text-gray-800"
                      : "bg-gray-50 text-gray-700"
                  }`}>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {note.type === "user" ? "Kunde:" : "Berater:"}
                    </span>
                    <span className="whitespace-pre-wrap">{note.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl overflow-hidden text-white">
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tipps für gute Klassifizierung
              </h3>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showHowItWorks ? 'rotate-180' : ''}`} />
            </button>
            {showHowItWorks && (
              <ul className="text-sm text-white/90 space-y-2 px-5 pb-5">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Beschreiben Sie konkret, was Sie verkaufen oder anbieten
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Vermeiden Sie zu breite Oberbegriffe wie "Waren aus Metall"
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Nutzen Sie TMclass-akzeptierte Begriffe
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Achten Sie auf die richtige Klassenzuordnung
                </li>
              </ul>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 text-sm">Häufige Fehler vermeiden</h4>
                <p className="text-amber-700 text-xs mt-1">
                  Unklare Formulierungen führen oft zu Mängelbescheiden. Der Berater hilft Ihnen, 
                  amtskonforme Beschreibungen zu erstellen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSummaryModal && meetingSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSummaryModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Klassifizierungs-Zusammenfassung</h2>
                    <p className="text-white/80 text-sm">
                      {new Date().toLocaleDateString("de-DE", { 
                        weekday: "long", 
                        day: "numeric", 
                        month: "long" 
                      })} · {meetingDuration}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-white/80 hover:text-white p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2.5 first:mt-0 text-gray-900">{children}</h2>,
                    h2: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 first:mt-0 text-blue-600 flex items-center gap-2">{children}</h3>,
                    h3: ({ children }) => <h4 className="text-sm font-semibold mt-4 mb-2 first:mt-0 text-gray-800">{children}</h4>,
                    p: ({ children }) => <p className="mb-3 last:mb-0 text-gray-700 leading-relaxed text-sm">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-700 text-sm">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  }}
                >
                  {meetingSummary}
                </ReactMarkdown>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between gap-3">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={handleNavigateToAnmeldung}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                Zur Anmeldung übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
