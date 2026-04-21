from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ClassroomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None


class ClassroomResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    """Le teacher fournit l'email de l'étudiant à inscrire."""
    student_email: EmailStr


class EnrollmentResponse(BaseModel):
    id: int
    classroom_id: int
    student_id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True


class CourseMaterialResponse(BaseModel):
    id: int
    classroom_id: int
    filename: str
    original_name: str
    chunk_count: int
    uploaded_at: datetime

    class Config:
        from_attributes = True
