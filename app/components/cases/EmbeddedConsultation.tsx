"use client";

import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Keyboard, Loader2, Info, Lightbulb, Check, Clock, X, MessageCircle, Send, AlertCircle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

const KLAUS_SYSTEM_PROMPT = `Du bist Klaus, ein freundlicher und kompetenter Markenberater bei TrademarkIQ.

Du bist ein weltweit anerkannter Experte für Marken, Markenrecht und Markenstrategien.

Deine Expertise umfasst:

MARKENRECHT & ANMELDUNG:
- Alle großen Markenämter: DPMA (Deutschland), EUIPO (EU), WIPO (international), USPTO (USA), UKIPO (UK), JPO (Japan), CNIPA (China), und viele mehr
- Nizza-Klassifikation (alle 45 Klassen)
- Markenanmeldung und -überwachung
- Kollisionsprüfung und Widerspruchsverfahren
- Kosten, Fristen und Verfahrensabläufe

MARKENSTRATEGIE & BRANDING:
- Markenentwicklung und Markenaufbau
- Namensfindung und Markennamens-Strategien
- Markenpositionierung und Differenzierung
- Markenerweiterung und Markenarchitektur
- Internationale Markenstrategien

WICHTIG - Gesprächsführung:
- Stelle NICHT alle Fragen auf einmal! Das wirkt überwältigend.
- Führe ein natürliches Beratungsgespräch - eine Frage nach der anderen.
- Beginne immer mit einer freundlichen Bestätigung, dass du gerne hilfst.

DEINE AUFGABE:
Du berätst Kunden zu allen Fragen rund um Marken. Hilf ihnen dabei:
1. Einen passenden Markennamen zu finden oder zu bewerten
2. Die richtigen Nizza-Klassen für ihre Produkte/Dienstleistungen zu bestimmen
3. Die Zielländer für den Markenschutz zu wählen
4. Fragen zu Markenrecht und -strategie zu beantworten

WICHTIGE REGELN:
1. Du antwortest IMMER auf Deutsch
2. Du gibst praxisorientierte, verständliche Antworten
3. Du verbindest strategische und rechtliche Perspektiven
4. Du sprichst in einem freundlichen, professionellen Ton
5. Du bietest KEINE E-Mail-Berichte an und fragst NICHT nach E-Mail-Adressen

BEGRÜSSUNG: Beginne das Gespräch mit: 'Hallo, mein Name ist Klaus. Wie kann ich Ihnen heute bei Ihrer Marke helfen?'`;

interface EmbeddedVoiceAssistantProps {
  accessToken: string;
  inputMode: "sprache" | "text";
  onMessageSent: (message: string, type: "user" | "assistant") => void;
  onQuestionClick?: (question: string) => void;
  pendingQuestion: string | null;
  onPendingQuestionConsumed: () => void;
  onSessionStart: () => void;
  onSessionEnd: () => void;
}

