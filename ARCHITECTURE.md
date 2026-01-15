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

### Unterschiede je nach Akkordeon (Übersicht)

| Akkordeon | Erforderliche Felder | Logo erforderlich? | Web-Suche? | Navigation |
|-----------|---------------------|-------------------|------------|------------|
| Beratung | Name, Klassen, Länder, Art | Nein | JA | → Markenname oder Recherche |
| Markenname | Name, Art, (Logo) | Nur bei Bild/Wort-Bild | Nein | → Recherche |
| Recherche | Name, Klassen, Länder | Nein | Nein | Recherche starten |

---

## Detaillierte Analyse: Markenname-Akkordeon

### Erforderliche Felder (Zeile 2069-2081)

```typescript
if (openAccordion === "markenname") {
  // 1. Markenname
  if (!currentName) missing.push("Markenname");
  
  // 2. Markenart bestätigt
  if (!isTrademarkTypeConfirmed) missing.push("Markenart");
  
  // 3. Logo (NUR bei Bildmarke oder Wort-Bildmarke)
  const needsLogo = trademarkType === "bildmarke" || trademarkType === "wort-bildmarke";
  if (needsLogo && !trademarkImageUrl) missing.push("Logo");
}
```

### Feldprüfung

| Feld | Variable | Bedingung |
|------|----------|-----------|
| Markenname | `currentName` (= `manualNameInput`) | Muss vorhanden sein |
| Markenart | `isTrademarkTypeConfirmed` | Muss `true` sein |
| Logo | `trademarkImageUrl` | Nur wenn `trademarkType === "bildmarke"` oder `"wort-bildmarke"` |

### KI-Nachricht bei Vollständigkeit (Zeile 2105-2108)

```typescript
targetRef.current?.sendQuestion(
  `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. ${needsLogo ? "Logo ist bereit!" : ""} Frag ob der Benutzer zur Recherche weitergehen möchte.]`
);
```

**Beispiel-Nachricht:**
```
[SYSTEM: Alle Angaben komplett! Marke: "Accelari", Art: Wort-/Bildmarke, Logo vorhanden. Logo ist bereit! Frag ob der Benutzer zur Recherche weitergehen möchte.]
```

**Was die KI dann macht:**
1. Bestätigt dass alle Angaben komplett sind
2. Erwähnt das Logo (wenn vorhanden)
3. Fragt: "Möchtest du jetzt zur Recherche weitergehen?"
4. Bei JA: Navigiert zu Recherche

---

## Detaillierte Analyse: Recherche-Akkordeon

### Erforderliche Felder (Zeile 2082-2096)

```typescript
// Recherche: Name, Klassen, Länder (KEINE Markenart!)
if (!currentName) missing.push("Markenname");
if (rechercheForm.niceClasses.length === 0) missing.push("Nizza-Klassen");
if (rechercheForm.countries.length === 0) missing.push("Länder");
// WICHTIG: Markenart wird in Recherche NICHT geprüft!
// if (openAccordion === "beratung" && !isTrademarkTypeConfirmed) missing.push("Markenart");
```

### Feldprüfung

| Feld | Variable | Bedingung |
|------|----------|-----------|
| Markenname | `rechercheForm.trademarkName` | Muss vorhanden sein |
| Nizza-Klassen | `rechercheForm.niceClasses` | Array muss mindestens 1 Element haben |
| Länder | `rechercheForm.countries` | Array muss mindestens 1 Element haben |
| Markenart | - | **NICHT geprüft** (nur in Beratung) |

### KI-Nachricht bei Vollständigkeit (Zeile 2109-2112)

```typescript
targetRef.current?.sendQuestion(
  `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. Alles bereit für die Recherche! Bestätige kurz.]`
);
```

**Beispiel-Nachricht:**
```
[SYSTEM: Alle Angaben komplett! Marke: "Accelari", Klassen: 9, 42, Länder: DE, EU. Alles bereit für die Recherche! Bestätige kurz.]
```

**Was die KI dann macht:**
1. Bestätigt dass alle Angaben für die Recherche bereit sind
2. Fasst die Angaben zusammen
3. Bietet an, die Recherche zu starten
4. Wartet auf Benutzer-Bestätigung

---

## Detaillierte Analyse: Beratung-Akkordeon

### Erforderliche Felder (Zeile 2082-2096)

```typescript
// Beratung: Name, Klassen, Länder, Art (ALLE 4!)
if (!currentName) missing.push("Markenname");
if (rechercheForm.niceClasses.length === 0) missing.push("Nizza-Klassen");
if (rechercheForm.countries.length === 0) missing.push("Länder");
if (openAccordion === "beratung" && !isTrademarkTypeConfirmed) missing.push("Markenart");
```

### Feldprüfung

| Feld | Variable | Bedingung |
|------|----------|-----------|
| Markenname | `manualNameInput` | Muss vorhanden sein |
| Nizza-Klassen | `rechercheForm.niceClasses` | Array muss mindestens 1 Element haben |
| Länder | `rechercheForm.countries` | Array muss mindestens 1 Element haben |
| Markenart | `isTrademarkTypeConfirmed` | Muss `true` sein |

### KI-Nachricht bei Vollständigkeit (Zeile 2113-2122)

```typescript
targetRef.current?.sendQuestion(
  `[SYSTEM: Alle Angaben komplett! ${present.join(", ")}. 
  WICHTIG - Befolge diese Schritte:
  1) Führe ZUERST eine Web-Suche durch: [WEB_SUCHE:${currentName} trademark brand company]
  2) Warne bei Konflikten und erkläre was du gefunden hast
  3) ${needsLogo ? 'Bei Bildmarke/Wort-Bildmarke: Frag "Möchtest du jetzt dein Logo erstellen?" - bei JA dann [GOTO:markenname]' : 'Bei Wortmarke: Frag "Sollen wir zur Recherche gehen?" - bei JA dann [GOTO:recherche]'}
  4) Warte auf User-Antwort bevor du navigierst!]`
);
```

**Beispiel-Nachricht (Wortmarke):**
```
[SYSTEM: Alle Angaben komplett! Marke: "Accelari", Klassen: 9, 42, Länder: DE, EU, Art: Wortmarke. 
WICHTIG - Befolge diese Schritte:
1) Führe ZUERST eine Web-Suche durch: [WEB_SUCHE:Accelari trademark brand company]
2) Warne bei Konflikten und erkläre was du gefunden hast
3) Bei Wortmarke: Frag "Sollen wir zur Recherche gehen?" - bei JA dann [GOTO:recherche]
4) Warte auf User-Antwort bevor du navigierst!]
```

**Beispiel-Nachricht (Bildmarke):**
```
[SYSTEM: Alle Angaben komplett! Marke: "Accelari", Klassen: 9, 42, Länder: DE, EU, Art: Bildmarke. 
WICHTIG - Befolge diese Schritte:
1) Führe ZUERST eine Web-Suche durch: [WEB_SUCHE:Accelari trademark brand company]
2) Warne bei Konflikten und erkläre was du gefunden hast
3) Bei Bildmarke/Wort-Bildmarke: Frag "Möchtest du jetzt dein Logo erstellen?" - bei JA dann [GOTO:markenname]
4) Warte auf User-Antwort bevor du navigierst!]
```

**Was die KI dann macht:**
1. Führt Web-Suche durch mit `[WEB_SUCHE:Name trademark brand company]`
2. Analysiert Suchergebnisse auf Konflikte (ähnliche Marken, Unternehmen)
3. Erklärt dem Benutzer was gefunden wurde
4. Fragt nach nächstem Schritt:
   - Bei Wortmarke: "Sollen wir zur Recherche gehen?"
   - Bei Bildmarke: "Möchtest du jetzt dein Logo erstellen?"
5. Wartet auf Benutzer-Antwort
6. Navigiert erst nach Bestätigung

---

## Gemeinsame Logik für alle Akkordeons

### Derselbe useEffect (Zeile 2004-2134)

Alle drei Akkordeons verwenden denselben useEffect mit:
- Gleicher 10s Debounce
- Gleiche Refs (`hasNotifiedCompleteRef`, `lastNotifiedStateRef`)
- Gleicher Reset bei Akkordeon-Wechsel
- Unterschiedliche Feldprüfung je nach `openAccordion`
- Unterschiedliche KI-Nachricht je nach `openAccordion`

### Ablaufdiagramm

```
Benutzer ändert Feld manuell
        ↓
useEffect erkennt Änderung
        ↓
Prüfung: triggerChangeInProgressRef === false?
        ↓ JA
Zustand still aktualisieren (lastNotifiedStateRef)
        ↓
10 Sekunden warten (Debounce)
        ↓
Prüfe erforderliche Felder (je nach Akkordeon)
        ↓
┌─────────────────────────────────────────┐
│ Alle Felder komplett?                   │
├─────────────────────────────────────────┤
│ NEIN → Keine Aktion (stilles Warten)    │
│ JA   → hasNotifiedCompleteRef === false?│
│        ├─ NEIN → Keine Aktion           │
│        └─ JA   → KI-Nachricht senden    │
└─────────────────────────────────────────┘
```

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

## Bekannte Probleme & Verbesserungen (TODO)

### KRITISCH - Bugs die behoben werden müssen

#### 1. triggerChangeInProgressRef fehlt in Recherche-Trigger

**Status:** OFFEN
**Datei:** `page.tsx`, Zeile 2314-2341
**Problem:** Recherche-Trigger setzen `triggerChangeInProgressRef` nicht, was zu falschen "manuellen Änderungs"-Erkennungen führt.

**Aktueller Code (fehlerhaft):**
```typescript
// Recherche-Trigger (Zeile 2314-2321)
const markeMatch = content.match(/\[MARKE:([^\]]+)\]/);
if (markeMatch?.[1]) {
  // KEIN FLAG GESETZT!
  setManualNameInput(name);
  setRechercheForm(prev => ({ ...prev, trademarkName: name }));
}
```

