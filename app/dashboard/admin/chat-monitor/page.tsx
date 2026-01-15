"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, User, Bot, Clock, Hash, DollarSign, Calendar, Filter, RefreshCw } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { ChatMonitorSkeleton } from "@/app/components/Skeleton";

interface ChatMessage{
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  caseId?: string;
  caseName?: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEur: string;
  credits: number;
  model?: string;
  durationMs?: number;
  createdAt: string;
}

interface ChatSession {
  sessionId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  caseId?: string;
  caseName?: string;
  messages: ChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostEur: number;
  totalCredits: number;
  startedAt: string;
}

export default function ChatMonitorPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "week" | "all">("week");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ totalSessions: 0, totalMessages: 0, totalTokens: 0, totalCost: 0, totalCredits: 0 });

  // Echte Daten von API laden
  const loadChatLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/chat-logs?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setStats(data.stats || { totalSessions: 0, totalMessages: 0, totalTokens: 0, totalCost: 0, totalCredits: 0 });
        // Ersten Session automatisch expandieren
        if (data.sessions?.length > 0) {
          setExpandedSessions(new Set([data.sessions[0].sessionId]));
        }
      }
    } catch (error) {
      console.error("Failed to load chat logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatLogs();
  }, [filter]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const totalStats = {
    sessions: sessions.length,
    messages: sessions.reduce((acc, s) => acc + s.messages.length, 0),
    tokens: sessions.reduce((acc, s) => acc + s.totalTokens, 0),
    cost: sessions.reduce((acc, s) => acc + s.totalCostEur, 0),
    credits: sessions.reduce((acc, s) => acc + s.totalCredits, 0),
  };


  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Berater-Monitor
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Alle Chat-Gespräche mit Token-Verbrauch und Kosten
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalStats.sessions}</p>
          <p className="text-xs text-gray-500">Gespräche</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalStats.messages}</p>
          <p className="text-xs text-gray-500">Nachrichten</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{totalStats.tokens.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Tokens</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-red-500">{totalStats.cost.toFixed(2)}€</p>
          <p className="text-xs text-gray-500">Deine Kosten</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-primary">{(totalStats.credits * 0.03).toFixed(2)}€</p>
          <p className="text-xs text-gray-500">Kunde zahlt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">+{((totalStats.credits * 0.03) - totalStats.cost).toFixed(2)}€</p>
          <p className="text-xs text-gray-500">Dein Gewinn</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-2">
          {(["today", "week", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "today" ? "Heute" : f === "week" ? "Diese Woche" : "Alle"}
            </button>
          ))}
        </div>
        <button 
          onClick={() => loadChatLogs()}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Lädt..." : "Aktualisieren"}
        </button>
      </div>

      {/* Loading State */}
      {loading && sessions.length === 0 && (
        <ChatMonitorSkeleton items={5} />
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Keine Chat-Gespräche gefunden</p>
          <p className="text-gray-400 text-sm mt-1">Chatte mit dem Berater, dann erscheinen hier die Logs</p>
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-4">
        {sessions.map((chatSession) => (
          <div key={chatSession.sessionId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Session Header */}
            <button
              onClick={() => toggleSession(chatSession.sessionId)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{chatSession.userName || chatSession.userEmail}</p>
                  <p className="text-xs text-gray-500">
                    Fall: {chatSession.caseName || "Kein Fall"} · {formatDate(chatSession.startedAt)} {formatTime(chatSession.startedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-gray-900">{chatSession.messages.length}</p>
                  <p className="text-xs text-gray-500">Nachr.</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-blue-600">{chatSession.totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Tokens</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-red-500">{chatSession.totalCostEur.toFixed(2)}€</p>
                  <p className="text-xs text-gray-500">Du zahlst</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">{(chatSession.totalCredits * 0.03).toFixed(2)}€</p>
                  <p className="text-xs text-gray-500">Kunde</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-green-600">+{((chatSession.totalCredits * 0.03) - chatSession.totalCostEur).toFixed(2)}€</p>
                  <p className="text-xs text-gray-500">Gewinn</p>
                </div>
                <span className="text-gray-400">
                  {expandedSessions.has(chatSession.sessionId) ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {/* Messages */}
            {expandedSessions.has(chatSession.sessionId) && (
              <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
                {chatSession.messages.map((msg) => (
                  <div key={msg.id} className="flex gap-4">
                    {/* Time */}
                    <div className="w-20 text-xs text-gray-400 pt-1">
                      {formatTime(msg.createdAt)}
                    </div>

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user" ? "bg-blue-100" : "bg-purple-100"
                    }`}>
                      {msg.role === "user" ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${
                          msg.role === "user" ? "text-blue-600" : "text-purple-600"
                        }`}>
                          {msg.role === "user" ? "USER" : "CLAUDE"}
                        </span>
                        {msg.role === "assistant" && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{msg.model}</span>
                            {msg.durationMs && (
                              <>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-400">{msg.durationMs}ms</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Token Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {msg.role === "user" ? (
                          <span className="text-blue-500">
                            <Hash className="w-3 h-3 inline mr-1" />
                            {msg.inputTokens} Input Tokens
                          </span>
                        ) : (
                          <>
                            <span className="text-purple-500">
                              <Hash className="w-3 h-3 inline mr-1" />
                              {msg.outputTokens} Output Tokens
                            </span>
                            <span className="text-orange-500">
                              <DollarSign className="w-3 h-3 inline mr-1" />
                              {msg.costEur}€
                            </span>
                            <span className="text-primary font-medium">
                              {msg.credits} Credits
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Session Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Zusammenfassung Gespräch</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Input: <strong className="text-blue-600">{chatSession.totalInputTokens.toLocaleString()}</strong></span>
                        <span>Output: <strong className="text-purple-600">{chatSession.totalOutputTokens.toLocaleString()}</strong></span>
                        <span>Gesamt: <strong>{chatSession.totalTokens.toLocaleString()}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-6 text-sm">
                        <span>Deine Kosten: <strong className="text-red-500">{chatSession.totalCostEur.toFixed(4)}€</strong></span>
                        <span>Kunde zahlt: <strong className="text-primary">{(chatSession.totalCredits * 0.03).toFixed(4)}€</strong></span>
                        <span>Gewinn: <strong className="text-green-600">+{((chatSession.totalCredits * 0.03) - chatSession.totalCostEur).toFixed(4)}€</strong></span>
                      </div>
                      <span className="text-lg font-bold text-primary">= {chatSession.totalCredits} Credits</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      {sessions.length > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-800 mb-2">✅ Live-Daten</h4>
          <p className="text-sm text-green-700">
            Diese Seite zeigt echte Chat-Logs aus der Datenbank. Jedes Gespräch mit dem KI-Berater wird automatisch protokolliert.
          </p>
        </div>
      )}
    </div>
  );
}
