from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel

from app.models.exam_session import SessionStatus


class ExamSessionCreate(BaseModel):
    classroom_id: int


class ExamSessionResponse(BaseModel):
    id: int
    classroom_id: int
    student_id: int
    status: SessionStatus
    score: Optional[float]
    bloom_level: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ExamReportResponse(BaseModel):
    """Rapport détaillé généré par les agents en fin de session."""
    session_id: int
    score: Optional[float]
    bloom_level: Optional[str]
    report: Dict[str, Any]
