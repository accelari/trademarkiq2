"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Send, Keyboard, MoreVertical, RefreshCw, Paperclip, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  imageUrl?: string;
}

export interface ClaudeAssistantHandle {
  sendQuestion: (question: string) => void;
  isConnected: () => boolean;
  startSession: (mode?: "voice" | "text") => void;
  simulateStreaming: (text: string) => Promise<void>;
}

interface ClaudeAssistantProps {
  caseId: string;
  onMessageSent?: (message: Message) => void;
  onDelete?: () => void;
  onImageUploaded?: (imageUrl: string) => void;
  previousMessages?: Message[];
  previousSummary?: string;
  title?: string;
  subtitle?: string;
  systemPromptAddition?: string;
  showImageUpload?: boolean;
  alwaysShowMessages?: boolean;
  autoConnect?: boolean;
}

const ClaudeAssistant = forwardRef<ClaudeAssistantHandle, ClaudeAssistantProps>(
  ({ caseId, onMessageSent, onDelete, onImageUploaded, previousMessages = [], previousSummary, title, subtitle, systemPromptAddition, showImageUpload = false, alwaysShowMessages = false, autoConnect = false }, ref) => {
    const [isConnected, setIsConnected] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [textInput, setTextInput] = useState("");
    const [messages, setMessages] = useState<Message[]>(previousMessages);
    const [streamingResponse, setStreamingResponse] = useState("");
    const [error, setError] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingQuestionsRef = useRef<string[]>([]);
    const isInitialLoadRef = useRef(true);
    const ignorePreviousMessagesRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

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

    // Trigger aus Nachricht entfernen für Anzeige (System behält sie intern)
    const cleanMessageForDisplay = useCallback((content: string) => {
      return content
        .replace(/\[MARKE:[^\]]+\]/g, "")
        .replace(/\[KLASSEN:[^\]]+\]/g, "")
        .replace(/\[LAENDER:[^\]]+\]/g, "")
        .replace(/\[ART:[^\]]+\]/g, "")
        .replace(/\[GOTO:[^\]]+\]/g, "")
        .replace(/\[SYSTEM:[^\]]+\]/g, "")
        .replace(/\[LOGO_GENERIEREN\]/g, "")
        .replace(/\[RECHERCHE_STARTEN\]/g, "")
        .replace(/\s{2,}/g, " ") // Mehrfache Leerzeichen entfernen
        .trim();
    }, []);

    // Prüfen ob Nachricht ein System-Prompt ist (nicht anzeigen)
    const isSystemMessage = useCallback((content: string) => {
      return content.trim().startsWith("[SYSTEM:");
    }, []);

    const scrollToBottom = useCallback(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, streamingResponse, scrollToBottom]);

    useEffect(() => {
      if (previousMessages.length === 0) {
        ignorePreviousMessagesRef.current = false;
      }
      if (!ignorePreviousMessagesRef.current && previousMessages.length > 0 && messages.length === 0) {
        setMessages(previousMessages);
        // Scroll nach unten nach dem Laden der vorherigen Nachrichten
        setTimeout(() => scrollToBottom(), 100);
      }
      if (isInitialLoadRef.current) {
        setTimeout(() => {
          isInitialLoadRef.current = false;
          // Scroll nach unten nach Initial-Load
          scrollToBottom();
        }, 500);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previousMessages, messages.length]);

    // Auto-Start: Automatically start session and request greeting
    const hasAutoStartedRef = useRef(false);
    
    const requestGreeting = useCallback(async () => {
      if (isLoading) return;
      
      setError(null);
      setIsLoading(true);
      setStreamingResponse("");

      try {
        abortControllerRef.current = new AbortController();
        
        // Send empty messages array - Claude will generate greeting based on system prompt
        const response = await fetch("/api/claude-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Hallo!" }],
            systemPromptAddition,
            previousSummary,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error("API request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  fullResponse += data.text;
                  setStreamingResponse(fullResponse);
                } else if (data.type === "done") {
                  const assistantMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: fullResponse,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, assistantMessage]);
                  onMessageSent?.(assistantMessage);
                  setStreamingResponse("");
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }, [systemPromptAddition, previousSummary, onMessageSent, isLoading]);

    useEffect(() => {
      // Auto-start: wenn keine Nachrichten da sind, starte automatisch mit Begrüßung
      if (!hasAutoStartedRef.current && !isConnected && !isLoading && messages.length === 0 && previousMessages.length === 0) {
        hasAutoStartedRef.current = true;
        setTimeout(() => {
          setIsConnected(true);
          requestGreeting();
        }, 500);
      }
      // Auto-connect: wenn vorherige Nachrichten da sind
      else if (autoConnect && previousMessages.length > 0 && !isConnected && !isLoading && !hasAutoStartedRef.current) {
        hasAutoStartedRef.current = true;
        setTimeout(() => {
          setIsConnected(true);
        }, 300);
      }
    }, [autoConnect, previousMessages.length, messages.length, isConnected, isLoading, requestGreeting]);

    const addMessage = useCallback((role: "user" | "assistant", content: string) => {
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      onMessageSent?.(newMessage);
      return newMessage;
    }, [onMessageSent]);

    const sendMessage = useCallback(async (text: string) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);
      setStreamingResponse("");

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      onMessageSent?.(userMessage);

      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortControllerRef.current = new AbortController();
        
        const response = await fetch("/api/claude-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            systemPromptAddition,
            previousSummary,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("API request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  fullResponse += data.text;
                  setStreamingResponse(fullResponse);
                } else if (data.type === "done") {
                  // Add final assistant message
                  const assistantMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: fullResponse,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, assistantMessage]);
                  onMessageSent?.(assistantMessage);
                  setStreamingResponse("");
                } else if (data.type === "error") {
                  setError(data.error);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled
          return;
        }
        console.error("Claude API error:", err);
        setError(err instanceof Error ? err.message : "Verbindungsfehler");
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }, [messages, systemPromptAddition, previousSummary, onMessageSent, isLoading]);

    const startSession = useCallback((mode: "voice" | "text" = "text") => {
      setIsConnected(true);
      setError(null);

      // Process pending questions
      if (pendingQuestionsRef.current.length > 0) {
        const questions = [...pendingQuestionsRef.current];
        pendingQuestionsRef.current = [];
        questions.forEach((q, idx) => {
          setTimeout(() => sendMessage(q), idx * 500);
        });
      } else if (messages.length === 0 && !hasAutoStartedRef.current) {
        // Request greeting from Claude
        hasAutoStartedRef.current = true;
        requestGreeting();
      }
    }, [messages.length, sendMessage, requestGreeting]);

    const handleSendText = useCallback(() => {
      if (!textInput.trim() || isLoading) return;
      sendMessage(textInput.trim());
      setTextInput("");
    }, [textInput, sendMessage, isLoading]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    }, [handleSendText]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        setError("Datei zu groß (max. 5 MB)");
        return;
      }
      
      const url = URL.createObjectURL(file);
      
      const imageMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "[Bild hochgeladen]",
        timestamp: new Date(),
        imageUrl: url
      };
      setMessages(prev => [...prev, imageMessage]);
      onMessageSent?.(imageMessage);
      onImageUploaded?.(url);
      
      // Inform assistant about the image
      sendMessage("Ich habe gerade ein Bild/Logo hochgeladen. Bitte bestätige, dass du es siehst und es als mein Logo verwendet werden kann.");
      
      e.target.value = "";
    }, [onMessageSent, onImageUploaded, sendMessage]);

    // Simulate streaming for context messages (like when switching accordions)
    const simulateStreaming = useCallback(async (text: string) => {
      if (isLoading) return;
      
      setIsConnected(true);
      setIsLoading(true);
      setStreamingResponse("");
      
      // Simulate typing effect - faster than real API
      const words = text.split(" ");
      let currentText = "";
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? " " : "") + words[i];
        setStreamingResponse(currentText);
        await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per word
      }
      
      // Add complete message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      onMessageSent?.(assistantMessage);
      setStreamingResponse("");
      setIsLoading(false);
    }, [isLoading, onMessageSent]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      sendQuestion: (question: string) => {
        if (isConnected && !isLoading) {
          sendMessage(question);
        } else {
          pendingQuestionsRef.current.push(question);
          if (!isConnected) {
            startSession("text");
          }
        }
      },
      isConnected: () => isConnected,
      startSession,
      simulateStreaming,
    }), [isConnected, isLoading, sendMessage, startSession, simulateStreaming]);

    // Auto-focus textarea after loading completes
    useEffect(() => {
      if (!isLoading && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [isLoading]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, []);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      ignorePreviousMessagesRef.current = true;
      setMessages([]);
      setStreamingResponse("");
      setIsConnected(false);
      onDelete?.();
      setTimeout(() => {
        startSession("text");
      }, 300);
    }, [onDelete, startSession]);

    return (
      <div className="relative flex flex-col h-full bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 s-gradient-header rounded-t-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => startSession("text")}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Beratung starten"
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{title || "KI-Markenberater"}</div>
              <div className="text-xs text-white/85 truncate">{subtitle || "Schriftliche Beratung"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0"
          style={{ maxHeight: "400px" }}
        >
          <>
              {messages
                .filter((message) => !isSystemMessage(message.content)) // System-Prompts nicht anzeigen
                .map((message) => {
                  const displayContent = cleanMessageForDisplay(message.content);
                  // Leere Nachrichten nach Trigger-Entfernung nicht anzeigen
                  if (!displayContent && !message.imageUrl) return null;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          message.role === "user"
                            ? "bg-teal-600 text-white rounded-br-md"
                            : "bg-gray-100 text-gray-900 rounded-bl-md"
                        }`}
                      >
                        {message.imageUrl && (
                          <img 
                            src={message.imageUrl} 
                            alt="Uploaded" 
                            className="max-w-full max-h-48 rounded-lg mb-2"
                          />
                        )}
                        {displayContent && (
                          <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                        )}
                        <p className={`text-xs mt-1 ${
                          message.role === "user" ? "text-teal-100" : "text-gray-400"
                        }`}>
                          {formatMessageDateTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              
              {/* Streaming response */}
              {streamingResponse && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-gray-100 text-gray-900 rounded-bl-md">
                    <p className="text-sm whitespace-pre-wrap">{cleanMessageForDisplay(streamingResponse)}</p>
                    <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1" />
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && !streamingResponse && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input Area - always visible */}
        <div className="p-4 border-t border-gray-200">
            <div className="flex items-end gap-2">
              {showImageUpload && (
                <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Paperclip className="w-5 h-5" />
                </label>
              )}
              
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Nachricht eingeben..."
                  className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  rows={1}
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  onClick={handleSendText}
                  disabled={!textInput.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-1.5 text-teal-600 hover:text-teal-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
        </div>
      </div>
    );
  }
);

ClaudeAssistant.displayName = "ClaudeAssistant";

export default ClaudeAssistant;