**Korrekter Code:**
```typescript
const markeMatch = content.match(/\[MARKE:([^\]]+)\]/);
if (markeMatch?.[1]) {
  triggerChangeInProgressRef.current = true;  // HINZUFÜGEN
  setManualNameInput(name);
  setRechercheForm(prev => ({ ...prev, trademarkName: name }));
  setTimeout(() => { triggerChangeInProgressRef.current = false; }, 100);  // HINZUFÜGEN
}
```

**Auswirkung:** Wenn KI in Recherche `[MARKE:Name]` setzt, denkt das System es sei eine manuelle Änderung und sendet nach 10s fälschlicherweise eine "Alles komplett" Nachricht.

**Aufwand:** 5 Minuten

---

#### 2. lastNotifiedStateRef wird in Recherche nicht aktualisiert

**Status:** OFFEN
**Datei:** `page.tsx`, Zeile 2458-2461
**Problem:** Nach Trigger-Verarbeitung in Recherche wird `lastNotifiedStateRef` nicht aktualisiert, was zu Race Conditions führen kann.

**Vergleich:**
- Beratung (Zeile 1987-1993): Aktualisiert `lastNotifiedStateRef` nach Trigger ✓
- Recherche: Aktualisiert NICHT ✗

**Lösung:** Nach `if (hasAction)` in Recherche-useEffect auch `lastNotifiedStateRef` aktualisieren.

**Aufwand:** 5 Minuten

---

### HOCH - Code-Qualität

#### 3. Duplizierter Trigger-Code

**Status:** OFFEN
**Dateien:** `page.tsx`, Zeile 1922-1954 und 2314-2341
**Problem:** Die Trigger `[MARKE:]`, `[KLASSEN:]`, `[LAENDER:]` werden in BEIDEN useEffects (Beratung UND Recherche) verarbeitet.

**Betroffene Trigger:**
| Trigger | Beratung (Zeile) | Recherche (Zeile) |
|---------|------------------|-------------------|
| [MARKE:] | 1922-1930 | 2314-2321 |
| [KLASSEN:] | 1933-1943 | 2323-2331 |
| [LAENDER:] | 1945-1954 | 2333-2341 |

**Empfehlung:** Gemeinsame Funktion `processCommonTriggers()` erstellen.

**Aufwand:** 30 Minuten

---

#### 4. Inkonsistente Ref-Benennung

**Status:** OFFEN
**Datei:** `page.tsx`
**Problem:** Inkonsistente Benennung der lastProcessedMsgId Refs.

| Akkordeon | Aktuelle Ref | Empfohlene Ref |
|-----------|--------------|----------------|
| Beratung | `lastProcessedBeratungMsgIdRef` | (OK) |
| Recherche | `lastProcessedRechercheMsgIdRef` | (OK) |
| Markenname | `lastProcessedMsgIdRef` | `lastProcessedMarkennameMsgIdRef` |

**Aufwand:** 2 Minuten

---

### MITTEL - Architektur-Verbesserungen

#### 5. Zentrales Trigger-System

**Status:** VORSCHLAG
**Problem:** Jedes Akkordeon hat eigene Trigger-Verarbeitung mit unterschiedlichem Verhalten.

**Empfehlung:** Ein zentrales Trigger-System in `lib/triggers.ts` erstellen:

```typescript
// lib/triggers.ts
interface TriggerContext {
  setManualNameInput: (name: string) => void;
  setRechercheForm: (fn: (prev: RechercheForm) => RechercheForm) => void;
  setTrademarkType: (type: TrademarkType) => void;
  triggerChangeInProgressRef: RefObject<boolean>;
  lastNotifiedStateRef: RefObject<string>;
}

export const processCommonTriggers = (content: string, ctx: TriggerContext) => {
  // [MARKE:], [KLASSEN:], [LAENDER:], [ART:]
  // Mit einheitlichem Flag-Management
};

export const processBeratungTriggers = (content: string, ctx: TriggerContext) => {
  processCommonTriggers(content, ctx);
  // [GOTO:], [WEB_SUCHE:]
};

export const processRechercheTriggers = (content: string, ctx: TriggerContext) => {
  processCommonTriggers(content, ctx);
  // [RECHERCHE_STARTEN], [WEITERE_RECHERCHE]
};

export const processMarkennameTriggers = (content: string, ctx: TriggerContext) => {
  // [LOGO_GENERIEREN:], [LOGO_BEARBEITEN:]
};
```

**Vorteile:**
- Einheitliches Verhalten
- Keine Code-Duplizierung
- Einfachere Wartung
- Bessere Testbarkeit

**Aufwand:** 2-3 Stunden

---

### NIEDRIG - Dokumentation

#### 6. Zeilennummern in Dokumentation aktualisieren

**Status:** LAUFEND
**Problem:** Zeilennummern in ARCHITECTURE.md können nach Code-Änderungen veraltet sein.

**Empfehlung:** Bei größeren Refactorings Zeilennummern prüfen und aktualisieren.

---

## Prioritäten-Übersicht

| # | Priorität | Problem | Status | Aufwand |
|---|-----------|---------|--------|---------|
| 1 | KRITISCH | triggerChangeInProgressRef in Recherche | OFFEN | 5 min |
| 2 | KRITISCH | lastNotifiedStateRef in Recherche | OFFEN | 5 min |
| 3 | HOCH | Duplizierter Trigger-Code | OFFEN | 30 min |
| 4 | HOCH | Inkonsistente Ref-Benennung | OFFEN | 2 min |
| 5 | MITTEL | Zentrales Trigger-System | VORSCHLAG | 2-3 h |
| 6 | NIEDRIG | Zeilennummern aktualisieren | LAUFEND | - |

---

## Systematische Code-Analyse (Roadmap)

### Übersicht

Das Projekt enthält **147 TypeScript-Dateien**, die in 8 Kategorien analysiert werden:

| # | Kategorie | Dateien | Status | Aufwand |
|---|-----------|---------|--------|---------|
| 1 | Kern-Dateien | 10 | IN ARBEIT | 2-3 h |
| 2 | API-Routen | 45 | OFFEN | 4-5 h |
| 3 | Komponenten | 15 | OFFEN | 1-2 h |
| 4 | Lib-Module | 30 | OFFEN | 2-3 h |
| 5 | Frontend-Seiten | 16 | OFFEN | 1-2 h |
| 6 | Agents | 8 | OFFEN | 1 h |
| 7 | Datenbank & Tests | 10 | OFFEN | 1 h |
| 8 | Konfiguration | 3 | OFFEN | 15 min |

**Gesamtaufwand:** 12-18 Stunden

### Dokumentations-Format pro Datei

```
## [Dateiname]
**Pfad:** /pfad/zur/datei.ts
**Zeilen:** ~XXX
**Zweck:** Was macht die Datei?
**Abhängigkeiten:** Welche Dateien werden importiert?
**Exportiert:** Was wird exportiert?
**Wichtige Funktionen:** Hauptfunktionen/Komponenten
**Bekannte Probleme:** Falls vorhanden
**Verbesserungsvorschläge:** Falls vorhanden
```

---

### Kategorie 1: Kern-Dateien (10 Dateien)

Diese Dateien bilden das Herzstück der Anwendung:

| # | Datei | Zeilen | Status |
|---|-------|--------|--------|
| 1.1 | `app/dashboard/case/[caseId]/page.tsx` | ~9800 | OFFEN |
| 1.2 | `app/components/ClaudeAssistant.tsx` | ~1100 | OFFEN |
| 1.3 | `lib/prompts/beratung.ts` | ~200 | OFFEN |
| 1.4 | `lib/prompts/markenname.ts` | ~150 | OFFEN |
| 1.5 | `lib/prompts/recherche.ts` | ~150 | OFFEN |
| 1.6 | `lib/prompts/anmeldung.ts` | ~200 | OFFEN |
| 1.7 | `lib/prompts/base-rules.ts` | ~50 | OFFEN |
| 1.8 | `lib/prompts/index.ts` | ~20 | OFFEN |
| 1.9 | `lib/api-logger.ts` | ~300 | OFFEN |
| 1.10 | `lib/credit-manager.ts` | ~200 | OFFEN |

---

### Kategorie 2: API-Routen (45 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 2.1 | `app/api/claude-chat/route.ts` | OFFEN |
| 2.2 | `app/api/openai/chat/route.ts` | OFFEN |
| 2.3 | `app/api/tmsearch/search/route.ts` | OFFEN |
| 2.4 | `app/api/tmsearch/analyze/route.ts` | OFFEN |
| 2.5 | `app/api/tmsearch/analyze-stream/route.ts` | OFFEN |
| 2.6 | `app/api/tmsearch/info/route.ts` | OFFEN |
| 2.7 | `app/api/generate-logo/route.ts` | OFFEN |
| 2.8 | `app/api/edit-logo/route.ts` | OFFEN |
| 2.9 | `app/api/case-logos/route.ts` | OFFEN |
| 2.10 | `app/api/web-search/route.ts` | OFFEN |
| 2.11 | `app/api/credits/route.ts` | OFFEN |
| 2.12 | `app/api/whisper/route.ts` | OFFEN |
| 2.13 | `app/api/cases/route.ts` | OFFEN |
| 2.14 | `app/api/cases/[caseId]/route.ts` | OFFEN |
| 2.15 | `app/api/cases/[caseId]/consultation/route.ts` | OFFEN |
| 2.16 | `app/api/cases/[caseId]/consultation/messages/route.ts` | OFFEN |
| 2.17 | `app/api/cases/[caseId]/analyses/route.ts` | OFFEN |
| 2.18 | `app/api/cases/[caseId]/analysis/route.ts` | OFFEN |
| 2.19 | `app/api/cases/[caseId]/full/route.ts` | OFFEN |
| 2.20 | `app/api/cases/[caseId]/memory/route.ts` | OFFEN |
| 2.21 | `app/api/cases/[caseId]/prefill/route.ts` | OFFEN |
| 2.22 | `app/api/cases/[caseId]/recherche-history/route.ts` | OFFEN |
| 2.23 | `app/api/cases/[caseId]/reset-steps/route.ts` | OFFEN |
| 2.24 | `app/api/cases/[caseId]/run-recherche-analyse/route.ts` | OFFEN |
| 2.25 | `app/api/cases/[caseId]/session-events/route.ts` | OFFEN |
| 2.26 | `app/api/cases/[caseId]/skip/route.ts` | OFFEN |
| 2.27 | `app/api/cases/[caseId]/steps/route.ts` | OFFEN |
| 2.28 | `app/api/cases/[caseId]/update-status/route.ts` | OFFEN |
| 2.29 | `app/api/cases/[caseId]/visited-accordions/route.ts` | OFFEN |
| 2.30 | `app/api/cases/[caseId]/catch-up-beratung/route.ts` | OFFEN |
| 2.31 | `app/api/cases/active/route.ts` | OFFEN |
| 2.32 | `app/api/cases/extract-decisions/route.ts` | OFFEN |
| 2.33 | `app/api/cases/save-decisions/route.ts` | OFFEN |
| 2.34 | `app/api/cases/select-alternative/route.ts` | OFFEN |
| 2.35 | `app/api/cases/start/route.ts` | OFFEN |
| 2.36 | `app/api/anmeldung/applicant-profile/route.ts` | OFFEN |
| 2.37 | `app/api/anmeldung/generate-strategy/route.ts` | OFFEN |
| 2.38 | `app/api/anmeldung/registration-order/route.ts` | OFFEN |
| 2.39 | `app/api/admin/analytics/route.ts` | OFFEN |
| 2.40 | `app/api/admin/api-costs/route.ts` | OFFEN |
| 2.41 | `app/api/admin/chat-logs/route.ts` | OFFEN |
| 2.42 | `app/api/admin/test-api/route.ts` | OFFEN |
| 2.43 | `app/api/auth/*.ts` (7 Dateien) | OFFEN |
| 2.44 | `app/api/recherche/*.ts` (2 Dateien) | OFFEN |
| 2.45 | `app/api/report/*.ts` (2 Dateien) | OFFEN |

