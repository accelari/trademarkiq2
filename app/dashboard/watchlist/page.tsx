"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWatchlist, useAlerts } from "@/lib/hooks";
import { 
  Bell, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Trash2,
  Settings,
  X,
  BellRing,
  Calendar,
  Globe,
  Loader2,
  Filter,
  Mail,
  Edit2,
  Save,
  ChevronRight,
  RefreshCw,
  History,
  ChevronDown
} from "lucide-react";
import WorkflowProgress from "@/app/components/WorkflowProgress";

type NotificationSettings = {
  emailEnabled: boolean;
  email: string;
  frequency: "sofort" | "täglich" | "wöchentlich";
  alertTypes: {
    newConflicts: boolean;
    statusChanges: boolean;
    expiryWarnings: boolean;
  };
};

const defaultNotificationSettings: NotificationSettings = {
  emailEnabled: true,
  email: "",
  frequency: "sofort",
  alertTypes: {
    newConflicts: true,
    statusChanges: true,
    expiryWarnings: true,
  },
};

type ConflictResult = {
  name: string;
  holder: string;
  accuracy: number;
  office: string;
  niceClasses: number[];
  registrationNumber: string;
  riskLevel: "high" | "medium" | "low";
};

type ConflictResults = {
  conflicts: ConflictResult[];
  conflictsFound: number;
  isTestMode: boolean;
  lastChecked?: string;
};

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { items, isLoading, mutate } = useWatchlist();
  const { alerts } = useAlerts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [newMarkName, setNewMarkName] = useState("");
  const [newMarkJurisdiction, setNewMarkJurisdiction] = useState("dpma");
  const [newMarkRegNumber, setNewMarkRegNumber] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("all");
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    ...defaultNotificationSettings,
    email: session?.user?.email || "",
  });

  const [editedItem, setEditedItem] = useState<any>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isCheckingAllConflicts, setIsCheckingAllConflicts] = useState(false);
  const [conflictResults, setConflictResults] = useState<ConflictResults | null>(null);
  const [activityHistoryOpen, setActivityHistoryOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email && !notificationSettings.email) {
      setNotificationSettings(prev => ({ ...prev, email: session.user?.email || "" }));
    }
  }, [session?.user?.email]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAddItem = async () => {
    if (!newMarkName) return;
    
    setAddLoading(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMarkName,
          registrationNumber: newMarkRegNumber,
          jurisdiction: newMarkJurisdiction,
          classes: [],
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewMarkName("");
        setNewMarkRegNumber("");
        mutate();
      }
    } catch (error) {
      console.error("Error adding watchlist item:", error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      mutate();
      setShowDetailModal(false);
      setShowDeleteConfirm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error deleting watchlist item:", error);
    }
  };

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setEditedItem({
      name: item.name,
      registrationNumber: item.registrationNumber || "",
      jurisdiction: item.jurisdiction,
      classes: (item.classes || []).join(", "),
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
      notificationSettings: item.notificationSettings || { ...defaultNotificationSettings, email: session?.user?.email || "" },
    });
    setEditMode(false);
    setConflictResults(null);
    setShowDetailModal(true);
  };

  const handleSaveItem = async () => {
    if (!selectedItem || !editedItem) return;

    setSaveLoading(true);
    try {
      const classesArray = editedItem.classes
        ? editedItem.classes.split(",").map((c: string) => c.trim()).filter((c: string) => c)
        : [];

      const res = await fetch(`/api/watchlist/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedItem.name,
          registrationNumber: editedItem.registrationNumber || null,
          jurisdiction: editedItem.jurisdiction,
          classes: classesArray,
          expiryDate: editedItem.expiryDate || null,
          notificationSettings: editedItem.notificationSettings,
        }),
      });

      if (res.ok) {
        mutate();
        setEditMode(false);
        const updatedItem = await res.json();
        setSelectedItem(updatedItem);
      }
    } catch (error) {
      console.error("Error updating watchlist item:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveGlobalNotifications = async () => {
    setSaveLoading(true);
    try {
      const updatePromises = items.map((item: any) =>
        fetch(`/api/watchlist/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationSettings: notificationSettings,
          }),
        })
      );

      await Promise.all(updatePromises);
      mutate();
      setShowNotificationModal(false);
    } catch (error) {
      console.error("Error updating notification settings:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCheckConflicts = async (itemId: string) => {
    setIsCheckingConflicts(true);
    setConflictResults(null);
    try {
      const res = await fetch("/api/watchlist/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistItemId: itemId }),
      });

      if (res.ok) {
        const data = await res.json();
        setConflictResults({
          conflicts: data.conflicts || [],
          conflictsFound: data.conflictsFound || 0,
          isTestMode: data.isTestMode || false,
          lastChecked: data.lastChecked,
        });
        mutate();
      } else {
        console.error("Error checking conflicts");
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleCheckAllConflicts = async () => {
    if (items.length === 0) return;
    
    setIsCheckingAllConflicts(true);
    try {
      for (const item of items) {
        await fetch("/api/watchlist/check-conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchlistItemId: item.id }),
        });
      }
      mutate();
    } catch (error) {
      console.error("Error checking all conflicts:", error);
    } finally {
      setIsCheckingAllConflicts(false);
    }
  };

  const stats = {
    total: items.length,
    active: items.filter((i: any) => i.status === "active").length,
    alerts: alerts.filter((a: any) => !a.acknowledged).length,
    expiring: items.filter((i: any) => i.status === "expiring").length,
  };

  const filteredItems = items.filter((item: any) => {
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && item.status === "active") ||
      (statusFilter === "alert" && item.status === "alert") ||
      (statusFilter === "expiring" && item.status === "expiring");
    
    const matchesJurisdiction = jurisdictionFilter === "all" || 
      item.jurisdiction.toLowerCase() === jurisdictionFilter.toLowerCase();
    
    return matchesStatus && matchesJurisdiction;
  });

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep={5} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Watchlist & Alerts</h1>
          <p className="text-gray-600 mt-1">
            Überwachen Sie Ihre Marken und erhalten Sie Benachrichtigungen bei Konflikten
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCheckAllConflicts}
            disabled={isCheckingAllConflicts || items.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingAllConflicts ? 'animate-spin' : ''}`} />
            {isCheckingAllConflicts ? 'Prüfe...' : 'Alle Marken prüfen'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Marke hinzufügen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <Bell className="w-4 h-4" />
            <p className="text-sm">Überwacht</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm">Aktiv</p>
          </div>
          <p className="text-3xl font-semibold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">Neue Alerts</p>
          </div>
          <p className="text-3xl font-semibold text-orange-600 mt-1">{stats.alerts}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="w-4 h-4" />
            <p className="text-sm">Verlängerung fällig</p>
          </div>
          <p className="text-3xl font-semibold text-blue-600 mt-1">{stats.expiring}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Überwachte Marken</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary w-48"
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Filter:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="all">Alle Status</option>
                    <option value="active">Aktiv</option>
                    <option value="alert">Alert</option>
                    <option value="expiring">Verlängerung fällig</option>
                  </select>
                  <select
                    value={jurisdictionFilter}
                    onChange={(e) => setJurisdictionFilter(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="all">Alle Ämter</option>
                    <option value="dpma">DPMA</option>
                    <option value="euipo">EUIPO</option>
                    <option value="wipo">WIPO</option>
                  </select>
                </div>
                <span className="text-sm text-gray-500 md:ml-auto">
                  {filteredItems.length} von {items.length} Ergebnissen
                </span>
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">
                  {items.length === 0 
                    ? "Noch keine Marken auf der Watchlist." 
                    : "Keine Marken entsprechen den Filterkriterien."}
                </p>
                {items.length === 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Marke hinzufügen
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredItems.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(item)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          item.status === "active" ? "bg-green-100" :
                          item.status === "alert" ? "bg-orange-100" : "bg-blue-100"
                        }`}>
                          {item.status === "active" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : item.status === "alert" ? (
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 break-words">{item.name}</h3>
                            {item.alertCount > 0 && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium whitespace-nowrap">
                                {item.alertCount} Alert{item.alertCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.jurisdiction.toUpperCase()} {item.registrationNumber && `• ${item.registrationNumber}`}
                          </p>
                          {item.lastChecked && (
                            <p className="text-xs text-gray-400 mt-1">
                              Letzte Prüfung: {new Date(item.lastChecked).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 flex-shrink-0" />
                              Klassen: {(item.classes || []).join(", ") || "Keine"}
                            </span>
                            {item.expiryDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                Läuft ab: {new Date(item.expiryDate).toLocaleDateString("de-DE")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" />
              Aktuelle Alerts
            </h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">Keine aktuellen Alerts.</p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg ${
                      alert.severity === "high" ? "bg-red-50 border border-red-100" :
                      alert.severity === "medium" ? "bg-orange-50 border border-orange-100" :
                      "bg-blue-50 border border-blue-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        alert.severity === "high" ? "text-red-600" :
                        alert.severity === "medium" ? "text-orange-600" : "text-blue-600"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.createdAt).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-light rounded-xl p-5 text-white">
            <h4 className="font-semibold mb-2">Automatische Überwachung</h4>
            <p className="text-sm text-white/80 mb-4">
              Wir prüfen Ihre Marken täglich auf neue Konflikte und informieren Sie sofort per E-Mail.
            </p>
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="w-full px-4 py-2.5 bg-white text-primary rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Benachrichtigungen konfigurieren
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Marke zur Watchlist hinzufügen</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markenname
                </label>
                <input
                  type="text"
                  value={newMarkName}
                  onChange={(e) => setNewMarkName(e.target.value)}
                  placeholder="z.B. TechFlow"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registrierungsnummer (optional)
                </label>
                <input
                  type="text"
                  value={newMarkRegNumber}
                  onChange={(e) => setNewMarkRegNumber(e.target.value)}
                  placeholder="z.B. 30 2024 001 234"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markenamt
                </label>
                <select 
                  value={newMarkJurisdiction}
                  onChange={(e) => setNewMarkJurisdiction(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
                >
                  <option value="dpma">DPMA (Deutschland)</option>
                  <option value="euipo">EUIPO (EU)</option>
                  <option value="wipo">WIPO (International)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddItem}
                disabled={addLoading || !newMarkName}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowNotificationModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900">Benachrichtigungen konfigurieren</h3>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">E-Mail-Benachrichtigungen</p>
                    <p className="text-sm text-gray-500">Erhalten Sie Alerts per E-Mail</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailEnabled}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {notificationSettings.emailEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail-Adresse
                    </label>
                    <input
                      type="email"
                      value={notificationSettings.email}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ihre@email.de"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Benachrichtigungsfrequenz
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(["sofort", "täglich", "wöchentlich"] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setNotificationSettings(prev => ({ ...prev, frequency: freq }))}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                            notificationSettings.frequency === freq
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                          }`}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert-Typen
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alertTypes.newConflicts}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            alertTypes: { ...prev.alertTypes, newConflicts: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Neue Konflikte</p>
                          <p className="text-xs text-gray-500">Bei potenziellen Markenkonflikten</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alertTypes.statusChanges}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            alertTypes: { ...prev.alertTypes, statusChanges: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Statusänderungen</p>
                          <p className="text-xs text-gray-500">Bei Änderungen am Markenstatus</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alertTypes.expiryWarnings}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            alertTypes: { ...prev.alertTypes, expiryWarnings: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Ablaufwarnungen</p>
                          <p className="text-xs text-gray-500">Vor Ablauf der Markenschutzfrist</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveGlobalNotifications}
                disabled={saveLoading}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedItem && editedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => { setShowDetailModal(false); setSelectedItem(null); setEditMode(false); }}>
          <div className="bg-white rounded-xl w-full sm:max-w-2xl shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedItem.status === "active" ? "bg-green-100" :
                  selectedItem.status === "alert" ? "bg-orange-100" : "bg-blue-100"
                }`}>
                  {selectedItem.status === "active" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : selectedItem.status === "alert" ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-500">{selectedItem.jurisdiction.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setEditMode(false);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Markendetails</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedItem.name}
                        onChange={(e) => setEditedItem((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedItem.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Registrierungsnummer</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedItem.registrationNumber}
                        onChange={(e) => setEditedItem((prev: any) => ({ ...prev, registrationNumber: e.target.value }))}
                        placeholder="z.B. 30 2024 001 234"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedItem.registrationNumber || "-"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Markenamt</label>
                    {editMode ? (
                      <select
                        value={editedItem.jurisdiction}
                        onChange={(e) => setEditedItem((prev: any) => ({ ...prev, jurisdiction: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
                      >
                        <option value="dpma">DPMA (Deutschland)</option>
                        <option value="euipo">EUIPO (EU)</option>
                        <option value="wipo">WIPO (International)</option>
                      </select>
                    ) : (
                      <p className="font-medium text-gray-900">{selectedItem.jurisdiction.toUpperCase()}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Klassen</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedItem.classes}
                        onChange={(e) => setEditedItem((prev: any) => ({ ...prev, classes: e.target.value }))}
                        placeholder="z.B. 9, 35, 42"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">
                        {(selectedItem.classes || []).join(", ") || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Ablaufdatum</label>
                    {editMode ? (
                      <input
                        type="date"
                        value={editedItem.expiryDate}
                        onChange={(e) => setEditedItem((prev: any) => ({ ...prev, expiryDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">
                        {selectedItem.expiryDate 
                          ? new Date(selectedItem.expiryDate).toLocaleDateString("de-DE")
                          : "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                      selectedItem.status === "active" ? "bg-green-100 text-green-700" :
                      selectedItem.status === "alert" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {selectedItem.status === "active" ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Aktiv</>
                      ) : selectedItem.status === "alert" ? (
                        <><AlertTriangle className="w-3.5 h-3.5" /> Alert</>
                      ) : (
                        <><Clock className="w-3.5 h-3.5" /> Verlängerung fällig</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Benachrichtigungseinstellungen
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">E-Mail-Benachrichtigungen</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedItem.notificationSettings?.emailEnabled ?? true}
                        onChange={(e) => setEditedItem((prev: any) => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            emailEnabled: e.target.checked
                          }
                        }))}
                        disabled={!editMode}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${!editMode ? 'opacity-60' : ''}`}></div>
                    </label>
                  </div>

                  {editMode && editedItem.notificationSettings?.emailEnabled && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">E-Mail-Adresse</label>
                        <input
                          type="email"
                          value={editedItem.notificationSettings?.email || ""}
                          onChange={(e) => setEditedItem((prev: any) => ({
                            ...prev,
                            notificationSettings: {
                              ...prev.notificationSettings,
                              email: e.target.value
                            }
                          }))}
                          placeholder="ihre@email.de"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-500 mb-2">Frequenz</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(["sofort", "täglich", "wöchentlich"] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => setEditedItem((prev: any) => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  frequency: freq
                                }
                              }))}
                              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                editedItem.notificationSettings?.frequency === freq
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                              }`}
                            >
                              {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={editedItem.notificationSettings?.alertTypes?.newConflicts ?? true}
                            onChange={(e) => setEditedItem((prev: any) => ({
                              ...prev,
                              notificationSettings: {
                                ...prev.notificationSettings,
                                alertTypes: {
                                  ...prev.notificationSettings?.alertTypes,
                                  newConflicts: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">Neue Konflikte</span>
                        </label>
                        <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={editedItem.notificationSettings?.alertTypes?.statusChanges ?? true}
                            onChange={(e) => setEditedItem((prev: any) => ({
                              ...prev,
                              notificationSettings: {
                                ...prev.notificationSettings,
                                alertTypes: {
                                  ...prev.notificationSettings?.alertTypes,
                                  statusChanges: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">Statusänderungen</span>
                        </label>
                        <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={editedItem.notificationSettings?.alertTypes?.expiryWarnings ?? true}
                            onChange={(e) => setEditedItem((prev: any) => ({
                              ...prev,
                              notificationSettings: {
                                ...prev.notificationSettings,
                                alertTypes: {
                                  ...prev.notificationSettings?.alertTypes,
                                  expiryWarnings: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">Ablaufwarnungen</span>
                        </label>
                      </div>
                    </>
                  )}

                  {!editMode && editedItem.notificationSettings?.emailEnabled && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">E-Mail:</span>
                        <p className="font-medium text-gray-900">{editedItem.notificationSettings?.email || "-"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequenz:</span>
                        <p className="font-medium text-gray-900 capitalize">{editedItem.notificationSettings?.frequency || "Sofort"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Aktive Alerts:</span>
                        <p className="font-medium text-gray-900">
                          {[
                            editedItem.notificationSettings?.alertTypes?.newConflicts && "Neue Konflikte",
                            editedItem.notificationSettings?.alertTypes?.statusChanges && "Statusänderungen",
                            editedItem.notificationSettings?.alertTypes?.expiryWarnings && "Ablaufwarnungen",
                          ].filter(Boolean).join(", ") || "Alle"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    Konfliktprüfung
                  </h4>
                  <button
                    onClick={() => handleCheckConflicts(selectedItem.id)}
                    disabled={isCheckingConflicts}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingConflicts ? 'animate-spin' : ''}`} />
                    {isCheckingConflicts ? 'Prüfe...' : 'Konflikte prüfen'}
                  </button>
                </div>

                {selectedItem.lastChecked && (
                  <p className="text-sm text-gray-500 mb-4">
                    Zuletzt geprüft: {new Date(selectedItem.lastChecked).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {isCheckingConflicts && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-gray-500">Suche nach Konflikten...</p>
                    </div>
                  </div>
                )}

                {conflictResults && !isCheckingConflicts && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        conflictResults.conflictsFound === 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {conflictResults.conflictsFound} Konflikt{conflictResults.conflictsFound !== 1 ? 'e' : ''} gefunden
                      </span>
                      {conflictResults.isTestMode && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Testmodus
                        </span>
                      )}
                    </div>

                    {conflictResults.conflicts.length > 0 && (
                      <div className="space-y-3">
                        {conflictResults.conflicts.map((conflict, index) => (
                          <div 
                            key={index}
                            className={`p-4 rounded-lg border ${
                              conflict.riskLevel === 'high' 
                                ? 'bg-red-50 border-red-200' 
                                : conflict.riskLevel === 'medium' 
                                  ? 'bg-orange-50 border-orange-200' 
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-semibold text-gray-900">{conflict.name}</h5>
                                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                    conflict.riskLevel === 'high' 
                                      ? 'bg-red-600 text-white' 
                                      : conflict.riskLevel === 'medium' 
                                        ? 'bg-orange-500 text-white' 
                                        : 'bg-yellow-500 text-white'
                                  }`}>
                                    {conflict.accuracy}% Übereinstimmung
                                  </span>
                                </div>
                                {conflict.holder && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Inhaber: {conflict.holder}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                  {conflict.office && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                                      {conflict.office}
                                    </span>
                                  )}
                                  {conflict.registrationNumber && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                                      Nr: {conflict.registrationNumber}
                                    </span>
                                  )}
                                  {conflict.niceClasses && conflict.niceClasses.length > 0 && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                                      Klassen: {conflict.niceClasses.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                conflict.riskLevel === 'high' 
                                  ? 'bg-red-100' 
                                  : conflict.riskLevel === 'medium' 
                                    ? 'bg-orange-100' 
                                    : 'bg-yellow-100'
                              }`}>
                                <AlertTriangle className={`w-5 h-5 ${
                                  conflict.riskLevel === 'high' 
                                    ? 'text-red-600' 
                                    : conflict.riskLevel === 'medium' 
                                      ? 'text-orange-600' 
                                      : 'text-yellow-600'
                                }`} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {conflictResults.conflictsFound === 0 && (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-700">
                          Keine Konflikte gefunden. Ihre Marke scheint einzigartig zu sein.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!conflictResults && !isCheckingConflicts && !selectedItem.lastChecked && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <Search className="w-5 h-5 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Klicken Sie auf "Konflikte prüfen", um potenzielle Konflikte mit bestehenden Marken zu finden.
                    </p>
                  </div>
                )}
              </div>

              {/* Aktivitätsverlauf Accordion */}
              {(() => {
                const itemAlerts = alerts
                  .filter((a: any) => a.watchlistItemId === selectedItem.id)
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                return (
                  <div className="border-t border-gray-100 pt-5">
                    <button
                      onClick={() => setActivityHistoryOpen(!activityHistoryOpen)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <span className="font-medium text-gray-900">
                          Aktivitätsverlauf ({itemAlerts.length} {itemAlerts.length === 1 ? 'Eintrag' : 'Einträge'})
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activityHistoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {activityHistoryOpen && (
                      <div className="mt-4">
                        {itemAlerts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="p-3 bg-gray-100 rounded-full mb-3">
                              <History className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">Noch keine Aktivitäten</p>
                            <p className="text-gray-400 text-xs mt-1">Hier werden zukünftige Alerts und Aktivitäten angezeigt</p>
                          </div>
                        ) : (
                          <div className="relative">
                            {itemAlerts.map((alert: any, index: number) => {
                              const getAlertIcon = (type: string) => {
                                if (type === 'conflict' || type === 'new_conflict') {
                                  return <AlertTriangle className="w-4 h-4" />;
                                } else if (type === 'status_change') {
                                  return <RefreshCw className="w-4 h-4" />;
                                } else if (type === 'expiry' || type === 'expiry_warning') {
                                  return <Clock className="w-4 h-4" />;
                                }
                                return <Bell className="w-4 h-4" />;
                              };

                              const getSeverityColor = (severity: string) => {
                                if (severity === 'high') return 'bg-red-500';
                                if (severity === 'medium') return 'bg-orange-500';
                                return 'bg-green-500';
                              };

                              const getIconBgColor = (severity: string) => {
                                if (severity === 'high') return 'bg-red-100 text-red-600';
                                if (severity === 'medium') return 'bg-orange-100 text-orange-600';
                                return 'bg-green-100 text-green-600';
                              };

                              const formatDate = (dateString: string) => {
                                const date = new Date(dateString);
                                return date.toLocaleDateString("de-DE", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              };

                              return (
                                <div key={alert.id} className="flex gap-4">
                                  {/* Timeline line */}
                                  <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBgColor(alert.severity)}`}>
                                      {getAlertIcon(alert.type)}
                                    </div>
                                    {index < itemAlerts.length - 1 && (
                                      <div className={`w-0.5 flex-1 mt-2 mb-2 ${getSeverityColor(alert.severity)}`} />
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className={`flex-1 pb-4 ${index < itemAlerts.length - 1 ? 'border-b border-gray-100 mb-4' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-gray-500">
                                            {formatDate(alert.createdAt)}
                                          </span>
                                          {alert.acknowledged && (
                                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                              <CheckCircle className="w-3 h-3" />
                                              Bestätigt
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                          {alert.type === 'conflict' || alert.type === 'new_conflict' ? 'Konflikt erkannt' :
                                           alert.type === 'status_change' ? 'Statusänderung' :
                                           alert.type === 'expiry' || alert.type === 'expiry_warning' ? 'Ablaufwarnung' :
                                           alert.type}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                                      </div>
                                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${
                                        alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                                        alert.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                      }`}>
                                        {alert.severity === 'high' ? 'Hoch' :
                                         alert.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
              <div className="flex-1" />
              {editMode && (
                <button
                  onClick={handleSaveItem}
                  disabled={saveLoading || !editedItem.name}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saveLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Speichern
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Marke löschen?</h3>
              </div>
              <p className="text-gray-600">
                Möchten Sie <strong>{selectedItem.name}</strong> wirklich von Ihrer Watchlist entfernen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
