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

## Letzte Änderungen (Januar 2026)

- Credit & API Monitoring System implementiert
- Logo-Persistenz mit Base64-Speicherung
- Regionale WIPO-Codes (BX, OA) Unterstützung
- 194 WIPO-Mitgliedsstaaten in Länderauswahl
- Search Coverage Reporting für nicht-durchsuchte Register