---

### Kategorie 3: Komponenten (15 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 3.1 | `app/components/CaseTimeline.tsx` | OFFEN |
| 3.2 | `app/components/ErrorBoundary.tsx` | OFFEN |
| 3.3 | `app/components/Footer.tsx` | OFFEN |
| 3.4 | `app/components/Header.tsx` | OFFEN |
| 3.5 | `app/components/Messages.tsx` | OFFEN |
| 3.6 | `app/components/OpenAIVoiceAssistant.tsx` | OFFEN |
| 3.7 | `app/components/RechercheHistoryBanner.tsx` | OFFEN |
| 3.8 | `app/components/RechercheSteps.tsx` | OFFEN |
| 3.9 | `app/components/ReportGenerator.tsx` | OFFEN |
| 3.10 | `app/components/cases/AnimatedRiskScore.tsx` | OFFEN |
| 3.11 | `app/components/cases/ConflictCard.tsx` | OFFEN |
| 3.12 | `app/components/ui/progress-bar.tsx` | OFFEN |
| 3.13 | `app/components/ui/tooltip.tsx` | OFFEN |
| 3.14 | `components/CreditDisplay.tsx` | OFFEN |
| 3.15 | `components/analytics-provider.tsx` | OFFEN |

---

### Kategorie 4: Lib-Module (30 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 4.1 | `lib/anthropic.ts` | OFFEN |
| 4.2 | `lib/auth.ts` | OFFEN |
| 4.3 | `lib/cache.ts` | OFFEN |
| 4.4 | `lib/case-memory.ts` | OFFEN |
| 4.5 | `lib/chat-logger.ts` | OFFEN |
| 4.6 | `lib/content-validation.ts` | OFFEN |
| 4.7 | `lib/country-mapping.ts` | OFFEN |
| 4.8 | `lib/email.ts` | OFFEN |
| 4.9 | `lib/env.ts` | OFFEN |
| 4.10 | `lib/hooks.ts` | OFFEN |
| 4.11 | `lib/hooks/useActiveCase.ts` | OFFEN |
| 4.12 | `lib/nice-classes.ts` | OFFEN |
| 4.13 | `lib/rate-limit.ts` | OFFEN |
| 4.14 | `lib/register-urls.ts` | OFFEN |
| 4.15 | `lib/related-classes.ts` | OFFEN |
| 4.16 | `lib/search-variants.ts` | OFFEN |
| 4.17 | `lib/similarity/index.ts` | OFFEN |
| 4.18 | `lib/tmsearch/client.ts` | OFFEN |
| 4.19 | `lib/tmsearch/types.ts` | OFFEN |
| 4.20 | `lib/tmview-agent.ts` | OFFEN |
| 4.21 | `lib/trademark-search.ts` | OFFEN |
| 4.22 | `lib/utils.ts` | OFFEN |
| 4.23 | `lib/validation.ts` | OFFEN |
| 4.24 | `lib/analytics.ts` | OFFEN |
| 4.25 | `lib/api-error.ts` | OFFEN |
| 4.26 | `lib/ai/extract-decisions.ts` | OFFEN |

---

### Kategorie 5: Frontend-Seiten (16 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 5.1 | `app/page.tsx` | OFFEN |
| 5.2 | `app/layout.tsx` | OFFEN |
| 5.3 | `app/providers.tsx` | OFFEN |
| 5.4 | `app/dashboard/page.tsx` | OFFEN |
| 5.5 | `app/dashboard/layout.tsx` | OFFEN |
| 5.6 | `app/dashboard/cases/page.tsx` | OFFEN |
| 5.7 | `app/dashboard/credits/page.tsx` | OFFEN |
| 5.8 | `app/dashboard/profile/page.tsx` | OFFEN |
| 5.9 | `app/dashboard/subscription/page.tsx` | OFFEN |
| 5.10 | `app/dashboard/admin/costs/page.tsx` | OFFEN |
| 5.11 | `app/dashboard/admin/users/page.tsx` | OFFEN |
| 5.12 | `app/dashboard/admin/users/[userId]/page.tsx` | OFFEN |
| 5.13 | `app/dashboard/admin/chat-monitor/page.tsx` | OFFEN |
| 5.14 | `app/dashboard/admin/api-test/page.tsx` | OFFEN |
| 5.15 | `app/(auth)/*.tsx` (6 Dateien) | OFFEN |

---

### Kategorie 6: Agents (8 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 6.1 | `app/agents/index.ts` | OFFEN |
| 6.2 | `app/agents/types.ts` | OFFEN |
| 6.3 | `app/agents/multi-agent-handler.ts` | OFFEN |
| 6.4 | `app/agents/master/orchestrator.ts` | OFFEN |
| 6.5 | `app/agents/master/proposal-generator.ts` | OFFEN |
| 6.6 | `app/agents/code/code-agent.ts` | OFFEN |
| 6.7 | `app/agents/design/design-agent.ts` | OFFEN |
| 6.8 | `app/agents/qa/qa-agent.ts` | OFFEN |
| 6.9 | `app/agents/workflow/workflow-agent.ts` | OFFEN |

---

### Kategorie 7: Datenbank & Tests (10 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 7.1 | `db/schema.ts` | OFFEN |
| 7.2 | `db/index.ts` | OFFEN |
| 7.3 | `db/seed.ts` | OFFEN |
| 7.4 | `tests/setup.ts` | OFFEN |
| 7.5 | `tests/unit/api-logger.test.ts` | OFFEN |
| 7.6 | `tests/unit/content-validation.test.ts` | OFFEN |
| 7.7 | `tests/unit/country-mapping.test.ts` | OFFEN |
| 7.8 | `tests/unit/credit-manager.test.ts` | OFFEN |
| 7.9 | `tests/unit/similarity.test.ts` | OFFEN |
| 7.10 | `tests/integration/*.test.ts` (2 Dateien) | OFFEN |

---

### Kategorie 8: Konfiguration (3 Dateien)

| # | Datei | Status |
|---|-------|--------|
| 8.1 | `middleware.ts` | OFFEN |
| 8.2 | `drizzle.config.ts` | OFFEN |
| 8.3 | `vitest.config.ts` | OFFEN |
| 8.4 | `tailwind.config.ts` | OFFEN |

---

## Detaillierte Datei-Analysen

### Kategorie 1: Kern-Dateien

#### 1.1 app/dashboard/case/[caseId]/page.tsx

**Pfad:** `/app/dashboard/case/[caseId]/page.tsx`
**Zeilen:** ~9783
**Typ:** React Client Component ("use client")

**Zweck:**
Die Hauptseite für einen einzelnen Markenfall. Enthält das komplette Akkordeon-System mit 4 KI-Beratern (Beratung, Markenname, Recherche, Anmeldung) und alle zugehörigen Formulare, Trigger-Handler und UI-Komponenten.

**Abhängigkeiten (Imports):**
- React: useState, useRef, useCallback, useEffect
- Next.js: useParams, useRouter
- SWR: useSWR, mutate
- Lucide Icons: ~40 Icons
- Eigene Komponenten:
  - `AnimatedRiskScore` - Animierte Risiko-Anzeige
  - `RechercheHistoryBanner` - Historie-Banner
  - `ConflictCard`, `ConflictDetailModal` - Konflikt-Anzeige
  - `ClaudeAssistant` - KI-Chat-Komponente
  - `Tooltip` + spezialisierte Tooltips
  - `RechercheSteps` - Recherche-Fortschritt
  - `ReportGenerator` - PDF-Export
- Prompts: getBeratungPrompt, getRecherchePrompt, getMarkennamePrompt, getAnmeldungPrompt

**Exportiert:**
- `CasePage` (default export) - Haupt-Komponente

**Struktur der Datei:**

| Zeilen | Abschnitt | Beschreibung |
|--------|-----------|--------------|
| 1-61 | Imports | React, Next.js, Icons, Komponenten |
| 63-101 | Interfaces/Types | AnalysisSummary, QuickCheckStatus, NameSuggestion, CountryOption |
| 103-330 | COUNTRY_OPTIONS | 194 WIPO-Länder + regionale Codes (BX, OA) |
| 335-542 | SELF_REGISTER_ALLOWED | Länder mit Selbstanmeldung |
| 544-625 | StepStatus Interface | Workflow-Schritt-Typen |
| 636-644 | WORKFLOW_STEPS | Workflow-Definition |
| 646-724 | AccordionSection | Wiederverwendbare Akkordeon-Komponente |
| 726-774 | Hilfsfunktionen | LoadingSkeleton, formatDuration, formatGermanDate, truncateText |
| 776-9783 | CasePage | Haupt-Komponente |

