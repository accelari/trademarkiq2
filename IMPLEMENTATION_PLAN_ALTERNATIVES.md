# Implementierungsplan: KI-Namensvorschläge & Shortlist Verbesserungen

## Übersicht

Dieser Plan behebt die identifizierten Probleme und implementiert fehlende Funktionen für die Markenalternativen-Features.

---

## Phase 1: Bug-Fixes (Kritisch)

### 1.1 Vollanalyse-Button korrigieren
**Datei:** `app/components/recherche/alternatives/NameSuggestionCard.tsx`

**Problem:** "Vollanalyse"-Button ruft `onQuickCheck()` auf statt einer echten Vollanalyse.

**Lösung:**
```typescript
// Neue Props hinzufügen
interface NameSuggestionCardProps {
  // ... bestehende props
  onFullAnalysis?: () => void;  // NEU
}

// Button ändern (Zeile 118-125)
{hasResult && (
  <button
    onClick={onFullAnalysis || onQuickCheck}  // Vollanalyse wenn vorhanden
    className="..."
  >
    <BarChart3 className="w-4 h-4" />  // Anderes Icon
    Vollanalyse
  </button>
)}
```

### 1.2 Shortlist-Daten korrekt befüllen
**Datei:** `app/hooks/useAlternativeSearch.ts`

**Problem:** `conflictCount`, `criticalCount` werden nicht aus Quick-Check übernommen.

**Lösung:**
```typescript
// addToShortlist erweitern (Zeile 152-170)
const addToShortlist = useCallback(
  (name: string, data: {
    riskScore: number;
    riskLevel: string;
    conflicts?: number;      // NEU
    criticalCount?: number;  // NEU
  }) => {
    const item: ShortlistItem = {
      name,
      riskScore: data.riskScore,
      riskLevel: data.riskLevel as "low" | "medium" | "high" | "unknown",
      conflictCount: data.conflicts || 0,      // Aus API
      criticalCount: data.criticalCount || 0,  // Aus API
      domainDe: "unknown",
      domainCom: "unknown",
      pronunciation: 4,
      aiTip: "Prüfung abgeschlossen",
      hasFullAnalysis: false,
    };
    store.addToShortlist(item);
  },
  [store]
);
```

**Datei:** `app/components/recherche/alternatives/AlternativeGeneratorModal.tsx`

```typescript
// handleToggleShortlist erweitern (Zeile 128-140)
const handleToggleShortlist = (name: string) => {
  if (shortlist.includes(name)) {
    onRemoveFromShortlist(name);
  } else {
    const suggestion = suggestions.find((s) => s.name === name);
    if (suggestion) {
      onAddToShortlist(name, {
        riskScore: suggestion.quickCheckScore || 0,
        riskLevel: suggestion.quickCheckStatus || "idle",
        conflicts: suggestion.quickCheckConflicts || 0,  // NEU
        criticalCount: suggestion.quickCheckConflicts && suggestion.quickCheckScore >= 70
          ? Math.ceil(suggestion.quickCheckConflicts * 0.3) : 0,  // Schätzung
      });
    }
  }
};
```

---

## Phase 2: Domain-Verfügbarkeitsprüfung

