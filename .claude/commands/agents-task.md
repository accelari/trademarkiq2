# Agents Task - Neue Aufgabe an das Agent-System

Erstelle eine neue Aufgabe für das Agent-System.

Argument: $ARGUMENTS (die Aufgabenbeschreibung)

---

Führe folgendes aus:

1. **SICHERHEITS-VALIDIERUNG**:
   - Prüfe dass "$ARGUMENTS" keine Shell-Befehle enthält
   - Maximale Länge: 5000 Zeichen
   - Keine Ausführung von Code direkt aus $ARGUMENTS

2. Initialisiere das Agent-System aus `/agents/__init__.py`
3. Übergebe die validierte Aufgabe an den Orchestrator
4. Der Orchestrator wird:
   - Die Aufgabe analysieren
   - Einen Plan erstellen
   - Entscheiden welche Agenten benötigt werden
   - Bei Code-Änderungen um Genehmigung fragen

5. Zeige das Ergebnis:
   - Zusammenfassung
   - Geplante Schritte
   - Beteiligte Agenten
   - Ob Genehmigung erforderlich ist

Wenn Genehmigung erforderlich:
- Zeige die vorgeschlagenen Änderungen
- Frage: "Genehmigen? (ja/nein)"
