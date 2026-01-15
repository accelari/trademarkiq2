# TrademarkIQ2 - Architektur-Dokumentation

## Projektübersicht

TrademarkIQ2 ist eine KI-gestützte Markenrecherche-Plattform, die Anwälten und Unternehmen hilft, Markenrisiken zu analysieren und fundierte Entscheidungen zu treffen.

**Tech Stack:**
- Frontend: Next.js 16.0.3 (App Router, Turbopack)
- Backend: Next.js API Routes
- Datenbank: PostgreSQL mit Drizzle ORM
- Authentifizierung: NextAuth.js
- Styling: Tailwind CSS + shadcn/ui

---

## Externe APIs

### KI-Modelle
| API | Verwendung | Datei |
|-----|------------|-------|
| **Claude (Anthropic)** | Hauptberater-Chat, Risikoanalyse, Markenberatung | `app/api/claude-chat/route.ts` |
| **OpenAI GPT-4o** | Fallback-Chat, Whisper Transkription | `app/api/openai/chat/route.ts`, `app/api/whisper/route.ts` |

### Markenrecherche
| API | Verwendung | Datei |
|-----|------------|-------|
| **TMSearch.ai** | Markensuche in globalen Registern (WIPO, EUIPO, DPMA, etc.) | `app/api/tmsearch/search/route.ts` |
| **Tavily** | Web-Recherche für Markeninformationen | `app/api/web-search/route.ts` |

### Bildgenerierung
| API | Verwendung | Datei |
|-----|------------|-------|
| **Ideogram** | Logo-Generierung (V_2_TURBO Modell) | `app/api/generate-logo/route.ts` |
| **BFL (Black Forest Labs)** | Logo-Bearbeitung mit FLUX Kontext | `app/api/edit-logo/route.ts` |

---

## Datenbank-Schema

### Kern-Tabellen

```
users                    # Benutzer mit Credits
  ├── credits           # Aktuelles Guthaben (decimal)
  ├── creditWarningThreshold
  └── isAdmin

trademark_cases          # Markenfälle
  ├── caseNumber        # Eindeutige Fallnummer
  ├── trademarkName
  └── status

case_decisions          # Entscheidungen pro Fall
  ├── trademarkNames[]
  ├── trademarkType     # wortmarke, bildmarke, wort-bildmarke
  ├── countries[]
  └── niceClasses[]

case_analyses           # Recherche-Ergebnisse
  ├── searchQuery       # {trademarkName, countries, niceClasses}
  ├── conflicts[]       # Gefundene Konflikte
  ├── aiAnalysis        # KI-Bewertung
  └── riskLevel         # high, medium, low

case_logos              # Gespeicherte Logos
  ├── url               # Original URL (kann ablaufen)
  ├── imageData         # Base64-kodiert (permanent)
  ├── source            # generated, uploaded, edited
  └── isSelected
```

### Credit-System

```
api_usage_logs          # Alle API-Aufrufe
  ├── apiProvider       # claude, openai, tmsearch, tavily, ideogram, bfl
  ├── inputTokens / outputTokens
  ├── costUsd / costEur
  └── creditsCharged

credit_transactions     # Guthaben-Historie
  ├── type              # purchase, usage, refund, bonus
  ├── amount            # +/- Credits
  ├── balanceBefore / balanceAfter
  └── description
```

---

## API-Routen Übersicht

### Authentifizierung (`/api/auth/`)
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/auth/[...nextauth]` | * | NextAuth Handler |
| `/api/auth/register` | POST | Benutzer registrieren |
| `/api/auth/verify-email` | POST | E-Mail verifizieren |
| `/api/auth/forgot-password` | POST | Passwort zurücksetzen |

### Markenfälle (`/api/cases/`)
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/cases` | GET/POST | Fälle auflisten/erstellen |
| `/api/cases/[caseId]` | GET/PUT/DELETE | Einzelnen Fall verwalten |
| `/api/cases/[caseId]/analyses` | GET/POST | Recherche-Ergebnisse |
| `/api/cases/[caseId]/consultation` | GET/POST | Beratungs-Chat |
| `/api/cases/[caseId]/recherche-history` | GET | Recherche-Historie |

### Markenrecherche (`/api/tmsearch/`)
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/tmsearch/search` | POST | TMSearch.ai Suche ausführen |
| `/api/tmsearch/analyze` | POST | Konflikte analysieren |
| `/api/tmsearch/analyze-stream` | POST | Streaming-Analyse |
| `/api/tmsearch/info` | GET | Verfügbare Register |

### KI-Chat
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/claude-chat` | POST | Claude Berater-Chat |
| `/api/openai/chat` | POST | OpenAI Chat (Fallback) |
| `/api/whisper` | POST | Audio-Transkription |

### Logo-Generierung
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/generate-logo` | POST | Logo mit Ideogram generieren |
| `/api/edit-logo` | POST | Logo mit BFL FLUX bearbeiten |
| `/api/case-logos` | GET/POST/DELETE | Logos verwalten |

### Credits & Admin
| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/credits` | GET/POST | Credit-Stand & Transaktionen |
| `/api/admin/api-costs` | GET | API-Kosten Übersicht |
| `/api/admin/analytics` | GET | Nutzungsstatistiken |

