# Multi-Agent-System für Trademark IQ

Dieses System ermöglicht automatisierte Code-Generierung und -Optimierung durch mehrere spezialisierte Agenten.

## 🏗️ Architektur

### Agenten
- **Code-Agent** (SWE-1.5): TypeScript, React, Next.js, API-Routen
- **Design-Agent** (Claude-3.5-Sonnet): UI/UX, Accessibility, Responsive Design
- **Workflow-Agent** (GPT-4o): Business-Logik, Status-Übergänge, Prozesse
- **QA-Agent** (SWE-1.5): Tests, Build, Security, Performance
- **Master-Agent** (GPT-4o): Koordination, Kreuz-Prüfung, finale Vorschläge

## 🚀 Nutzung

```typescript
import { MultiAgentHandler } from './multi-agent-handler';

const handler = new MultiAgentHandler();

// Anforderung verarbeiten
const proposal = await handler.handleUserRequest("Ich will einen neuen Step für KI-Review");

// Antwort verarbeiten
const result = await handler.handleUserResponse("Ja", proposal);
```

## 📁 Struktur

```
app/agents/
├── types.ts                 # Typ-Definitionen
├── multi-agent-handler.ts   # Haupt-Handler
├── master/                  # Master-Agent
│   ├── orchestrator.ts      # Koordination
│   └── proposal-generator.ts # Vorschläge
├── code/                    # Code-Agent
│   └── code-agent.ts
├── design/                  # Design-Agent
│   └── design-agent.ts
├── workflow/                # Workflow-Agent
│   └── workflow-agent.ts
└── qa/                      # QA-Agent
    └── qa-agent.ts
```

## 🔄 Workflow

1. **Anforderung** → Alle Agenten analysieren parallel
2. **Kreuz-Prüfung** → Agenten geben sich gegenseitig Feedback
3. **Synthese** → Master erstellt finalen Vorschlag
4. **Bestätigung** → User klickt "Ja/Nein/Ändern"
5. **Umsetzung** → Automatische Implementierung

## 🎯 Vorteile

- **Qualität**: 4-fache Prüfung statt einzelner Analyse
- **Konsistenz**: Kreuz-Prüfung zwischen Disziplinen
- **Geschwindigkeit**: Parallele Verarbeitung + Automatisierung
- **Sicherheit**: TypeScript + Tests + Build-Checks

## 📝 Beispiel

**Input:** "Ich will eine Warnung anzeigen, wenn Risiko > 80%"

**Output:**
```
## 🎯 Vorschlag für: "Ich will eine Warnung anzeigen, wenn Risiko > 80%"

### 📋 Änderungen Übersicht

**📁 Dateien (3):**
🧩 `app/components/ui/risk-warning.tsx` - React-Komponente mit UI-Logik
🔌 `app/api/cases/[caseId]/risk-check/route.ts` - API-Route mit Business-Logik
📄 `app/dashboard/case/[caseId]/page.tsx` - React-Komponente mit UI-Logik

### ✨ Vorteile
• Klare visuelle Warnung für hohe Risiken
• Accessibility-konforme Umsetzung
• Responsive Design für alle Geräte

### ⚠️ Risiken
• Performance bei großen Datenmengen prüfen
• Color-Contrast-Verhältnisse validieren

### ⏱️ Geschätzte Zeit: 15 Minuten

---

## 🤔 Entscheidung

**Möchtest du diesen Vorschlag umsetzen?**

Antworte mit:
- **"Ja"** → Ich implementiere alle Änderungen sofort
- **"Nein"** → Ich verwerfe den Vorschlag
- **"Ändern"** + deine Anmerkungen → Ich passe den Vorschlag an
```
