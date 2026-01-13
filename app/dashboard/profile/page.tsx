"use client";

import { useSession } from "next-auth/react";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Laden...</p>
      </div>
    );
  }

  const user = session.user;
  const userName = user.name || "Benutzer";
  const userEmail = user.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mein Profil</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
              {user.image ? (
                <img
                  src={user.image}
                  alt={userName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-bold text-2xl">{userInitials}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{userName}</h2>
              <p className="text-gray-600">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">E-Mail</p>
              <p className="font-medium text-gray-900">{userEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Konto-Status</p>
              <p className="font-medium text-green-600">Aktiv</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Hinweis:</strong> Um Ihr Profil zu löschen, klicken Sie auf Ihren Namen in der Seitenleiste und wählen Sie "Profil löschen".
        </p>
      </div>
    </div>
  );
}