**State-Management (99 useState Hooks):**

Die wichtigsten State-Variablen:

| State | Typ | Zweck |
|-------|-----|-------|
| `openAccordion` | string | Aktuell geöffnetes Akkordeon |
| `sessionMessages` | Message[] | Chat-Nachrichten für Beratung |
| `markennameMessages` | Message[] | Chat-Nachrichten für Markenname |
| `rechercheMessages` | Message[] | Chat-Nachrichten für Recherche |
| `anmeldungMessages` | Message[] | Chat-Nachrichten für Anmeldung |
| `rechercheForm` | Object | Recherche-Formular (Name, Klassen, Länder) |
| `anmeldungForm` | Object | Anmeldung-Formular |
| `applicantData` | Object | Anmelder-Daten |
| `liveAnalysisResult` | Object | Recherche-Ergebnisse |
| `trademarkType` | string | Markenart (wortmarke/bildmarke/wort-bildmarke) |
| `logoGallery` | Array | Generierte/hochgeladene Logos |

**Refs (für Trigger-Verarbeitung):**

| Ref | Zweck |
|-----|-------|
| `voiceAssistantRef` | Beratung ClaudeAssistant |
| `markennameVoiceRef` | Markenname ClaudeAssistant |
| `rechercheVoiceRef` | Recherche ClaudeAssistant |
| `anmeldungVoiceRef` | Anmeldung ClaudeAssistant |
| `triggerChangeInProgressRef` | Flag: KI-Trigger aktiv |
| `lastNotifiedStateRef` | Letzter benachrichtigter Zustand |
| `lastProcessedBeratungMsgIdRef` | Letzte verarbeitete Beratung-Nachricht |
| `lastProcessedRechercheMsgIdRef` | Letzte verarbeitete Recherche-Nachricht |

**Trigger-Handler (useEffect Hooks):**

| Zeilen | Handler | Trigger |
|--------|---------|---------|
| 1912-1995 | Beratung-Trigger | [MARKE:], [KLASSEN:], [LAENDER:], [ART:], [GOTO:] |
| 2303-2461 | Recherche-Trigger | [MARKE:], [KLASSEN:], [LAENDER:], [RECHERCHE_STARTEN], [WEITERE_RECHERCHE], [WEB_SUCHE:] |
| 2463-2697 | Markenname-Trigger | [LOGO_GENERIEREN:], [LOGO_BEARBEITEN:] |
| 2227-2301 | Anmeldung-Trigger | Manuelle Änderungserkennung |

**Bekannte Probleme:**

1. **BUG: triggerChangeInProgressRef fehlt in Recherche** (Zeilen 2314-2341)
   - Im Recherche-Trigger-Handler wird `triggerChangeInProgressRef.current = true` nicht gesetzt
   - Kann zu falschen "manuellen Änderung"-Erkennungen führen
   - **Fix:** Zeilen 2316-2320 anpassen wie in Beratung (Zeilen 1926-1930)

2. **BUG: lastNotifiedStateRef nicht aktualisiert in Recherche** (Zeilen 2458-2461)
   - Nach Trigger-Verarbeitung wird `lastNotifiedStateRef` nicht aktualisiert
   - **Fix:** Wie in Beratung (Zeilen 1986-1993) hinzufügen

3. **Code-Duplizierung:**
   - Trigger-Verarbeitung für [MARKE:], [KLASSEN:], [LAENDER:] ist in Beratung UND Recherche fast identisch
   - **Vorschlag:** Zentrale `processTriggers()` Funktion erstellen

4. **Datei zu groß:**
   - ~9800 Zeilen ist schwer wartbar
   - **Vorschlag:** Aufteilen in:
     - `page.tsx` - Haupt-Layout (~1000 Zeilen)
     - `hooks/useTriggerHandlers.ts` - Trigger-Logik (~500 Zeilen)
     - `hooks/useRechercheForm.ts` - Recherche-State (~300 Zeilen)
     - `hooks/useAnmeldungForm.ts` - Anmeldung-State (~300 Zeilen)
     - `components/BeratungAccordion.tsx` - Beratung UI (~1500 Zeilen)
     - `components/MarkennameAccordion.tsx` - Markenname UI (~1500 Zeilen)
     - `components/RechercheAccordion.tsx` - Recherche UI (~2000 Zeilen)
     - `components/AnmeldungAccordion.tsx` - Anmeldung UI (~2000 Zeilen)

**Verbesserungsvorschläge:**

| # | Verbesserung | Aufwand | Priorität |
|---|--------------|---------|-----------|
| 1 | Bug #1 beheben (triggerChangeInProgressRef) | 15 min | HOCH |
| 2 | Bug #2 beheben (lastNotifiedStateRef) | 15 min | HOCH |
| 3 | Zentrale Trigger-Funktion | 2 h | MITTEL |
| 4 | Datei aufteilen | 8-16 h | NIEDRIG |
| 5 | TypeScript Interfaces verbessern | 2 h | NIEDRIG |

---

#### 1.2 app/components/ClaudeAssistant.tsx

**Pfad:** `/app/components/ClaudeAssistant.tsx`
**Zeilen:** ~1142
**Typ:** React Client Component

**Zweck:**
Wiederverwendbare Chat-Komponente für alle KI-Berater. Verwaltet Chat-UI, Nachrichtenverlauf, Streaming-Antworten, Voice-Input und Trigger-Filterung.

**Abhängigkeiten:**
- React: useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef
- Lucide Icons: Send, Mic, MicOff, Volume2, VolumeX, Loader2, User, Bot, Copy, Check, RefreshCw
- react-markdown: Markdown-Rendering
- remark-gfm: GitHub Flavored Markdown

**Exportiert:**
- `ClaudeAssistant` (default) - Haupt-Komponente
- `ClaudeAssistantHandle` (type) - Ref-Interface für externe Steuerung

**Props Interface:**

```typescript
interface ClaudeAssistantProps {
  systemPrompt: string;           // System-Prompt für Claude
  caseId: string;                 // Fall-ID
  consultationType: string;       // "beratung" | "markenname" | "recherche" | "anmeldung"
  contextData?: Record<string, unknown>; // Kontext-Daten
  messages: Message[];            // Externe Nachrichten
  setMessages: (msgs: Message[]) => void; // Nachrichten-Setter
  onTriggerDetected?: (trigger: string, value: string) => void; // Trigger-Callback
  placeholder?: string;           // Input-Placeholder
  welcomeMessage?: string;        // Initiale Begrüßung
  className?: string;             // CSS-Klassen
}
```

**Handle Interface (für Refs):**

```typescript
interface ClaudeAssistantHandle {
  sendQuestion: (question: string) => Promise<void>;  // Frage senden
  clearMessages: () => void;                          // Chat leeren
  getMessages: () => Message[];                       // Nachrichten abrufen
}
```

**Wichtige Funktionen:**

| Funktion | Zeilen | Beschreibung |
|----------|--------|--------------|
| `sendMessage` | ~200-400 | Nachricht an Claude senden, Streaming verarbeiten |
| `filterTriggers` | ~150-180 | Trigger aus Antwort entfernen für UI |
| `handleVoiceInput` | ~450-500 | Spracheingabe verarbeiten |
| `copyToClipboard` | ~520-540 | Nachricht kopieren |

**Trigger-Filterung:**

Die Komponente filtert folgende Trigger aus der UI-Anzeige:
- `[MARKE:...]`
- `[KLASSEN:...]`
- `[LAENDER:...]`
- `[ART:...]`
- `[GOTO:...]`
- `[RECHERCHE_STARTEN]`
- `[WEITERE_RECHERCHE]`
- `[WEB_SUCHE:...]`
- `[LOGO_GENERIEREN:...]`
- `[LOGO_BEARBEITEN:...]`
- `[KOSTEN_BERECHNEN]`
- `[ANMELDUNG_STARTEN]`

**Bekannte Probleme:**

1. **Trigger-Liste nicht zentral:**
   - Trigger sind in ClaudeAssistant UND page.tsx definiert
   - Bei neuen Triggern müssen beide Dateien geändert werden
   - **Vorschlag:** Zentrale `TRIGGERS` Konstante in `/lib/triggers.ts`

2. **Keine Fehlerbehandlung bei Streaming-Abbruch:**
   - Wenn der User während Streaming navigiert, kann es zu Fehlern kommen
   - **Vorschlag:** AbortController für Streaming-Requests

**Verbesserungsvorschläge:**

| # | Verbesserung | Aufwand | Priorität |
|---|--------------|---------|-----------|
| 1 | Zentrale Trigger-Definition | 1 h | MITTEL |
| 2 | AbortController für Streaming | 30 min | NIEDRIG |
| 3 | Bessere TypeScript-Typen | 1 h | NIEDRIG |

---

#### 1.3 lib/prompts/beratung.ts

**Pfad:** `/lib/prompts/beratung.ts`
**Zeilen:** 332
**Typ:** TypeScript Module

**Zweck:**
Definiert die KI-Persönlichkeit und Regeln für den Beratungs-Berater. Enthält Trigger-Definitionen, Workflow-Anweisungen und Beispiele für die KI.

**Exportiert:**
- `BeratungContext` (interface) - Kontext-Daten für den Prompt
- `getBeratungRules(context)` - Generiert akkordeon-spezifische Regeln

**Kontext-Interface:**
```typescript
interface BeratungContext {
  markenname: string;
  markenart: string;
  klassen: string;
  laender: string;
  isTrademarkTypeConfirmed: boolean;
  trademarkType: string;
}
```

**Definierte Trigger:**
| Trigger | Beschreibung |
|---------|--------------|
| `[MARKE:Name]` | Markenname setzen |
| `[ART:wortmarke\|bildmarke\|wort-bildmarke]` | Markenart setzen |
| `[KLASSEN:01,02,03]` | Nizza-Klassen setzen |
| `[LAENDER:DE,EU,US]` | Länder setzen |
| `[WEB_SUCHE:query]` | Web-Suche ausführen |
| `[WEITERE_RECHERCHE]` | Formular zurücksetzen |
| `[WEITER:akkordeon]` | Zu anderem Akkordeon navigieren |

