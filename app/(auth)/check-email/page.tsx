"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    
    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setResent(true);
      } else {
        setError(data.error || "Fehler beim erneuten Senden");
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Überprüfen Sie Ihre E-Mails
      </h1>
      
      <p className="text-gray-600 mb-2">
        Wir haben einen Bestätigungslink an
      </p>
      
      {email && (
        <p className="font-medium text-gray-900 mb-6">
          {email}
        </p>
      )}
      
      <p className="text-sm text-gray-500 mb-8">
        Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
        Der Link ist 24 Stunden gültig.
      </p>

      {resent ? (
        <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
          <CheckCircle className="w-5 h-5" />
          <span>Neue E-Mail wurde gesendet!</span>
        </div>
      ) : (
        <button
          onClick={handleResend}
          disabled={resending || !email}
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
          {resending ? "Wird gesendet..." : "E-Mail erneut senden"}
        </button>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-6">{error}</p>
      )}

      <div className="border-t pt-6 mt-6">
        <p className="text-sm text-gray-500">
          Keine E-Mail erhalten? Überprüfen Sie Ihren Spam-Ordner oder{" "}
          <Link href="/register" className="text-primary hover:underline">
            versuchen Sie es mit einer anderen E-Mail
          </Link>
        </p>
      </div>

      <div className="mt-6">
        <Link 
          href="/login"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
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
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          }>
            <CheckEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
