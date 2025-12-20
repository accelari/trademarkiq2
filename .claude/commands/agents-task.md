# Agents Task - Neue Aufgabe an das Agent-System

Erstelle eine neue Aufgabe für das Agent-System.

Argument: $ARGUMENTS (die Aufgabenbeschreibung)

---

Führe folgendes aus:

1. Initialisiere das Agent-System aus `/agents/__init__.py`
2. Übergebe die Aufgabe "$ARGUMENTS" an den Orchestrator
3. Der Orchestrator wird:
   - Die Aufgabe analysieren
   - Einen Plan erstellen
   - Entscheiden welche Agenten benötigt werden
   - Bei Code-Änderungen um Genehmigung fragen

4. Zeige das Ergebnis:
   - Zusammenfassung
   - Geplante Schritte
   - Beteiligte Agenten
   - Ob Genehmigung erforderlich ist

Wenn Genehmigung erforderlich:
- Zeige die vorgeschlagenen Änderungen
- Frage: "Genehmigen? (ja/nein)"