**Wichtige Regeln:**
1. Web-Suche PROAKTIV bei jedem neuen Markennamen
2. Bei Konflikten WARTEN auf User-Bestätigung (keine Trigger setzen!)
3. Zusammenfassung erst wenn ALLE Daten komplett
4. Validierung von Klassen (1-45), Ländern, Markennamen

---

#### 1.4 lib/prompts/markenname.ts

**Pfad:** `/lib/prompts/markenname.ts`
**Zeilen:** 88
**Typ:** TypeScript Module

**Zweck:**
Definiert die KI-Persönlichkeit für den Logo/Markenname-Berater. Fokus auf Logo-Generierung und Design-Beratung.

**Exportiert:**
- `MarkennameContext` (interface)
- `getMarkennameRules(context)`

**Kontext-Interface:**
```typescript
interface MarkennameContext {
  trademarkName: string;
  trademarkType: string;
  hasLogo: boolean;
}
```

**Definierte Trigger:**
| Trigger | Beschreibung |
|---------|--------------|
| `[LOGO_GENERIEREN:prompt]` | Logo mit AI generieren |
| `[WEITER:recherche]` | Zur Recherche navigieren |

**Wichtige Regeln:**
1. Fragen nach Stil, Farben, Symbolen vor Logo-Generierung
2. Nach Logo-Erstellung Feedback einholen
3. Rechtliche Hinweise bei kopierten/ähnlichen Logos

---

#### 1.5 lib/prompts/recherche.ts

**Pfad:** `/lib/prompts/recherche.ts`
**Zeilen:** 106
**Typ:** TypeScript Module

**Zweck:**
Definiert die KI-Persönlichkeit für den Recherche-Berater. Fokus auf Markenrecherche und Konfliktanalyse.

**Exportiert:**
- `RechercheContext` (interface)
- `getRechercheRules(context)`

**Kontext-Interface:**
```typescript
interface RechercheContext {
  trademarkName: string;
  niceClasses: string[];
  countries: string[];
  trademarkType: string;
  isRunningAnalysis: boolean;
}
```

**Definierte Trigger:**
| Trigger | Beschreibung |
|---------|--------------|
| `[RECHERCHE_STARTEN]` | Markenrecherche starten |
| `[WEB_SUCHE:query]` | Web-Suche für Infos |
| `[WEITER:checkliste]` | Zur Checkliste navigieren |
| `[WEITER:beratung]` | Zurück zur Beratung |

**Wichtige Regeln:**
1. Recherche NUR starten wenn Name, Klassen UND Länder vorhanden
2. Unterschied zwischen `[RECHERCHE_STARTEN]` (Datenbanken) und `[WEB_SUCHE]` (Internet)
3. Ergebnis-Handling: GO (grün), WARNUNG (gelb), NO-GO (rot)

---

#### 1.6 lib/prompts/anmeldung.ts

**Pfad:** `/lib/prompts/anmeldung.ts`
**Zeilen:** 209
**Typ:** TypeScript Module

**Zweck:**
Definiert die KI-Persönlichkeit für den Anmeldungs-Berater. Fokus auf Anmelder-Daten und Kostenberechnung.

**Exportiert:**
- `AnmeldungContext` (interface)
- `getAnmeldungRules(context)`

**Kontext-Interface:**
```typescript
interface AnmeldungContext {
  trademarkName: string;
  trademarkType: string;
  niceClasses: string[];
  countries: string[];
  applicantType?: string;
  applicantName?: string;
  applicantStreet?: string;
  applicantZip?: string;
  applicantCity?: string;
  applicantCountry?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantLegalForm?: string;
  selfRegisterAllowed?: boolean;
  hasAllData?: boolean;
}
```

**Definierte Trigger:**
| Trigger | Beschreibung |
|---------|--------------|
| `[ANMELDER_TYP:privat\|firma]` | Anmeldertyp setzen |
| `[ANMELDER_NAME:...]` | Name/Firma setzen |
| `[ANMELDER_STRASSE:...]` | Straße setzen |
| `[ANMELDER_PLZ:...]` | PLZ setzen |
| `[ANMELDER_ORT:...]` | Ort setzen |
| `[ANMELDER_LAND:...]` | Land setzen |
| `[ANMELDER_EMAIL:...]` | E-Mail setzen |
| `[ANMELDER_TELEFON:...]` | Telefon setzen |
| `[ANMELDER_RECHTSFORM:...]` | Rechtsform setzen |
| `[KOSTEN_BERECHNEN]` | Kostenübersicht anzeigen |
| `[WEB_SUCHE:query]` | Web-Suche für Gebühren |

**Wichtige Regeln:**
1. Workflow: Begrüßung → Anmelder-Daten → Kosten → Optionen
2. Bidirektionale Synchronisation: Formular ↔ Chat
3. Selbstanmeldung vs. Vertreter je nach Land

---

#### 1.7 lib/prompts/base-rules.ts

**Pfad:** `/lib/prompts/base-rules.ts`
**Zeilen:** 247
**Typ:** TypeScript Module

**Zweck:**
Globale Basis-Regeln die in ALLEN Akkordeons gelten. Enthält allgemeine Verhaltensregeln, FAQ-Antworten und Formatierungsrichtlinien.

**Exportiert:**
- `BASE_RULES` (const string) - Globale Regeln

**Wichtige Abschnitte:**
| Abschnitt | Beschreibung |
|-----------|--------------|
| Mehrsprachigkeit | Automatische Spracherkennung |
| Formatierung | Fett für wichtige Fragen |
| Ignorierte Fragen | Wie mit abgelenkten Usern umgehen |
| Unklare Antworten | Nachfragen statt raten |
| Abbruch-Handling | Pausieren/Später weitermachen |
| Frustrierter User | Empathische Reaktion |
| Falsche Fachbegriffe | Patent vs. Marke erklären |
| Kosten-Fragen | Richtwerte für Amtsgebühren |
| Dauer-Fragen | Bearbeitungszeiten |
| Anwalt-Frage | Wann Anwalt empfehlen |
| Datenschutz | DSGVO-Hinweise |
| Nizza-Klassen | Erklärung des Systems |
| Navigation-Trigger | `[WEITER:...]` Trigger |

---

#### 1.8 lib/prompts/index.ts

**Pfad:** `/lib/prompts/index.ts`
**Zeilen:** 57
**Typ:** TypeScript Module

**Zweck:**
Zentrale Prompt-Verwaltung. Kombiniert akkordeon-spezifische Regeln mit globalen Basis-Regeln.

**Exportiert:**
- `getBeratungPrompt(context)` - Vollständiger Beratungs-Prompt
- `getRecherchePrompt(context)` - Vollständiger Recherche-Prompt
- `getMarkennamePrompt(context)` - Vollständiger Markenname-Prompt
- `getAnmeldungPrompt(context)` - Vollständiger Anmeldung-Prompt
- `BASE_RULES` - Re-export
- Alle `get*Rules` Funktionen - Re-export
- Alle Context-Types - Re-export

**Struktur:**
```
Vollständiger Prompt = Akkordeon-spezifische Regeln + BASE_RULES
```

---

**Zusammenfassung Prompt-System:**

| Datei | Zeilen | Trigger | Zweck |
|-------|--------|---------|-------|
| beratung.ts | 332 | 7 | Marken-Daten erfassen |
| markenname.ts | 88 | 2 | Logo-Generierung |
| recherche.ts | 106 | 4 | Markenrecherche |
| anmeldung.ts | 209 | 11 | Anmelder-Daten |
| base-rules.ts | 247 | 7 | Globale Regeln |
| index.ts | 57 | - | Zentrale Verwaltung |

**Bekannte Probleme im Prompt-System:**

1. **Trigger-Duplizierung:**
   - Trigger sind in Prompts UND in page.tsx/ClaudeAssistant.tsx definiert
   - Bei neuen Triggern müssen 3+ Dateien geändert werden
   - **Vorschlag:** Zentrale `TRIGGERS` Konstante

2. **Inkonsistente Trigger-Namen:**
   - Beratung: `[WEITER:recherche]`
   - Recherche: `[WEITER:checkliste]`
   - Anmeldung: `[KOSTEN_BERECHNEN]`
   - **Vorschlag:** Einheitliches Namensschema

3. **Fehlende Trigger-Dokumentation:**
   - Nicht alle Trigger sind in allen Prompts dokumentiert
   - **Vorschlag:** Vollständige Trigger-Liste in jedem Prompt

---

#### 1.9 lib/api-logger.ts

**Pfad:** `/lib/api-logger.ts`
**Zeilen:** 448
**Typ:** TypeScript Module

**Zweck:**
Zentrales API-Logging und Kostenberechnung. Trackt alle API-Aufrufe, berechnet Kosten basierend auf Token/Units und zieht automatisch Credits ab.

**Abhängigkeiten:**
- `@/db` - Drizzle ORM Datenbankverbindung
- `@/db/schema` - apiUsageLogs, users, creditTransactions Tabellen
- `drizzle-orm` - eq, sql

**Exportiert:**

| Export | Typ | Beschreibung |
|--------|-----|--------------|
| `ApiProvider` | type | "claude" \| "openai" \| "tmsearch" \| "tavily" \| "hume" \| "resend" \| "ideogram" \| "bfl" |
| `API_PRICING` | const | Preiskonfiguration für alle APIs |
| `LogApiUsageParams` | interface | Parameter für logApiUsage() |
| `calculateApiCost()` | function | Kosten berechnen (USD, EUR, Credits) |
| `logApiUsage()` | function | API-Nutzung loggen + Credits abziehen |
| `deductCredits()` | function | Credits vom User abziehen |
| `addCredits()` | function | Credits hinzufügen (Kauf, Bonus) |
| `getCredits()` | function | Credit-Stand abrufen |
| `checkCredits()` | function | Prüfen ob genug Credits |
| `estimateCredits()` | function | Credits vor API-Call schätzen |

