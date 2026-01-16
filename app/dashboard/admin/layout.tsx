"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Admin-Layout: Schützt alle Admin-Seiten vor unbefugtem Zugriff
 * Nur Benutzer mit isAdmin=true können Admin-Seiten sehen
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.isAdmin === true;

  useEffect(() => {
    // Wenn Session geladen und User kein Admin ist, zur Dashboard-Startseite weiterleiten
    if (status === "authenticated" && !isAdmin) {
      router.push("/dashboard");
    }
  }, [status, isAdmin, router]);

  // Während Session lädt, Ladeindikator zeigen
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Wenn nicht eingeloggt, nichts anzeigen (wird zur Login-Seite weitergeleitet)
  if (status === "unauthenticated") {
    return null;
  }

  // Wenn kein Admin, Fehlermeldung anzeigen
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Zugriff verweigert</h1>
        <p className="text-gray-600">
          Du hast keine Berechtigung, auf den Admin-Bereich zuzugreifen.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Zurück zum Dashboard
        </button>
      </div>
    );
  }

  // Admin hat Zugriff - Kinder rendern
  return <>{children}</>;
}