### 2.1 Domain-Check API erstellen
**Neue Datei:** `app/api/recherche/check-domain/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { domain } = await request.json();

  if (!domain?.trim()) {
    return NextResponse.json({ error: "Domain erforderlich" }, { status: 400 });
  }

  try {
    // Option 1: DNS-Lookup (kostenlos, aber ungenau)
    const checkDomain = async (tld: string): Promise<"available" | "taken" | "unknown"> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        // Einfacher HTTP-Check
        const response = await fetch(`https://${domain}.${tld}`, {
          method: "HEAD",
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeout);
        return response ? "taken" : "available";
      } catch {
        return "unknown";
      }
    };

    const [deDomain, comDomain] = await Promise.all([
      checkDomain("de"),
      checkDomain("com"),
    ]);

    return NextResponse.json({
      success: true,
      domain,
      de: deDomain,
      com: comDomain,
    });
  } catch (error) {
    console.error("Domain check error:", error);
    return NextResponse.json({ error: "Domain-Prüfung fehlgeschlagen" }, { status: 500 });
  }
}
```

### 2.2 Domain-Check in Shortlist integrieren
**Datei:** `app/hooks/useAlternativeSearch.ts`

```typescript
// Neue Funktion hinzufügen
const checkDomain = useCallback(
  async (name: string): Promise<{ de: string; com: string }> => {
    try {
      const response = await fetch("/api/recherche/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: name.toLowerCase().replace(/[^a-z0-9]/g, "") }),
      });

      if (!response.ok) throw new Error("Domain-Check fehlgeschlagen");

      const data = await response.json();

      // Shortlist-Item aktualisieren
      store.updateShortlistItem(name, {
        domainDe: data.de,
        domainCom: data.com,
      });

      return { de: data.de, com: data.com };
    } catch (error) {
      console.error("Domain check error:", error);
      return { de: "unknown", com: "unknown" };
    }
  },
  [store]
);
```

### 2.3 Auto-Check bei Shortlist-Hinzufügung
**Datei:** `app/stores/alternativeSearchStore.ts`

```typescript
// addToShortlist erweitern
addToShortlist: (item) =>
  set((state) => {
    if (state.shortlist.some((s) => s.name === item.name)) return state;
    if (state.shortlist.length >= 10) return state;

    const newShortlist = [...state.shortlist, item];

    // Domain-Check async triggern (wird später aktualisiert)
    // Hinweis: Besser im Hook/Komponente machen

    return { shortlist: newShortlist, /* ... */ };
  }),
```

---

## Phase 3: Aussprache-Bewertung mit KI

### 3.1 Aussprache-API erstellen
**Neue Datei:** `app/api/recherche/rate-pronunciation/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropicClient } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { name, language = "de" } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-haiku-3-5-20241022", // Schnelleres Modell für einfache Aufgabe
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Bewerte die Aussprache des Markennamens "${name}" für ${language === "de" ? "deutsche" : "englische"} Muttersprachler.

Kriterien:
- Wie leicht ist der Name auszusprechen?
- Gibt es Verwechslungspotenzial?
- Ist der Name einprägsam?
- Funktioniert er international?

Antworte NUR mit JSON:
{
  "rating": 1-5,
  "reason": "Kurze Begründung in 1 Satz"
}`
      }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unerwartete Antwort");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Keine JSON-Antwort");

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      name,
      rating: Math.min(5, Math.max(1, parsed.rating)),
      reason: parsed.reason || "",
    });
  } catch (error) {
    console.error("Pronunciation rating error:", error);
    // Fallback: Heuristik-basierte Bewertung
    const rating = calculatePronunciationHeuristic(name);
    return NextResponse.json({
      success: true,
      name,
      rating,
      reason: "Automatische Bewertung",
      fallback: true,
    });
  }
}

function calculatePronunciationHeuristic(name: string): number {
  let score = 5;

  // Zu lang
  if (name.length > 12) score -= 1;
  if (name.length > 16) score -= 1;

  // Schwierige Buchstabenkombinationen
  if (/[xqz]/i.test(name)) score -= 0.5;
  if (/[^a-zA-Z0-9]/.test(name)) score -= 0.5; // Sonderzeichen
  if (/([bcdfghjklmnpqrstvwxyz]{4,})/i.test(name)) score -= 1; // Konsonantenhäufung

  // Bonus für einfache Struktur
  if (/^[A-Z][a-z]+$/.test(name)) score += 0.5;

  return Math.min(5, Math.max(1, Math.round(score)));
}
```

### 3.2 Integration in Hook
**Datei:** `app/hooks/useAlternativeSearch.ts`