**API-Preiskonfiguration (Januar 2026):**

| Provider | Modell | Preis |
|----------|--------|-------|
| Claude | claude-opus-4-5-20251101 | $5/$25 per 1M tokens |
| Claude | claude-sonnet-4-5-20251022 | $3/$15 per 1M tokens |
| Claude | claude-haiku-4-5-20251022 | $1/$5 per 1M tokens |
| OpenAI | gpt-4o | $2.50/$10 per 1M tokens |
| OpenAI | whisper-1 | $0.006 per minute |
| tmsearch | - | $0.05 per search |
| Tavily | - | $0.01 per search |
| Hume | - | $0.02 per minute |
| Resend | - | $0.001 per email |
| Ideogram | V_3 | $0.06 per image |
| BFL | flux-kontext-pro | $0.04 per image |

**Kostenberechnung:**
```
costUsd = API-Kosten (basierend auf Tokens/Units)
costEur = costUsd × 0.92 (USD→EUR)
finalCost = costEur × 3 (Markup)
creditsCharged = ceil(finalCost / 0.03) (1 Credit = 0.03€)
```

**Bekannte Probleme:**

1. **Duplizierte Funktionen:**
   - `deductCredits()` und `addCredits()` existieren AUCH in credit-manager.ts
   - **Vorschlag:** Nur in einer Datei definieren, andere importiert

2. **Keine Retry-Logik:**
   - Bei DB-Fehlern wird nicht wiederholt
   - **Vorschlag:** Retry mit exponential backoff

---

#### 1.10 lib/credit-manager.ts

**Pfad:** `/lib/credit-manager.ts`
**Zeilen:** 368
**Typ:** TypeScript Module

**Zweck:**
Credit-Verwaltung für das Stripe-basierte Bezahlsystem. Verwaltet Credit-Pakete, Transaktionen und Verbrauchsstatistiken.

**Abhängigkeiten:**
- `@/db` - Drizzle ORM Datenbankverbindung
- `@/db/schema` - users, creditTransactions, apiUsageLogs Tabellen
- `drizzle-orm` - eq, desc, sql, and, gte, lte

**Exportiert:**

| Export | Typ | Beschreibung |
|--------|-----|--------------|
| `CREDIT_PACKAGES` | const | Stripe Credit-Pakete |
| `getUserCredits()` | function | Credit-Stand abrufen |
| `hasEnoughCredits()` | function | Prüfen ob genug Credits |
| `deductCredits()` | function | Credits abziehen |
| `addCredits()` | function | Credits hinzufügen |
| `getCreditHistory()` | function | Transaktionshistorie |
| `getUserUsageStats()` | function | Verbrauchsstatistiken |
| `setWarningThreshold()` | function | Warning-Schwelle setzen |
| `processStripePayment()` | function | Stripe-Zahlung verarbeiten |

**Credit-Pakete (Januar 2026):**

| Paket | Credits | Preis | Rabatt |
|-------|---------|-------|--------|
| credits_350 | 350 | 10.00€ | 0% |
| credits_900 | 900 | 25.00€ | ~3% |
| credits_1900 | 1900 | 50.00€ | ~7% |

**Wichtige Funktionen:**

| Funktion | Beschreibung |
|----------|--------------|
| `getUserCredits()` | Gibt credits, warningThreshold, isLow, isEmpty zurück |
| `getCreditHistory()` | Paginierte Transaktionshistorie mit Filtern |
| `getUserUsageStats()` | Aggregierte Statistiken nach API-Provider |
| `processStripePayment()` | Verhindert doppelte Verarbeitung via checkoutSessionId |

**Bekannte Probleme:**

1. **Duplizierte Funktionen mit api-logger.ts:**
   - `deductCredits()`, `addCredits()` sind in beiden Dateien
   - Unterschiedliche Implementierungen können zu Inkonsistenzen führen
   - **Vorschlag:** Zentrale credit-utils.ts mit allen Credit-Funktionen

2. **Keine Transaktions-Isolation:**
   - Credit-Updates sind nicht in DB-Transaktionen
   - Bei Race Conditions können Credits falsch berechnet werden
   - **Vorschlag:** `db.transaction()` verwenden

3. **Stripe Price IDs aus Environment:**
   - `STRIPE_PRICE_350_CREDITS` etc. müssen in .env definiert sein
   - Keine Validierung ob IDs existieren
   - **Vorschlag:** Validierung beim App-Start

---

### Zusammenfassung Kategorie 1 (Kern-Dateien)

| # | Datei | Zeilen | Status | Probleme |
|---|-------|--------|--------|----------|
| 1.1 | page.tsx | 9783 | Analysiert | 4 Bugs, zu groß |
| 1.2 | ClaudeAssistant.tsx | 1142 | Analysiert | 2 Probleme |
| 1.3 | beratung.ts | 332 | Analysiert | - |
| 1.4 | markenname.ts | 88 | Analysiert | - |
| 1.5 | recherche.ts | 106 | Analysiert | - |
| 1.6 | anmeldung.ts | 209 | Analysiert | - |
| 1.7 | base-rules.ts | 247 | Analysiert | - |
| 1.8 | index.ts | 57 | Analysiert | - |
| 1.9 | api-logger.ts | 448 | Analysiert | 2 Probleme |
| 1.10 | credit-manager.ts | 368 | Analysiert | 3 Probleme |

**Gesamtzeilen Kategorie 1:** ~12.780 Zeilen

**Identifizierte Bugs (HOCH Priorität):**
1. `triggerChangeInProgressRef` fehlt in Recherche-Trigger-Handler
2. `lastNotifiedStateRef` nicht aktualisiert in Recherche

**Identifizierte Verbesserungen:**
1. Zentrale Trigger-Definition erstellen
2. page.tsx in kleinere Komponenten aufteilen
3. Duplizierte Credit-Funktionen konsolidieren
4. DB-Transaktionen für Credit-Updates

---

### Kategorie 2: API-Routen (58 Dateien)

Die API-Routen sind in `/app/api/` organisiert und folgen dem Next.js App Router Pattern.

#### 2.1 KI-Chat & Suche

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/claude-chat/route.ts` | 680 | POST | Haupt-Chat-Endpoint für Claude. Enthält BASE_SYSTEM_PROMPT mit allen Regeln. Streaming-Antworten. |
| `/api/openai/chat/route.ts` | ~150 | POST | OpenAI GPT-4o Chat-Endpoint (Alternative zu Claude) |
| `/api/web-search/route.ts` | 110 | POST | Tavily Web-Suche. Loggt API-Nutzung, zieht Credits ab. |
| `/api/whisper/route.ts` | ~80 | POST | OpenAI Whisper Speech-to-Text |

**Wichtige Details zu claude-chat:**
- Enthält umfangreichen BASE_SYSTEM_PROMPT (~500 Zeilen)
- Definiert alle Trigger: [MARKE:], [KLASSEN:], [LAENDER:], [ART:], [GOTO:], [WEB_SUCHE:]
- Streaming via ReadableStream
- Loggt Chat-Nachrichten via logChatMessage()

---

#### 2.2 Markenrecherche (tmsearch)

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/tmsearch/search/route.ts` | 264 | POST | Markensuche via tmsearch.ai. Filter nach Ländern, Klassen, Status. |
| `/api/tmsearch/analyze/route.ts` | ~200 | POST | Analyse der Suchergebnisse |
| `/api/tmsearch/analyze-stream/route.ts` | ~300 | POST | Streaming-Analyse mit Claude |
| `/api/tmsearch/info/route.ts` | ~50 | GET | API-Info und Status |

**Wichtige Details zu tmsearch/search:**
- Unterstützt regionale WIPO-Codes (BX für Benelux, OA für OAPI)
- Filter: countries, liveOnly, classes, minAccuracy
- expandCountriesWithRegionalCodes() für automatische Erweiterung
- Loggt API-Nutzung und Credits

---

#### 2.3 Logo-Generierung & Bearbeitung

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/generate-logo/route.ts` | 110 | POST | Logo-Generierung via Ideogram API |
| `/api/edit-logo/route.ts` | 126 | POST | Logo-Bearbeitung via BFL Flux Kontext Pro |
| `/api/generate-logo-prompt/route.ts` | ~80 | POST | Prompt-Generierung für Logos |
| `/api/case-logos/route.ts` | ~150 | GET, POST | Logo-Persistenz (Base64 in DB) |

**Wichtige Details:**
- generate-logo: Ideogram V_2_TURBO ($0.05/Bild)
- edit-logo: BFL Flux Kontext Pro ($0.04/Bild) mit Polling
- case-logos: Speichert Logos als Base64 in der Datenbank

---

#### 2.4 Credit-System

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/credits/route.ts` | 124 | GET, POST | Credit-Stand, Historie, Statistiken, Pakete |

**GET Parameter:**
- `type=balance` - Aktueller Credit-Stand
- `type=history` - Transaktionshistorie (paginiert)
- `type=usage` - Verbrauchsstatistiken nach Provider
- `type=packages` - Verfügbare Credit-Pakete

**POST Actions:**
- `action=setWarningThreshold` - Warning-Schwelle setzen

---

