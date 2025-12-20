"""
Base Agent class for TrademarkIQ Agent System
"""

import anthropic
from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

from .config import AgentConfig, get_api_key, load_project_context, MODEL


@dataclass
class Message:
    """A message in the conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    agent_name: Optional[str] = None


@dataclass
class TaskResult:
    """Result of an agent task."""
    success: bool
    output: str
    agent_name: str
    task_description: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict = field(default_factory=dict)
    requires_approval: bool = False
    proposed_changes: list[dict] = field(default_factory=list)


class Agent:
    """Base class for all agents."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.name = config.name
        self.role = config.role
        self.conversation_history: list[Message] = []
        self.client = anthropic.Anthropic(api_key=get_api_key())
        self.project_context = load_project_context()

    def _build_system_prompt(self) -> str:
        """Build the full system prompt with project context."""
        return f"""{self.config.system_prompt}

--- PROJEKT-KONTEXT ---
{self.project_context[:4000]}

--- DEINE FÄHIGKEITEN ---
{', '.join(self.config.capabilities)}

--- DEINE EINSCHRÄNKUNGEN ---
{', '.join(self.config.restrictions)}
"""

    def think(self, user_input: str, context: Optional[str] = None) -> str:
        """
        Process user input and generate a response.

        Args:
            user_input: The user's message or task
            context: Additional context (e.g., code, file contents)

        Returns:
            The agent's response
        """
        # Build the user message
        full_input = user_input
        if context:
            full_input = f"{user_input}\n\n--- KONTEXT ---\n{context}"

        # Add to conversation history
        self.conversation_history.append(Message(
            role="user",
            content=full_input,
            agent_name=None
        ))

        # Build messages for API call
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in self.conversation_history
        ]

        # Call Claude
        response = self.client.messages.create(
            model=MODEL,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            system=self._build_system_prompt(),
            messages=messages
        )

        assistant_response = response.content[0].text

        # Add response to history
        self.conversation_history.append(Message(
            role="assistant",
            content=assistant_response,
            agent_name=self.name
        ))

        return assistant_response

    def execute_task(self, task: str, context: Optional[str] = None) -> TaskResult:
        """
        Execute a specific task.

        Args:
            task: Description of the task to perform
            context: Additional context

        Returns:
            TaskResult with the outcome
        """
        try:
            output = self.think(task, context)

            # Check if this requires approval (code changes)
            requires_approval = any(
                keyword in output.lower()
                for keyword in ["ändern", "erstellen", "löschen", "hinzufügen", "code:"]
            )

            return TaskResult(
                success=True,
                output=output,
                agent_name=self.name,
                task_description=task,
                requires_approval=requires_approval
            )
        except Exception as e:
            return TaskResult(
                success=False,
                output=f"Fehler: {str(e)}",
                agent_name=self.name,
                task_description=task
            )

    def reset_conversation(self):
        """Clear conversation history."""
        self.conversation_history = []

    def get_capabilities(self) -> list[str]:
        """Return list of agent capabilities."""
        return self.config.capabilities

    def can_do(self, action: str) -> bool:
        """Check if agent can perform an action."""
        return action in self.config.capabilities

    def __repr__(self) -> str:
        return f"Agent({self.name}, role={self.role})"
