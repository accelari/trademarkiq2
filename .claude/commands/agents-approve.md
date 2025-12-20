# Agents Approve - Genehmige wartende Tasks

Zeige und genehmige Tasks die auf Genehmigung warten.

Argument: $ARGUMENTS (optional: Task-ID zum Genehmigen)

---

Führe folgendes aus:

1. Lade die Task-Queue aus `/services/task_queue.py`

2. **SICHERHEITS-VALIDIERUNG** für $ARGUMENTS:
   - Task-IDs müssen das Format Q-XXXXX haben (nur Zahlen)
   - Keine anderen Zeichen akzeptieren
   - Validiere dass Task existiert bevor Aktionen durchgeführt werden

3. Falls keine $ARGUMENTS:
   - Liste alle Tasks mit Status "waiting_approval"
   - Zeige für jeden Task:
     - ID
     - Titel
     - Beschreibung
     - Vorgeschlagene Änderungen
   - Frage: "Welchen Task genehmigen? (ID eingeben oder 'alle')"

4. Falls $ARGUMENTS eine validierte Task-ID ist:
   - Zeige die Details des Tasks
   - Zeige die vorgeschlagenen Änderungen
   - Frage: "Genehmigen? (ja/nein)"
   - Bei "ja": Führe die Änderungen aus
   - Bei "nein": Markiere als abgelehnt

5. Format:

```
⚠️ WARTENDE GENEHMIGUNGEN
=========================

[Q-00001] 🟡 Komponente erstellen
Beschreibung: Neue AccordionSection Komponente
Vorgeschlagene Änderungen:
- Erstellen: app/components/AccordionSection.tsx
- Ändern: app/components/index.ts

Genehmigen? (ja/nein)
```
