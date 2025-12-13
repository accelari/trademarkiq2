"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { 
  Mic, 
  ClipboardList, 
  BarChart3, 
  Users, 
  Bell, 
  Handshake,
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  Loader2,
  Info
} from "lucide-react";
import Link from "next/link";
import { useDashboardStats } from "@/lib/hooks";

const quickActions = [
  { 
    name: "Neue Recherche", 
    description: "Starten Sie eine neue Markenrecherche mit dem KI-Assistenten",
    href: "/dashboard/copilot", 
    icon: Mic,
    color: "bg-primary"
  },
  { 
    name: "Playbook starten", 
    description: "Schritt-für-Schritt Anleitung zur Markenanmeldung",
    href: "/dashboard/playbooks", 
    icon: ClipboardList,
    color: "bg-blue-500"
  },
  { 
    name: "Risiko prüfen", 
    description: "Analysieren Sie das Kollisionsrisiko Ihrer Marken",
    href: "/dashboard/risiko", 
    icon: BarChart3,
    color: "bg-orange-500"
  },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { stats, isLoading } = useDashboardStats();

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

  if (!session) {
    return null;
  }

  const userName = session.user?.name || session.user?.email?.split("@")[0] || "Benutzer";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
          Willkommen zurück, {userName}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Hier ist Ihre Übersicht für heute.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                Anzahl der durchgeführten Markenrecherchen
                <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats?.searches?.total || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Recherchen</p>
          <p className="text-xs text-gray-400 mt-1">+{stats?.searches?.thisWeek || 0} diese Woche</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                Laufende Schritt-für-Schritt Anleitungen
                <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats?.activePlaybooks?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Aktive Playbooks</p>
          <p className="text-xs text-gray-400 mt-1">in Bearbeitung</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                Überwachte Marken für Konfliktprüfung
                <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats?.watchlist?.total || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Watchlist</p>
          <p className="text-xs text-gray-400 mt-1">{stats?.alerts?.unacknowledged || 0} neue Alerts</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                Zeitpunkt der letzten Systemprüfung
                <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">Heute</p>
          <p className="text-sm text-gray-500 mt-1">Letzter Check</p>
          <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schnellaktionen</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {action.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {action.description}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Starten <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Recherchen</h2>
          {stats?.recentSearches && stats.recentSearches.length > 0 ? (
            <div className="space-y-4">
              {stats.recentSearches.map((search: any, index: number) => (
                <div key={search.id || index} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    search.riskLevel === 'low' ? 'bg-green-500' :
                    search.riskLevel === 'medium' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{search.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      Risiko: {search.riskScore}%
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(search.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Noch keine Recherchen durchgeführt.</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-primary to-primary-light rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-2">Marken-CoPilot</h2>
          <p className="text-white/80 text-sm mb-6">
            Ihr KI-Assistent ist bereit. Starten Sie eine neue Recherche oder lassen Sie sich beraten.
          </p>
          <Link
            href="/dashboard/copilot"
            className="inline-flex items-center gap-2 bg-white text-primary px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Jetzt sprechen
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/team" className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary/20 transition-all">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Team verwalten</p>
            <p className="text-sm text-gray-500">Mitglieder einladen</p>
          </div>
        </Link>

        <Link href="/dashboard/watchlist" className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary/20 transition-all">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Watchlist</p>
            <p className="text-sm text-gray-500">{stats?.watchlist?.total || 0} Marken überwacht</p>
          </div>
        </Link>

        <Link href="/dashboard/experten" className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary/20 transition-all">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Handshake className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Experten finden</p>
            <p className="text-sm text-gray-500">Anwälte verfügbar</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
