"""
Orchestrator Agent - Coordinates all other agents
"""

from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .base import Agent, TaskResult, Message
from .config import AGENT_CONFIGS, SPECIALIST_CONFIGS, AgentConfig


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
    """

    def __init__(self):
        super().__init__(AGENT_CONFIGS["orchestrator"])
        self.agents: dict[str, Agent] = {}
        self.tasks: dict[str, Task] = {}
        self.task_counter = 0

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
