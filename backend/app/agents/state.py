"""Shared session state passed through the LangGraph graph."""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal


class Message(BaseModel):
    role: Literal["student", "agent", "system"]
    agent: Optional[str] = None   # Which agent produced this message
    content: str
    timestamp: Optional[str] = None


class SessionState(BaseModel):
    # Identity
    session_id: int
    student_id: int
    course_id: str                        # ChromaDB collection id

    # Conversation
    messages: List[Message] = Field(default_factory=list)
    current_student_input: str = ""

    # Routing
    next_agent: Optional[str] = None      # Orchestrator sets this
    turn_count: int = 0

    # Scoring (updated live by Grader)
    running_score: float = 0.0
    bloom_level: str = "Knowledge"        # Current Bloom taxonomy level
    topics_covered: List[str] = Field(default_factory=list)
    topics_pending: List[str] = Field(default_factory=list)

    # Fact-checker output for current turn
    retrieved_chunks: List[str] = Field(default_factory=list)
    fact_check_verdict: Optional[bool] = None

    # Pedagogical strategy
    remediation_needed: bool = False
    hint_level: int = 0                   # 0 = no hint, 1-3 progressive hints

    # Session control
    exam_finished: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