---

## Wichtige Lib-Module

### `/lib/api-logger.ts`
Zentrales API-Logging und Kostenberechnung für alle externen APIs.

**Funktionen:**
- `logApiUsage()` - API-Aufruf loggen und Credits abziehen
- `calculateApiCost()` - Kosten basierend auf Provider/Modell berechnen
- `deductCredits()` / `addCredits()` - Credit-Verwaltung

**Preiskonfiguration:**
```typescript
API_PRICING = {
  claude: { "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0 } },
  tmsearch: { perSearch: 0.05 },
  ideogram: { "V_2_TURBO": { perImage: 0.05 } },
  bfl: { "flux-kontext-pro": { perImage: 0.04 } },
  // ...
}
```

### `/lib/credit-manager.ts`
Credit-System Verwaltung.

**Funktionen:**
- `getUserCredits()` - Aktuellen Stand abrufen
- `hasEnoughCredits()` - Prüfen ob genug Credits
- `getCreditHistory()` - Transaktionshistorie
- `getUserUsageStats()` - Verbrauchsstatistiken

### `/lib/country-mapping.ts`
Länder- und Register-Mapping für Markenrecherche.

**Wichtig:**
- `getRelevantCountries()` - Berechnet relevante Länder für einen Konflikt
- Unterstützt regionale Codes: BX (Benelux), OA (OAPI), EU, etc.
- Expandiert regionale Codes zu Einzelländern

### `/lib/tmsearch/`
TMSearch.ai API Client.

**Dateien:**
- `client.ts` - API-Aufrufe
- `types.ts` - TypeScript Interfaces

### `/lib/nice-classes.ts`
Nizza-Klassifikation (45 Klassen für Waren/Dienstleistungen).

### `/lib/search-variants.ts`
Generiert Suchvarianten für Markennamen (phonetisch, visuell, Tippfehler).

---

## Seiten-Struktur

```
app/
├── (auth)/                    # Auth-Seiten (Login, Register)
│   ├── login/
│   └── register/
├── dashboard/                 # Hauptanwendung
│   ├── cases/                 # Fallübersicht
│   ├── case/[caseId]/        # Einzelner Fall (Hauptseite!)
│   ├── credits/              # Credit-Verwaltung
│   └── admin/                # Admin-Bereich
│       └── costs/            # API-Kosten Dashboard
└── api/                      # API-Routen (siehe oben)
```

### Hauptseite: `/dashboard/case/[caseId]/page.tsx`
Diese Datei (~6000 Zeilen) enthält die gesamte Markenfall-UI:
- Beratungs-Chat
- Markenrecherche mit TMSearch
- Konflikt-Analyse und Risikobewertung
- Logo-Generierung und -Bearbeitung
- Länder- und Klassenauswahl

---

## Datenflüsse

### 1. Markenrecherche
```
User wählt Markenname + Länder + Klassen
    ↓
/api/tmsearch/search (TMSearch.ai API)
    ↓
Ergebnisse werden gefiltert (relevante Länder)
    ↓
/api/tmsearch/analyze-stream (Claude analysiert Konflikte)
    ↓
Risikobewertung wird angezeigt
    ↓
Ergebnis in case_analyses gespeichert
```

### 2. Logo-Generierung
```
User gibt Prompt ein
    ↓
/api/generate-logo (Ideogram API)
    ↓
Logo wird als Base64 in case_logos gespeichert
    ↓
Optional: /api/edit-logo (BFL FLUX für Bearbeitung)
```

### 3. Credit-Abrechnung
```
Jeder API-Aufruf → logApiUsage()
    ↓
Kosten werden berechnet (calculateApiCost)
    ↓
Credits werden abgezogen (deductCredits)
    ↓
Transaktion in credit_transactions geloggt
```

---

## Umgebungsvariablen

```env
# Datenbank
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:5000

# KI APIs
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Markenrecherche
TMSEARCH_API_KEY=...
TAVILY_API_KEY=...

# Bildgenerierung
IDEOGRAM_API_KEY=...
BFL_API_KEY=...

# E-Mail
RESEND_API_KEY=...
```

---

## Bekannte Einschränkungen

1. **TMSearch.ai Register:** Nicht alle Länder werden direkt unterstützt. Regionale Codes (BX, OA) müssen zu Einzelländern expandiert werden.

2. **Logo-URLs:** Externe URLs (Ideogram, BFL) können ablaufen. Deshalb werden Logos als Base64 in der Datenbank gespeichert.

3. **Verwandte Klassen:** Feature ist deaktiviert, da TMSearch keine Waren/Dienstleistungs-Inhalte liefert.

---

## KI-Chatbot-System (Akkordeon-Berater)

