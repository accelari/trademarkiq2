"use client";

import { useVoice } from "@humeai/voice-react";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

export default function Messages() {
  const { messages, sendUserInput, status } = useVoice();
  const [inputText, setInputText] = useState("");
  const [persistentMessages, setPersistentMessages] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setPersistentMessages(messages);
    }
  }, [messages]);

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

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="max-h-64 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
        {persistentMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">
              {isConnected 
                ? "Sprechen Sie oder schreiben Sie eine Nachricht..." 
                : "Klicken Sie auf 'Starten' um zu beginnen"}
            </p>
          </div>
        ) : (
          persistentMessages.map((msg, index) => {
            if (msg.type === "user_message") {
              return (
                <div key={index} className="flex justify-end animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="bg-gray-100 text-gray-900 rounded-sm rounded-tr-none px-4 py-2.5 text-sm">
                      {msg.message.content}
                    </div>
                  </div>
                </div>
              );
            } else if (msg.type === "assistant_message") {
              return (
                <div key={index} className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Markenberater
                    </div>
                    <div className="bg-primary/10 text-gray-900 rounded-sm rounded-tl-none px-4 py-2.5 text-sm border border-primary/20">
                      {msg.message.content}
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
          className="flex-1 s-input py-2.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Textnachricht eingeben"
        />
        <button
          type="submit"
          disabled={!isConnected || !inputText.trim()}
          className={`px-4 rounded-sm transition-all flex items-center justify-center ${
            inputText.trim() && isConnected
              ? 'bg-primary hover:bg-primary-hover text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Nachricht senden"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