#### 2.5 Case-Management

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/cases/route.ts` | ~100 | GET, POST | Alle Cases eines Users |
| `/api/cases/start/route.ts` | ~80 | POST | Neuen Case starten |
| `/api/cases/active/route.ts` | ~50 | GET | Aktiven Case abrufen |
| `/api/cases/[caseId]/route.ts` | ~150 | GET, PUT, DELETE | Einzelner Case CRUD |
| `/api/cases/[caseId]/full/route.ts` | ~100 | GET | Case mit allen Relationen |
| `/api/cases/[caseId]/prefill/route.ts` | ~80 | POST | Case vorausfüllen |
| `/api/cases/[caseId]/steps/route.ts` | ~100 | GET, PUT | Workflow-Schritte |
| `/api/cases/[caseId]/skip/route.ts` | ~50 | POST | Schritt überspringen |
| `/api/cases/[caseId]/reset-steps/route.ts` | ~50 | POST | Schritte zurücksetzen |
| `/api/cases/[caseId]/update-status/route.ts` | ~50 | POST | Status aktualisieren |
| `/api/cases/[caseId]/visited-accordions/route.ts` | ~80 | GET, POST | Besuchte Akkordeons |
| `/api/cases/[caseId]/memory/route.ts` | ~100 | GET, POST | Case-Memory (Kontext) |
| `/api/cases/[caseId]/session-events/route.ts` | ~80 | GET, POST | Session-Events |

---

#### 2.6 Recherche & Analyse

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/cases/[caseId]/analysis/route.ts` | ~100 | GET, POST | Analyse-Ergebnisse |
| `/api/cases/[caseId]/analyses/route.ts` | ~80 | GET | Alle Analysen eines Cases |
| `/api/cases/[caseId]/run-recherche-analyse/route.ts` | ~200 | POST | Recherche-Analyse starten |
| `/api/cases/[caseId]/recherche-history/route.ts` | ~100 | GET, POST | Recherche-Historie |
| `/api/cases/[caseId]/catch-up-beratung/route.ts` | ~80 | POST | Beratung nachholen |
| `/api/recherche/quick-check/route.ts` | ~150 | POST | Schnell-Check |
| `/api/recherche/generate-alternatives/route.ts` | ~100 | POST | Alternativen generieren |

---

#### 2.7 Consultation (Chat-Nachrichten)

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/cases/[caseId]/consultation/route.ts` | ~100 | GET, POST | Consultation-Session |
| `/api/cases/[caseId]/consultation/messages/route.ts` | ~80 | GET, POST | Chat-Nachrichten |

---

#### 2.8 Anmeldung

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/anmeldung/applicant-profile/route.ts` | ~150 | GET, POST | Anmelder-Profil |
| `/api/anmeldung/registration-order/route.ts` | ~200 | POST | Anmeldung bestellen |
| `/api/anmeldung/generate-strategy/route.ts` | ~100 | POST | Anmelde-Strategie generieren |

---

#### 2.9 Authentifizierung

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/auth/[...nextauth]/route.ts` | ~50 | GET, POST | NextAuth.js Handler |
| `/api/auth/register/route.ts` | ~100 | POST | Benutzer registrieren |
| `/api/auth/forgot-password/route.ts` | ~80 | POST | Passwort vergessen |
| `/api/auth/reset-password/route.ts` | ~80 | POST | Passwort zurücksetzen |
| `/api/auth/verify-email/route.ts` | ~60 | POST | E-Mail verifizieren |
| `/api/auth/check-verification/route.ts` | ~50 | GET | Verifizierung prüfen |
| `/api/auth/resend-verification/route.ts` | ~60 | POST | Verifizierung erneut senden |

---

#### 2.10 User-Management

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/user/delete/route.ts` | ~80 | DELETE | Benutzer löschen |
| `/api/user/tour-status/route.ts` | ~60 | GET, POST | Tour-Status (Onboarding) |

---

#### 2.11 Admin

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/admin/api-costs/route.ts` | ~200 | GET | API-Kosten Übersicht |
| `/api/admin/chat-logs/route.ts` | ~100 | GET | Chat-Logs |
| `/api/admin/analytics/route.ts` | ~150 | GET | Analytics-Daten |
| `/api/admin/test-api/route.ts` | ~80 | POST | API-Tests |

---

#### 2.12 Reports & Analytics

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/report/generate/route.ts` | ~150 | POST | Report generieren |
| `/api/report/export/route.ts` | ~100 | POST | Report exportieren (PDF) |
| `/api/analytics/track/route.ts` | ~80 | POST | Analytics-Events tracken |

---

#### 2.13 Decisions & Alternatives

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/cases/save-decisions/route.ts` | ~80 | POST | Entscheidungen speichern |
| `/api/cases/extract-decisions/route.ts` | ~100 | POST | Entscheidungen extrahieren |
| `/api/cases/select-alternative/route.ts` | ~60 | POST | Alternative auswählen |

---

#### 2.14 OpenAI Realtime

| Datei | Zeilen | Methoden | Beschreibung |
|-------|--------|----------|--------------|
| `/api/openai-realtime/session/route.ts` | ~80 | POST | Realtime-Session erstellen |

---

### Zusammenfassung Kategorie 2 (API-Routen)

**Gesamtanzahl:** 58 API-Route-Dateien

**Nach Funktionsbereich:**
| Bereich | Anzahl | Wichtigste Dateien |
|---------|--------|-------------------|
| KI-Chat & Suche | 4 | claude-chat, web-search |
| Markenrecherche | 4 | tmsearch/search, analyze-stream |
| Logo | 4 | generate-logo, edit-logo |
| Credits | 1 | credits |
| Case-Management | 13 | cases/[caseId]/* |
| Recherche | 7 | run-recherche-analyse |
| Consultation | 2 | consultation/messages |
| Anmeldung | 3 | applicant-profile |
| Auth | 7 | register, reset-password |
| User | 2 | delete, tour-status |
| Admin | 4 | api-costs, chat-logs |
| Reports | 3 | generate, export |
| Decisions | 3 | save-decisions |
| Realtime | 1 | session |

**Identifizierte Muster:**

1. **Konsistentes Auth-Pattern:**
   - Alle geschützten Routen nutzen `const session = await auth()`
   - Prüfung auf `session?.user?.id`

2. **API-Logging:**
   - Alle kostenpflichtigen APIs nutzen `logApiUsage()`
   - Credits werden automatisch abgezogen

3. **Error-Handling:**
   - Try-catch mit console.error
   - NextResponse.json mit status codes

**Bekannte Probleme:**

1. **Inkonsistente Error-Messages:**
   - Manche deutsch ("Nicht autorisiert"), manche englisch ("Unauthorized")
   - **Vorschlag:** Einheitliche Sprache (deutsch für User-facing)

2. **Fehlende Rate-Limiting:**
   - Keine Rate-Limits auf API-Routen
   - **Vorschlag:** Rate-Limiting Middleware hinzufügen

3. **Duplizierter Auth-Code:**
   - `const session = await auth()` in jeder Route
   - **Vorschlag:** Auth-Middleware für geschützte Routen

---

### Kategorie 3: Komponenten (17 Dateien)

Die Komponenten sind in `/app/components/` und `/components/` organisiert.

#### 3.1 Chat & Voice Komponenten

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/app/components/ClaudeAssistant.tsx` | 1142 | Haupt-Chat-Komponente für Claude. Trigger-Filterung, Streaming, Voice-Input. |
| `/app/components/OpenAIVoiceAssistant.tsx` | 722 | OpenAI Realtime Voice-Chat. WebRTC, Spracheingabe/-ausgabe. |
| `/app/components/Messages.tsx` | 108 | Hume AI Voice-Nachrichten-Anzeige. |

**Wichtige Details zu ClaudeAssistant:**
- Props: systemPrompt, onTrigger, onMessage, previousMessages
- Handle-Interface für Refs: sendQuestion(), isConnected()
- Trigger-Filterung: Entfernt [MARKE:], [KLASSEN:] etc. aus Anzeige
- Streaming via ReadableStream

**Wichtige Details zu OpenAIVoiceAssistant:**
- WebRTC-basierte Echtzeit-Kommunikation
- Unterstützt Voice und Text-Modus
- Auto-Connect bei vorherigen Nachrichten
- Bild-Upload für Logo-Analyse

---

#### 3.2 Recherche-Komponenten

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/app/components/RechercheSteps.tsx` | 639 | Recherche-Workflow-Visualisierung. 5 Schritte mit Erklärungen. |
| `/app/components/RechercheHistoryBanner.tsx` | ~100 | Banner für vorherige Recherchen |
| `/app/components/cases/ConflictCard.tsx` | 325 | Konflikt-Marken-Karte mit Detail-Modal |
| `/app/components/cases/AnimatedRiskScore.tsx` | ~80 | Animierter Risiko-Score |

**Wichtige Details zu RechercheSteps:**
- 5 Schritte: search, filter, details, ai-analysis, summary
- Detaillierte Erklärungen für jeden Schritt
- ResultSummary-Komponente für Schritt-Ergebnisse
- StepDetailModal für erweiterte Ansicht

**Wichtige Details zu ConflictCard:**
- ConflictMark Interface mit allen Marken-Details
- ConflictDetailModal für vollständige Ansicht
- Risiko-Level-Styling (high/medium/low)
- Datum-Formatierung für deutsche Locale

---

#### 3.3 Report & Export

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/app/components/ReportGenerator.tsx` | 313 | Markengutachten-Generator. PDF/Word-Export. |

**Wichtige Details:**
- Generiert professionelle Markengutachten via API
- Editierbarer Report-Content (contentEditable)
- Export zu PDF und Word via /api/report/export
- Risiko-Zusammenfassung im Header

---

#### 3.4 Credit & UI Komponenten

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/components/CreditDisplay.tsx` | 150 | Credit-Anzeige mit Auto-Refresh. useCredits() Hook. |
| `/app/components/CaseTimeline.tsx` | ~200 | Case-Workflow-Timeline |
| `/app/components/Header.tsx` | ~150 | App-Header mit Navigation |
| `/app/components/Footer.tsx` | ~80 | App-Footer |
| `/app/components/ErrorBoundary.tsx` | ~60 | React Error Boundary |

**Wichtige Details zu CreditDisplay:**
- Zeigt Credits mit Farb-Coding (grün/gelb/rot)
- Auto-Refresh alle 60 Sekunden
- useCredits() Hook für programmatischen Zugriff
- Compact-Modus für Header-Anzeige

---

#### 3.5 UI-Primitives

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/app/components/ui/tooltip.tsx` | ~50 | Tooltip-Komponente |
| `/app/components/ui/progress-bar.tsx` | ~40 | Progress-Bar |
| `/components/ui/dropdown-menu.tsx` | ~100 | Dropdown-Menü |
| `/components/analytics-provider.tsx` | ~80 | Analytics-Context-Provider |

---

### Zusammenfassung Kategorie 3 (Komponenten)

**Gesamtanzahl:** 17 Komponenten-Dateien

