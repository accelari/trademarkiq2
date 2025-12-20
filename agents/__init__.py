"""
TrademarkIQ Agent System

A multi-agent system for autonomous code development and review.

Usage:
    from agents import AgentSystem

    system = AgentSystem()
    result = system.process("Verbessere die Risikoanalyse-Anzeige")
"""

from .base import Agent, TaskResult, Message
from .config import AgentConfig, ALL_AGENTS
from .orchestrator import Orchestrator, Task, TaskStatus
from .core import PlannerAgent, ExecutorAgent, ReviewerAgent
from .specialists import (
    ArchitectAgent,
    FrontendAgent,
    BackendAgent,
    SecurityAgent,
    TrademarkAgent,
)


class AgentSystem:
    """
    Main entry point for the TrademarkIQ Agent System.

    This class initializes all agents and provides a simple interface
    for processing requests.
    """

    def __init__(self, auto_register: bool = True):
        """
        Initialize the agent system.

        Args:
            auto_register: If True, automatically register all agents
        """
        self.orchestrator = Orchestrator()

        if auto_register:
            self._register_all_agents()

    def _register_all_agents(self):
        """Register all available agents with the orchestrator."""
        registered = 0
        errors = []

        # Define agents to register
        agent_definitions = [
            ("planner", PlannerAgent, "Planner"),
            ("executor", ExecutorAgent, "Executor"),
            ("reviewer", ReviewerAgent, "Reviewer"),
            ("architect", ArchitectAgent, "Architekt"),
            ("frontend", FrontendAgent, "Frontend"),
            ("backend", BackendAgent, "Backend"),
            ("security", SecurityAgent, "Security"),
            ("trademark", TrademarkAgent, "Trademark"),
        ]

        for agent_id, agent_class, name in agent_definitions:
            try:
                agent = agent_class()
                self.orchestrator.register_agent(agent_id, agent)
                setattr(self, agent_id, agent)
                registered += 1
            except Exception as e:
                errors.append(f"{name}: {str(e)}")
                print(f"⚠️ Fehler bei Agent '{name}': {e}")

        if registered > 0:
            print(f"\n✅ Agent System initialisiert mit {registered} Agenten")
        if errors:
            print(f"⚠️ {len(errors)} Agenten konnten nicht geladen werden")

        return registered

    def process(self, request: str, context: str = None) -> dict:
        """
        Process a user request.

        Args:
            request: What the user wants to do
            context: Optional additional context (file contents, etc.)

        Returns:
            dict with results, plan, and any required approvals
        """
        return self.orchestrator.process_request(request, context)

    def approve(self, task_id: str) -> dict:
        """Approve a pending task."""
        return self.orchestrator.approve_task(task_id)

    def reject(self, task_id: str, reason: str = "") -> dict:
        """Reject a pending task."""
        return self.orchestrator.reject_task(task_id, reason)

    def status(self) -> dict:
        """Get system status."""
        return self.orchestrator.get_status()

    def pending_tasks(self) -> list[Task]:
        """Get tasks waiting for approval."""
        return self.orchestrator.get_pending_tasks()

    def ask_agent(self, agent_id: str, question: str, context: str = None) -> str:
        """
        Ask a specific agent directly.

        Args:
            agent_id: The agent to ask (e.g., "architect", "security")
            question: The question or task
            context: Optional context

        Returns:
            The agent's response

        Raises:
            ValueError: If agent_id or question is invalid
        """
        # Input validation
        if not agent_id or not isinstance(agent_id, str):
            raise ValueError("agent_id must be a non-empty string")
        if not question or not isinstance(question, str):
            raise ValueError("question must be a non-empty string")

        # Sanitize agent_id (only allow alphanumeric and underscore)
        agent_id = agent_id.strip().lower()
        if not agent_id.replace("_", "").isalnum():
            raise ValueError(f"Invalid agent_id format: {agent_id}")

        agent = self.orchestrator.get_agent(agent_id)
        if not agent:
            available = ', '.join(self.orchestrator.agents.keys())
            return f"Agent '{agent_id}' nicht gefunden. Verfügbar: {available}"

        try:
            return agent.think(question, context)
        except Exception as e:
            return f"Fehler bei Agent '{agent_id}': {str(e)}"

    def list_agents(self) -> list[dict]:
        """List all available agents."""
        return self.orchestrator.list_agents()


# Export main classes
__all__ = [
    "AgentSystem",
    "Agent",
    "Orchestrator",
    "TaskResult",
    "Task",
    "TaskStatus",
    "PlannerAgent",
    "ExecutorAgent",
    "ReviewerAgent",
    "ArchitectAgent",
    "FrontendAgent",
    "BackendAgent",
    "SecurityAgent",
    "TrademarkAgent",
]
