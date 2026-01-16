"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslations, getAvailableLocales, type Locale } from "@/lib/i18n";

/**
 * Language Switcher Komponente
 * 
 * Ermöglicht dem Benutzer, die Sprache der Anwendung zu wechseln.
 * Die Auswahl wird im LocalStorage gespeichert.
 * 
 * Verwendung:
 * ```tsx
 * import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
 * 
 * <LanguageSwitcher />
 * ```
 */

interface LanguageSwitcherProps {
  className?: string;
  variant?: "dropdown" | "buttons" | "minimal";
}

export function LanguageSwitcher({ 
  className = "", 
  variant = "dropdown" 
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const availableLocales = getAvailableLocales();

  // Verhindere Hydration-Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
    // Seite neu laden, um alle Texte zu aktualisieren
    window.location.reload();
  };

  if (!mounted) {
    return null;
  }

  const currentLocale = availableLocales.find(l => l.code === locale);

  // Minimal Variant - nur Icon mit Tooltip
  if (variant === "minimal") {
    return (
      <button
        onClick={() => {
          const nextLocale = locale === "de" ? "en" : "de";
          handleLocaleChange(nextLocale);
        }}
        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
        title={`Sprache wechseln zu ${locale === "de" ? "English" : "Deutsch"}`}
      >
        <Globe className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  // Buttons Variant - alle Sprachen als Buttons
  if (variant === "buttons") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {availableLocales.map((l) => (
          <button
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              locale === l.code
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown Variant (default)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {currentLocale?.label}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {availableLocales.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLocaleChange(l.code)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  locale === l.code
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;
