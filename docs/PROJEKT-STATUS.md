# TrademarkIQ - Projekt-Statusbericht

**Erstellt:** 20. Dezember 2024  
**Version:** 1.0  
**Status:** MVP in Entwicklung

---

## 1. Projektübersicht

### Was ist TrademarkIQ?
TrademarkIQ ist eine KI-gestützte Plattform für Markenrecherche und -anmeldung im deutschen Markt. Die Plattform ermöglicht es Unternehmen und Gründern, Markennamen auf Kollisionsrisiken zu prüfen, bevor sie eine teure Markenanmeldung durchführen.

### Zielgruppe
- Startups und Gründer
- KMUs (kleine und mittlere Unternehmen)
- Markenagenturen
- Rechtsanwälte (als Unterstützungstool)

### Kernversprechen
- **Schnelligkeit:** Ergebnisse in Sekunden statt Tagen
- **Kostenersparnis:** Vermeidung teurer Markenkollisionen (Ø €5.000+)
- **Einfachheit:** Komplexe Markenrecherche für Nicht-Juristen verständlich

---

## 2. Feature-Status (Ampelsystem)

| Status | Bedeutung |
|--------|-----------|
| 🟢 | Fertig & funktionsfähig |
| 🟡 | In Arbeit / Teilweise fertig |
| 🔴 | Noch nicht begonnen / Geplant |

### Hauptfunktionen

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Markenberatung (Klaus)** | 🟢 | KI-Sprachassistent für Beratungsgespräche |
| **Markenprüfung (Recherche)** | 🟢 | Suche in DPMA, EUIPO, WIPO Registern |
| **Risikoanalyse** | 🟢 | KI-gestützte Konfliktbewertung mit Ampelsystem |
| **Alternative Namen** | 🟢 | KI generiert Namensvorschläge bei hohem Risiko |
| **Watchlist** | 🟢 | Markenüberwachung mit Konfliktprüfung |
| **Playbooks** | 🟢 | Schritt-für-Schritt Anleitungen (DPMA, EUIPO, WIPO) |
| **Team-Verwaltung** | 🟢 | Einladungen, Rollen, Multi-User |
| **Experten-Verzeichnis** | 🟢 | Kontakt zu Markenrechtsanwälten |
| **Markenanmeldung** | 🟡 | Wizard vorhanden, Experten-Zuweisung fehlt teilweise |

### Authentifizierung & Sicherheit

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Registrierung | 🟢 | E-Mail + Passwort |
| Login | 🟢 | Session-basiert (NextAuth v5) |
| E-Mail-Verifizierung | 🟢 | Bestätigungslink per E-Mail |
| Passwort vergessen | 🟢 | Reset-Link per E-Mail |
| DSGVO-Konformität | 🟢 | Server in Deutschland |

### Technische Qualität

| Bereich | Status | Details |
|---------|--------|---------|
| Datenbank | 🟢 | PostgreSQL (Neon), 15+ Tabellen |
| API-Struktur | 🟢 | 40+ REST-Endpoints |
| KI-Integration | 🟢 | Claude (Anthropic), Hume Voice AI |
| Externe APIs | 🟢 | tmsearch.ai für Registersuche |
| Code-Qualität | 🟢 | TypeScript, ESLint, komponenten-basiert |
| Mobile Responsive | 🟡 | Grundlegend vorhanden |

---

## 3. User Journey (Die 4 Schritte)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. BERATUNG    │ ──▶ │  2. PRÜFUNG     │ ──▶ │  3. ANMELDUNG   │ ──▶ │  4. WATCHLIST   │
│     (Klaus)     │     │   (Recherche)   │     │    (Wizard)     │     │  (Überwachung)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
       🟢                      🟢                      🟡                      🟢
