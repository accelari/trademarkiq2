"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  Plus, 
  Loader2, 
  ChevronRight,
  User,
  Bot,
  Calendar,
  FileText
} from "lucide-react";

interface Consultation {
  id: string;
  title: string;
  summary: string;
  duration: number | null;
  mode: string;
  createdAt: string;
  caseNumber?: string | null;
  trademarkName?: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatHistoriePage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      setIsLoadingConsultations(true);
      setError(null);
      const response = await fetch("/api/consultations");
      if (!response.ok) throw new Error("Fehler beim Laden der Beratungen");
      const data = await response.json();
      setConsultations(data.consultations || []);
    } catch (err) {
      setError("Beratungen konnten nicht geladen werden");
      console.error(err);
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  const fetchMessages = async (consultationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/consultations/${consultationId}/messages`);
      if (!response.ok) throw new Error("Fehler beim Laden der Nachrichten");
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectConsultation = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    fetchMessages(consultation.id);
  };

  const handleDeleteConsultation = async (id: string) => {
    if (!confirm("Möchten Sie diese Beratung wirklich löschen?")) return;
    
    try {
      setIsDeletingId(id);
      const response = await fetch(`/api/consultations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Fehler beim Löschen");
      
      setConsultations(prev => prev.filter(c => c.id !== id));
      if (selectedConsultation?.id === id) {
        setSelectedConsultation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      alert("Beratung konnte nicht gelöscht werden");
    } finally {
      setIsDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")} Min.`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
            Chat-Verlauf
          </h1>
          <p className="text-gray-600 mt-1">
            Ihre vergangenen Markenberatungen
          </p>
        </div>
        <Link
          href="/dashboard/copilot"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neue Beratung
        </Link>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Beratungen ({consultations.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingConsultations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">{error}</div>
            ) : consultations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Noch keine Beratungen</p>
                <Link
                  href="/dashboard/copilot"
                  className="inline-flex items-center gap-1 text-primary text-sm mt-2 hover:underline"
                >
                  Erste Beratung starten
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {consultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors group ${
                      selectedConsultation?.id === consultation.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                    onClick={() => handleSelectConsultation(consultation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate text-sm">
                          {consultation.title || "Unbenannte Beratung"}
                        </h3>
                        {consultation.trademarkName && (
                          <p className="text-xs text-primary mt-0.5 truncate">
                            Marke: {consultation.trademarkName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(consultation.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(consultation.duration)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConsultation(consultation.id);
                        }}
                        disabled={isDeletingId === consultation.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        {isDeletingId === consultation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {selectedConsultation ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-medium text-gray-900">
                  {selectedConsultation.title}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(selectedConsultation.createdAt)}
                  {selectedConsultation.trademarkName && (
                    <span className="ml-2">• Marke: {selectedConsultation.trademarkName}</span>
                  )}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Keine Nachrichten vorhanden</p>
                    {selectedConsultation.summary && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-2xl mx-auto">
                        <h4 className="font-medium text-gray-900 mb-2">Zusammenfassung</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedConsultation.summary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === "user"
                                ? "bg-primary text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              message.role === "user"
                                ? "bg-primary text-white rounded-br-md"
                                : "bg-gray-100 text-gray-800 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.role === "user" ? "text-white/70" : "text-gray-400"
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Beratung ausgewählt
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Wählen Sie eine Beratung aus der Liste aus, um die Nachrichten anzuzeigen.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
