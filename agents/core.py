"""
Core Agents: Planner, Executor, Reviewer
"""

from typing import Optional
from .base import Agent, TaskResult
from .config import AGENT_CONFIGS


class PlannerAgent(Agent):
    """Plans and structures tasks."""

    def __init__(self):
        super().__init__(AGENT_CONFIGS["planner"])

    def create_plan(self, task_description: str, context: Optional[str] = None) -> dict:
        """
        Create a detailed plan for a task.

        Returns:
            dict with steps, dependencies, complexity estimate
        """
        prompt = f"""Erstelle einen detaillierten Plan für folgende Aufgabe:

AUFGABE: {task_description}

Antworte im Format:
SCHRITTE:
1. [Schritt] | Agent: [agent_id] | Abhängig von: [keine/schritt_nr]
2. [Schritt] | Agent: [agent_id] | Abhängig von: [keine/schritt_nr]
...

GESCHÄTZTE KOMPLEXITÄT: [einfach/mittel/komplex]
RISIKEN: [potenzielle Probleme]
"""

        response = self.think(prompt, context)

        return {
            "raw_plan": response,
            "task": task_description
        }


class ExecutorAgent(Agent):
    """Executes approved code changes."""

    def __init__(self):
        super().__init__(AGENT_CONFIGS["executor"])

    def generate_code(self, requirement: str, context: Optional[str] = None) -> dict:
        """
        Generate code for a requirement.

        Returns:
            dict with code, file_path, explanation
        """
        prompt = f"""Generiere Code für folgende Anforderung:

ANFORDERUNG: {requirement}

Antworte im Format:
DATEI: [relativer Pfad zur Datei]
AKTION: [erstellen/ändern/löschen]
ERKLÄRUNG: [kurze Erklärung was der Code macht]

```[sprache]
[code hier]
```
"""

        response = self.think(prompt, context)

        return {
            "raw_response": response,
            "requirement": requirement,
            "needs_approval": True
        }

    def apply_change(self, file_path: str, code: str, action: str = "ändern") -> TaskResult:
        """
        Apply a code change (placeholder - actual file ops done by Claude Code).

        This method documents what WOULD be changed.
        Actual changes require human approval and Claude Code execution.
        """
        return TaskResult(
            success=True,
            output=f"Änderung vorbereitet für {file_path} ({action}). Warte auf Genehmigung.",
            agent_name=self.name,
            task_description=f"{action}: {file_path}",
            requires_approval=True,
            proposed_changes=[{
                "file": file_path,
                "action": action,
                "code": code
            }]
        )


class ReviewerAgent(Agent):
    """Reviews code quality."""

    def __init__(self):
        super().__init__(AGENT_CONFIGS["reviewer"])

    def review_code(self, code: str, context: Optional[str] = None) -> dict:
        """
        Review code for quality, bugs, and best practices.

        Returns:
            dict with rating, issues, suggestions
        """
        prompt = f"""Reviewe folgenden Code:

```
{code}
```

Antworte im Format:
BEWERTUNG: [1-10]

PROBLEME:
- [Problem 1]: [Schweregrad: kritisch/hoch/mittel/niedrig]
- [Problem 2]: [Schweregrad]
...

POSITIV:
- [Was gut ist]

VERBESSERUNGSVORSCHLÄGE:
- [Vorschlag 1]
- [Vorschlag 2]
"""

        response = self.think(prompt, context)

        return {
            "raw_review": response,
            "code_reviewed": code[:200] + "..."
        }

    def review_plan(self, plan: dict) -> dict:
        """
        Review an execution plan.

        Returns:
            dict with approval, concerns, suggestions
        """
        prompt = f"""Reviewe folgenden Ausführungsplan:

{plan.get('raw_plan', str(plan))}

Ist dieser Plan:
1. Vollständig? (alle Schritte enthalten)
2. Sicher? (keine risikoreichen Operationen ohne Prüfung)
3. Effizient? (keine unnötigen Schritte)

Antworte mit:
EMPFEHLUNG: [genehmigen/überarbeiten/ablehnen]
BEGRÜNDUNG: [warum]
VERBESSERUNGEN: [falls überarbeiten]
"""

        response = self.think(prompt)

        return {
            "raw_review": response,
            "plan_reviewed": True
        }


# Export
__all__ = ["PlannerAgent", "ExecutorAgent", "ReviewerAgent"]
