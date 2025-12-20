# Agents Approve - Genehmige wartende Tasks

Zeige und genehmige Tasks die auf Genehmigung warten.

Argument: $ARGUMENTS (optional: Task-ID zum Genehmigen)

---

Führe folgendes aus:

1. Lade die Task-Queue aus `/services/task_queue.py`

2. Falls keine $ARGUMENTS:
   - Liste alle Tasks mit Status "waiting_approval"
   - Zeige für jeden Task:
     - ID
     - Titel
     - Beschreibung
     - Vorgeschlagene Änderungen
   - Frage: "Welchen Task genehmigen? (ID eingeben oder 'alle')"

3. Falls $ARGUMENTS eine Task-ID ist:
   - Zeige die Details des Tasks
   - Zeige die vorgeschlagenen Änderungen
   - Frage: "Genehmigen? (ja/nein)"
   - Bei "ja": Führe die Änderungen aus
   - Bei "nein": Markiere als abgelehnt

4. Format:

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