Die Hauptseite (`/dashboard/case/[caseId]/page.tsx`) enthält mehrere KI-Berater, die in verschiedenen Akkordeons arbeiten. Jeder Berater hat einen eigenen Kontext und spezifische Trigger.

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    ClaudeAssistant Component                     │
│  (app/components/ClaudeAssistant.tsx)                           │
├─────────────────────────────────────────────────────────────────┤
│  - Verwaltet Chat-UI und Nachrichten                            │
│  - Sendet Anfragen an /api/claude-chat                          │
│  - Verarbeitet Trigger aus KI-Antworten                         │
│  - Unterstützt Spracheingabe (Hume AI) und Bildupload           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Prompt-System (lib/prompts/)                  │
├─────────────────────────────────────────────────────────────────┤
│  beratung.ts    → getBeratungRules(context)                     │
│  markenname.ts  → getMarkennameRules(context)                   │
│  recherche.ts   → getRechercheRules(context)                    │
│  anmeldung.ts   → getAnmeldungRules(context)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Akkordeon 1: Beratung

**Datei:** `lib/prompts/beratung.ts`

**Rolle:** Markenrechts-Experte mit 40 Jahren Erfahrung

**Kontext-Daten:**
- `markenname` - Der Markenname (oder "❌ fehlt")
- `markenart` - Wortmarke/Bildmarke/Wort-Bildmarke
- `klassen` - Nizza-Klassen (01-45)
- `laender` - Zielländer (DE, EU, US, etc.)

**Trigger (Chat → Formular):**
| Trigger | Funktion |
|---------|----------|
| `[MARKE:Name]` | Setzt den Markennamen |
| `[ART:wortmarke]` | Setzt Markenart (wortmarke/bildmarke/wort-bildmarke) |
| `[KLASSEN:09,42]` | Setzt Nizza-Klassen |
| `[LAENDER:DE,EU,US]` | Setzt Zielländer |
| `[WEB_SUCHE:query]` | Startet Tavily Web-Suche |
| `[WEITERE_RECHERCHE]` | Setzt Formular zurück für neue Recherche |
| `[WEITER:markenname]` | Navigiert zu Markenname-Akkordeon |
| `[WEITER:recherche]` | Navigiert zu Recherche-Akkordeon |

**Wichtige Verhaltensregeln:**
1. Web-Suche proaktiv bei jedem neuen Markennamen
2. Bei Konflikten WARTEN auf Benutzer-Bestätigung (keine Trigger setzen!)
3. Verwandte Klassen vorschlagen (z.B. Software Kl.9 → auch Kl.42)
4. Berühmte Marken warnen (Apple, Nike, etc. auch in anderen Klassen)

**Abschluss-Flow:**
1. Alle 4 Felder ausgefüllt → Zusammenfassung zeigen
2. Benutzer bestätigt → Bei Bildmarke: `[WEITER:markenname]`, Bei Wortmarke: `[WEITER:recherche]`

---

### Akkordeon 2: Markenname (Logo)

**Datei:** `lib/prompts/markenname.ts`

**Rolle:** Logo-Designer und Markenrechts-Experte

**Kontext-Daten:**
- `trademarkName` - Der Markenname
- `trademarkType` - Die Markenart
- `hasLogo` - Ob bereits ein Logo vorhanden ist
- `niceClasses` - Die gewählten Klassen
- `countries` - Die gewählten Länder

**Trigger:**
| Trigger | Funktion |
|---------|----------|
| `[MARKE:Name]` | Ändert den Markennamen |
| `[ART:bildmarke]` | Ändert die Markenart |
| `[LOGO_GENERIEREN:prompt]` | Generiert neues Logo (Ideogram API) |
| `[LOGO_BEARBEITEN:änderung]` | Bearbeitet bestehendes Logo (BFL FLUX API) |
| `[KLASSEN:01,02]` | Ändert Klassen |
| `[LAENDER:DE,EU]` | Ändert Länder |
| `[GOTO:recherche]` | Navigiert zur Recherche |

**Logo-Prompt Format (englisch, für KI-Bildgenerator):**
```
[LOGO_GENERIEREN:Logo for "Markenname", modern minimalist, blue and white colors, abstract geometric shape, vector style, clean design]
```

**Wann BEARBEITEN vs. NEU GENERIEREN:**
- Kleine Änderung (Farbe, Element entfernen) → `[LOGO_BEARBEITEN:...]`
- Komplett neues Design → `[LOGO_GENERIEREN:...]`

---

### Akkordeon 3: Recherche

**Datei:** `lib/prompts/recherche.ts`

**Rolle:** Markenrechts-Experte für Recherche-Ergebnisse

**Kontext-Daten:**
- `trademarkName` - Der Markenname
- `niceClasses` - Die gewählten Klassen
- `countries` - Die gewählten Länder
- `trademarkType` - Die Markenart
- `isRunningAnalysis` - Ob gerade eine Recherche läuft

**Trigger:**
| Trigger | Funktion |
|---------|----------|
| `[RECHERCHE_STARTEN]` | Startet TMSearch API-Suche |
| `[WEB_SUCHE:query]` | Sucht allgemeine Infos im Internet |
| `[WEITER:checkliste]` | Navigiert zur Checkliste |
| `[WEITER:beratung]` | Zurück zur Beratung (bei Namensänderung) |

