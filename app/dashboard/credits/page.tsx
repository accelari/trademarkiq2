"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Coins, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  CreditCard,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Search
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CreditBalance {
  credits: number;
  warningThreshold: number;
  isLow: boolean;
  isEmpty: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceEur: number;
  popular: boolean;
  stripeLink?: string;
}

interface Transaction {
  id: string;
  type: "purchase" | "usage" | "refund" | "bonus" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface UsageStats {
  totalCreditsUsed: number;
  totalCalls: number;
  byProvider: {
    provider: string;
    calls: number;
    creditsUsed: number;
  }[];
}

type SortField = "date" | "amount" | "provider";
type SortDirection = "asc" | "desc";
type FilterType = "all" | "usage" | "purchase" | "refund" | "bonus";

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "usage">("overview");
  
  // Filter & Sort State
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balanceRes, packagesRes, historyRes, usageRes] = await Promise.all([
        fetch("/api/credits?type=balance"),
        fetch("/api/credits?type=packages"),
        fetch("/api/credits?type=history"),
        fetch("/api/credits?type=usage"),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        if (data.success) setBalance(data);
      }

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        if (data.success) setPackages(data.packages);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        if (data.success) setTransactions(data.transactions);
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        if (data.success) setUsage(data);
      }
    } catch (err) {
      console.error("[CreditsPage] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = () => {
    if (!balance) return "bg-gray-100";
    if (balance.isEmpty) return "bg-red-50 border-red-200";
    if (balance.isLow) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (!balance) return <Coins className="w-8 h-8 text-gray-400" />;
    if (balance.isEmpty) return <AlertTriangle className="w-8 h-8 text-red-500" />;
    if (balance.isLow) return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
    return <CheckCircle className="w-8 h-8 text-green-500" />;
  };


    const getTransactionIcon = (type: string) => {
      switch (type) {
        case "purchase":
          return <TrendingUp className="w-4 h-4 text-green-500" />;
        case "usage":
          return <TrendingDown className="w-4 h-4 text-red-500" />;
        case "refund":
          return <TrendingUp className="w-4 h-4 text-blue-500" />;
        case "bonus":
          return <TrendingUp className="w-4 h-4 text-purple-500" />;
        default:
          return <Clock className="w-4 h-4 text-gray-500" />;
      }
    };

    // Extract provider from description (e.g., "claude API: /api/claude-chat" -> "claude")
    const getProviderFromDescription = (description: string): string => {
      const match = description.match(/^(\w+)\s+API:/i);
      return match ? match[1].toLowerCase() : "other";
    };

    // Get unique providers from transactions
    const uniqueProviders = useMemo(() => {
      const providers = new Set<string>();
      transactions.forEach(tx => {
        if (tx.type === "usage") {
          providers.add(getProviderFromDescription(tx.description));
        }
      });
      return Array.from(providers).sort();
    }, [transactions]);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
      let filtered = [...transactions];

      // Filter by type
      if (filterType !== "all") {
        filtered = filtered.filter(tx => tx.type === filterType);
      }

      // Filter by provider (only for usage transactions)
      if (filterProvider !== "all") {
        filtered = filtered.filter(tx => {
          if (tx.type !== "usage") return filterProvider === "all";
          return getProviderFromDescription(tx.description) === filterProvider;
        });
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(tx => 
          tx.description.toLowerCase().includes(query)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "date":
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case "amount":
            comparison = Number(a.amount) - Number(b.amount);
            break;
          case "provider":
            comparison = getProviderFromDescription(a.description).localeCompare(
              getProviderFromDescription(b.description)
            );
            break;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });

      return filtered;
    }, [transactions, filterType, filterProvider, sortField, sortDirection, searchQuery]);

    const toggleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    };

    const resetFilters = () => {
      setFilterType("all");
      setFilterProvider("all");
      setSearchQuery("");
      setSortField("date");
      setSortDirection("desc");
    };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meine Credits</h1>
          <p className="text-gray-500 mt-1">Verwalten Sie Ihr Guthaben und sehen Sie Ihre Nutzung</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Credit Balance Card */}
      <div className={`rounded-xl border-2 p-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <p className="text-sm text-gray-600 font-medium">Aktuelles Guthaben</p>
              <p className="text-4xl font-bold text-gray-900">
                {balance?.credits.toFixed(2) ?? "0.00"} <span className="text-lg font-normal text-gray-500">Credits</span>
              </p>
            </div>
          </div>
          {balance?.isEmpty && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              Guthaben aufgebraucht
            </div>
          )}
          {balance?.isLow && !balance.isEmpty && (
            <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium">
              Niedriges Guthaben
            </div>
          )}
        </div>
      </div>

      {/* Credit Packages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Credits aufladen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-xl border-2 p-5 transition-all hover:shadow-md ${
                pkg.popular ? "border-primary bg-primary/5" : "border-gray-200"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                  Beliebt
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{pkg.credits}</p>
                <p className="text-sm text-gray-500 mb-2">Credits</p>
                {/* Rabatt-Anzeige */}
                {pkg.credits === 900 && (
                  <p className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mb-2">
                    3% Rabatt
                  </p>
                )}
                {pkg.credits === 1900 && (
                  <p className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mb-2">
                    7% Rabatt
                  </p>
                )}
                {pkg.credits === 350 && (
                  <p className="text-xs text-gray-400 mb-2">Einstiegspaket</p>
                )}
                <p className="text-xl font-semibold text-primary mb-1">
                  {pkg.priceEur.toFixed(2)} EUR
                </p>
                {/* Preis pro Credit */}
                <p className="text-xs text-gray-400 mb-3">
                  {(pkg.priceEur / pkg.credits * 100).toFixed(1)} Cent/Credit
                </p>
                <a
                  href={pkg.stripeLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    pkg.popular
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Kaufen
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          Sichere Zahlung via Stripe. Credits werden sofort gutgeschrieben.
        </p>
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
            Ubersicht
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Transaktionen
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "usage"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Nutzung
          </button>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Gesamt verbraucht</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usage?.totalCreditsUsed.toFixed(2) ?? "0.00"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">API-Aufrufe</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usage?.totalCalls ?? 0}
                  </p>
                </div>
              </div>
              {usage?.byProvider && usage.byProvider.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Nutzung nach Provider</p>
                  <div className="space-y-2">
                    {usage.byProvider.map((p) => (
                      <div key={p.provider} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{p.provider}</span>
                        <span className="text-sm text-gray-500">
                          {p.calls} Aufrufe / {p.creditsUsed.toFixed(2)} Credits
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

                    {activeTab === "history" && (
                      <div className="space-y-4">
                        {/* Filter & Sort Controls */}
                        <div className="space-y-3">
                          {/* Search Bar */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Suchen..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>

                          {/* Filter Toggle & Sort Buttons */}
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setShowFilters(!showFilters)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                showFilters || filterType !== "all" || filterProvider !== "all"
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Filter className="w-4 h-4" />
                              Filter
                              {(filterType !== "all" || filterProvider !== "all") && (
                                <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {(filterType !== "all" ? 1 : 0) + (filterProvider !== "all" ? 1 : 0)}
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                            </button>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 mr-2">Sortieren:</span>
                              <button
                                onClick={() => toggleSort("date")}
                                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                                  sortField === "date"
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                Datum
                                {sortField === "date" && (
                                  <ArrowUpDown className={`w-3 h-3 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                                )}
                              </button>
                              <button
                                onClick={() => toggleSort("amount")}
                                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                                  sortField === "amount"
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                Betrag
                                {sortField === "amount" && (
                                  <ArrowUpDown className={`w-3 h-3 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                                )}
                              </button>
                              <button
                                onClick={() => toggleSort("provider")}
                                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                                  sortField === "provider"
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                Provider
                                {sortField === "provider" && (
                                  <ArrowUpDown className={`w-3 h-3 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Filters */}
                          {showFilters && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Typ</label>
                                  <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  >
                                    <option value="all">Alle Typen</option>
                                    <option value="usage">Nutzung</option>
                                    <option value="purchase">Kauf</option>
                                    <option value="refund">Erstattung</option>
                                    <option value="bonus">Bonus</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                                  <select
                                    value={filterProvider}
                                    onChange={(e) => setFilterProvider(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  >
                                    <option value="all">Alle Provider</option>
                                    {uniqueProviders.map(provider => (
                                      <option key={provider} value={provider}>
                                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button
                                  onClick={resetFilters}
                                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                  Filter zurücksetzen
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Results Count */}
                          <div className="text-xs text-gray-500">
                            {filteredTransactions.length} von {transactions.length} Transaktionen
                          </div>
                        </div>

                        {/* Transaction List */}
                        <div className="space-y-2">
                          {filteredTransactions.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              {transactions.length === 0 
                                ? "Keine Transaktionen vorhanden" 
                                : "Keine Transaktionen gefunden"}
                            </p>
                          ) : (
                            filteredTransactions.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                  {getTransactionIcon(tx.type)}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-gray-500">{formatDate(tx.createdAt, { includeTime: true })}</p>
                                      {tx.type === "usage" && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                                          {getProviderFromDescription(tx.description)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${Number(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Saldo: {Number(tx.balanceAfter).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

          {activeTab === "usage" && (
            <div className="space-y-4">
              {usage?.byProvider && usage.byProvider.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {usage.byProvider.map((p) => {
                      const creditsUsed = Number(p.creditsUsed);
                      const percentage = Number(usage.totalCreditsUsed) > 0 
                        ? (creditsUsed / Number(usage.totalCreditsUsed)) * 100 
                        : 0;
                      return (
                        <div key={p.provider} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 capitalize">{p.provider}</span>
                            <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{p.calls} Aufrufe</span>
                            <span>{creditsUsed.toFixed(2)} Credits</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">Keine Nutzungsdaten vorhanden</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
