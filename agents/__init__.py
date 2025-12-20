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
        # Core agents
        self.planner = PlannerAgent()
        self.executor = ExecutorAgent()
        self.reviewer = ReviewerAgent()

        self.orchestrator.register_agent("planner", self.planner)
        self.orchestrator.register_agent("executor", self.executor)
        self.orchestrator.register_agent("reviewer", self.reviewer)

        # Specialist agents
        self.architect = ArchitectAgent()
        self.frontend = FrontendAgent()
        self.backend = BackendAgent()
        self.security = SecurityAgent()
        self.trademark = TrademarkAgent()

        self.orchestrator.register_agent("architect", self.architect)
        self.orchestrator.register_agent("frontend", self.frontend)
        self.orchestrator.register_agent("backend", self.backend)
        self.orchestrator.register_agent("security", self.security)
        self.orchestrator.register_agent("trademark", self.trademark)

        print(f"\n✅ Agent System initialisiert mit {len(self.orchestrator.agents)} Agenten\n")

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
        """
        agent = self.orchestrator.get_agent(agent_id)
        if not agent:
            return f"Agent '{agent_id}' nicht gefunden. Verfügbar: {', '.join(self.orchestrator.agents.keys())}"

        return agent.think(question, context)

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
