# Devin Anweisungen für TrademarkIQ

## Präfix-System

Beachte das Präfix am Anfang der Benutzer-Nachricht:

### `a` - Schnelle Antwort (Answer)
Wenn die Nachricht mit `a ` beginnt, antworte direkt und schnell ohne zusätzlichen Kontext zu lesen.

**Beispiel:** `a was ist der Port für die lokale Entwicklung?`

### `d` - Deep/Detailliert (lies ARCHITECTURE.md)
Wenn die Nachricht mit `d ` beginnt, lies zuerst `ARCHITECTURE.md` um den Projektkontext zu verstehen, bevor du antwortest oder Änderungen machst.

**Beispiel:** `d implementiere ein neues Feature für Credit-Tracking`

### Kein Präfix
Wenn kein Präfix vorhanden ist, entscheide selbst basierend auf der Komplexität der Aufgabe:
- Einfache Fragen → Direkt antworten
- Komplexe Änderungen → Zuerst ARCHITECTURE.md lesen

## Wichtige Dateien

- `ARCHITECTURE.md` - Projektübersicht und Architektur
- `scalingo.json` - Deployment-Konfiguration (postdeploy: npm run db:push)
- `.env` - Umgebungsvariablen (nicht committen!)

## Deployment

- **Automatisch:** Code-Änderungen werden automatisch deployed wenn auf GitHub gepusht wird
- **Datenbankstruktur:** Wird automatisch via `postdeploy: npm run db:push` angewendet
- **App-URL:** https://trademarkiq.osc-fr1.scalingo.io

## Entwicklung

- Lokale App starten: `npm run dev` (Port 5000)
- DATABASE_URL zeigt auf Scalingo-Datenbank (Produktion)