```typescript
const ratePronunciation = useCallback(
  async (name: string): Promise<number> => {
    try {
      const response = await fetch("/api/recherche/rate-pronunciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language: store.generatorSettings.language }),
      });

      if (!response.ok) throw new Error("Bewertung fehlgeschlagen");

      const data = await response.json();

      store.updateShortlistItem(name, {
        pronunciation: data.rating as 1 | 2 | 3 | 4 | 5,
        aiTip: data.reason || "Bewertung abgeschlossen",
      });

      return data.rating;
    } catch (error) {
      console.error("Pronunciation rating error:", error);
      return 4; // Fallback
    }
  },
  [store]
);
```

---

## Phase 4: Vollanalyse implementieren

### 4.1 Vollanalyse-API erstellen
**Neue Datei:** `app/api/recherche/full-analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TMSearchClient } from "@/lib/tmsearch/client";
import { calculateSimilarity } from "@/lib/similarity";
import { anthropicClient } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { name, classes = [], countries = [] } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }

  try {
    const client = new TMSearchClient();

    // 1. Erweiterte Markensuche
    const searchResult = await client.search({ keyword: name });

    // 2. Similarity-Berechnung für alle Ergebnisse
    const resultsWithSimilarity = searchResult.results.map(r => ({
      ...r,
      similarity: calculateSimilarity(name, r.name || ""),
    }));

    // 3. Sortieren und kategorisieren
    const conflicts = resultsWithSimilarity
      .filter(r => r.similarity.combined >= 50)
      .sort((a, b) => b.similarity.combined - a.similarity.combined)
      .slice(0, 20);

    const criticalConflicts = conflicts.filter(r => r.similarity.combined >= 80);
    const mediumConflicts = conflicts.filter(r => r.similarity.combined >= 60 && r.similarity.combined < 80);

    // 4. KI-Analyse
    const aiAnalysis = await anthropicClient.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Analysiere den Markennamen "${name}" für Klassen ${classes.join(", ") || "alle"}.

Gefundene Konflikte:
${conflicts.slice(0, 10).map(c => `- ${c.name} (${c.office}, ${c.similarity.combined}% ähnlich)`).join("\n")}

Gib eine kurze rechtliche Einschätzung und Empfehlung.
Antworte NUR mit JSON:
{
  "riskLevel": "low|medium|high",
  "summary": "2-3 Sätze Zusammenfassung",
  "recommendation": "Konkrete Empfehlung",
  "topRisks": ["Risiko 1", "Risiko 2"]
}`
      }],
    });

    const aiContent = aiAnalysis.content[0];
    let aiData = { riskLevel: "medium", summary: "", recommendation: "", topRisks: [] };

    if (aiContent.type === "text") {
      const jsonMatch = aiContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      }
    }

    // 5. Risiko-Score berechnen
    let riskScore = 0;
    if (criticalConflicts.length > 0) {
      riskScore = Math.min(100, 70 + criticalConflicts.length * 10);
    } else if (mediumConflicts.length > 0) {
      riskScore = Math.min(69, 40 + mediumConflicts.length * 8);
    } else if (conflicts.length > 0) {
      riskScore = Math.min(39, 20 + conflicts.length * 5);
    }

    return NextResponse.json({
      success: true,
      name,
      riskScore,
      riskLevel: aiData.riskLevel,
      summary: aiData.summary,
      recommendation: aiData.recommendation,
      topRisks: aiData.topRisks,
      conflicts: conflicts.length,
      criticalCount: criticalConflicts.length,
      mediumCount: mediumConflicts.length,
      topConflicts: conflicts.slice(0, 5).map(c => ({
        name: c.name,
        office: c.office,
        similarity: c.similarity.combined,
        classes: c.niceClasses || [],
      })),
    });
  } catch (error) {
    console.error("Full analysis error:", error);
    return NextResponse.json({ error: "Analyse fehlgeschlagen" }, { status: 500 });
  }
}
```

### 4.2 Hook-Integration
**Datei:** `app/hooks/useAlternativeSearch.ts`

```typescript
// Ersetze den Placeholder (Zeile 225-227)
const startFullAnalysis = useCallback(
  async (name: string) => {
    try {
      const response = await fetch("/api/recherche/full-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          classes: store.selectedClasses,
          countries: [],
        }),
      });

      if (!response.ok) throw new Error("Analyse fehlgeschlagen");

      const data = await response.json();

      // Shortlist-Item aktualisieren
      store.updateShortlistItem(name, {
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        conflictCount: data.conflicts,
        criticalCount: data.criticalCount,
        aiTip: data.recommendation || data.summary,
        hasFullAnalysis: true,
      });

      return data;
    } catch (error) {
      console.error("Full analysis error:", error);
      throw error;
    }
  },
  [store]
);
```

---

## Phase 5: PDF-Export implementieren

### 5.1 PDF-Generierung API
**Neue Datei:** `app/api/recherche/export-comparison-pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
// PDF-Library: pdfkit oder @react-pdf/renderer

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { items, originalBrand } = await request.json();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Keine Items zum Exportieren" }, { status: 400 });
  }

  try {
    // Einfache HTML-zu-PDF Lösung
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .risk-high { color: #dc2626; }
          .risk-medium { color: #f59e0b; }
          .risk-low { color: #16a34a; }
        </style>
      </head>
      <body>
        <h1>Markenvergleich: ${originalBrand}</h1>
        <p>Erstellt am: ${new Date().toLocaleDateString("de-DE")}</p>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Risiko</th>
              <th>Konflikte</th>
              <th>Kritisch</th>
              <th>Domain .de</th>
              <th>Domain .com</th>
              <th>KI-Tipp</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td class="risk-${item.riskLevel}">${item.riskScore} (${item.riskLevel})</td>
                <td>${item.conflictCount}</td>
                <td>${item.criticalCount}</td>
                <td>${item.domainDe === "available" ? "✓" : item.domainDe === "taken" ? "✗" : "?"}</td>
                <td>${item.domainCom === "available" ? "✓" : item.domainCom === "taken" ? "✗" : "?"}</td>
                <td>${item.aiTip}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <p style="margin-top: 40px; font-size: 12px; color: #666;">
          Dieser Bericht wurde automatisch von TrademarkIQ erstellt und dient nur zu Informationszwecken.
          Für verbindliche Rechtsberatung wenden Sie sich bitte an einen Markenanwalt.
        </p>
      </body>
      </html>
    `;

    // Für echte PDF-Generierung: puppeteer oder ähnliches verwenden
    // Hier: HTML als Fallback zurückgeben

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="markenvergleich-${originalBrand}-${Date.now()}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Export fehlgeschlagen" }, { status: 500 });
  }
}
```

### 5.2 Hook-Integration
**Datei:** `app/hooks/useAlternativeSearch.ts`

```typescript
// Ersetze den Placeholder (Zeile 220-222)
const downloadPDF = useCallback(async () => {
  try {
    const response = await fetch("/api/recherche/export-comparison-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: store.shortlist,
        originalBrand: store.originalBrand,
      }),
    });

    if (!response.ok) throw new Error("Export fehlgeschlagen");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `markenvergleich-${store.originalBrand}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF download error:", error);
    alert("PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
  }
}, [store]);
```

---

## Phase 6: "Name auswählen" Aktion

### 6.1 Navigation zur Recherche mit ausgewähltem Namen
**Datei:** `app/hooks/useAlternativeSearch.ts`

```typescript
// Ersetze den Placeholder (Zeile 209-217)
const selectName = useCallback(
  (name: string) => {
    // Speichere in localStorage für Recherche-Page
    localStorage.setItem("selectedAlternativeName", JSON.stringify({
      name,
      classes: store.selectedClasses,
      timestamp: Date.now(),
    }));

    // Schließe Modals
    store.closeShortlist();
    store.closeGenerator();

    // Navigiere zur Recherche-Seite mit dem neuen Namen
    window.location.href = `/dashboard/recherche?prefill=${encodeURIComponent(name)}`;
  },
  [store]
);
```

### 6.2 Recherche-Page Prefill Support
**Datei:** `app/dashboard/recherche/page.tsx`

```typescript
// In der Komponente, useEffect hinzufügen:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const prefillName = params.get("prefill");

  if (prefillName) {
    setMarkenname(prefillName);
    // Optional: Vorherige Klassen aus localStorage laden
    const stored = localStorage.getItem("selectedAlternativeName");
    if (stored) {
      const data = JSON.parse(stored);
      if (data.classes) setSelectedKlassen(data.classes);
    }
  }
}, []);
```

---

## Phase 7: Bulk Quick-Check

### 7.1 "Alle prüfen" Button hinzufügen
**Datei:** `app/components/recherche/alternatives/AIGeneratorTab.tsx`

```typescript
// Nach "Generierte Vorschläge" Header (Zeile 194-207)
<div className="flex items-center justify-between">
  <h4 className="font-semibold text-gray-900">Generierte Vorschläge</h4>
  <div className="flex items-center gap-3">
    {/* NEU: Alle prüfen Button */}
    {suggestions.some(s => s.quickCheckStatus === "idle") && (
      <button
        onClick={onCheckAll}
        disabled={isGenerating}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
      >
        <Search className="w-4 h-4" />
        Alle prüfen
      </button>
    )}
    <button
      onClick={onRegenerate}
      disabled={isGenerating}
      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      Andere Vorschläge
    </button>
  </div>
