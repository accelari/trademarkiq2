"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, User, Mail, Calendar, Clock, Eye, MousePointer, 
  MessageSquare, Briefcase, RefreshCw, ChevronDown, ChevronUp,
  FileText, AlertCircle, CheckCircle, XCircle
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  isAdmin: boolean;
  credits?: number;
}

interface Session {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  pageViews: number;
  events: number;
  entryPage: string | null;
  exitPage: string | null;
  device: string | null;
  browser: string | null;
}

interface Event {
  id: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  pagePath: string | null;
  elementId: string | null;
  elementText: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Chat {
  id: string;
  role: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEur: string | null;
  credits: number;
  createdAt: string;
}

interface Case {
  id: string;
  caseNumber: string;
  trademarkName: string | null;
  status: string;
  createdAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"journey" | "chats" | "cases">("journey");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?view=user-detail&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessions(data.sessions || []);
        setEvents(data.events || []);
        setChats(data.chats || []);
        setCases(data.cases || []);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadUserData();
  }, [userId]);


  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "page_view": return <Eye className="w-4 h-4 text-blue-500" />;
      case "click": return <MousePointer className="w-4 h-4 text-orange-500" />;
      case "form_submit": return <FileText className="w-4 h-4 text-green-500" />;
      case "error": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "conversion": return <CheckCircle className="w-4 h-4 text-primary" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventLabel = (event: Event) => {
    if (event.eventType === "page_view") {
      return `Seite: ${event.pagePath}`;
    }
    if (event.eventType === "click") {
      return `Klick: ${event.elementText || event.elementId || event.eventName}`;
    }
    if (event.eventType === "form_submit") {
      return `Formular: ${event.eventName.replace("form_", "")}`;
    }
    if (event.eventType === "error") {
      return `Fehler: ${event.eventName.replace("error_", "")}`;
    }
    if (event.eventType === "conversion") {
      return `Conversion: ${event.eventName}`;
    }
    return event.eventName;
  };

  const getSessionEvents = (sessionId: string) => {
    return events.filter(e => e.sessionId === sessionId).reverse();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Lade Benutzerdaten...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500">Benutzer nicht gefunden</p>
          <button
            onClick={() => router.push("/dashboard/admin/users")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/admin/users")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {user.image ? (
                <img src={user.image} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {user.name || "Unbenannt"}
                {user.isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-sm rounded-full">
                    Admin
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Registriert: {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => loadUserData()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-orange-600">{events.length}</p>
          <p className="text-xs text-gray-500">Events</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{chats.length}</p>
          <p className="text-xs text-gray-500">Chat-Nachrichten</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-primary">{cases.length}</p>
          <p className="text-xs text-gray-500">Markenfälle</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {chats.reduce((acc, c) => acc + (c.credits || 0), 0)}
          </p>
          <p className="text-xs text-gray-500">Credits verbraucht</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: "journey", label: "User Journey", icon: MousePointer },
          { id: "chats", label: "Chat-Verlauf", icon: MessageSquare },
          { id: "cases", label: "Markenfälle", icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "journey" && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Sessions gefunden</p>
            </div>
          ) : (
            sessions.map((session) => {
              const sessionEvents = getSessionEvents(session.sessionId);
              const isExpanded = expandedSession === session.sessionId;

              return (
                <div key={session.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : session.sessionId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          Session vom {formatDate(session.startedAt)} um {formatTime(session.startedAt)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {session.device} · {session.browser} · Einstieg: {session.entryPage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{session.pageViews}</p>
                        <p className="text-xs text-gray-500">Seiten</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-orange-600">{session.events}</p>
                        <p className="text-xs text-gray-500">Events</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-600">{formatDuration(session.duration)}</p>
                        <p className="text-xs text-gray-500">Dauer</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <h4 className="font-medium text-gray-700 mb-4">Event-Timeline</h4>
                      {sessionEvents.length === 0 ? (
                        <p className="text-gray-500 text-sm">Keine Events in dieser Session</p>
                      ) : (
                        <div className="space-y-2">
                          {sessionEvents.map((event, index) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-4 bg-white rounded-lg p-3 border border-gray-100"
                            >
                              <div className="text-xs text-gray-400 w-16 pt-0.5">
                                {formatTime(event.createdAt)}
                              </div>
                              <div className="pt-0.5">
                                {getEventIcon(event.eventType)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{getEventLabel(event)}</p>
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {JSON.stringify(event.metadata)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "chats" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {chats.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Chat-Nachrichten</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div key={chat.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      chat.role === "user" ? "bg-blue-100" : "bg-purple-100"
                    }`}>
                      {chat.role === "user" ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${
                          chat.role === "user" ? "text-blue-600" : "text-purple-600"
                        }`}>
                          {chat.role === "user" ? "Benutzer" : "KI-Berater"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(chat.createdAt)} {formatTime(chat.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                        {chat.content}
                      </p>
                      {chat.role === "assistant" && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3">
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                            <div>
                              <span className="text-gray-500">Input:</span>{" "}
                              <span className="font-medium text-blue-600">{(chat.inputTokens || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Output:</span>{" "}
                              <span className="font-medium text-purple-600">{(chat.outputTokens || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Gesamt:</span>{" "}
                              <span className="font-medium">{(chat.totalTokens || 0).toLocaleString()}</span>
                            </div>
                            <div className="border-l border-gray-300 pl-4">
                              <span className="text-gray-500">Du zahlst:</span>{" "}
                              <span className="font-medium text-red-500">{parseFloat(chat.costEur || "0").toFixed(4)}€</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Kunde:</span>{" "}
                              <span className="font-medium text-primary">{((chat.credits || 0) * 0.03).toFixed(4)}€</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Gewinn:</span>{" "}
                              <span className="font-medium text-green-600">
                                +{(((chat.credits || 0) * 0.03) - parseFloat(chat.costEur || "0")).toFixed(4)}€
                              </span>
                            </div>
                            <div className="border-l border-gray-300 pl-4">
                              <span className="font-bold text-primary">{chat.credits} Credits</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "cases" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {cases.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Markenfälle</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cases.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {c.trademarkName || "Unbenannt"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {c.caseNumber} · Erstellt am {formatDate(c.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      c.status === "completed" ? "bg-green-100 text-green-700" :
                      c.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {c.status === "completed" ? "Abgeschlossen" :
                       c.status === "in_progress" ? "In Bearbeitung" :
                       c.status}
                    </span>
                    <button
                      onClick={() => router.push(`/dashboard/case/${c.id}`)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium"
                    >
                      Öffnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