**Recherche-Ablauf:**
1. Validierung: Name, Klassen, Länder vorhanden?
2. API-Call: `/api/tmsearch/analyze-stream` (Server-Sent Events)
3. 5 Schritte: TMSearch API → Filter → Details → AI Analyse → Zusammenfassung
4. Ergebnis: Risiko-Score, Konflikte, Empfehlung (GO/WARNUNG/NO-GO)
5. KI erklärt Ergebnisse automatisch

**Nach Recherche-Ergebnis:**
- GO (keine Konflikte): Weiterleitung zur Anmeldung
- WARNUNG (ähnliche Marken): Risiko erklären, Entscheidung dem Benutzer überlassen
- NO-GO (Konflikt): Alternativen vorschlagen

---

### Akkordeon 4: Anmeldung

**Datei:** `lib/prompts/anmeldung.ts`

**Rolle:** Anmeldungs-Berater für Markenregistrierung

**Kontext-Daten:**
- `trademarkName`, `trademarkType`, `niceClasses`, `countries`
- `applicantType` - Privatperson oder Firma
- `applicantName`, `applicantStreet`, `applicantZip`, `applicantCity`
- `applicantCountry`, `applicantEmail`, `applicantPhone`, `applicantLegalForm`

**Trigger:**
| Trigger | Funktion |
|---------|----------|
| `[ANMELDER_TYP:privat]` | Setzt Anmeldertyp (privat/firma) |
| `[ANMELDER_NAME:...]` | Setzt Anmeldername |
| `[ANMELDER_STRASSE:...]` | Setzt Straße |
| `[ANMELDER_PLZ:...]` | Setzt PLZ |
| `[ANMELDER_ORT:...]` | Setzt Ort |
| `[ANMELDER_LAND:...]` | Setzt Land |
| `[ANMELDER_EMAIL:...]` | Setzt E-Mail |
| `[ANMELDER_TELEFON:...]` | Setzt Telefon |
| `[ANMELDER_RECHTSFORM:...]` | Setzt Rechtsform (bei Firma) |
| `[KOSTEN_BERECHNEN]` | Berechnet Anmeldekosten |

**Bidirektionale Synchronisation (Formular ↔ Chat):**

Das Anmeldung-Akkordeon unterstützt bidirektionale Synchronisation:

1. **Chat → Formular:** KI-Trigger füllen Formularfelder automatisch
2. **Formular → Chat:** Manuelle Änderungen werden erkannt und dem KI mitgeteilt

**Technische Implementierung:**
```typescript
// Refs für Synchronisation
anmeldungTriggerChangeInProgressRef  // Flag: Änderung durch KI-Trigger
lastLoggedAnmeldungFieldsRef         // Letzte geloggte Feldwerte
anmeldungFieldChangeLogTimeoutRef    // 1.5s Debounce für Feld-Logging
anmeldungManualChangeTimeoutRef      // 10s Debounce für Chat-Benachrichtigung
```

**Ablauf bei manueller Formular-Änderung:**
1. Benutzer ändert Feld im Formular
2. 1.5s Debounce → Änderung wird im Event-Log protokolliert
3. Wenn ALLE Felder ausgefüllt → 10s warten
4. Chat-Nachricht an KI: "Benutzer hat alle Daten manuell eingegeben"
5. KI bestätigt und bietet Kostenberechnung an

---

### Datenfluss zwischen Akkordeons

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Beratung   │ ──▶ │  Markenname  │ ──▶ │  Recherche   │ ──▶ │  Anmeldung   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
   markenname          trademarkName        rechercheForm        applicantData
   markenart           trademarkType        niceClasses          calculatedCosts
   klassen             logoGallery          countries
   laender             trademarkImageUrl    liveAnalysisResult
```

**Gemeinsame State-Variablen:**
- `sessionMessages` - Chat-Verlauf (wird zwischen Akkordeons geteilt)
- `rechercheForm` - Enthält Name, Klassen, Länder
- `trademarkType` - Markenart
- `applicantData` - Anmelder-Daten

**Navigation:**
- `handleToggleAccordion(stepId)` - Öffnet/schließt Akkordeon
- `setOpenAccordion(stepId)` - Setzt aktives Akkordeon direkt

---

### Trigger-Verarbeitung (page.tsx)

Die Trigger werden in der Hauptseite verarbeitet:

```typescript
// Beratung-Trigger (processBeratungTriggers)
const markeMatch = content.match(/\[MARKE:([^\]]+)\]/i);
const artMatch = content.match(/\[ART:(wortmarke|bildmarke|wort-bildmarke)\]/i);
const klassenMatch = content.match(/\[KLASSEN:([^\]]+)\]/i);
const laenderMatch = content.match(/\[LAENDER:([^\]]+)\]/i);
const webSucheMatch = content.match(/\[WEB_SUCHE:([^\]]+)\]/i);
const weitereRechercheMatch = content.includes("[WEITERE_RECHERCHE]");
const weiterMatch = content.match(/\[WEITER:(beratung|markenname|recherche|anmeldung)\]/i);