</div>
```

### 7.2 Bulk-Check Funktion
**Datei:** `app/components/recherche/alternatives/AlternativeGeneratorModal.tsx`

```typescript
const handleCheckAll = async () => {
  const unchecked = suggestions.filter(s => s.quickCheckStatus === "idle");

  // Sequentiell prüfen (um API nicht zu überlasten)
  for (const suggestion of unchecked) {
    await handleQuickCheckSuggestion(suggestion.name);
    // Kleine Pause zwischen Anfragen
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};
```

---

## Zusammenfassung der Änderungen

| Phase | Dateien | Aufwand |
|-------|---------|---------|
| 1. Bug-Fixes | 3 Dateien | ~2h |
| 2. Domain-Check | 2 neue + 2 Änderungen | ~3h |
| 3. Aussprache | 1 neue + 1 Änderung | ~2h |
| 4. Vollanalyse | 1 neue + 2 Änderungen | ~4h |
| 5. PDF-Export | 1 neue + 1 Änderung | ~3h |
| 6. Name auswählen | 2 Änderungen | ~1h |
| 7. Bulk Quick-Check | 2 Änderungen | ~1h |

**Gesamt: ~16 Stunden Entwicklungszeit**

---

## Reihenfolge der Implementierung

1. **Phase 1** - Bug-Fixes (Priorität: KRITISCH)
2. **Phase 4** - Vollanalyse (Priorität: HOCH)
3. **Phase 6** - Name auswählen (Priorität: HOCH)
4. **Phase 2** - Domain-Check (Priorität: MITTEL)
5. **Phase 7** - Bulk Quick-Check (Priorität: MITTEL)
6. **Phase 3** - Aussprache (Priorität: NIEDRIG)
7. **Phase 5** - PDF-Export (Priorität: NIEDRIG)

---

## Abhängigkeiten

```
Phase 1 (Bug-Fixes)
    ↓
Phase 4 (Vollanalyse) ──→ Phase 6 (Name auswählen)
    ↓
Phase 2 (Domain-Check)
    ↓
Phase 3 (Aussprache)
    ↓
Phase 5 (PDF-Export) ← benötigt alle vorherigen Phasen für vollständige Daten
```

---

## Testing-Checkliste

- [ ] KI-Namengenerierung funktioniert
- [ ] Quick-Check zeigt korrekte Daten
- [ ] Shortlist-Items haben vollständige Daten
- [ ] Vollanalyse-Button startet echte Analyse
- [ ] Domain-Status wird geprüft und angezeigt
- [ ] Aussprache-Rating wird berechnet
- [ ] PDF-Export lädt Datei herunter
- [ ] "Name auswählen" navigiert korrekt
- [ ] "Alle prüfen" funktioniert sequentiell
- [ ] AI-Empfehlung basiert auf echten Daten
