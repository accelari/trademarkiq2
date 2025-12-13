"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTeam } from "@/lib/hooks";
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreVertical, 
  Shield, 
  FileText,
  Clock,
  X,
  Loader2,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Report {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  dateRange: string;
  format: string;
  createdAt: Date;
  status: "pending" | "ready" | "failed";
}

const reportTypes = [
  { value: "trademark_overview", label: "Markenübersicht" },
  { value: "risk_report", label: "Risiko-Report" },
  { value: "watchlist_status", label: "Watchlist-Status" },
  { value: "team_activities", label: "Team-Aktivitäten" },
];

const dateRanges = [
  { value: "7days", label: "Letzte 7 Tage" },
  { value: "30days", label: "Letzte 30 Tage" },
  { value: "90days", label: "Letzte 90 Tage" },
  { value: "custom", label: "Benutzerdefiniert" },
];

const formats = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
];

const initialMockReports: Report[] = [
  {
    id: "1",
    name: "Markenübersicht Q4 2024",
    type: "trademark_overview",
    typeLabel: "Markenübersicht",
    dateRange: "Letzte 90 Tage",
    format: "PDF",
    createdAt: new Date("2024-11-25"),
    status: "ready",
  },
  {
    id: "2",
    name: "Risiko-Report November",
    type: "risk_report",
    typeLabel: "Risiko-Report",
    dateRange: "Letzte 30 Tage",
    format: "PDF",
    createdAt: new Date("2024-11-20"),
    status: "ready",
  },
  {
    id: "3",
    name: "Watchlist-Status",
    type: "watchlist_status",
    typeLabel: "Watchlist-Status",
    dateRange: "Letzte 7 Tage",
    format: "CSV",
    createdAt: new Date("2024-11-28"),
    status: "pending",
  },
];

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { team, isLoading, mutate } = useTeam();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reports, setReports] = useState<Report[]>(initialMockReports);
  const [reportFormData, setReportFormData] = useState({
    type: "trademark_overview",
    dateRange: "30days",
    format: "pdf",
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail) return;
    
    setInviteLoading(true);
    setInviteError("");
    
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Einladung fehlgeschlagen");
        return;
      }

      setShowInviteModal(false);
      setInviteEmail("");
      mutate();
    } catch (error) {
      setInviteError("Ein Fehler ist aufgetreten");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateReport = () => {
    setReportLoading(true);
    
    setTimeout(() => {
      const selectedType = reportTypes.find(t => t.value === reportFormData.type);
      const selectedDateRange = dateRanges.find(d => d.value === reportFormData.dateRange);
      
      const newReport: Report = {
        id: Date.now().toString(),
        name: `${selectedType?.label} - ${new Date().toLocaleDateString("de-DE")}`,
        type: reportFormData.type,
        typeLabel: selectedType?.label || "",
        dateRange: selectedDateRange?.label || "",
        format: reportFormData.format.toUpperCase(),
        createdAt: new Date(),
        status: "pending",
      };
      
      setReports(prev => [newReport, ...prev]);
      setReportLoading(false);
      setShowReportModal(false);
      setShowReportSuccess(true);
      
      setReportFormData({
        type: "trademark_overview",
        dateRange: "30days",
        format: "pdf",
      });
      
      setTimeout(() => {
        setShowReportSuccess(false);
      }, 5000);
    }, 1500);
  };

  const getStatusBadge = (status: Report["status"]) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" />
            Bereit
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            Wird erstellt
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            <AlertCircle className="w-3 h-3" />
            Fehler
          </span>
        );
    }
  };

  const owner = team?.owner;
  const members = team?.members || [];
  const invitations = team?.invitations || [];

  return (
    <div className="space-y-6">
      {showReportSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Bericht wird erstellt</p>
              <p className="text-sm text-green-700 mt-1">
                Der Bericht wird generiert und an Ihre E-Mail-Adresse gesendet, sobald er fertig ist.
              </p>
            </div>
            <button
              onClick={() => setShowReportSuccess(false)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team-Verwaltung</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihr Team und teilen Sie Recherchen
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Mitglied einladen
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Team-Mitglieder</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {owner && (
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                      {owner.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 break-words">{owner.name || "Sie"}</p>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          Admin
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-auto sm:ml-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-green-600">Aktiv</span>
                      </div>
                      <p className="text-xs text-gray-400 hidden sm:block">Kontoinhaber</p>
                    </div>
                  </div>
                </div>
              )}

              {members.map((member: any) => (
                <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0">
                      {member.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 break-words">{member.user?.name || "Unbekannt"}</p>
                        {member.role === "admin" && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-auto sm:ml-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-green-600">Aktiv</span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}

              {invitations.filter((i: any) => i.status === "pending").map((invitation: any) => (
                <div key={invitation.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-400 flex-shrink-0">
                      ?
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 break-words">{invitation.email}</p>
                      <p className="text-sm text-gray-500">Rolle: {invitation.role === "admin" ? "Admin" : "Mitglied"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-auto sm:ml-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <span className="text-orange-600">Ausstehend</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Läuft ab: {new Date(invitation.expiresAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}

              {members.length === 0 && invitations.filter((i: any) => i.status === "pending").length === 0 && (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Noch keine Team-Mitglieder eingeladen.</p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Mitglied einladen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Berichte exportieren
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Erstellen Sie professionelle PDF-Berichte für Ihre Stakeholder.
            </p>
            <button 
              onClick={() => setShowReportModal(true)}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Neuen Bericht erstellen
            </button>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Erstellte Berichte
            </h3>
            {reports.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Noch keine Berichte erstellt.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {report.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {report.typeLabel}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {report.format}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {getStatusBadge(report.status)}
                          <span className="text-xs text-gray-400">
                            {report.createdAt.toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </div>
                      {report.status === "ready" && (
                        <button
                          className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                          title="Herunterladen"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-2">Rollen & Berechtigungen</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Admin</p>
                  <p className="text-gray-500">Vollzugriff auf alle Funktionen</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Mitglied</p>
                  <p className="text-gray-500">Kann Recherchen durchführen und ansehen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Mitglied einladen</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
                >
                  <option value="member">Mitglied</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Einladung senden
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Neuen Bericht erstellen</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Berichtstyp
                </label>
                <select
                  value={reportFormData.type}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {reportFormData.type === "trademark_overview" && "Übersicht aller registrierten Marken und deren Status."}
                  {reportFormData.type === "risk_report" && "Zusammenfassung aller Risikoanalysen und Konfliktpotenziale."}
                  {reportFormData.type === "watchlist_status" && "Status aller überwachten Marken in Ihrer Watchlist."}
                  {reportFormData.type === "team_activities" && "Protokoll aller Team-Aktivitäten und Änderungen."}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Zeitraum
                </label>
                <select
                  value={reportFormData.dateRange}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <div className="flex gap-3">
                  {formats.map((format) => (
                    <label
                      key={format.value}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                        reportFormData.format === format.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={format.value}
                        checked={reportFormData.format === format.value}
                        onChange={(e) => setReportFormData(prev => ({ ...prev, format: e.target.value }))}
                        className="sr-only"
                      />
                      <FileText className="w-4 h-4" />
                      {format.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Hinweis:</strong> Der Bericht wird generiert und an Ihre registrierte E-Mail-Adresse gesendet.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateReport}
                disabled={reportLoading}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Bericht erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
