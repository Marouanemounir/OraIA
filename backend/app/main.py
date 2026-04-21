from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 — side-effect import pour enregistrer les tables SQLAlchemy
from app.database import Base, engine
from app.routers import auth, classrooms, courses


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialisation au démarrage : crée le dossier uploads/ et les tables SQL."""
    Path("./uploads").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Socratic Viva v2",
    description="Plateforme d'examen oral IA multi-agents pour l'éducation",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(classrooms.router, prefix="/classrooms", tags=["classrooms"])
app.include_router(courses.router, tags=["courses"])  # Les chemins incluent déjà /classrooms/...


@app.get("/", tags=["health"])
async def health_check():
    """Vérifie que l'API est en ligne."""
    return {"status": "ok", "service": "Socratic Viva v2", "version": "2.0.0"}
