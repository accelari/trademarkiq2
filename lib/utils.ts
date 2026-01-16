import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// Datums- und Zeitformatierung (Zentrale Utilities)
// ============================================

/**
 * Formatiert ein Datum im deutschen Format (TT.MM.JJJJ)
 * @param dateStr - ISO-Datumsstring oder Date-Objekt
 * @param options - Optionale Formatierungsoptionen
 */
export function formatDate(
  dateStr: string | Date,
  options?: {
    includeTime?: boolean;
    shortYear?: boolean;
  }
): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  
  if (isNaN(date.getTime())) {
    return "Ungültiges Datum";
  }
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: options?.shortYear ? "2-digit" : "numeric",
  };
  
  if (options?.includeTime) {
    dateOptions.hour = "2-digit";
    dateOptions.minute = "2-digit";
  }
  
  return date.toLocaleDateString("de-DE", dateOptions);
}

/**
 * Formatiert eine Uhrzeit im deutschen Format (HH:MM)
 * @param dateStr - ISO-Datumsstring oder Date-Objekt
 */
export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  
  if (isNaN(date.getTime())) {
    return "Ungültige Zeit";
  }
  
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatiert Datum und Uhrzeit zusammen (TT.MM.JJJJ HH:MM)
 * @param dateStr - ISO-Datumsstring oder Date-Objekt
 */
export function formatDateTime(dateStr: string | Date): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

/**
 * Formatiert ein Datum relativ zur aktuellen Zeit (z.B. "vor 5 Minuten")
 * @param dateStr - ISO-Datumsstring oder Date-Objekt
 */
export function formatRelativeTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Minute${diffMin === 1 ? "" : "n"}`;
  if (diffHour < 24) return `vor ${diffHour} Stunde${diffHour === 1 ? "" : "n"}`;
  if (diffDay < 7) return `vor ${diffDay} Tag${diffDay === 1 ? "" : "en"}`;
  
  return formatDate(date);
}

// ============================================
// Zahlenformatierung
// ============================================

/**
 * Formatiert eine Zahl im deutschen Format mit Tausendertrennzeichen
 * @param value - Die zu formatierende Zahl
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

/**
 * Formatiert einen Währungsbetrag im deutschen Format
 * @param value - Der Betrag
 * @param currency - Währungscode (Standard: EUR)
 */
export function formatCurrency(value: number, currency: string = "EUR"): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatiert einen Prozentsatz
 * @param value - Der Wert (0-100 oder 0-1)
 * @param isDecimal - Ob der Wert als Dezimalzahl (0-1) übergeben wird
 */
export function formatPercent(value: number, isDecimal: boolean = false): string {
  const percent = isDecimal ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}
