"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, Loader2, Check, X } from "lucide-react";

type PasswordStrength = "weak" | "fair" | "good" | "strong";

interface PasswordRequirements {
  hasMinLength: boolean;
  hasLetters: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    hasMinLength: password.length >= 8,
    hasLetters: /[a-zA-Z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSpecialChars: /[^a-zA-Z0-9]/.test(password),
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  const reqs = getPasswordRequirements(password);
  
  if (!reqs.hasMinLength) {
    return "weak";
  }
  
  if (reqs.hasLetters && reqs.hasNumbers && reqs.hasSpecialChars) {
    return "strong";
  }
  
  if (reqs.hasLetters && reqs.hasNumbers) {
    return "good";
  }
  
  return "fair";
}

const strengthConfig = {
  weak: { label: "Schwach", color: "bg-red-500", width: "w-1/4" },
  fair: { label: "Mittel", color: "bg-orange-500", width: "w-2/4" },
  good: { label: "Gut", color: "bg-yellow-500", width: "w-3/4" },
  strong: { label: "Stark", color: "bg-green-500", width: "w-full" },
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = strengthConfig[passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein");
      return;
    }

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen");
        return;
      }

      if (data.requiresVerification) {
        router.push(`/check-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Anmeldung nach Registrierung fehlgeschlagen");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-semibold text-gray-900">Konto erstellen</h1>
            <p className="text-gray-600 mt-2">Starten Sie Ihre kostenlose Testphase</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              {error.includes("bereits registriert") && (
                <Link href="/login" className="block mt-2 text-primary font-medium hover:underline">
                  Zur Anmeldung
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              
              {password && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthInfo.color} ${strengthInfo.width} transition-all duration-300`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength === "weak" ? "text-red-600" :
                      passwordStrength === "fair" ? "text-orange-600" :
                      passwordStrength === "good" ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className={`flex items-center gap-1.5 ${passwordRequirements.hasMinLength ? "text-green-600" : "text-gray-400"}`}>
                      {passwordRequirements.hasMinLength ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Mindestens 8 Zeichen</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordRequirements.hasLetters ? "text-green-600" : "text-gray-400"}`}>
                      {passwordRequirements.hasLetters ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Enthält Buchstaben</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordRequirements.hasNumbers ? "text-green-600" : "text-gray-400"}`}>
                      {passwordRequirements.hasNumbers ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Enthält Zahlen</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordRequirements.hasSpecialChars ? "text-green-600" : "text-gray-400"}`}>
                      {passwordRequirements.hasSpecialChars ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Enthält Sonderzeichen</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrieren...
                </>
              ) : (
                <>
                  Kostenlos registrieren
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Bereits ein Konto?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Jetzt anmelden
              </Link>
            </p>
          </div>

          <p className="mt-6 text-xs text-gray-500 text-center">
            Mit der Registrierung akzeptieren Sie unsere{" "}
            <Link href="/agb" className="underline">AGB</Link> und{" "}
            <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
