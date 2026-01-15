# Agents Answer - Beantworte Fragen der Agenten

Beantworte offene Fragen der KI-Agenten.

Argument: $ARGUMENTS (Format: "Q-ID: Antwort" oder "alle" für Übersicht)

Beispiele:
- /agents-answer (zeigt alle offenen Fragen)
- /agents-answer Q-20241220123456: Ja, wir nutzen PostgreSQL
- /agents-answer alle (zeigt alle offenen Fragen)

---

Führe folgendes aus:

1. Lade das Projektgedächtnis aus `/agents/memory.py`
   ```python
   from agents.memory import get_memory
   memory = get_memory()
   ```

2. **SICHERHEITS-VALIDIERUNG** für $ARGUMENTS:
   - Frage-IDs müssen das Format Q-XXXXX haben
   - Antworten max. 5000 Zeichen

3. Falls keine $ARGUMENTS oder "alle":
   - Zeige alle offenen Fragen mit `memory.format_pending_questions()`
   - Format:
   ```
   📋 OFFENE FRAGEN AN DICH:
   ========================================

   🟠 [Q-123] Architekt:
      Welche Datenbank verwenden wir?
      Kontext: Recherche-System...

   🟡 [Q-124] Security:
      Wie werden Passwörter gespeichert?

   ========================================
   Antworte mit: /agents-answer Q-ID: Deine Antwort
   ```

4. Falls $ARGUMENTS eine Antwort enthält (Q-ID: Antwort):
   - Parse die Frage-ID und Antwort
   - Speichere mit `memory.answer_question(question_id, answer)`
   - Bestätige: "✅ Antwort gespeichert für [Agent-Name]"
   - Zeige verbleibende offene Fragen

5. Nach jeder Antwort:
   - Prüfe ob alle Fragen beantwortet sind
   - Falls ja: "🎉 Alle Fragen beantwortet! Bereit zum Starten."
