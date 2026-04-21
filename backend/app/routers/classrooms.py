from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.classroom import Classroom, Enrollment
from app.models.user import User, UserRole
from app.routers.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomResponse,
    EnrollmentCreate,
    EnrollmentResponse,
)

router = APIRouter()


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Réservé aux enseignants")
    return user


def _ensure_classroom_access(classroom: Classroom, user: User, db: Session) -> None:
    """Lève 403 si l'utilisateur n'est ni le teacher de la classe ni un student inscrit."""
    if user.role == UserRole.teacher:
        if classroom.teacher_id != user.id:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas l'enseignant de cette classe")
        return

    enrolled = (
        db.query(Enrollment)
        .filter(Enrollment.classroom_id == classroom.id, Enrollment.student_id == user.id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas inscrit dans cette classe")


@router.post(
    "/",
    response_model=ClassroomResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_classroom(
    payload: ClassroomCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Crée une nouvelle classe (réservé aux enseignants)."""
    classroom = Classroom(
        name=payload.name,
        description=payload.description,
        teacher_id=teacher.id,
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


@router.get("/", response_model=List[ClassroomResponse])
async def list_classrooms(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Liste les classes de l'utilisateur — enseignées (teacher) ou suivies (student)."""
    if user.role == UserRole.teacher:
        return db.query(Classroom).filter(Classroom.teacher_id == user.id).all()

    return (
        db.query(Classroom)
        .join(Enrollment, Enrollment.classroom_id == Classroom.id)
        .filter(Enrollment.student_id == user.id)
        .all()
    )


@router.post(
    "/{classroom_id}/enroll",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_student(
    classroom_id: int,
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Inscrit un étudiant dans la classe (réservé à l'enseignant propriétaire)."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classe introuvable")
    if classroom.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas l'enseignant de cette classe")

    student = db.query(User).filter(User.email == payload.student_email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")
    if student.role != UserRole.student:
        raise HTTPException(status_code=400, detail="L'utilisateur cible n'est pas un étudiant")

    already = (
        db.query(Enrollment)
        .filter(Enrollment.classroom_id == classroom_id, Enrollment.student_id == student.id)
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="Étudiant déjà inscrit dans cette classe")

    enrollment = Enrollment(classroom_id=classroom_id, student_id=student.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/{classroom_id}/students", response_model=List[UserResponse])
async def list_students(
    classroom_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Liste les étudiants inscrits dans la classe (teacher propriétaire ou student inscrit)."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classe introuvable")

    _ensure_classroom_access(classroom, user, db)

    return (
        db.query(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .filter(Enrollment.classroom_id == classroom_id)
        .all()
    )
