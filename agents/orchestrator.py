"""
Orchestrator Agent - Coordinates all other agents

Der Orchestrator ist der Koordinator aller Agenten.
WICHTIG: Er fragt IMMER zuerst den Benutzer, bevor er handelt.
Alle Gespräche werden im Projektgedächtnis protokolliert.
"""

from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .base import Agent, TaskResult, Message
from .config import AGENT_CONFIGS, SPECIALIST_CONFIGS, AgentConfig
from .memory import get_memory, ProjectMemory


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_APPROVAL = "waiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    """A task in the system."""
    id: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: Optional[str] = None
    result: Optional[TaskResult] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    parent_task_id: Optional[str] = None
    subtasks: list[str] = field(default_factory=list)
    proposed_changes: list[dict] = field(default_factory=list)
    priority: int = 0  # Higher = more important


class Orchestrator(Agent):
    """
    The Orchestrator coordinates all agents and manages the workflow.

    WICHTIG: Der Orchestrator fragt IMMER zuerst den Benutzer!
    Er ist neugierig und will das Projekt verstehen.
    """

    def __init__(self):
        super().__init__(AGENT_CONFIGS["orchestrator"])
        self.agents: dict[str, Agent] = {}
        self.tasks: dict[str, Task] = {}
        self.task_counter = 0
        self.memory: ProjectMemory = get_memory()

    def ask_user_question(
        self,
        question: str,
        context: str = None,
        priority: str = "normal",
        category: str = "general"
    ) -> str:
        """
        Stellt eine Frage an den Benutzer und protokolliert sie.

        Returns:
            Die Frage-ID
        """
        return self.memory.ask_user(
            agent_id="orchestrator",
            agent_name="Orchestrator",
            question=question,
            context=context,
            priority=priority,
            category=category
        )

    def collect_agent_questions(self, request: str) -> list[dict]:
        """
        Sammelt Fragen von allen relevanten Agenten zu einer Anfrage.

        Returns:
            Liste von Fragen mit agent_id und question
        """
        questions = []

        # Frage jeden registrierten Agenten nach seinen Fragen
        question_prompt = f"""Du erhältst eine neue Aufgabe. Bevor wir starten:

AUFGABE: {request}

PROJEKTGEDÄCHTNIS:
{self.memory.get_context_for_agent(self.name)}

Sei NEUGIERIG! Stelle 1-3 wichtige Fragen an den Projektleiter (Benutzer),
die du klären musst, bevor du diese Aufgabe bearbeiten kannst.

Format:
FRAGE 1: [Deine wichtigste Frage]
KATEGORIE: [architecture/business/technical/design/security]
PRIORITÄT: [critical/high/normal/low]

