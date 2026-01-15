"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, Search, Filter, RefreshCw, Eye, MessageSquare, 
  MousePointer, Briefcase, Calendar, Clock
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  isAdmin: boolean;
  sessions: number;
  events: number;
  chats: number;
  cases: number;
  lastActive: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/analytics?view=users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      (user.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "active") {
      const lastActive = new Date(user.lastActive);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && lastActive > weekAgo;
    }
    if (filter === "inactive") {
      const lastActive = new Date(user.lastActive);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && lastActive <= weekAgo;
    }
    return matchesSearch;
  });


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Benutzerverwaltung
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Alle Benutzer mit Aktivitätsstatistiken
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-xs text-gray-500">Benutzer gesamt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => {
              const lastActive = new Date(u.lastActive);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return lastActive > weekAgo;
            }).length}
          </p>
          <p className="text-xs text-gray-500">Aktiv (7 Tage)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">
            {users.reduce((acc, u) => acc + u.sessions, 0)}
          </p>
          <p className="text-xs text-gray-500">Sessions gesamt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">
            {users.reduce((acc, u) => acc + u.cases, 0)}
          </p>
          <p className="text-xs text-gray-500">Markenfälle gesamt</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Benutzer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "Alle" : f === "active" ? "Aktiv" : "Inaktiv"}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadUsers()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Benutzer</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sessions</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Events</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Chats</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fälle</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Registriert</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Zuletzt aktiv</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Lade Benutzer...</p>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Keine Benutzer gefunden</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-primary font-medium">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || "Unbenannt"}
                          {user.isAdmin && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">{user.sessions}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <MousePointer className="w-4 h-4" />
                      <span className="font-medium">{user.events}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <div className="flex items-center justify-center gap-1 text-purple-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">{user.chats}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <div className="flex items-center justify-center gap-1 text-primary">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium">{user.cases}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4 text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                  <td className="text-center px-4 py-4 text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatRelativeTime(user.lastActive)}
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <button
                      onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
