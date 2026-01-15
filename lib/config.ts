/**
 * Zentrale Konfiguration für die TrademarkIQ Anwendung
 * 
 * Alle konfigurierbaren Werte an einem Ort für einfache Anpassung
 */

// ============================================
// Debounce-Zeiten (in Millisekunden)
// ============================================

export const DEBOUNCE_TIMES = {
  /**
   * Zeit bis Feldänderungen im Event-Log protokolliert werden
   * Verhindert Spam bei schnellem Tippen
   * Default: 1500ms (1.5 Sekunden)
   */
  FIELD_CHANGE_LOG: 1500,
  
  /**
   * Zeit bis Chat-Benachrichtigung bei manuellen Änderungen gesendet wird
   * Gibt dem User Zeit, alle Felder auszufüllen bevor KI reagiert
   * Default: 10000ms (10 Sekunden)
   */
  CHAT_NOTIFICATION: 10000,
  
  /**
   * Zeit bis Auto-Save der Session-Zusammenfassung
   * Default: 2000ms (2 Sekunden)
   */
  SESSION_AUTOSAVE: 2000,
  
  /**
   * Zeit bis Auto-Save der Recherche-Entscheidungen
   * Default: 2000ms (2 Sekunden)
   */
  DECISIONS_AUTOSAVE: 2000,
  
  /**
   * Zeit bis Trigger-Flag zurückgesetzt wird
   * Verhindert Race Conditions zwischen KI-Trigger und manueller Änderungserkennung
   * Default: 100ms
   */
  TRIGGER_FLAG_RESET: 100,
} as const;

// ============================================
// Trigger-Feedback Konfiguration
// ============================================

export const TRIGGER_FEEDBACK = {
  /**
   * Zeit bis Trigger-Feedback automatisch ausgeblendet wird
   * Default: 5000ms (5 Sekunden)
   */
  AUTO_DISMISS_DELAY: 5000,
  
  /**
   * Animation-Dauer für Ein-/Ausblenden
   * Default: 300ms
   */
  ANIMATION_DURATION: 300,
} as const;

// ============================================
// Chat-Konfiguration
// ============================================

export const CHAT_CONFIG = {
  /**
   * Maximale Anzahl an Nachrichten die im Chat angezeigt werden
   * Ältere Nachrichten werden ausgeblendet aber nicht gelöscht
   * Default: 100
   */
  MAX_VISIBLE_MESSAGES: 100,
  
  /**
   * Verzögerung vor Navigation nach [GOTO:] Trigger
   * Gibt dem User Zeit, die Nachricht zu lesen
   * Default: 500ms
   */
  GOTO_NAVIGATION_DELAY: 500,
} as const;

// ============================================
// Recherche-Konfiguration
// ============================================

export const RECHERCHE_CONFIG = {
  /**
   * Maximale Anzahl an Konflikten die initial angezeigt werden
   * Default: 10
   */
  INITIAL_CONFLICTS_SHOWN: 10,
  
  /**
   * Maximale Anzahl an alternativen Namen die vorgeschlagen werden
   * Default: 5
   */
  MAX_ALTERNATIVE_NAMES: 5,
} as const;

// ============================================
// Logo-Konfiguration
// ============================================

export const LOGO_CONFIG = {
  /**
   * Maximale Dateigröße für Logo-Upload in Bytes
   * Default: 5MB
   */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /**
   * Erlaubte Dateitypen für Logo-Upload
   */
  ALLOWED_TYPES: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  
  /**
   * Maximale Anzahl an Logos pro Fall
   * Default: 20
   */
  MAX_LOGOS_PER_CASE: 20,
} as const;

// ============================================
// API-Konfiguration
// ============================================

export const API_CONFIG = {
  /**
   * Timeout für API-Anfragen in Millisekunden
   * Default: 30000ms (30 Sekunden)
   */
  REQUEST_TIMEOUT: 30000,
  
  /**
   * Maximale Anzahl an Wiederholungsversuchen bei Fehlern
   * Default: 3
   */
  MAX_RETRIES: 3,
  
  /**
   * Verzögerung zwischen Wiederholungsversuchen in Millisekunden
   * Default: 1000ms (1 Sekunde)
   */
  RETRY_DELAY: 1000,
} as const;

// Type exports für TypeScript
export type DebounceTimesConfig = typeof DEBOUNCE_TIMES;
export type TriggerFeedbackConfig = typeof TRIGGER_FEEDBACK;
export type ChatConfig = typeof CHAT_CONFIG;
export type RechercheConfig = typeof RECHERCHE_CONFIG;
export type LogoConfig = typeof LOGO_CONFIG;
export type ApiConfig = typeof API_CONFIG;