**Nach Funktionsbereich:**
| Bereich | Anzahl | Wichtigste Dateien |
|---------|--------|-------------------|
| Chat & Voice | 3 | ClaudeAssistant, OpenAIVoiceAssistant |
| Recherche | 4 | RechercheSteps, ConflictCard |
| Report | 1 | ReportGenerator |
| Credit & UI | 5 | CreditDisplay, Header |
| UI-Primitives | 4 | tooltip, dropdown-menu |

**Identifizierte Muster:**

1. **Konsistente Ref-Pattern:**
   - forwardRef + useImperativeHandle für externe Steuerung
   - Handle-Interfaces für typsichere Refs

2. **Callback-Memoization:**
   - useCallback für Event-Handler
   - Vermeidung unnötiger Re-Renders

3. **Locale-Awareness:**
   - Deutsche Datum-Formatierung
   - Deutsche UI-Texte

**Bekannte Probleme:**

1. **Duplizierte Datum-Formatierung:**
   - formatGermanDate() in mehreren Komponenten
   - **Vorschlag:** Zentrale utils/date.ts erstellen

2. **Inkonsistente Komponenten-Struktur:**
   - Manche in /app/components/, manche in /components/
   - **Vorschlag:** Alle in /components/ konsolidieren

3. **Fehlende Prop-Validierung:**
   - Keine Runtime-Validierung von Props
   - **Vorschlag:** Zod-Schemas für kritische Props

---

### Kategorie 4: Lib-Module (35 Dateien)

Die Lib-Module sind in `/lib/` organisiert und enthalten wiederverwendbare Logik.

#### 4.1 Authentifizierung & Sicherheit

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/auth.ts` | 108 | NextAuth.js Konfiguration. JWT-Sessions, Credentials-Provider. |
| `/lib/validation.ts` | 66 | Input-Validierung. Email, Passwort, Name. |
| `/lib/rate-limit.ts` | 51 | In-Memory Rate-Limiting mit Map. |
| `/lib/env.ts` | 8 | Umgebungsvariablen-Validierung. |

**Wichtige Details zu auth.ts:**
- JWT-Sessions mit 30 Tagen Gültigkeit
- Timing-Attack-Schutz bei fehlenden Usern
- Email-Verifizierung erforderlich
- isAdmin-Flag in Session

---

#### 4.2 KI & API-Clients

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/anthropic.ts` | 11 | Anthropic Client. Claude Opus/Sonnet/Haiku Modelle. |
| `/lib/api-logger.ts` | ~300 | API-Kosten-Logging. 8 Provider, Credit-Berechnung. |
| `/lib/chat-logger.ts` | 72 | Chat-Logging mit Token-Kosten. |
| `/lib/api-error.ts` | 15 | APIError-Klasse und Handler. |

**Wichtige Details zu api-logger.ts:**
- Preise für: Claude, OpenAI, tmsearch, Tavily, Hume, Resend, Ideogram, BFL
- Formel: costUsd → costEur (×0.92) → finalCost (×3) → credits (÷0.03)
- Automatisches Credit-Abzug

---

#### 4.3 Markenrecherche

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/tmsearch/client.ts` | 260 | TMSearch.ai API-Client. Suche, Filter, Info. |
| `/lib/tmsearch/types.ts` | 857 | Typen, Konstanten, Normalisierung. WIPO-Codes. |
| `/lib/trademark-search.ts` | 241 | Direkte API-Aufrufe zu EUIPO, DPMA, USPTO. |
| `/lib/similarity/index.ts` | 269 | Ähnlichkeitsberechnung. Levenshtein, Phonetik, Visuell. |
| `/lib/search-variants.ts` | 314 | Suchvarianten-Generierung. Phonetik, Tippfehler. |
| `/lib/country-mapping.ts` | 112 | Länder-Mapping für regionale Register (EU, BX, OA). |
| `/lib/register-urls.ts` | 123 | URLs zu offiziellen Markenregistern. |
| `/lib/related-classes.ts` | 360 | Verwandte Nizza-Klassen mit Risiko-Levels. |
| `/lib/nice-classes.ts` | 67 | 45 Nizza-Klassen mit deutschen Beschreibungen. |

**Wichtige Details zu tmsearch/types.ts:**
- TMSEARCH_AVAILABLE_REGISTERS: Welche Länder direkt durchsuchbar sind
- NATIONAL_REGISTER_URLS: Links für manuelle Recherche
- SearchCoverageReport: Dokumentiert nicht-durchsuchte Register
- WIPO_DESIGNATION_MAPPING: BE→BX, CM→OA etc.

**Wichtige Details zu similarity/index.ts:**
- levenshteinDistance/Similarity: Edit-Distanz
- phoneticSimilarity: Phonetische Ähnlichkeit
- visualSimilarity: Visuelle Ähnlichkeit
- calculateSimilarity: Kombiniert (60% phonetisch, 40% visuell)

---

#### 4.4 Case & Credit Management

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/case-memory.ts` | 289 | Case-Gedächtnis für KI-Agenten. Timeline, Recherchen. |
| `/lib/credit-manager.ts` | ~200 | Credit-Verwaltung. Pakete, Abzug, Prüfung. |
| `/lib/content-validation.ts` | 36 | Prüft ob Chat substantiven Inhalt hat. |

**Wichtige Details zu case-memory.ts:**
- buildCaseMemory(): Baut vollständiges Case-Gedächtnis
- generatePromptForAgent(): Generiert Kontext-Prompt für KI
- Timeline mit allen Events
- Journey-Status (beratung, recherche, etc.)

**Wichtige Details zu credit-manager.ts:**
- CREDIT_PACKAGES: 350/10€, 900/25€, 1900/50€
- checkCredits(): Prüft ob genug Credits
- deductCredits(): Zieht Credits ab
- WARNING_THRESHOLD: 50 Credits

---

#### 4.5 Prompts

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/prompts/beratung.ts` | ~200 | Beratungs-Berater Prompt. |
| `/lib/prompts/markenname.ts` | ~150 | Markenname-Berater Prompt. |
| `/lib/prompts/recherche.ts` | ~150 | Recherche-Berater Prompt. |
| `/lib/prompts/anmeldung.ts` | ~200 | Anmeldung-Berater Prompt. |
| `/lib/prompts/base-rules.ts` | ~50 | Basis-Regeln für alle Berater. |
| `/lib/prompts/index.ts` | ~20 | Export aller Prompts. |

**Wichtige Details:**
- Jeder Prompt definiert Trigger-Format
- Basis-Regeln werden in alle Prompts eingebunden
- Deutsche Sprache, professioneller Ton

---

#### 4.6 Utilities & Hooks

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/utils.ts` | 7 | cn() für Tailwind-Klassen. |
| `/lib/cache.ts` | 28 | In-Memory Cache mit TTL. |
| `/lib/hooks.ts` | 59 | SWR-Hooks für API-Daten. |
| `/lib/hooks/useActiveCase.ts` | ~50 | Hook für aktiven Case. |
| `/lib/analytics.ts` | 119 | Client-Side Analytics. Events, Page Views. |
| `/lib/email.ts` | 226 | Resend-Integration. Verifizierung, Passwort-Reset. |

**Wichtige Details zu hooks.ts:**
- useSearches, usePlaybooks, useWatchlist, useAlerts
- useTeam, useExperts, useDashboardStats
- useApplications, useApplication
- Alle mit SWR für Caching und Revalidierung

---

#### 4.7 Agents (AI-Agenten)

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `/lib/ai/extract-decisions.ts` | ~100 | Extrahiert Entscheidungen aus Chat. |
| `/lib/tmview-agent.ts` | ~200 | TMView-Agent für Markenrecherche. |

---

### Zusammenfassung Kategorie 4 (Lib-Module)

**Gesamtanzahl:** 35 Lib-Dateien

**Nach Funktionsbereich:**
| Bereich | Anzahl | Wichtigste Dateien |
|---------|--------|-------------------|
| Auth & Sicherheit | 4 | auth.ts, validation.ts |
| KI & API | 4 | anthropic.ts, api-logger.ts |
| Markenrecherche | 9 | tmsearch/*, similarity/* |
| Case & Credit | 3 | case-memory.ts, credit-manager.ts |
| Prompts | 6 | beratung.ts, markenname.ts |
| Utilities | 6 | utils.ts, hooks.ts |
| Agents | 2 | extract-decisions.ts |

**Identifizierte Muster:**

1. **Singleton-Pattern:**
   - TMSearchClient mit getTMSearchClient()
   - Anthropic-Client als Export

2. **In-Memory Caching:**
   - Rate-Limit Map
   - Strategy Cache (LRU)
   - Generic Cache mit TTL

3. **Normalisierung:**
   - normalizeResult() für API-Responses
   - toPhonetic() für Ähnlichkeitsvergleich

**Bekannte Probleme:**

1. **Duplizierte Konstanten:**
   - EU_COUNTRIES in tmsearch/types.ts UND country-mapping.ts
   - **Vorschlag:** Zentrale constants.ts erstellen

2. **In-Memory Rate-Limiting:**
   - Funktioniert nicht bei mehreren Server-Instanzen
   - **Vorschlag:** Redis-basiertes Rate-Limiting

3. **Fehlende Error-Boundaries:**
   - API-Clients werfen Errors ohne Recovery
   - **Vorschlag:** Retry-Logik mit Exponential Backoff

4. **Hardcoded Preise:**
   - API-Preise in api-logger.ts hardcoded
   - **Vorschlag:** Preise in Datenbank oder Config

---

*(Kategorie 5: Frontend-Seiten - Analyse folgt...)*

---

## Letzte Änderungen (Januar 2026)

- Credit & API Monitoring System implementiert
- Logo-Persistenz mit Base64-Speicherung
- Regionale WIPO-Codes (BX, OA) Unterstützung
- 194 WIPO-Mitgliedsstaaten in Länderauswahl
- Search Coverage Reporting für nicht-durchsuchte Register
- Bidirektionale Synchronisation für Anmeldung-Akkordeon
- "Weiter zur Anmeldung" Button im Recherche-Akkordeon
- Detaillierte KI-Chatbot-System Dokumentation hinzugefügt
- Systematische Code-Analyse Roadmap erstellt