FRAGE 2: ...
"""

        for agent_id, agent in self.agents.items():
            # Nur spezialisierte Agenten fragen
            if agent_id in ["planner", "executor"]:
                continue

            try:
                response = agent.think(question_prompt)
                agent_questions = self._parse_agent_questions(response, agent_id, agent.name)
                questions.extend(agent_questions)
            except Exception as e:
                print(f"⚠️ Konnte {agent.name} nicht befragen: {e}")

        return questions

    def _parse_agent_questions(self, response: str, agent_id: str, agent_name: str) -> list[dict]:
        """Parsed die Fragen aus einer Agent-Antwort."""
        questions = []
        lines = response.split("\n")

        current_question = None
        current_category = "general"
        current_priority = "normal"

        for line in lines:
            line = line.strip()
            if line.startswith("FRAGE"):
                if current_question:
                    questions.append({
                        "agent_id": agent_id,
                        "agent_name": agent_name,
                        "question": current_question,
                        "category": current_category,
                        "priority": current_priority
                    })
                # Neue Frage beginnt
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_question = parts[1].strip()
                current_category = "general"
                current_priority = "normal"
            elif line.startswith("KATEGORIE:"):
                current_category = line.replace("KATEGORIE:", "").strip().lower()
            elif line.startswith("PRIORITÄT:"):
                current_priority = line.replace("PRIORITÄT:", "").strip().lower()

        # Letzte Frage hinzufügen
        if current_question:
            questions.append({
                "agent_id": agent_id,
                "agent_name": agent_name,
                "question": current_question,
                "category": current_category,
                "priority": current_priority
            })

        return questions

    def start_discovery(self, request: str) -> dict:
        """
        NEUER EINSTIEGSPUNKT: Startet die Erkundungsphase.

        Statt direkt zu handeln, sammelt der Orchestrator erst Fragen
        und präsentiert sie dem Benutzer.

        Returns:
            Dict mit Fragen und Status
        """
        print(f"\n{'='*60}")
        print(f"🎯 NEUE ANFRAGE: {request[:80]}...")
        print(f"{'='*60}")

        # Protokolliere die Anfrage
        self.memory.record_conversation(
            source="user",
            target="orchestrator",
            content=request
        )

        print("\n🤔 Sammle Fragen von allen Agenten...")

        # Eigene Fragen des Orchestrators
        my_questions = [
            {
                "agent_id": "orchestrator",
                "agent_name": "Orchestrator",
                "question": "Was ist das Hauptziel dieser Aufgabe? Was soll am Ende erreicht sein?",
                "category": "business",
                "priority": "high"
            }
        ]

        # Fragen von Spezialisten sammeln
        agent_questions = self.collect_agent_questions(request)
        all_questions = my_questions + agent_questions

        # Alle Fragen ins Gedächtnis speichern
        question_ids = []
        for q in all_questions:
            q_id = self.memory.ask_user(
                agent_id=q["agent_id"],
                agent_name=q["agent_name"],
                question=q["question"],
                context=request,
                priority=q["priority"],
                category=q["category"]
            )
            question_ids.append(q_id)

        print(f"\n📋 {len(all_questions)} Fragen gesammelt!")

        return {
            "status": "discovery",
            "request": request,
            "question_count": len(all_questions),
            "questions": all_questions,
            "question_ids": question_ids,
            "message": self.memory.format_pending_questions()
        }

    def register_agent(self, agent_id: str, agent: Agent):
        """Register an agent with the orchestrator."""
        self.agents[agent_id] = agent
        print(f"✓ Agent registriert: {agent.name} ({agent_id})")

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get a registered agent by ID."""
        return self.agents.get(agent_id)

    def list_agents(self) -> list[dict]:
        """List all registered agents."""
        return [
            {
                "id": agent_id,
                "name": agent.name,
                "role": agent.role,
                "capabilities": agent.get_capabilities()
            }
            for agent_id, agent in self.agents.items()
        ]

    def create_task(self, description: str, priority: int = 0) -> Task:
        """Create a new task."""
        self.task_counter += 1
        task_id = f"TASK-{self.task_counter:04d}"

        task = Task(
            id=task_id,
            description=description,
            priority=priority
        )
        self.tasks[task_id] = task

        print(f"📋 Task erstellt: {task_id} - {description[:50]}...")
        return task

    def analyze_request(self, user_request: str) -> dict:
        """
        Analyze a user request and determine how to handle it.

        Returns a plan with:
        - summary: What the user wants
        - complexity: simple/medium/complex
        - agents_needed: Which agents to involve
        - steps: Proposed execution steps
        """
        analysis_prompt = f"""Analysiere diese Anfrage und erstelle einen Ausführungsplan:

ANFRAGE: {user_request}

Antworte im folgenden Format:

ZUSAMMENFASSUNG: [Was will der User in einem Satz]

KOMPLEXITÄT: [einfach/mittel/komplex]

BENÖTIGTE AGENTEN: [Liste der Agent-IDs, kommasepariert]
Verfügbare Agenten: {', '.join(self.agents.keys())}

SCHRITTE:
1. [Erster Schritt] -> Agent: [agent_id]
2. [Zweiter Schritt] -> Agent: [agent_id]
...

GENEHMIGUNG_ERFORDERLICH: [ja/nein]
(ja wenn Code geändert, erstellt oder gelöscht werden soll)
"""

        response = self.think(analysis_prompt)
        return self._parse_analysis(response)

    def _parse_analysis(self, response: str) -> dict:
        """Parse the analysis response into a structured format."""
        result = {
            "summary": "",
            "complexity": "mittel",
            "agents_needed": [],
            "steps": [],
            "requires_approval": False,
            "raw_response": response
        }

        lines = response.split("\n")
        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("ZUSAMMENFASSUNG:"):
                result["summary"] = line.replace("ZUSAMMENFASSUNG:", "").strip()
            elif line.startswith("KOMPLEXITÄT:"):
                result["complexity"] = line.replace("KOMPLEXITÄT:", "").strip().lower()
            elif line.startswith("BENÖTIGTE AGENTEN:"):
                agents_str = line.replace("BENÖTIGTE AGENTEN:", "").strip()
                result["agents_needed"] = [a.strip() for a in agents_str.split(",") if a.strip()]
            elif line.startswith("SCHRITTE:"):
                current_section = "steps"
            elif line.startswith("GENEHMIGUNG_ERFORDERLICH:"):
                result["requires_approval"] = "ja" in line.lower()
            elif current_section == "steps" and line and line[0].isdigit():
                result["steps"].append(line)

        return result

    def delegate_to_agent(self, agent_id: str, task: str, context: Optional[str] = None) -> TaskResult:
        """
        Delegate a task to a specific agent.
        """
        agent = self.get_agent(agent_id)
        if not agent:
            return TaskResult(
                success=False,
                output=f"Agent '{agent_id}' nicht gefunden.",
                agent_name="orchestrator",
                task_description=task
            )

        print(f"🔄 Delegiere an {agent.name}: {task[:50]}...")
        result = agent.execute_task(task, context)
        print(f"✓ {agent.name} fertig: {'Erfolg' if result.success else 'Fehler'}")

        return result

    def execute_plan(self, plan: dict, context: Optional[str] = None) -> list[TaskResult]:
        """
        Execute a plan by delegating to appropriate agents.

        Returns list of results from each step.
        """
        results = []

        for step in plan.get("steps", []):
            # Parse step to find agent
            agent_id = None
            if "-> Agent:" in step:
                parts = step.split("-> Agent:")
                agent_id = parts[1].strip().split()[0] if len(parts) > 1 else None

            if agent_id and agent_id in self.agents:
                result = self.delegate_to_agent(agent_id, step, context)
                results.append(result)
            else:
                # Use planner as fallback
                if "planner" in self.agents:
                    result = self.delegate_to_agent("planner", step, context)
                    results.append(result)

        return results

    def process_request(self, user_request: str, context: Optional[str] = None) -> dict:
        """
        Main entry point: Process a user request end-to-end.

        1. Analyze the request
        2. Create tasks
        3. Execute plan (or wait for approval if needed)
        4. Return results

        Returns dict with:
        - success: bool
        - plan: The execution plan
        - results: List of agent results
        - requires_approval: bool
        - proposed_changes: List of proposed changes (if approval needed)
        """
        print(f"\n{'='*60}")
        print(f"🎯 Neue Anfrage: {user_request[:100]}...")
        print(f"{'='*60}\n")

        # Step 1: Analyze
        print("📊 Analysiere Anfrage...")
        plan = self.analyze_request(user_request)
        print(f"   Komplexität: {plan['complexity']}")
        print(f"   Agenten: {', '.join(plan['agents_needed'])}")

        # Step 2: Check if approval needed
        if plan["requires_approval"]:
            print("\n⚠️  GENEHMIGUNG ERFORDERLICH")
            print("   Diese Anfrage erfordert Code-Änderungen.")

            # Create task in waiting state
            task = self.create_task(user_request)
            task.status = TaskStatus.WAITING_APPROVAL

            return {
                "success": True,
                "plan": plan,
                "results": [],
                "requires_approval": True,
                "task_id": task.id,
                "message": "Diese Aktion erfordert deine Genehmigung. Antworte mit 'genehmigt' oder 'abgelehnt'."
            }

        # Step 3: Execute
        print("\n🚀 Führe Plan aus...")
        results = self.execute_plan(plan, context)

        # Step 4: Summarize
        print("\n📝 Erstelle Zusammenfassung...")
        summary = self._summarize_results(results)

        return {
            "success": all(r.success for r in results),
            "plan": plan,
            "results": results,
            "requires_approval": False,
            "summary": summary
        }

    def _summarize_results(self, results: list[TaskResult]) -> str:
        """Create a summary of all results."""
        if not results:
            return "Keine Ergebnisse."

        summary_parts = []
        for i, result in enumerate(results, 1):
            status = "✅" if result.success else "❌"
            summary_parts.append(f"{status} {result.agent_name}: {result.output[:200]}...")

        return "\n".join(summary_parts)

    def approve_task(self, task_id: str) -> dict:
        """Approve a pending task and execute it."""
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "message": f"Task {task_id} nicht gefunden."}

        if task.status != TaskStatus.WAITING_APPROVAL:
            return {"success": False, "message": f"Task {task_id} wartet nicht auf Genehmigung."}

        task.status = TaskStatus.APPROVED
        print(f"✅ Task {task_id} genehmigt. Führe aus...")

        # Execute the original request
        plan = self.analyze_request(task.description)
        plan["requires_approval"] = False  # Already approved
        results = self.execute_plan(plan)

        task.status = TaskStatus.COMPLETED if all(r.success for r in results) else TaskStatus.FAILED
        task.result = results[0] if results else None

        return {
            "success": task.status == TaskStatus.COMPLETED,
            "task_id": task_id,
            "results": results
        }

    def reject_task(self, task_id: str, reason: str = "") -> dict:
        """Reject a pending task."""
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "message": f"Task {task_id} nicht gefunden."}

        task.status = TaskStatus.REJECTED
        print(f"❌ Task {task_id} abgelehnt. Grund: {reason}")

        return {
            "success": True,
            "task_id": task_id,
            "message": f"Task abgelehnt. {reason}"
        }

    def get_pending_tasks(self) -> list[Task]:
        """Get all tasks waiting for approval."""
        return [
            task for task in self.tasks.values()
            if task.status == TaskStatus.WAITING_APPROVAL
        ]

    def get_status(self) -> dict:
        """Get current system status."""
        return {
            "agents_registered": len(self.agents),
            "agents": self.list_agents(),
            "total_tasks": len(self.tasks),
            "pending_approval": len(self.get_pending_tasks()),
            "tasks_by_status": {
                status.value: len([t for t in self.tasks.values() if t.status == status])
                for status in TaskStatus
            }
        }