// Markenname-Trigger (processMarkennameTriggers)
const logoGenMatch = content.match(/\[LOGO_GENERIEREN:([^\]]+)\]/i);
const logoEditMatch = content.match(/\[LOGO_BEARBEITEN:([^\]]+)\]/i);

// Recherche-Trigger (processRechercheTriggers)
const rechercheStartMatch = content.includes("[RECHERCHE_STARTEN]");

// Anmeldung-Trigger (processAnmeldungTriggers)
const typMatch = content.match(/\[ANMELDER_TYP:(privat|firma)\]/i);
const nameMatch = content.match(/\[ANMELDER_NAME:([^\]]+)\]/i);
// ... weitere Anmelder-Felder
const kostenMatch = content.includes("[KOSTEN_BERECHNEN]");
```

---

## Detaillierter Workflow: Benutzer-Journey

### Phase 1: Session-Start (Beratung)

```
1. Benutzer öffnet Fall
   └── openAccordion = "beratung" (default, Zeile 845)
   
2. ClaudeAssistant wird geladen
   └── systemPromptAddition = getBeratungRules(context)
   └── previousMessages = sessionMessages
   
3. Auto-Start Begrüßung (ClaudeAssistant.tsx, Zeile 431-447)
   └── Wenn keine Nachrichten: requestGreeting() wird aufgerufen
   └── KI sendet Begrüßung mit Streaming-Effekt
   └── Nachricht wird zu sessionMessages hinzugefügt
```

### Phase 2: Beratungs-Dialog

```
1. Benutzer tippt/spricht Nachricht
   └── sendMessage() in ClaudeAssistant.tsx
   └── POST /api/claude-chat mit systemPromptAddition
   
2. KI-Antwort wird gestreamt
   └── Streaming via Server-Sent Events
   └── setStreamingResponse(fullResponse)
   
3. Nachricht wird gespeichert
   └── onMessageSent?.(assistantMessage)
   └── setSessionMessages(prev => [...prev, msg])
   
4. Trigger-Erkennung (page.tsx, Zeile 1912-1995)
   └── useEffect überwacht sessionMessages
   └── Wenn lastMsg.role === "assistant"
   └── Regex-Matching für Trigger
```

### Phase 3: Trigger-Verarbeitung

```
Wenn KI "[MARKE:Accelari]" setzt:

1. Trigger wird erkannt (Zeile 1923)
   └── const markeMatch = content.match(/\[MARKE:([^\]]+)\]/)
   
2. Flag wird gesetzt (Zeile 1927)
   └── triggerChangeInProgressRef.current = true
   
3. Formular wird aktualisiert (Zeile 1928-1929)
   └── setManualNameInput(name)
   └── setRechercheForm(prev => ({ ...prev, trademarkName: name }))
   
4. Flag wird zurückgesetzt (Zeile 1930)
   └── setTimeout(() => { triggerChangeInProgressRef.current = false }, 100)
   
5. lastNotifiedState wird aktualisiert (Zeile 1987-1993)
   └── Verhindert dass manuelle Änderungs-Erkennung auslöst
```

### Phase 4: Akkordeon-Wechsel

```
Automatisch via [WEITER:markenname] Trigger:

1. Trigger wird erkannt (Zeile 1533)
   └── const weiterMatch = content.match(/\[WEITER:(\w+)\]/i)
   
2. Validierung (Zeile 1538)
   └── VALID_ACCORDIONS.includes(target)
   
3. Verzögerung (Zeile 1546-1554)
   └── setTimeout(() => { ... }, 1500)  // 1.5s damit User Nachricht lesen kann
   
4. Navigation
   └── setOpenAccordion(target)
   └── window.location.hash = `#${target}`
   └── el?.scrollIntoView({ behavior: "smooth", block: "start" })
```

### Phase 5: Begrüßung im neuen Akkordeon

```
1. useEffect erkennt Akkordeon-Wechsel (Zeile 1702-1817)
   └── openAccordion !== lastVisitedAccordionRef.current
   
2. Prüfung ob bereits besucht (Zeile 1735)
   └── greetedAccordionsRef.current.has(openAccordion)
   
3. Kontext-Nachricht auswählen (Zeile 1741-1792)
   └── contextMessages[openAccordion]
   └── Dynamisch basierend auf aktuellem Status
   
4. Streaming-Effekt (Zeile 1805)
   └── targetRef.current?.simulateStreaming(contextMsg)
   
5. Als besucht markieren (Zeile 1811-1812)
   └── greetedAccordionsRef.current.add(openAccordion)
   └── saveVisitedAccordion(openAccordion)  // In DB speichern
