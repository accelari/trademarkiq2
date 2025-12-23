"use client";

import { useVoice } from "@humeai/voice-react";
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";

const KLAUS_SYSTEM_PROMPT = `Du bist Klaus, ein freundlicher und kompetenter Markenberater bei TrademarkIQ.

Du bist ein weltweit anerkannter Experte für Marken, Markenrecht und Markenstrategien.

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
3. Du sprichst in einem freundlichen, professionellen Ton`;

export interface VoiceAssistantHandle {
  sendQuestion: (question: string) => void;
  isConnected: () => boolean;
}

interface VoiceAssistantProps {
  accessToken: string;
  embedded?: boolean;
  onMessageSent?: (messages: { role: "user" | "assistant"; content: string }[]) => void;
}

const VoiceAssistant = forwardRef<VoiceAssistantHandle, VoiceAssistantProps>(({ accessToken, embedded = false, onMessageSent }, ref) => {
  const { 
    messages, 
    sendUserInput, 
    status, 
    connect, 
    disconnect,
    isMuted,
    mute,
    unmute,
  } = useVoice();

  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const isConnectingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    sendQuestion: async (question: string) => {
      if (status.value === "connected") {
        sendUserInput(question);
      } else {
        setPendingQuestions(prev => [...prev, question]);
        if (!isConnectingRef.current && status.value !== "connecting") {
          isConnectingRef.current = true;
          try {
            await connect({
              auth: {
                type: "accessToken" as const,
                value: accessToken,
              },
              hostname: "api.hume.ai",
              configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
              sessionSettings: {
                type: "session_settings",
                systemPrompt: KLAUS_SYSTEM_PROMPT
              }
            });
          } catch (err) {
            console.error("Failed to connect:", err);
            setPendingQuestions([]);
          } finally {
            isConnectingRef.current = false;
          }
        }
      }
    },
    isConnected: () => status.value === "connected",
  }));

  useEffect(() => {
    if (status.value === "connected" && pendingQuestions.length > 0) {
      const timer = setTimeout(() => {
        pendingQuestions.forEach((q, idx) => {
          setTimeout(() => sendUserInput(q), idx * 300);
        });
        setPendingQuestions([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status.value, pendingQuestions, sendUserInput]);
  
  const [inputText, setInputText] = useState("");
  const [persistentMessages, setPersistentMessages] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setPersistentMessages(messages);
      
      if (messages.length > prevMessagesLengthRef.current && onMessageSent) {
        const formattedMessages = messages
          .filter((m) => m.type === "user_message" || m.type === "assistant_message")
          .map((m) => ({
            role: (m.type === "user_message" ? "user" : "assistant") as "user" | "assistant",
            content: m.type === "user_message" || m.type === "assistant_message" 
              ? (m as any).message?.content || "" 
              : "",
          }))
          .filter((m) => m.content);
        onMessageSent(formattedMessages);
      }
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, onMessageSent]);

  useEffect(() => {
    scrollToBottom();
  }, [persistentMessages]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && status.value === "connected") {
      sendUserInput(inputText.trim());
      setInputText("");
    }
  };

  const isConnected = status.value === "connected";
  const isConnecting = status.value === "connecting";

  const handleToggleConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      try {
        await connect({
          auth: {
            type: "accessToken" as const,
            value: accessToken,
          },
          hostname: "api.hume.ai",
          configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "e4c377e1-6a8c-429f-a334-9325c30a1fc3",
          sessionSettings: {
            type: "session_settings",
            systemPrompt: KLAUS_SYSTEM_PROMPT
          }
        });
      } catch (err) {
        console.error("Failed to connect:", err);
      }
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? "" : "h-full"}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : 
            isConnecting ? "bg-yellow-500 animate-pulse" : "bg-gray-400"
          }`} />
          <span className="text-sm font-medium text-gray-700">
            {isConnected ? "Verbunden" : isConnecting ? "Verbinde..." : "Nicht verbunden"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={isMuted ? unmute : mute}
              className={`p-2 rounded-lg transition-colors ${
                isMuted ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={isMuted ? "Ton aktivieren" : "Stummschalten"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleToggleConnection}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isConnected 
                ? "bg-red-100 text-red-700 hover:bg-red-200" 
                : isConnecting
                ? "bg-gray-100 text-gray-500 cursor-wait"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {isConnected ? (
              <>
                <PhoneOff className="w-4 h-4" />
                Beenden
              </>
            ) : isConnecting ? (
              <>
                <Phone className="w-4 h-4 animate-pulse" />
                Verbinde...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Starten
              </>
            )}
          </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className={`overflow-y-auto space-y-3 mb-4 custom-scrollbar ${embedded ? "max-h-80" : "flex-1"}`}
      >
        {persistentMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-sm">
              {isConnected 
                ? "Sprechen Sie oder schreiben Sie eine Nachricht..." 
                : "Klicken Sie auf 'Starten' um die Beratung zu beginnen"}
            </p>
          </div>
        ) : (
          persistentMessages.map((msg, index) => {
            if (msg.type === "user_message") {
              return (
                <div key={index} className="flex justify-end animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="bg-gray-100 text-gray-900 rounded-lg rounded-tr-none px-4 py-2.5 text-sm">
                      {msg.message?.content}
                    </div>
                  </div>
                </div>
              );
            } else if (msg.type === "assistant_message") {
              return (
                <div key={index} className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="text-xs text-teal-600 font-semibold mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                      Markenberater
                    </div>
                    <div className="bg-teal-50 text-gray-900 rounded-lg rounded-tl-none px-4 py-2.5 text-sm border border-teal-100">
                      {msg.message?.content}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })
        )}
      </div>

      <form onSubmit={handleSendText} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isConnected ? "Schreiben Sie hier..." : "Klicken Sie 'Starten' um zu beginnen..."}
          disabled={!isConnected}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!isConnected || !inputText.trim()}
          className={`px-4 rounded-lg transition-all flex items-center justify-center ${
            inputText.trim() && isConnected
              ? "bg-teal-600 hover:bg-teal-700 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
});

VoiceAssistant.displayName = "VoiceAssistant";

export default VoiceAssistant;