```

### Schritt 1: Beratung (Markenberater Klaus) 🟢
- **Was funktioniert:**
  - Sprachgesteuerte Beratung mit KI
  - Langzeit-Gedächtnis (Klaus erinnert sich an frühere Gespräche)
  - Automatische Extraktion von Markenname, Länder, Nizza-Klassen
  - Zusammenfassung speichern und per E-Mail senden
  - Case-System mit Fallnummern (TM-2024-XXXXXX)

### Schritt 2: Markenprüfung (Recherche + Risikoanalyse) 🟢
- **Was funktioniert:**
  - Suche in DPMA, EUIPO, WIPO, WIPO-Designierungen
  - KI-generierte Suchvarianten (phonetisch, visuell, Synonyme)
  - Zwei-Stufen-Analyse: Quick-Check (1 Sek.) + Vollanalyse (~2 Min.)
  - Risiko-Score mit Ampelsystem (Grün/Gelb/Rot)
  - Detaillierte Konfliktanalyse pro gefundener Marke
  - Alternative Namensvorschläge bei hohem Risiko
  - Daten aus Beratung werden automatisch übernommen

### Schritt 3: Markenanmeldung 🟡
- **Was funktioniert:**
  - 4-Schritt-Wizard (Marke → Amt → Klassen → Zusammenfassung)
  - Status-Tracking (Entwurf, Eingereicht, Prüfung, etc.)
  - Playbooks mit Checklisten für DPMA/EUIPO/WIPO
- **Was fehlt:**
  - Automatische Experten-Zuweisung
  - Direkte Einreichung bei Ämtern

### Schritt 4: Watchlist (Überwachung) 🟢
- **Was funktioniert:**
  - Marken zur Überwachung hinzufügen
  - Automatische Konfliktprüfung
  - Aktivitäts-Timeline mit Alerts
  - Batch-Prüfung aller Marken

---

## 4. Datenbank-Struktur

| Tabelle | Zweck | Einträge* |
|---------|-------|-----------|
| users | Benutzerkonten | - |
| organizations | Firmen/Teams | - |
| memberships | Benutzer ↔ Organisation | - |
| trademarkCases | Markenfälle (TM-Nummern) | - |
| caseSteps | Fortschritt pro Fall | - |
| caseDecisions | Extrahierte Entscheidungen | - |
| consultations | Beratungsgespräche | - |
| searches | Durchgeführte Suchen | - |
| watchlistItems | Überwachte Marken | - |
| alerts | Benachrichtigungen | - |
| playbooks | Anmeldungs-Playbooks | - |
| trademarkApplications | Anmeldungen | - |
| experts | Experten-Verzeichnis | - |
| expertContacts | Kontaktanfragen | - |

*Einträge variieren je nach Nutzung

---

## 5. Externe Abhängigkeiten

| Dienst | Zweck | Status |
|--------|-------|--------|
| **Hume AI** | Sprachassistent (Klaus) | 🟢 Aktiv |
| **Anthropic Claude** | KI-Analyse, Textgenerierung | 🟢 Aktiv |
| **tmsearch.ai** | Markenregister-Suche | 🟢 Aktiv |
| **Neon (PostgreSQL)** | Datenbank | 🟢 Aktiv |
| **Resend** | E-Mail-Versand | 🟢 Aktiv |
| **Replit** | Hosting & Deployment | 🟢 Aktiv |

---

## 6. Offene Punkte & Empfehlungen

### Priorität HOCH 🔴
| Thema | Beschreibung | Aufwand |
|-------|--------------|---------|
| Zahlungsintegration | Stripe für Abonnements | 2-3 Tage |
| PDF-Export | Risikobericht als PDF | 1 Tag |
| Mobile Optimierung | Dashboard für Smartphones | 2 Tage |

### Priorität MITTEL 🟡
| Thema | Beschreibung | Aufwand |
|-------|--------------|---------|
| E-Mail-Benachrichtigungen | Alerts per E-Mail senden | 1 Tag |
| Mehrsprachigkeit | Englische Version | 3-5 Tage |
| Analytics | Nutzungsstatistiken | 1-2 Tage |

### Priorität NIEDRIG 🟢
| Thema | Beschreibung | Aufwand |
|-------|--------------|---------|
| Dark Mode | Dunkles Farbschema | 0.5 Tage |
| API-Dokumentation | Für Entwickler | 1 Tag |
| Onboarding-Tour | Interaktive Einführung | 1 Tag |

---

## 7. Technologie-Stack

```
Frontend:        Next.js 16 (App Router) + React + TypeScript
Styling:         Tailwind CSS + Custom Design System (ACCELARI)
Datenbank:       PostgreSQL (Neon) + Drizzle ORM
Auth:            NextAuth v5 (JWT + Sessions)
KI:              Claude 4 (Anthropic) + Hume Voice AI
E-Mail:          Resend
Hosting:         Replit
```

---

## 8. Zusammenfassung

### Stärken ✅
- Vollständige Benutzer-Journey von Beratung bis Watchlist
- Moderne KI-Integration (Sprache + Text)
- Echte Markenregister-Daten (keine Mock-Daten)
- Saubere Code-Architektur
- DSGVO-konform

### Verbesserungspotenzial ⚠️
- Zahlungsintegration fehlt noch
- Mobile Ansicht könnte besser sein
- Einige Features noch nicht 100% poliert

### Gesamtbewertung
**Das Projekt ist zu ~85% fertig für einen MVP-Launch.**

Die Kernfunktionen (Beratung, Recherche, Risikoanalyse, Watchlist) sind vollständig implementiert und funktionsfähig. Für einen kommerziellen Launch fehlt primär die Zahlungsintegration.

---

*Dieser Bericht wurde automatisch erstellt basierend auf der Code-Analyse vom 20.12.2024*
