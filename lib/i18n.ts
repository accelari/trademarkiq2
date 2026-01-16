/**
 * i18n Utilities für TrademarkIQ
 * 
 * Diese Datei bietet eine einfache i18n-Lösung, die die App für
 * zukünftige Mehrsprachigkeit vorbereitet, ohne die URL-Struktur zu ändern.
 * 
 * Unterstützte Sprachen:
 * - de: Deutsch (Standard)
 * - en: Englisch
 * 
 * Verwendung:
 * ```tsx
 * import { useTranslations, t } from '@/lib/i18n';
 * 
 * // In einer Client-Komponente:
 * const { t } = useTranslations();
 * return <h1>{t('credits.title')}</h1>;
 * 
 * // Oder direkt (für Server-Komponenten):
 * import { t } from '@/lib/i18n';
 * return <h1>{t('credits.title')}</h1>;
 * ```
 */

import deMessages from '@/messages/de.json';
import enMessages from '@/messages/en.json';

// Typen
export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

type Messages = typeof deMessages;
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
      : never
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<Messages>;

// Übersetzungsdateien
const messages: Record<Locale, Messages> = {
  de: deMessages,
  en: enMessages,
};

// Aktuelle Sprache (kann später durch Cookie/LocalStorage/URL gesteuert werden)
let currentLocale: Locale = defaultLocale;

/**
 * Setzt die aktuelle Sprache
 */
export function setLocale(locale: Locale): void {
  if (locales.includes(locale)) {
    currentLocale = locale;
    // Optional: In LocalStorage speichern
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }
}

/**
 * Gibt die aktuelle Sprache zurück
 */
export function getLocale(): Locale {
  // Versuche aus LocalStorage zu laden (nur im Browser)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored && locales.includes(stored)) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

/**
 * Holt einen verschachtelten Wert aus einem Objekt anhand eines Pfads
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Fallback: Schlüssel zurückgeben
    }
  }
  
  return typeof current === 'string' ? current : path;
}

/**
 * Übersetzt einen Schlüssel in die aktuelle Sprache
 * 
 * @param key - Der Übersetzungsschlüssel (z.B. 'credits.title')
 * @param params - Optionale Parameter für Interpolation (z.B. { count: 5 })
 * @returns Die übersetzte Zeichenkette
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  const translation = getNestedValue(messages[locale] as unknown as Record<string, unknown>, key);
  
  if (!params) {
    return translation;
  }
  
  // Parameter interpolieren (z.B. {count} -> 5)
  return translation.replace(/\{(\w+)\}/g, (_, paramKey) => {
    return params[paramKey]?.toString() ?? `{${paramKey}}`;
  });
}

/**
 * React Hook für Übersetzungen in Client-Komponenten
 * 
 * @returns Ein Objekt mit der t-Funktion und der aktuellen Sprache
 */
export function useTranslations() {
  return {
    t,
    locale: getLocale(),
    setLocale,
    locales,
  };
}

/**
 * Gibt alle verfügbaren Sprachen mit Labels zurück
 */
export function getAvailableLocales(): Array<{ code: Locale; label: string }> {
  return [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
  ];
}

/**
 * Formatiert ein Datum in der aktuellen Sprache
 */
export function formatLocalizedDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = getLocale();
  const localeCode = locale === 'de' ? 'de-DE' : 'en-US';
  
  return d.toLocaleDateString(localeCode, options ?? {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatiert eine Zahl in der aktuellen Sprache
 */
export function formatLocalizedNumber(num: number, options?: Intl.NumberFormatOptions): string {
  const locale = getLocale();
  const localeCode = locale === 'de' ? 'de-DE' : 'en-US';
  
  return num.toLocaleString(localeCode, options);
}

/**
 * Formatiert eine Währung in der aktuellen Sprache
 */
export function formatLocalizedCurrency(amount: number, currency = 'EUR'): string {
  const locale = getLocale();
  const localeCode = locale === 'de' ? 'de-DE' : 'en-US';
  
  return amount.toLocaleString(localeCode, {
    style: 'currency',
    currency,
  });
}