```

---

## Akkordeon-Wechsel-Nachrichten (Detaillierte Regeln)

### Wann wird eine Nachricht gesendet?

Die Nachricht wird gesendet wenn **ALLE** folgenden Bedingungen erfüllt sind (page.tsx, Zeile 1702-1817):

| # | Bedingung | Code | Zeile |
|---|-----------|------|-------|
| 1 | Akkordeon ist gesetzt | `if (!openAccordion) return` | 1703 |
| 2 | Akkordeon hat gewechselt | `if (openAccordion === lastVisitedAccordionRef.current) return` | 1704 |
| 3 | Akkordeon hat KI-Berater | `accordionsWithAI.includes(openAccordion)` | 1722-1726 |
| 4 | Es gibt bereits Nachrichten | `if (sessionMessages.length === 0) return` | 1728-1731 |
| 5 | Akkordeon wurde noch nicht begrüßt | `if (greetedAccordionsRef.current.has(openAccordion)) return` | 1734-1738 |
| 6 | Es gab ein vorheriges Akkordeon | `if (contextMsg && lastVisitedAccordionRef.current !== null)` | 1796 |

**Akkordeons mit KI-Berater:** `["beratung", "markenname", "recherche"]`

### Welche Nachricht wird gesendet?

Die Nachricht ist **dynamisch** und hängt vom Akkordeon und dem aktuellen Status ab:

**Beratung (statisch):**
```
Wir sind jetzt im Bereich **Beratung**. Hier können wir:
- Deinen Markennamen besprechen
- Die passende Markenart wählen (Wort-, Bild- oder Wort-/Bildmarke)
- Die richtigen Nizza-Klassen für dein Geschäft finden
- Die Länder/Regionen für den Markenschutz auswählen

Was möchtest du als nächstes tun?
```

**Markenname (dynamisch, Zeile 1749-1781):**

| Bedingung | Nachricht |
|-----------|-----------|
| `manualNameInput && trademarkType` UND `bildmarke/wort-bildmarke` | Logo-Erstellung anbieten: "Perfekt! Hier erstellen wir dein Logo für '{name}'..." |
| `manualNameInput && trademarkType` UND `wortmarke` | Namensalternativen oder Recherche: "'{name}' als Wortmarke - hier kannst du..." |
| Sonst (neuer Fall) | Willkommens-Nachricht: "Willkommen! Hier legst du deine Marke an..." |

**Recherche (dynamisch, Zeile 1782-1791):**
```
Perfekt, wir sind jetzt bei der **Markenrecherche**! Hier prüfen wir:
- Ob dein Markenname bereits geschützt ist
- Ähnliche eingetragene Marken in deinen Klassen
- Konflikte in den gewählten Ländern/Regionen

{Markenname: "..." wenn vorhanden}
{Klassen: ... wenn vorhanden}
{Länder: ... wenn vorhanden}

Soll ich die Recherche starten?
```

### Wie wird die Nachricht im Chat platziert?

Die Funktion `simulateStreaming()` in ClaudeAssistant.tsx (Zeile 771-825) wird aufgerufen:

```
1. Container ausblenden (verhindert Flackern)
   └── messagesContainerRef.current.style.visibility = "hidden"
   └── Scroll zum Ende: scrollTop = scrollHeight
   
2. Kontext-Modus aktivieren
   └── setIsContextMode(true)
   
3. Container nach 20ms wieder einblenden
   └── messagesContainerRef.current.style.visibility = "visible"
   
4. Text Wort für Wort streamen (30ms pro Wort)
   └── const words = text.split(" ")
   └── for (word of words): setStreamingResponse(currentText)
   
5. Nachricht zu messages hinzufügen
   └── role: "assistant"
   └── content: text (vollständiger Text)
   └── timestamp: new Date()
   
6. Callback aufrufen
   └── onMessageSent?.(assistantMessage)
   └── → setSessionMessages(prev => [...prev, msg])
   
7. Scroll zur neuen Nachricht (nach 100ms)
   └── container.scrollTop = messageElement.offsetTop - 16
   └── Nachricht erscheint oben im sichtbaren Bereich
```

### Persistenz (Akkordeon als "besucht" speichern)

```
1. In Memory markieren
   └── greetedAccordionsRef.current.add(openAccordion)
   
2. In DB speichern
   └── saveVisitedAccordion(openAccordion)
   └── POST /api/cases/{caseId}/visited-accordions
   └── Body: { accordion: "markenname" }
   
3. Bei Reload aus DB laden (Zeile 1663-1665)
   └── const visitedFromDB = data.decisions?.visitedAccordions || []
   └── visitedFromDB.forEach(acc => greetedAccordionsRef.current.add(acc))
   
4. Ergebnis: Akkordeon wird NIE wieder begrüßt (auch nach Reload)
```

### Refs für Akkordeon-Wechsel (Zeile 1620-1623)

```typescript
lastVisitedAccordionRef     // Letztes besuchtes Akkordeon (string | null)
greetedAccordionsRef        // Set<string> - bereits begrüßte Akkordeons
greetingsInitializedRef     // boolean - Initialisierung abgeschlossen
```

---

## Nachrichten-System

### sessionMessages (Globaler Chat-Verlauf)

```typescript
// Definition (Zeile 1343)
const [sessionMessages, setSessionMessages] = useState<any[]>([]);

