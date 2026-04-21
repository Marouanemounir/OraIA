import logging
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.classroom import Classroom, Enrollment
from app.models.course import CourseMaterial
from app.models.user import User, UserRole
from app.routers.auth import get_current_user
from app.schemas.classroom import CourseMaterialResponse
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_PDF_BYTES = 25 * 1024 * 1024  # 25 MB safety cap


def _index_material_in_background(classroom_id: int, file_path: str, material_id: int) -> None:
    """Wrapper exception-safe exécuté par BackgroundTasks après la réponse HTTP."""
    try:
        get_rag_service().index_document(
            classroom_id=str(classroom_id),
            file_path=file_path,
            material_id=material_id,
        )
    except Exception:
        logger.exception("Échec indexation RAG en arrière-plan material_id=%d", material_id)


@router.post(
    "/classrooms/{classroom_id}/courses/upload",
    response_model=CourseMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_course_material(
    classroom_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Téléverse un PDF de support de cours dans une classe (enseignant propriétaire uniquement)."""
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Réservé aux enseignants")

    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classe introuvable")
    if classroom.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas l'enseignant de cette classe")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Le fichier est vide")
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 25 MB)")

    stored_name = f"{uuid.uuid4().hex}.pdf"
    file_path = UPLOAD_DIR / stored_name
    file_path.write_bytes(content)

    material = CourseMaterial(
        classroom_id=classroom_id,
        filename=stored_name,
        original_name=file.filename,
        file_path=str(file_path),
        chunk_count=0,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Indexation RAG asynchrone : le client reçoit chunk_count=0,
    # le service met à jour la valeur en base à la fin du traitement.
    background_tasks.add_task(
        _index_material_in_background,
        classroom_id=classroom_id,
        file_path=str(file_path),
        material_id=material.id,
    )

    return material


@router.get(
    "/classrooms/{classroom_id}/courses",
    response_model=List[CourseMaterialResponse],
)
async def list_course_materials(
    classroom_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Liste les supports de cours d'une classe (teacher propriétaire ou student inscrit)."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classe introuvable")

    if user.role == UserRole.teacher:
        if classroom.teacher_id != user.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
    else:
        enrolled = (
            db.query(Enrollment)
            .filter(Enrollment.classroom_id == classroom_id, Enrollment.student_id == user.id)
            .first()
        )
        if not enrolled:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas inscrit dans cette classe")

    return (
        db.query(CourseMaterial)
        .filter(CourseMaterial.classroom_id == classroom_id)
        .order_by(CourseMaterial.uploaded_at.desc())
        .all()
    )