interface TextMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const EmbeddedVoiceAssistant = forwardRef<{ stopSession: () => void }, EmbeddedVoiceAssistantProps>(
  ({ accessToken, inputMode, onMessageSent, pendingQuestion, onPendingQuestionConsumed, onSessionStart, onSessionEnd }, ref) => {
    const { status, connect, disconnect, sendUserInput, sendSessionSettings, messages } = useVoice();
    const [error, setError] = useState<string | null>(null);
    const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
    const [textInput, setTextInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionSettingsSent, setSessionSettingsSent] = useState(false);
    const textChatRef = useRef<HTMLDivElement>(null);
    const processedPairsRef = useRef<Set<string>>(new Set());
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      stopSession: () => {
        if (status.value === "connected") {
          disconnect();
        }
      },
    }));

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
                onMessageSent(userMsgBefore.content, "user");
              }
              onMessageSent(assistantMsg.content, "assistant");
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

    useEffect(() => {
      if (status.value === "connected") {
        sendSessionSettings({
          systemPrompt: KLAUS_SYSTEM_PROMPT
        });
        setSessionSettingsSent(true);
        onSessionStart();
      }
    }, [status.value, sendSessionSettings, onSessionStart]);

    useEffect(() => {
      if (status.value === "disconnected") {
        processedPairsRef.current = new Set();
        setSessionSettingsSent(false);
      }
    }, [status.value]);

    const prevStatusRef = useRef<string | null>(null);
    useEffect(() => {
      if (prevStatusRef.current === "connected" && status.value === "disconnected") {
        onSessionEnd();
      }
      prevStatusRef.current = status.value;
    }, [status.value, onSessionEnd]);

    useEffect(() => {
      if (status.value === "connected" && pendingQuestion && sessionSettingsSent) {
        const timeoutId = setTimeout(() => {
          sendUserInput(pendingQuestion);
          onPendingQuestionConsumed();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }, [status.value, pendingQuestion, sendUserInput, sessionSettingsSent, onPendingQuestionConsumed]);

    const handleToggle = async () => {
      try {
        setError(null);
        
        if (status.value === "connected") {
          await disconnect();
        } else {
          await connect({
            auth: {
              type: "accessToken" as const,
              value: accessToken,
            },
            hostname: "api.hume.ai",
            configId: "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
            sessionSettings: {
              type: "session_settings",
              systemPrompt: KLAUS_SYSTEM_PROMPT
            }
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
        body: JSON.stringify({ message, history })
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
      onMessageSent(message, "user");
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
        onMessageSent(response, "assistant");
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
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={textChatRef}>
            {textMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hallo! Ich bin Klaus</h3>
                <p className="text-gray-600 max-w-sm">
                  Ihr KI-Markenberater. Tippen Sie Ihre Frage ein oder wählen Sie eine Schnellfrage.
                </p>
              </div>
            )}
            {textMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.type === "user"
                      ? "bg-teal-600 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {msg.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
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
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Klaus denkt nach...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleTextSubmit} className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Tippen Sie Ihre Frage..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={isLoading || !textInput.trim()}
                className="px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>

          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        {status.value === "connected" ? (
          <div className="text-center">
            <div className="relative mb-6">
              <button
                onClick={handleToggle}
                className="w-28 h-28 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105"
              >
                <MicOff className="w-12 h-12 text-white" />
              </button>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">Verbunden</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-2">Ich höre zu...</p>
            <p className="text-sm text-gray-500">Klicken Sie zum Beenden</p>

            {messages.length > 0 && (
              <div className="mt-6 max-h-48 overflow-y-auto text-left">
                {messages
                  .filter(m => m.type === "assistant_message" && "message" in m && (m as any).message?.content)
                  .slice(-1)
                  .map((msg, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        }}
                      >
                        {("message" in msg && (msg as any).message?.content) || ""}
                      </ReactMarkdown>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hallo! Ich bin Klaus</h3>
            <p className="text-gray-600 mb-6 max-w-sm">
              Ihr KI-Markenberater. Klicken Sie auf 'Starten' oder wählen Sie eine Schnellfrage.
            </p>
            
            <button
              onClick={handleToggle}
              disabled={status.value === "connecting"}
              className="w-28 h-28 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
            >
              {status.value === "connecting" ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>
            <p className="mt-4 text-sm font-medium text-teal-600">
              {status.value === "connecting" ? "Verbinde..." : "Starten"}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2 max-w-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }
);

EmbeddedVoiceAssistant.displayName = "EmbeddedVoiceAssistant";

function EmbeddedConsultationInner({ caseId, accessToken, onComplete }: EmbeddedConsultationProps) {
  const [inputMode, setInputMode] = useState<"sprache" | "text">("sprache");
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [isEnding, setIsEnding] = useState(false);
  const [endingStep, setEndingStep] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState("00:00");
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const meetingNotesRef = useRef<MeetingNote[]>([]);
  const inputModeRef = useRef<"sprache" | "text">("sprache");
  const voiceAssistantRef = useRef<{ stopSession: () => void }>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    meetingNotesRef.current = meetingNotes;
  }, [meetingNotes]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setSessionDuration(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        setSessionDurationSeconds(diff);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime]);

  const handleSessionStart = useCallback(() => {
    if (!startTime) {
      setStartTime(new Date());
    }
  }, [startTime]);

  const handleSessionEnd = useCallback(() => {
  }, []);

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
    if (inputMode === "text") {
      const userMessage: MeetingNote = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        content: question,
        type: "user",
      };
      setMeetingNotes(prev => [...prev, userMessage]);
    } else {
      setPendingQuestion(question);
    }
  }, [inputMode]);

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
          duration: sessionDurationSeconds,
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
  const userMessages = meetingNotes.filter(n => n.type === "user");
  const assistantMessages = meetingNotes.filter(n => n.type === "assistant");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setInputMode("sprache")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === "sprache"
                  ? "bg-white text-teal-600 shadow-sm"
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
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Tippen
            </button>
          </div>

          {startTime && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{sessionDuration}</span>
            </div>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <VoiceProvider>
              <EmbeddedVoiceAssistant 
                ref={voiceAssistantRef}
                accessToken={accessToken} 
                inputMode={inputMode} 
                onMessageSent={handleMessageSent}
                pendingQuestion={pendingQuestion}
                onPendingQuestionConsumed={() => setPendingQuestion(null)}
                onSessionStart={handleSessionStart}
                onSessionEnd={handleSessionEnd}
              />
            </VoiceProvider>
          </div>

          {hasNotes && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-gray-900 text-sm">Gesprächsverlauf</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {meetingNotes.filter(n => n.type !== "system").length} Nachrichten
                  </span>
                </div>
                <div className={`transform transition-transform ${showTranscript ? "rotate-180" : ""}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {showTranscript && (
                <div className="border-t border-gray-100 p-4 max-h-80 overflow-y-auto">
                  <div className="space-y-3">
                    {meetingNotes.filter(n => n.type !== "system").map((note) => (
                      <div
                        key={note.id}
                        className={`flex ${note.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            note.type === "user"
                              ? "bg-teal-600 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          }`}
                        >
                          <div className={`text-xs mb-1 ${note.type === "user" ? "text-teal-200" : "text-gray-500"}`}>
                            {note.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            {note.type === "user" ? " • Sie" : " • Klaus"}
                          </div>
                          {note.type === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-sm">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-sm">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              }}
                            >
                              {note.content}
                            </ReactMarkdown>
                          ) : (
                            <span className="text-sm">{note.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h4 className="font-semibold text-gray-900 text-sm">Schnellfragen</h4>
            </div>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuestionClick(question)}
                  className="w-full text-left text-sm py-2.5 px-3 rounded-lg transition-all border bg-gray-50 hover:bg-teal-50 text-gray-700 hover:text-teal-700 border-gray-200 hover:border-teal-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl overflow-hidden text-white">
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-semibold text-sm">So funktioniert's</h4>
              </div>
              <div className={`transform transition-transform ${showHowItWorks ? "rotate-180" : ""}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {showHowItWorks && (
              <div className="px-4 pb-4">
                <ul className="space-y-3 text-sm text-white/90">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                    <span>
                      {inputMode === "sprache" 
                        ? "Klicken Sie auf 'Starten' und sprechen Sie Ihre Fragen"
                        : "Tippen Sie Ihre Fragen ins Textfeld"
                      }
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                    <span>Klären Sie Markennamen, Klassen und Länder</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                    <span>Beenden Sie die Beratung, um die Daten zu speichern</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {hasNotes && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">Statistik</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-teal-600">{userMessages.length}</div>
                  <div className="text-xs text-gray-500">Ihre Fragen</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-gray-700">{assistantMessages.length}</div>
                  <div className="text-xs text-gray-500">Antworten</div>
                </div>
              </div>
              {startTime && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Dauer</span>
                    <span className="font-medium text-gray-900">{sessionDuration}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmbeddedConsultation(props: EmbeddedConsultationProps) {
  return <EmbeddedConsultationInner {...props} />;
}

export default EmbeddedConsultation;
