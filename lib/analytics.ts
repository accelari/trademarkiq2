"use client";

// Session ID im Browser speichern
const SESSION_KEY = "tiq_session_id";

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Event Types
export type EventType = "page_view" | "click" | "form_submit" | "error" | "conversion" | "navigation";

export interface TrackEventParams {
  eventType: EventType;
  eventName: string;
  elementId?: string;
  elementText?: string;
  metadata?: Record<string, unknown>;
}

// Hauptfunktion zum Tracken von Events
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    const payload = {
      sessionId,
      eventType: params.eventType,
      eventName: params.eventName,
      pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
      elementId: params.elementId,
      elementText: params.elementText,
      metadata: params.metadata,
    };

    // Fire and forget - wir warten nicht auf die Antwort
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // Wichtig für beforeunload
    }).catch(() => {
      // Fehler still ignorieren - Analytics soll nicht die App blocken
    });
  } catch {
    // Fehler still ignorieren
  }
}

// Convenience-Funktionen
export function trackPageView(pageName?: string): void {
  trackEvent({
    eventType: "page_view",
    eventName: pageName || window.location.pathname,
  });
}

export function trackClick(elementId: string, elementText?: string, metadata?: Record<string, unknown>): void {
  trackEvent({
    eventType: "click",
    eventName: `click_${elementId}`,
    elementId,
    elementText,
    metadata,
  });
}

export function trackFormSubmit(formName: string, metadata?: Record<string, unknown>): void {
  trackEvent({
    eventType: "form_submit",
    eventName: `form_${formName}`,
    metadata,
  });
}

export function trackConversion(conversionName: string, metadata?: Record<string, unknown>): void {
  trackEvent({
    eventType: "conversion",
    eventName: conversionName,
    metadata,
  });
}

export function trackError(errorName: string, metadata?: Record<string, unknown>): void {
  trackEvent({
    eventType: "error",
    eventName: `error_${errorName}`,
    metadata,
  });
}

export function trackNavigation(from: string, to: string): void {
  trackEvent({
    eventType: "navigation",
    eventName: "navigate",
    metadata: { from, to },
  });
}

// Automatisches Page View Tracking als React Hook
export function usePageTracking(): void {
  if (typeof window === "undefined") return;
  
  // Einmalig beim Mount tracken
  trackPageView();
}
