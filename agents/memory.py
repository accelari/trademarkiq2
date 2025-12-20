"""
Projektgedächtnis für TrademarkIQ Agent System

Speichert alle Gespräche, Entscheidungen und Fragen persistent.
Alle Agenten haben Zugriff auf das gemeinsame Gedächtnis.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal
from dataclasses import dataclass, field, asdict


# Speicherort für das Projektgedächtnis
MEMORY_DIR = Path(__file__).parent.parent / ".project_memory"
MEMORY_FILE = MEMORY_DIR / "memory.json"
DECISIONS_FILE = MEMORY_DIR / "decisions.json"
QUESTIONS_FILE = MEMORY_DIR / "pending_questions.json"


@dataclass
class MemoryEntry:
    """Ein Eintrag im Projektgedächtnis."""
    id: str
    timestamp: str
    entry_type: Literal["question", "answer", "decision", "insight", "conversation"]
    source: str  # Wer hat das geschrieben (agent_id oder "user")
    target: Optional[str]  # An wen gerichtet (agent_id oder "user")
    content: str
    context: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    related_to: Optional[str] = None  # ID eines verwandten Eintrags


@dataclass
class PendingQuestion:
    """Eine offene Frage an den Benutzer."""
    id: str
    timestamp: str
    agent_id: str
    agent_name: str
    question: str
    context: Optional[str] = None
    priority: Literal["low", "normal", "high", "critical"] = "normal"
    category: str = "general"  # z.B. "architecture", "business", "technical"
    answered: bool = False
    answer: Optional[str] = None


class ProjectMemory:
    """
    Zentrales Projektgedächtnis für alle Agenten.

    Speichert:
    - Alle Gespräche zwischen Agenten und mit dem Benutzer
    - Entscheidungen des Benutzers
    - Offene Fragen
    - Erkenntnisse und Insights
    """

    def __init__(self):
        """Initialisiert das Projektgedächtnis."""
        self._ensure_memory_dir()
        self.entries: list[MemoryEntry] = []
        self.pending_questions: list[PendingQuestion] = []
        self._load()

    def _ensure_memory_dir(self):
        """Stellt sicher, dass das Speicherverzeichnis existiert."""
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)

    def _generate_id(self, prefix: str = "M") -> str:
        """Generiert eine eindeutige ID."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        return f"{prefix}-{timestamp}"

    def _load(self):
        """Lädt das Gedächtnis aus den Dateien."""
        # Hauptgedächtnis laden
        if MEMORY_FILE.exists():
            try:
                with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.entries = [
                        MemoryEntry(**entry) for entry in data.get("entries", [])
                    ]
            except (json.JSONDecodeError, TypeError):
                self.entries = []

        # Offene Fragen laden
        if QUESTIONS_FILE.exists():
            try:
                with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.pending_questions = [
                        PendingQuestion(**q) for q in data.get("questions", [])
                    ]
            except (json.JSONDecodeError, TypeError):
                self.pending_questions = []

    def _save(self):
        """Speichert das Gedächtnis in die Dateien."""
        # Hauptgedächtnis speichern
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "entries": [asdict(e) for e in self.entries],
                "last_updated": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

        # Offene Fragen speichern
        with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "questions": [asdict(q) for q in self.pending_questions],
                "last_updated": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

    # === FRAGEN AN DEN BENUTZER ===

    def ask_user(
        self,
        agent_id: str,
        agent_name: str,
        question: str,
        context: Optional[str] = None,
        priority: str = "normal",
        category: str = "general"
    ) -> str:
        """
        Agent stellt eine Frage an den Benutzer.

        Returns:
            Die ID der Frage
        """
        q = PendingQuestion(
            id=self._generate_id("Q"),
            timestamp=datetime.now().isoformat(),
            agent_id=agent_id,
            agent_name=agent_name,
            question=question,
            context=context,
            priority=priority,
            category=category
        )
        self.pending_questions.append(q)

        # Auch ins Hauptgedächtnis
        self.add_entry(
            entry_type="question",
            source=agent_id,
            target="user",
            content=question,
            context=context,
            tags=[category, priority]
        )

        self._save()
        return q.id

    def get_pending_questions(self, category: Optional[str] = None) -> list[PendingQuestion]:
        """Gibt alle unbeantworteten Fragen zurück."""
        questions = [q for q in self.pending_questions if not q.answered]
        if category:
            questions = [q for q in questions if q.category == category]
        # Nach Priorität sortieren
        priority_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}
        return sorted(questions, key=lambda q: priority_order.get(q.priority, 2))

    def answer_question(self, question_id: str, answer: str) -> bool:
        """Beantwortet eine Frage."""
        for q in self.pending_questions:
            if q.id == question_id:
                q.answered = True
                q.answer = answer

                # Antwort ins Gedächtnis
                self.add_entry(
                    entry_type="answer",
                    source="user",
                    target=q.agent_id,
                    content=answer,
                    related_to=question_id,
                    tags=[q.category]
                )

                self._save()
                return True
        return False

    # === GEDÄCHTNIS-EINTRÄGE ===

    def add_entry(
        self,
        entry_type: str,
        source: str,
        content: str,
        target: Optional[str] = None,
        context: Optional[str] = None,
        tags: list[str] = None,
        related_to: Optional[str] = None
    ) -> str:
        """Fügt einen Eintrag zum Gedächtnis hinzu."""
        entry = MemoryEntry(
            id=self._generate_id("M"),
            timestamp=datetime.now().isoformat(),
            entry_type=entry_type,
            source=source,
            target=target,
            content=content,
            context=context,
            tags=tags or [],
            related_to=related_to
        )
        self.entries.append(entry)
        self._save()
        return entry.id

    def record_decision(self, decision: str, context: str = None, tags: list[str] = None) -> str:
        """Speichert eine Entscheidung des Benutzers."""
        return self.add_entry(
            entry_type="decision",
            source="user",
            content=decision,
            context=context,
            tags=["decision"] + (tags or [])
        )

    def record_insight(self, agent_id: str, insight: str, tags: list[str] = None) -> str:
        """Speichert eine Erkenntnis eines Agenten."""
        return self.add_entry(
            entry_type="insight",
            source=agent_id,
            content=insight,
            tags=["insight"] + (tags or [])
        )

    def record_conversation(
        self,
        source: str,
        target: str,
        content: str,
        context: Optional[str] = None
    ) -> str:
        """Protokolliert ein Gespräch."""
        return self.add_entry(
            entry_type="conversation",
            source=source,
            target=target,
            content=content,
            context=context
        )

    # === SUCHE UND ABRUF ===

    def search(
        self,
        query: str = None,
        entry_type: str = None,
        source: str = None,
        tags: list[str] = None,
        limit: int = 50
    ) -> list[MemoryEntry]:
        """Durchsucht das Gedächtnis."""
        results = self.entries.copy()

        if entry_type:
            results = [e for e in results if e.entry_type == entry_type]

        if source:
            results = [e for e in results if e.source == source]

        if tags:
            results = [e for e in results if any(t in e.tags for t in tags)]

        if query:
            query_lower = query.lower()
            results = [
                e for e in results
                if query_lower in e.content.lower()
                or (e.context and query_lower in e.context.lower())
            ]

        # Neueste zuerst
        results = sorted(results, key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    def get_decisions(self, limit: int = 20) -> list[MemoryEntry]:
        """Gibt alle Entscheidungen zurück."""
        return self.search(entry_type="decision", limit=limit)

    def get_insights(self, agent_id: str = None, limit: int = 20) -> list[MemoryEntry]:
        """Gibt Erkenntnisse zurück."""
        return self.search(entry_type="insight", source=agent_id, limit=limit)

    def get_context_for_agent(self, agent_id: str, limit: int = 10) -> str:
        """
        Erstellt einen Kontext-String für einen Agenten.
        Enthält relevante Entscheidungen, Antworten und Erkenntnisse.
        """
        parts = []

        # Letzte Entscheidungen
        decisions = self.get_decisions(limit=5)
        if decisions:
            parts.append("=== BENUTZER-ENTSCHEIDUNGEN ===")
            for d in decisions:
                parts.append(f"- {d.content}")

        # Beantwortete Fragen dieses Agenten
        answered = [q for q in self.pending_questions if q.answered and q.agent_id == agent_id]
        if answered:
            parts.append("\n=== BEANTWORTETE FRAGEN ===")
            for q in answered[-5:]:
                parts.append(f"F: {q.question}")
                parts.append(f"A: {q.answer}")

        # Erkenntnisse
        insights = self.get_insights(limit=5)
        if insights:
            parts.append("\n=== ERKENNTNISSE ===")
            for i in insights:
                parts.append(f"[{i.source}] {i.content}")

        return "\n".join(parts) if parts else "Noch keine Einträge im Projektgedächtnis."

    def get_summary(self) -> dict:
        """Gibt eine Zusammenfassung des Gedächtnisses zurück."""
        return {
            "total_entries": len(self.entries),
            "pending_questions": len([q for q in self.pending_questions if not q.answered]),
            "answered_questions": len([q for q in self.pending_questions if q.answered]),
            "decisions": len([e for e in self.entries if e.entry_type == "decision"]),
            "insights": len([e for e in self.entries if e.entry_type == "insight"]),
            "conversations": len([e for e in self.entries if e.entry_type == "conversation"])
        }

    def format_pending_questions(self) -> str:
        """Formatiert alle offenen Fragen für die Anzeige."""
        questions = self.get_pending_questions()
        if not questions:
            return "Keine offenen Fragen."

        lines = ["📋 OFFENE FRAGEN AN DICH:", "=" * 40]

        for i, q in enumerate(questions, 1):
            priority_icon = {"critical": "🔴", "high": "🟠", "normal": "🟡", "low": "🟢"}.get(q.priority, "⚪")
            lines.append(f"\n{priority_icon} [{q.id}] {q.agent_name}:")
            lines.append(f"   {q.question}")
            if q.context:
                lines.append(f"   Kontext: {q.context[:100]}...")

        lines.append("\n" + "=" * 40)
        lines.append("Antworte mit: /agents-answer <ID> <Antwort>")

        return "\n".join(lines)


# Singleton-Instanz
_memory_instance: Optional[ProjectMemory] = None


def get_memory() -> ProjectMemory:
    """Gibt die Singleton-Instanz des Projektgedächtnisses zurück."""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = ProjectMemory()
    return _memory_instance
