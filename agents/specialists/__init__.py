"""
Specialist Agents for TrademarkIQ
"""

from ..base import Agent
from ..config import SPECIALIST_CONFIGS


class ArchitectAgent(Agent):
    """Software Architecture specialist."""
    def __init__(self):
        super().__init__(SPECIALIST_CONFIGS["architect"])


class FrontendAgent(Agent):
    """Frontend/React specialist."""
    def __init__(self):
        super().__init__(SPECIALIST_CONFIGS["frontend"])


class BackendAgent(Agent):
    """Backend/API specialist."""
    def __init__(self):
        super().__init__(SPECIALIST_CONFIGS["backend"])


class SecurityAgent(Agent):
    """Security specialist."""
    def __init__(self):
        super().__init__(SPECIALIST_CONFIGS["security"])


class TrademarkAgent(Agent):
    """Trademark/Legal specialist."""
    def __init__(self):
        super().__init__(SPECIALIST_CONFIGS["trademark"])


# Export all specialists
__all__ = [
    "ArchitectAgent",
    "FrontendAgent",
    "BackendAgent",
    "SecurityAgent",
    "TrademarkAgent",
]
