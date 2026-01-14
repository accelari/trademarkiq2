"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Activity,
  RefreshCw,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Server
} from "lucide-react";

interface CostOverview {
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    calls: number;
    costUsd: number;
    costEur: number;
    creditsCharged: number;
    inputTokens: number;
    outputTokens: number;
  };
  byProvider: {
    provider: string;
    calls: number;
    costUsd: number;
    costEur: number;
    creditsCharged: number;
  }[];
  revenue: {
    purchases: number;
    creditsAdded: number;
    creditsValue: number;
  };
  profit: {
    apiCosts: number;
    creditsValue: number;
    netProfit: number;
    margin: string;
  };
}

interface UserCost {
  userId: string;
  email: string;
  name: string;
  calls: number;
  costEur: number;
  creditsCharged: number;
}

interface RecentCall {
  id: string;
  apiProvider: string;
  apiEndpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
  creditsCharged: number;
  createdAt: string;
  userEmail: string;
}

export default function AdminCostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<CostOverview | null>(null);
  const [userCosts, setUserCosts] = useState<UserCost[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "recent">("overview");
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, recentRes] = await Promise.all([
        fetch(`/api/admin/api-costs?type=overview&days=${days}`),
        fetch(`/api/admin/api-costs?type=by-user&days=${days}`),
        fetch(`/api/admin/api-costs?type=recent`),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        if (data.success) setOverview(data);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success) setUserCosts(data.users);
      }

      if (recentRes.ok) {
        const data = await recentRes.json();
        if (data.success) setRecentCalls(data.calls);
      }
    } catch (err) {
      console.error("[AdminCostsPage] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, days]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    });
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      claude: "bg-purple-100 text-purple-700",
      openai: "bg-green-100 text-green-700",
      tmsearch: "bg-blue-100 text-blue-700",
      tavily: "bg-orange-100 text-orange-700",
      hume: "bg-pink-100 text-pink-700",
      resend: "bg-cyan-100 text-cyan-700",
    };
    return colors[provider] || "bg-gray-100 text-gray-700";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API-Kosten Monitor</h1>
          <p className="text-gray-500 mt-1">Uberwachen Sie alle API-Kosten und Einnahmen</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value={7}>Letzte 7 Tage</option>
            <option value={30}>Letzte 30 Tage</option>
            <option value={90}>Letzte 90 Tage</option>
          </select>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400">API-Aufrufe</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {overview?.totals.calls ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {overview?.totals.inputTokens.toLocaleString()} Input / {overview?.totals.outputTokens.toLocaleString()} Output Tokens
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs text-gray-400">API-Kosten</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {formatCurrency(overview?.totals.costEur ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ${(overview?.totals.costUsd ?? 0).toFixed(2)} USD
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-400">Credits verbraucht</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {(overview?.totals.creditsCharged ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Wert: {formatCurrency(overview?.profit.creditsValue ?? 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${(overview?.profit.netProfit ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
              {(overview?.profit.netProfit ?? 0) >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              )}
            </div>
            <span className="text-xs text-gray-400">Gewinn</span>
          </div>
          <p className={`text-2xl font-bold mt-3 ${(overview?.profit.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(overview?.profit.netProfit ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Marge: {overview?.profit.margin ?? "0"}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Nach Provider
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Nach Benutzer
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "recent"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Letzte Aufrufe
          </button>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {overview?.byProvider && overview.byProvider.length > 0 ? (
                overview.byProvider.map((p) => {
                  const percentage = overview.totals.costEur > 0 
                    ? (p.costEur / overview.totals.costEur) * 100 
                    : 0;
                  return (
                    <div key={p.provider} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getProviderColor(p.provider)}`}>
                            {p.provider}
                          </span>
                          <span className="text-sm text-gray-500">{p.calls} Aufrufe</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.costEur)}</p>
                          <p className="text-xs text-gray-500">{p.creditsCharged.toFixed(2)} Credits</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">Keine Daten vorhanden</p>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-2">
              {userCosts.length > 0 ? (
                userCosts.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.calls} Aufrufe</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(user.costEur)}</p>
                      <p className="text-xs text-gray-500">{user.creditsCharged.toFixed(2)} Credits</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Keine Benutzerdaten vorhanden</p>
              )}
            </div>
          )}

          {activeTab === "recent" && (
            <div className="space-y-2">
              {recentCalls.length > 0 ? (
                recentCalls.map((call) => (
                  <div key={call.id} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getProviderColor(call.apiProvider)}`}>
                          {call.apiProvider}
                        </span>
                        <span className="text-xs text-gray-500">{call.model}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(call.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{call.inputTokens.toLocaleString()} in</span>
                        <span>{call.outputTokens.toLocaleString()} out</span>
                        <span className="text-gray-400">{call.userEmail}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(call.costEur)}</span>
                        <span className="text-xs text-gray-500 ml-2">({call.creditsCharged.toFixed(2)} Cr)</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Keine Aufrufe vorhanden</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
