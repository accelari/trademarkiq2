"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign,
  Activity,
  Briefcase,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  Eye
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  users: {
    total: number;
    activeThisWeek: number;
    newThisMonth: number;
    trend: number;
  };
  cases: {
    total: number;
    activeThisWeek: number;
    completedThisMonth: number;
    trend: number;
  };
  revenue: {
    totalCreditsValue: number;
    thisMonth: number;
    lastMonth: number;
    trend: number;
  };
  costs: {
    totalApiCosts: number;
    thisMonth: number;
    lastMonth: number;
    trend: number;
  };
  profit: {
    total: number;
    thisMonth: number;
    margin: number;
  };
  chats: {
    total: number;
    thisWeek: number;
    avgPerUser: number;
  };
  topUsers: {
    id: string;
    name: string;
    email: string;
    cases: number;
    credits: number;
    costEur: number;
  }[];
  recentActivity: {
    type: string;
    description: string;
    user: string;
    timestamp: string;
  }[];
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const loadStats = async () => {
    setLoading(true);
    try {
      const [analyticsRes, costsRes] = await Promise.all([
        fetch(`/api/admin/analytics?view=overview&period=${period}`),
        fetch(`/api/admin/api-costs?type=overview&days=${period === "7d" ? 7 : period === "30d" ? 30 : 90}`)
      ]);

      let analyticsData = null;
      let costsData = null;

      if (analyticsRes.ok) {
        analyticsData = await analyticsRes.json();
      }
      if (costsRes.ok) {
        costsData = await costsRes.json();
      }

      // Combine data into dashboard stats
      const combinedStats: DashboardStats = {
        users: {
          total: analyticsData?.totalUsers || 0,
          activeThisWeek: analyticsData?.activeUsersThisWeek || 0,
          newThisMonth: analyticsData?.newUsersThisMonth || 0,
          trend: analyticsData?.userTrend || 0,
        },
        cases: {
          total: analyticsData?.totalCases || 0,
          activeThisWeek: analyticsData?.activeCasesThisWeek || 0,
          completedThisMonth: analyticsData?.completedCasesThisMonth || 0,
          trend: analyticsData?.caseTrend || 0,
        },
        revenue: {
          totalCreditsValue: costsData?.profit?.creditsValue || 0,
          thisMonth: costsData?.revenue?.creditsValue || 0,
          lastMonth: 0,
          trend: 0,
        },
        costs: {
          totalApiCosts: costsData?.totals?.costEur || 0,
          thisMonth: costsData?.totals?.costEur || 0,
          lastMonth: 0,
          trend: 0,
        },
        profit: {
          total: costsData?.profit?.netProfit || 0,
          thisMonth: costsData?.profit?.netProfit || 0,
          margin: parseFloat(costsData?.profit?.margin || "0"),
        },
        chats: {
          total: analyticsData?.totalChats || 0,
          thisWeek: analyticsData?.chatsThisWeek || 0,
          avgPerUser: analyticsData?.avgChatsPerUser || 0,
        },
        topUsers: analyticsData?.topUsers || [],
        recentActivity: analyticsData?.recentActivity || [],
      };

      setStats(combinedStats);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    trend, 
    icon: Icon, 
    color,
    href
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    trend?: number; 
    icon: any; 
    color: string;
    href?: string;
  }) => {
    const content = (
      <div className={`bg-white rounded-xl border border-gray-200 p-5 ${href ? 'hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        <p className="text-xs text-gray-400 mt-2">{title}</p>
      </div>
    );

    if (href) {
      return <Link href={href}>{content}</Link>;
    }
    return content;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Gesamtubersicht uber alle Metriken</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p === "7d" ? "7 Tage" : p === "30d" ? "30 Tage" : "90 Tage"}
              </button>
            ))}
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Benutzer gesamt"
          value={stats?.users.total || 0}
          subtitle={`${stats?.users.activeThisWeek || 0} aktiv diese Woche`}
          trend={stats?.users.trend}
          icon={Users}
          color="bg-blue-100 text-blue-600"
          href="/dashboard/admin/users"
        />
        <StatCard
          title="Markenfalle gesamt"
          value={stats?.cases.total || 0}
          subtitle={`${stats?.cases.activeThisWeek || 0} aktiv diese Woche`}
          trend={stats?.cases.trend}
          icon={Briefcase}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="API-Kosten"
          value={formatCurrency(stats?.costs.totalApiCosts || 0)}
          subtitle="Deine Ausgaben"
          icon={DollarSign}
          color="bg-red-100 text-red-600"
          href="/dashboard/admin/costs"
        />
        <StatCard
          title="Gewinn"
          value={formatCurrency(stats?.profit.total || 0)}
          subtitle={`${stats?.profit.margin || 0}% Marge`}
          icon={(stats?.profit.total || 0) >= 0 ? TrendingUp : TrendingDown}
          color={(stats?.profit.total || 0) >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
          href="/dashboard/admin/costs"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Credit-Einnahmen"
          value={formatCurrency(stats?.revenue.totalCreditsValue || 0)}
          subtitle="Wert der verbrauchten Credits"
          icon={CreditCard}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Chat-Nachrichten"
          value={stats?.chats.total || 0}
          subtitle={`${stats?.chats.thisWeek || 0} diese Woche`}
          icon={MessageSquare}
          color="bg-purple-100 text-purple-600"
          href="/dashboard/admin/chat-monitor"
        />
        <StatCard
          title="API-Aufrufe"
          value={stats?.chats.total || 0}
          subtitle="Gesamt"
          icon={Activity}
          color="bg-orange-100 text-orange-600"
          href="/dashboard/admin/costs"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Top Benutzer</h2>
            <Link href="/dashboard/admin/users" className="text-sm text-primary hover:underline">
              Alle anzeigen
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.topUsers && stats.topUsers.length > 0 ? (
              stats.topUsers.slice(0, 5).map((user) => (
                <Link
                  key={user.id}
                  href={`/dashboard/admin/users/${user.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                      <p className="text-xs text-gray-500">{user.cases} Falle</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.credits} Credits</p>
                    <p className="text-xs text-gray-500">{formatCurrency(user.costEur)} Kosten</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Keine Benutzerdaten verfugbar</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Schnellzugriff</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/admin/users"
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Benutzer</p>
                <p className="text-xs text-gray-500">Alle Benutzer verwalten</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/costs"
              className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <DollarSign className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">API-Kosten</p>
                <p className="text-xs text-gray-500">Kosten uberwachen</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/chat-monitor"
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <MessageSquare className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Chat-Logs</p>
                <p className="text-xs text-gray-500">Alle Gesprache einsehen</p>
              </div>
            </Link>
            <Link
              href="/dashboard/admin/api-test"
              className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
            >
              <Activity className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">API-Test</p>
                <p className="text-xs text-gray-500">APIs testen</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
