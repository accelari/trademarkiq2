"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Ihre E-Mail wurde erfolgreich verifiziert!");
          setTimeout(() => {
            router.push("/login?verified=true");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verifizierung fehlgeschlagen");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
    };

    verifyEmail();
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          E-Mail wird verifiziert...
        </h1>
        <p className="text-gray-600">
          Bitte warten Sie einen Moment.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          E-Mail verifiziert!
        </h1>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Sie werden in Kürze zur Anmeldeseite weitergeleitet...
        </p>
        <Link 
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Jetzt anmelden
        </Link>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          E-Mail bestätigen
        </h1>
        <p className="text-gray-600 mb-6">
          Bitte überprüfen Sie Ihre E-Mails und klicken Sie auf den Bestätigungslink.
        </p>
        <div className="space-y-3">
          <Link 
            href="/login"
            className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
          >
            Zur Anmeldung
          </Link>
          <Link 
            href="/register"
            className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            Neues Konto erstellen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Verifizierung fehlgeschlagen
      </h1>
      <p className="text-gray-600 mb-6">
        {message}
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet.
      </p>
      <div className="space-y-3">
        <Link 
          href="/login"
          className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
        >
          Zur Anmeldung
        </Link>
        <p className="text-sm text-gray-500">
          Probleme?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Erneut registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TM</span>
              </div>
              <span className="font-semibold text-xl text-gray-900">TrademarkIQ</span>
            </Link>
          </div>

          <Suspense fallback={
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
