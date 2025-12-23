"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Phone, PhoneOff, Send, Keyboard, Volume2, Trash2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTranscription?: boolean;
}

export interface VoiceAssistantHandle {
  sendQuestion: (question: string) => void;
  isConnected: () => boolean;
}

interface OpenAIVoiceAssistantProps {
  caseId: string;
  onMessageSent?: (message: Message) => void;
  onDelete?: () => void;
  previousMessages?: Message[];
  previousSummary?: string;
}

const OpenAIVoiceAssistant = forwardRef<VoiceAssistantHandle, OpenAIVoiceAssistantProps>(
  ({ caseId, onMessageSent, onDelete, previousMessages = [], previousSummary }, ref) => {
    const [isConnected, setIsConnected] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
    const [textInput, setTextInput] = useState("");
    const [messages, setMessages] = useState<Message[]>(previousMessages);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const [assistantResponse, setAssistantResponse] = useState("");
    const [error, setError] = useState<string | null>(null);
    
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pendingQuestionsRef = useRef<string[]>([]);
    const isInitialLoadRef = useRef(true);

    const scrollToBottom = useCallback(() => {
      if (!isInitialLoadRef.current && messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, currentTranscript, assistantResponse, scrollToBottom]);

    useEffect(() => {
      if (previousMessages.length > 0 && messages.length === 0) {
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
    
    const connect = useCallback(async () => {
      if (isConnectingRef.current || isConnected) return;
      
      isConnectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      try {
        // Get ephemeral token from our server
        const currentConversation = messages.length > 0 
          ? messages.map(m => `${m.role === 'user' ? 'Kunde' : 'Klaus'}: ${m.content}`).join('\n')
          : '';
        
        const tokenResponse = await fetch("/api/openai-realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previousSummary, currentConversation })
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get session token");
        }

        const { client_secret: clientSecret } = await tokenResponse.json();

        // Create peer connection with STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        });
        peerConnectionRef.current = pc;

        // Set up audio element for playback
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElementRef.current = audioEl;

        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
        };

        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Create data channel for events
        const dc = pc.createDataChannel("oai-events");
        dataChannelRef.current = dc;

        dc.onopen = () => {
          console.log("Data channel opened");
          if (pendingQuestionsRef.current.length > 0) {
            pendingQuestionsRef.current.forEach((q, idx) => {
              setTimeout(() => sendTextMessage(q), idx * 500);
            });
            pendingQuestionsRef.current = [];
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

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
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

        // Get the final SDP with ICE candidates
        const finalSdp = pc.localDescription?.sdp;
        if (!finalSdp) {
          throw new Error("Failed to generate SDP");
        }

        // Connect to OpenAI Realtime
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
    }, [isConnected, sendTextMessage, previousSummary, messages]);

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
            connect();
          }
        }
      },
      isConnected: () => isConnected
    }), [isConnected, connect, sendTextMessage]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        disconnect();
      };
    }, [disconnect]);

    return (
      <div className="relative flex flex-col h-full bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="font-medium text-gray-900">
              Klaus - Markenrechtsberater
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputMode(inputMode === "voice" ? "text" : "voice")}
              className={`p-2 rounded-lg transition-colors ${
                inputMode === "text" 
                  ? "bg-teal-100 text-teal-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={inputMode === "voice" ? "Zu Text wechseln" : "Zu Sprache wechseln"}
            >
              {inputMode === "voice" ? <Keyboard className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {/* Delete Button - only show when there are saved messages */}
            {previousMessages.length > 0 && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Chatverlauf löschen"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] custom-scrollbar">
          {messages.length === 0 && !isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Phone className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-center">
                Klicken Sie auf "{previousMessages.length > 0 ? 'Beratung fortsetzen' : 'Beratung starten'}" um mit Klaus zu sprechen.
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
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.isTranscription && (
                  <span className="text-xs opacity-70 mt-1 block">
                    (Transkribiert)
                  </span>
                )}
              </div>
            </div>
          ))}

          {currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg p-3 bg-teal-400 text-white opacity-70">
                <p>{currentTranscript}</p>
              </div>
            </div>
          )}

          {assistantResponse && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                <p className="whitespace-pre-wrap">{assistantResponse}</p>
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
              onClick={connect}
              disabled={isConnecting}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
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

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-50">
            <div className="bg-white rounded-lg p-6 m-4 max-w-sm shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Chatverlauf löschen?</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Der gesamte Chatverlauf mit Klaus wird gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg border border-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Ja, löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

OpenAIVoiceAssistant.displayName = "OpenAIVoiceAssistant";

export default OpenAIVoiceAssistant;
