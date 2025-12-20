# Agents - TrademarkIQ Agent System

Zeige den Status des Agent-Systems und verfügbare Agenten.

---

Führe folgendes aus:

1. Lade das Agent-System aus `/agents/__init__.py`
2. Zeige alle registrierten Agenten mit ihren Rollen und Fähigkeiten
3. Zeige die Task-Queue Statistiken aus `/services/task_queue.py`
4. Liste alle Tasks die auf Genehmigung warten

Format die Ausgabe übersichtlich:

```
🤖 AGENT SYSTEM STATUS
======================

Registrierte Agenten:
- [agent_id]: Name - Rolle (Fähigkeiten)

📋 Task Queue:
- Wartend: X
- In Bearbeitung: Y
- Auf Genehmigung wartend: Z

⚠️ Wartende Genehmigungen:
[Liste der Tasks die Genehmigung brauchen]
```
