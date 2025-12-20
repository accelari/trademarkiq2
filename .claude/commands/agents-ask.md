# Agents Ask - Frage einen spezifischen Agenten

Stelle eine Frage direkt an einen spezifischen Agenten.

Argument: $ARGUMENTS (Format: "agent_id: frage")

Beispiele:
- /agents-ask architect: Wie sollte die Komponenten-Struktur aussehen?
- /agents-ask security: Gibt es Sicherheitsprobleme in der Auth-Logik?
- /agents-ask trademark: Wie funktioniert die Nizza-Klassifikation?

---

Verfügbare Agenten:
- `architect` - Software-Architekt (System-Design, Patterns)
- `frontend` - Frontend-Entwickler (React, Next.js, UI)
- `backend` - Backend-Entwickler (API, Server, DB)
- `security` - Sicherheitsexperte (OWASP, Vulnerabilities)
- `trademark` - Markenrecht-Experte (Nizza, Kollisionen)
- `planner` - Aufgabenplaner (Strukturierung)
- `reviewer` - Qualitätsprüfer (Code Review)

---

Führe folgendes aus:

1. Parse "$ARGUMENTS" um agent_id und Frage zu extrahieren
2. Initialisiere den entsprechenden Agenten
3. Stelle die Frage mit dem aktuellen Datei-Kontext (falls relevant)
4. Zeige die Antwort des Agenten

Falls die Frage Code-Kontext braucht, lies die relevanten Dateien zuerst.
