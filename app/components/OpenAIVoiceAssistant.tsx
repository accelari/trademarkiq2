"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Phone, PhoneOff, Send, Keyboard, Volume2, MoreVertical, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  isTranscription?: boolean;
}

export interface VoiceAssistantHandle {
  sendQuestion: (question: string) => void;
  isConnected: () => boolean;
  startSession: (mode?: "voice" | "text") => void;
}

interface OpenAIVoiceAssistantProps {
  caseId: string;
  onMessageSent?: (message: Message) => void;
  onDelete?: () => void;
  previousMessages?: Message[];
  previousSummary?: string;
  title?: string;
  subtitle?: string;
  systemPromptAddition?: string;
}

const OpenAIVoiceAssistant = forwardRef<VoiceAssistantHandle, OpenAIVoiceAssistantProps>(
  ({ caseId, onMessageSent, onDelete, previousMessages = [], previousSummary, title, subtitle, systemPromptAddition }, ref) => {
    const [isConnected, setIsConnected] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
    const [textInput, setTextInput] = useState("");
    const [messages, setMessages] = useState<Message[]>(previousMessages);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const [assistantResponse, setAssistantResponse] = useState("");
    const [error, setError] = useState<string | null>(null);
    const connectedWithMicRef = useRef<boolean>(false);
    
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pendingQuestionsRef = useRef<string[]>([]);
    const isInitialLoadRef = useRef(true);
    const ignorePreviousMessagesRef = useRef(false);

    const formatMessageDateTime = useCallback((value: Date | string) => {
      try {
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "";
      }
    }, []);

    const scrollToBottom = useCallback(() => {
      if (!isInitialLoadRef.current && messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, []);

    useEffect(() => {
      if (audioElementRef.current) {
        audioElementRef.current.muted = inputMode !== "voice";
      }
    }, [inputMode]);

    useEffect(() => {
      scrollToBottom();
    }, [messages, currentTranscript, assistantResponse, scrollToBottom]);

    useEffect(() => {
      if (previousMessages.length === 0) {
        ignorePreviousMessagesRef.current = false;
      }
      if (!ignorePreviousMessagesRef.current && previousMessages.length > 0 && messages.length === 0) {
        setMessages(previousMessages);
      }
      if (isInitialLoadRef.current) {
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    }, [previousMessages, messages.length]);

    const addMessage = useCallback((role: "user" | "assistant", content: string, isTranscription = false) => {
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date(),
        isTranscription
      };
      setMessages(prev => [...prev, newMessage]);
      onMessageSent?.(newMessage);
      return newMessage;
    }, [onMessageSent]);

    const sendTextMessage = useCallback((text: string) => {
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
        console.error("Data channel not ready");
        return;
      }

      const event = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }]
        }
      };
      
      dataChannelRef.current.send(JSON.stringify(event));
      dataChannelRef.current.send(JSON.stringify({ type: "response.create" }));
      addMessage("user", text);
    }, [addMessage]);

    const isConnectingRef = useRef(false);

    const disconnect = useCallback(() => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
        audioElementRef.current = null;
      }

      setIsConnected(false);
      setCurrentTranscript("");
      setAssistantResponse("");
    }, []);

    const handleServerEvent = useCallback((event: any) => {
      switch (event.type) {
        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript) {
            addMessage("user", event.transcript, true);
          }
          setCurrentTranscript("");
          break;

        case "response.audio_transcript.delta":
          setAssistantResponse(prev => prev + (event.delta || ""));
          break;

        case "response.audio_transcript.done":
          if (assistantResponse || event.transcript) {
            addMessage("assistant", event.transcript || assistantResponse);
          }
          setAssistantResponse("");
          break;

        case "response.done":
          setAssistantResponse("");
          break;

        case "input_audio_buffer.speech_started":
          setCurrentTranscript("...");
          break;

        case "error":
          console.error("Server error:", event.error);
          setError(event.error?.message || "Serverfehler");
          break;
      }
    }, [addMessage, assistantResponse]);

    const connect = useCallback(async (withMic: boolean = true) => {
      if (isConnectingRef.current || isConnected) return;

      isConnectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      try {
        const currentConversation = messages.length > 0
          ? messages.map(m => `${m.role === 'user' ? 'Kunde' : 'Klaus'}: ${m.content}`).join('\n')
          : '';

        const tokenResponse = await fetch("/api/openai-realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previousSummary, currentConversation, systemPromptAddition })
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get session token");
        }

        const { client_secret: clientSecret } = await tokenResponse.json();

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        });
        peerConnectionRef.current = pc;

        connectedWithMicRef.current = withMic;

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.muted = inputMode !== "voice";
        audioElementRef.current = audioEl;

        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
        };

        if (withMic) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        } else {
          pc.addTransceiver("audio", { direction: "recvonly" });
          localStreamRef.current = null;
        }

        const dc = pc.createDataChannel("oai-events");
        dataChannelRef.current = dc;

        dc.onopen = () => {
          if (pendingQuestionsRef.current.length > 0) {
            pendingQuestionsRef.current.forEach((q, idx) => {
              setTimeout(() => sendTextMessage(q), idx * 500);
            });
            pendingQuestionsRef.current = [];
          } else if (messages.length === 0) {
            // Sofortige Begrüßung wenn keine vorherigen Nachrichten
            const greeting = {
              type: "response.create",
              response: {
                modalities: ["text", "audio"],
                instructions: "Begrüße den Kunden freundlich per Du. Sag 'Hallo!' oder 'Guten Tag!' und frag kurz wie du helfen kannst. Maximal 1 Satz. Nenne NICHT deinen Namen. Sei freundlich und professionell, nicht zu jugendlich."
              }
            };
            dc.send(JSON.stringify(greeting));
          } else {
            // Beratung fortsetzen - sende einfache Aufforderung, System-Prompt hat bereits den Kontext
            const continuation = {
              type: "response.create",
              response: {
                modalities: ["text", "audio"]
              }
            };
            dc.send(JSON.stringify(continuation));
          }
        };

        dc.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data);
            handleServerEvent(event);
          } catch (err) {
            console.error("Failed to parse server event:", err);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") {
            resolve();
          } else {
            const checkState = () => {
              if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", checkState);
                resolve();
              }
            };
            pc.addEventListener("icegatheringstatechange", checkState);
            setTimeout(() => resolve(), 3000);
          }
        });

        const finalSdp = pc.localDescription?.sdp;
        if (!finalSdp) {
          throw new Error("Failed to generate SDP");
        }

        const sdpResponse = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp"
            },
            body: finalSdp
          }
        );

        if (!sdpResponse.ok) {
          throw new Error("Failed to connect to OpenAI Realtime");
        }

        const answerSdp = await sdpResponse.text();
        
        // Prüfe ob Verbindung noch offen ist bevor setRemoteDescription
        if (pc.signalingState === "closed") {
          console.warn("RTCPeerConnection already closed, aborting");
          return;
        }
        
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        setIsConnected(true);
      } catch (err) {
        console.error("Connection error:", err);
        setError(err instanceof Error ? err.message : "Verbindungsfehler");
        disconnect();
      } finally {
        isConnectingRef.current = false;
        setIsConnecting(false);
      }
    }, [disconnect, handleServerEvent, inputMode, isConnected, messages, previousSummary, sendTextMessage]);

    const startSession = useCallback(
      (mode: "voice" | "text" = "voice") => {
        setInputMode(mode);
        if (!isConnected && !isConnectingRef.current) {
          connect(mode === "voice");
          return;
        }

        if (mode === "voice" && isConnected && !connectedWithMicRef.current && !isConnectingRef.current) {
          disconnect();
          setTimeout(() => {
            connect(true);
          }, 50);
        }
      },
      [connect, disconnect, isConnected]
    );

    const toggleMute = useCallback(() => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsMuted(!audioTrack.enabled);
        }
      }
    }, []);

    const handleSendText = useCallback(() => {
      if (!textInput.trim()) return;
      sendTextMessage(textInput.trim());
      setTextInput("");
    }, [textInput, sendTextMessage]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    }, [handleSendText]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      sendQuestion: (question: string) => {
        const channelReady = dataChannelRef.current?.readyState === "open";
        if (isConnected && channelReady) {
          sendTextMessage(question);
        } else {
          pendingQuestionsRef.current.push(question);
          if (!isConnectingRef.current && !isConnected) {
            connect(false);
          }
        }
      },
      isConnected: () => isConnected,
      startSession,
    }), [isConnected, connect, sendTextMessage, startSession]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        disconnect();
      };
    }, [disconnect]);

    // Close menu on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowMenu(false);
        }
      };
      if (showMenu) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [showMenu]);

    const handleNewSession = useCallback(() => {
      setShowMenu(false);
      disconnect();
      ignorePreviousMessagesRef.current = true;
      setMessages([]);
      onDelete?.();
      // Automatisch neue Sitzung starten nach kurzer Verzögerung
      setTimeout(() => {
        startSession(inputMode);
      }, 300);
    }, [disconnect, onDelete, startSession, inputMode]);

    return (
      <div className="relative flex flex-col h-full bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 s-gradient-header rounded-t-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => startSession("voice")}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Beratung per Sprache starten"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{title || "KI-Markenberater"}</div>
              <div className="text-xs text-white/85 truncate">{subtitle || "Sprachgesteuerte Beratung"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMode = inputMode === "voice" ? "text" : "voice";
                startSession(nextMode);
              }}
              className={`p-2 rounded-lg transition-colors ${
                inputMode === "text"
                  ? "bg-white/20 text-white hover:bg-white/25"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={inputMode === "voice" ? "Zu Text wechseln" : "Zu Sprache wechseln"}
            >
              {inputMode === "voice" ? <Keyboard className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Options Menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Optionen"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleNewSession}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Neue Sitzung starten
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] custom-scrollbar">
          {messages.length === 0 && !isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Phone className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm text-center leading-relaxed">
                Klick auf "{previousMessages.length > 0 ? 'Beratung fortsetzen' : 'Beratung starten'}" um loszulegen.
              </p>
            </div>
          )}

          {messages.length === 0 && isConnected && !assistantResponse && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-12 h-12 mb-3 rounded-full bg-teal-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-center text-teal-600 font-medium">
                Einen Moment...
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-gray-200 text-gray-900"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.isTranscription && (
                  <span className="text-xs opacity-70 mt-1 block">
                    (Transkribiert)
                  </span>
                )}
                <div className="text-[10px] text-gray-500 mt-1">
                  {formatMessageDateTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg p-3 bg-gray-200 text-gray-900 opacity-80">
                <p className="text-sm leading-relaxed">{currentTranscript}</p>
              </div>
            </div>
          )}

          {assistantResponse && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{assistantResponse}</p>
                <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          {!isConnected ? (
            <button
              onClick={() => startSession(inputMode)}
              disabled={isConnecting}
              className="w-full py-3 px-4 s-gradient-button text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verbinde...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  {previousMessages.length > 0 ? 'Beratung fortsetzen' : 'Beratung starten'}
                </>
              )}
            </button>
          ) : inputMode === "voice" ? (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  isMuted
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-teal-100 text-teal-600 hover:bg-teal-200"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={disconnect}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ihre Nachricht an Klaus..."
                className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="px-4 py-3 s-gradient-button rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                onClick={disconnect}
                className="px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

OpenAIVoiceAssistant.displayName = "OpenAIVoiceAssistant";

export default OpenAIVoiceAssistant;
