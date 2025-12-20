"""
Task Queue System for 24/7 Agent Operations

Persists tasks to disk so they survive restarts.
"""

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
from enum import Enum
from pathlib import Path


class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


class TaskType(Enum):
    CODE_REVIEW = "code_review"
    SECURITY_SCAN = "security_scan"
    IMPROVEMENT = "improvement"
    BUG_FIX = "bug_fix"
    FEATURE = "feature"
    DOCUMENTATION = "documentation"
    MONITORING = "monitoring"


@dataclass
class QueuedTask:
    """A task in the queue."""
    id: str
    title: str
    description: str
    task_type: str
    priority: int
    status: str  # pending, in_progress, waiting_approval, completed, failed
    created_at: str
    updated_at: str
    assigned_agent: Optional[str] = None
    result: Optional[str] = None
    proposed_changes: Optional[list] = None
    metadata: Optional[dict] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "QueuedTask":
        return cls(**data)


class TaskQueue:
    """
    Persistent task queue for the agent system.

    Tasks are stored in a JSON file and survive restarts.
    """

    def __init__(self, queue_file: str = None):
        """
        Initialize the task queue.

        Args:
            queue_file: Path to the JSON file for persistence
        """
        if queue_file is None:
            base_dir = Path(__file__).parent.parent
            queue_file = base_dir / "data" / "task_queue.json"

        self.queue_file = Path(queue_file)
        self.queue_file.parent.mkdir(parents=True, exist_ok=True)

        self.tasks: dict[str, QueuedTask] = {}
        self.task_counter = 0

        self._load()

    def _load(self):
        """Load tasks from disk."""
        if self.queue_file.exists():
            try:
                with open(self.queue_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.task_counter = data.get("counter", 0)
                    for task_data in data.get("tasks", []):
                        task = QueuedTask.from_dict(task_data)
                        self.tasks[task.id] = task
                print(f"📥 {len(self.tasks)} Tasks aus Queue geladen")
            except Exception as e:
                print(f"⚠️ Fehler beim Laden der Queue: {e}")

    def _save(self):
        """Save tasks to disk."""
        try:
            data = {
                "counter": self.task_counter,
                "tasks": [task.to_dict() for task in self.tasks.values()],
                "last_updated": datetime.now().isoformat()
            }
            with open(self.queue_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Fehler beim Speichern der Queue: {e}")

    def add(
        self,
        title: str,
        description: str,
        task_type: TaskType = TaskType.IMPROVEMENT,
        priority: TaskPriority = TaskPriority.NORMAL,
        metadata: dict = None
    ) -> QueuedTask:
        """
        Add a new task to the queue.

        Args:
            title: Short title
            description: Detailed description
            task_type: Type of task
            priority: Priority level
            metadata: Additional data

        Returns:
            The created task
        """
        self.task_counter += 1
        task_id = f"Q-{self.task_counter:05d}"
        now = datetime.now().isoformat()

        task = QueuedTask(
            id=task_id,
            title=title,
            description=description,
            task_type=task_type.value,
            priority=priority.value,
            status="pending",
            created_at=now,
            updated_at=now,
            metadata=metadata
        )

        self.tasks[task_id] = task
        self._save()

        print(f"➕ Task hinzugefügt: [{task_id}] {title}")
        return task

    def get(self, task_id: str) -> Optional[QueuedTask]:
        """Get a task by ID."""
        return self.tasks.get(task_id)

    def update_status(self, task_id: str, status: str, result: str = None):
        """Update task status."""
        task = self.tasks.get(task_id)
        if task:
            task.status = status
            task.updated_at = datetime.now().isoformat()
            if result:
                task.result = result
            self._save()
            print(f"🔄 Task {task_id} Status: {status}")

    def set_proposed_changes(self, task_id: str, changes: list):
        """Set proposed changes for a task."""
        task = self.tasks.get(task_id)
        if task:
            task.proposed_changes = changes
            task.status = "waiting_approval"
            task.updated_at = datetime.now().isoformat()
            self._save()

    def get_pending(self) -> list[QueuedTask]:
        """Get all pending tasks, sorted by priority."""
        pending = [t for t in self.tasks.values() if t.status == "pending"]
        return sorted(pending, key=lambda t: -t.priority)

    def get_waiting_approval(self) -> list[QueuedTask]:
        """Get all tasks waiting for approval."""
        return [t for t in self.tasks.values() if t.status == "waiting_approval"]

    def get_by_status(self, status: str) -> list[QueuedTask]:
        """Get tasks by status."""
        return [t for t in self.tasks.values() if t.status == status]

    def approve(self, task_id: str) -> bool:
        """Approve a task."""
        task = self.tasks.get(task_id)
        if task and task.status == "waiting_approval":
            task.status = "approved"
            task.updated_at = datetime.now().isoformat()
            self._save()
            print(f"✅ Task {task_id} genehmigt")
            return True
        return False

    def reject(self, task_id: str, reason: str = "") -> bool:
        """Reject a task."""
        task = self.tasks.get(task_id)
        if task and task.status == "waiting_approval":
            task.status = "rejected"
            task.result = f"Abgelehnt: {reason}" if reason else "Abgelehnt"
            task.updated_at = datetime.now().isoformat()
            self._save()
            print(f"❌ Task {task_id} abgelehnt")
            return True
        return False

    def complete(self, task_id: str, result: str = ""):
        """Mark a task as completed."""
        self.update_status(task_id, "completed", result)

    def fail(self, task_id: str, error: str = ""):
        """Mark a task as failed."""
        self.update_status(task_id, "failed", f"Fehler: {error}")

    def delete(self, task_id: str) -> bool:
        """Delete a task."""
        if task_id in self.tasks:
            del self.tasks[task_id]
            self._save()
            print(f"🗑️ Task {task_id} gelöscht")
            return True
        return False

    def clear_completed(self):
        """Remove all completed tasks."""
        completed = [tid for tid, t in self.tasks.items() if t.status == "completed"]
        for tid in completed:
            del self.tasks[tid]
        self._save()
        print(f"🧹 {len(completed)} abgeschlossene Tasks entfernt")

    def stats(self) -> dict:
        """Get queue statistics."""
        statuses = {}
        for task in self.tasks.values():
            statuses[task.status] = statuses.get(task.status, 0) + 1

        return {
            "total": len(self.tasks),
            "by_status": statuses,
            "pending": statuses.get("pending", 0),
            "waiting_approval": statuses.get("waiting_approval", 0),
            "in_progress": statuses.get("in_progress", 0)
        }

    def format_task(self, task: QueuedTask) -> str:
        """Format a task for display."""
        priority_icons = {0: "🔵", 1: "🟢", 2: "🟡", 3: "🔴"}
        status_icons = {
            "pending": "⏳",
            "in_progress": "🔄",
            "waiting_approval": "⚠️",
            "approved": "✅",
            "completed": "✓",
            "failed": "❌",
            "rejected": "🚫"
        }

        icon = priority_icons.get(task.priority, "⚪")
        status = status_icons.get(task.status, "❓")

        return f"{icon} [{task.id}] {status} {task.title}\n   {task.description[:100]}..."

    def format_all(self) -> str:
        """Format all tasks for display."""
        if not self.tasks:
            return "📭 Keine Tasks in der Queue."

        lines = ["📋 Task Queue:\n"]

        # Group by status
        for status in ["waiting_approval", "pending", "in_progress", "completed", "failed"]:
            tasks = self.get_by_status(status)
            if tasks:
                lines.append(f"\n### {status.upper()} ({len(tasks)})")
                for task in tasks:
                    lines.append(self.format_task(task))

        return "\n".join(lines)