// Struktur einer Nachricht
interface Message {
  id: string;           // crypto.randomUUID()
  role: "user" | "assistant";
  content: string;      // Enthält Trigger wie [MARKE:Name]
  timestamp: Date;
  imageUrl?: string;    // Optional für Bild-Uploads
}
```

### Nachrichten-Weitergabe an ClaudeAssistant

```typescript
<ClaudeAssistant
  ref={voiceAssistantRef}
  caseId={caseId}
  onMessageSent={(msg) => setSessionMessages(prev => [...prev, msg])}
  previousMessages={sessionMessages}
  systemPromptAddition={getBeratungRules(context)}
/>
```

### Trigger-Entfernung für Anzeige (ClaudeAssistant.tsx, Zeile 249-266)

```typescript
const cleanMessageForDisplay = (content: string) => {
  return content
    .replace(/\[MARKE:[^\]]+\]/g, "")
    .replace(/\[KLASSEN:[^\]]+\]/g, "")
    .replace(/\[LAENDER:[^\]]+\]/g, "")
    .replace(/\[ART:[^\]]+\]/g, "")
    .replace(/\[GOTO:[^\]]+\]/g, "")
    .replace(/\[SYSTEM:[^\]]+\]/g, "")
    .replace(/\[LOGO_GENERIEREN:[^\]]+\]/g, "")
    .replace(/\[LOGO_BEARBEITEN:[^\]]+\]/g, "")
    .replace(/\[RECHERCHE_STARTEN\]/g, "")
    .replace(/\[WEITERE_RECHERCHE\]/g, "")
    .replace(/\[WEITER:[^\]]+\]/g, "")
    .replace(/\[WEB_SUCHE:[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};
```

### System-Nachrichten (nicht anzeigen)

```typescript
const isSystemMessage = (content: string) => {
  return content.trim().startsWith("[SYSTEM:");
};
```

---

## Bidirektionale Synchronisation

### Refs für Synchronisation (page.tsx, Zeile 1820-1843)

```typescript
// Beratung/Markenname/Recherche
triggerChangeInProgressRef          // Flag: Änderung durch KI-Trigger
lastNotifiedStateRef                // Letzter bekannter Zustand (JSON)
manualChangeTimeoutRef              // 10s Debounce für Chat-Benachrichtigung
lastProcessedBeratungMsgIdRef       // Verhindert doppelte Trigger-Verarbeitung
isFirstManualCheckRef               // Ersten Render überspringen
hasNotifiedCompleteRef              // Verhindert mehrfache "Alles komplett" Nachrichten
lastAccordionRef                    // Letztes Akkordeon (für Reset)

// Anmeldung (zusätzlich)
anmeldungTriggerChangeInProgressRef
lastLoggedAnmeldungFieldsRef        // Letzte geloggte Feldwerte
anmeldungFieldChangeLogTimeoutRef   // 1.5s Debounce für Feld-Logging
anmeldungManualChangeTimeoutRef     // 10s Debounce für Chat-Benachrichtigung
```

### Chat → Formular (Trigger-Verarbeitung)

```
1. KI setzt Trigger: "[MARKE:Accelari]"
2. useEffect erkennt Trigger
3. triggerChangeInProgressRef.current = true
4. Formularfeld wird aktualisiert
5. Nach 100ms: Flag zurücksetzen
```

### Formular → Chat (Manuelle Änderungen)

```
1. Benutzer ändert Feld manuell
2. useEffect erkennt Änderung (wenn Flag NICHT gesetzt)
3. 1.5s Debounce → Event-Log Eintrag
4. Wenn ALLE Felder komplett → 10s warten
5. Chat-Nachricht an KI: "[SYSTEM: Alle Angaben komplett! ...]"
6. KI bestätigt und bietet nächsten Schritt an
```

### Hybrid-Ansatz (Zeile 1997-2126)

```typescript
// Einzelne Änderungen: Still protokollieren (kein Chat)
// Alle Felder komplett: EINMAL Chat-Nachricht senden

if (missing.length === 0 && !hasNotifiedCompleteRef.current) {
  hasNotifiedCompleteRef.current = true;
  targetRef.current?.sendQuestion(
    `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. ...]`
  );
}
```

---

## Manuelle Feldausfüllung in Beratung (Detaillierte Analyse)

### Übersicht: Hybrid-Ansatz

Der Code verwendet einen **"Hybrid-Ansatz"** für die Reaktion auf manuelle Feldänderungen:

| Situation | Reaktion |
|-----------|----------|
| Einzelne Felder geändert | STILL protokollieren (nur Event-Log, kein Chat) |
| ALLE Felder komplett | EINMAL Chat-Nachricht an KI senden |

### Schritt 1: Event-Logging (Zeile 1863-1910)

Wenn der Benutzer ein Feld manuell ändert:

```
1. useEffect überwacht: manualNameInput, trademarkType, niceClasses, countries
2. Prüfung: triggerChangeInProgressRef.current === false (nicht durch KI-Trigger)
3. Prüfung: lastLoggedFieldsRef.current.initialized === true
4. 1.5s Debounce warten
5. Für jedes geänderte Feld:
   └── logEvent("field_change", "Markenname → 'Name'")
```

**Wichtig:** Das ist NUR für das Event-Log (Protokollierung), KEINE Chat-Nachricht!

### Schritt 2: Prüfung auf Vollständigkeit (Zeile 2004-2134)

```
1. Bedingungen prüfen:
   └── sessionMessages.length > 0 (Session aktiv)
   └── triggerChangeInProgressRef.current === false (nicht durch KI)
   └── openAccordion === "beratung" (oder markenname/recherche)
   └── Zustand hat sich geändert (currentState !== lastNotifiedStateRef.current)
   
2. Zustand still aktualisieren:
   └── lastNotifiedStateRef.current = currentState
   
3. 10 Sekunden warten (Debounce)

4. Prüfe was fehlt (für Beratung):
   └── Markenname vorhanden? → if (!currentName) missing.push("Markenname")
   └── Nizza-Klassen vorhanden? → if (niceClasses.length === 0) missing.push("Nizza-Klassen")
   └── Länder vorhanden? → if (countries.length === 0) missing.push("Länder")
   └── Markenart bestätigt? → if (!isTrademarkTypeConfirmed) missing.push("Markenart")
```

### Schritt 3: KI-Reaktion (nur wenn ALLES komplett)

Wenn `missing.length === 0` UND `hasNotifiedCompleteRef.current === false`:

```typescript
// Zeile 2113-2122
targetRef.current?.sendQuestion(
  `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. 
  WICHTIG - Befolge diese Schritte:
  1) Führe ZUERST eine Web-Suche durch um den Markennamen zu prüfen: [WEB_SUCHE:${currentName} trademark brand company]
  2) Warne bei Konflikten und erkläre was du gefunden hast
  3) ${needsLogo ? 'Bei Bildmarke/Wort-Bildmarke: Frag "Möchtest du jetzt dein Logo erstellen?" - bei JA dann [GOTO:markenname]' : 'Bei Wortmarke: Frag "Sollen wir zur Recherche gehen?" - bei JA dann [GOTO:recherche]'}
  4) Warte auf User-Antwort bevor du navigierst!]`
);
```

**Was die KI dann macht:**
1. Führt Web-Suche durch mit `[WEB_SUCHE:Name trademark brand company]`
2. Erklärt die Suchergebnisse (Konflikte, ähnliche Marken)
3. Fragt nach nächstem Schritt (Logo erstellen oder Recherche)
4. Wartet auf Benutzer-Antwort bevor Navigation

### Schritt 4: Wenn NICHT alles komplett

```
- KEINE Chat-Nachricht wird gesendet
- Nur stilles Protokollieren im Event-Log
- Benutzer kann weiter Felder ausfüllen
- System wartet bis ALLE Felder komplett sind
```

### Reset bei Akkordeon-Wechsel (Zeile 2011-2024)

```typescript
if (lastAccordionRef.current !== openAccordion) {
  lastAccordionRef.current = openAccordion;
  hasNotifiedCompleteRef.current = false; // Reset!
  lastNotifiedStateRef.current = JSON.stringify({ ... });
  return; // Keine Benachrichtigung beim Wechsel
}
```

### Unterschiede je nach Akkordeon

| Akkordeon | Erforderliche Felder | KI-Nachricht bei Vollständigkeit |
|-----------|---------------------|----------------------------------|
| Beratung | Name, Klassen, Länder, Art | Web-Suche + Navigation zu Markenname/Recherche |
| Markenname | Name, Art, Logo (bei Bildmarke) | Frag ob zur Recherche weitergehen |
| Recherche | Name, Klassen, Länder | Bestätige und biete Recherche-Start an |

### Timing-Zusammenfassung

| Timing | Verwendung |
|--------|------------|
| 1.5s | Debounce für Event-Log Einträge |
| 10s | Debounce für "Alles komplett" Chat-Nachricht |
| 100ms | Flag zurücksetzen nach KI-Trigger |

---

## Timing-Werte

| Wert | Verwendung | Zeile |
|------|------------|-------|
| 100ms | Flag zurücksetzen nach Trigger-Änderung | 1930 |
| 300ms | Auto-connect Verzögerung | 444 |
| 500ms | Verzögerung vor Auto-Start Recherche | 1601 |
| 500ms | Verzögerung vor GOTO Navigation | 1976 |
| 1.5s | Debounce für Feld-Logging | 1903 |
| 1.5s | Verzögerung vor WEITER Navigation | 1554 |
| 2s | Verzögerung vor Phrase-basiertem Wechsel | 2000 (Fallback) |
| 10s | Debounce für "Alles komplett" Chat-Nachricht | 2056 |
| 30ms | Streaming-Effekt pro Wort | 800 (ClaudeAssistant) |

---

## Letzte Änderungen (Januar 2026)

- Credit & API Monitoring System implementiert
- Logo-Persistenz mit Base64-Speicherung
- Regionale WIPO-Codes (BX, OA) Unterstützung
- 194 WIPO-Mitgliedsstaaten in Länderauswahl
- Search Coverage Reporting für nicht-durchsuchte Register
- Bidirektionale Synchronisation für Anmeldung-Akkordeon
- "Weiter zur Anmeldung" Button im Recherche-Akkordeon
