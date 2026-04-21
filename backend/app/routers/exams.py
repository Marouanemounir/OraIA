from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.exam import ExamSessionCreate, ExamSessionResponse

router = APIRouter()


@router.post("/", response_model=ExamSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_exam(payload: ExamSessionCreate, db: Session = Depends(get_db)):
    """Démarre une nouvelle session d'examen pour un étudiant inscrit (à implémenter)."""
    raise NotImplementedError


@router.get("/", response_model=List[ExamSessionResponse])
async def list_my_exams(db: Session = Depends(get_db)):
    """Liste les sessions d'examen de l'étudiant courant (à implémenter)."""
    raise NotImplementedError


@router.get("/{session_id}", response_model=ExamSessionResponse)
async def get_exam(session_id: int, db: Session = Depends(get_db)):
    """Retourne le détail d'une session d'examen (à implémenter)."""
    raise NotImplementedError
