"""Curriculum mapper — generate a concept map from course materials via RAG + LLM."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from langchain_groq import ChatGroq

from app.agents.state import SessionState
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """Tu es un expert pédagogique chargé de cartographier un cours.

À partir du sujet et d'extraits du cours fournis, génère une carte conceptuelle structurée.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "core_concepts": [
    {"name": "string", "difficulty": 1-5, "description": "string"}
  ],
  "misconceptions": ["string", ...],
  "prerequis": ["string", ...],
  "learning_objectives": ["string", ...]
}

Règles :
- 4 à 8 core_concepts ordonnés du plus simple au plus avancé
- difficulty entre 1 (très facile) et 5 (très difficile)
- 2 à 5 misconceptions fréquentes des étudiants sur ce sujet
- 2 à 5 prérequis indispensables
- 3 à 6 learning_objectives concrets et mesurables
- Réponds dans la même langue que le sujet fourni"""


USER_TEMPLATE = """Sujet de l'examen : {topic}
Classroom : {classroom_id}

Extraits pertinents du cours :
{rag_extracts}

Génère la carte conceptuelle JSON."""


class CurriculumMapperAgent:
    """Builds the initial concept map of the topic by combining RAG with an LLM."""

    def __init__(self) -> None:
        self._llm = None  # lazy — created on first call so import doesn't need GROQ_API_KEY

    def _get_llm(self) -> ChatGroq:
        if self._llm is None:
            self._llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0,
                model_kwargs={"response_format": {"type": "json_object"}},
            )
        return self._llm

    def _format_extracts(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "(aucun extrait disponible — utilise tes connaissances générales sur le sujet)"
        lines = []
        for i, c in enumerate(chunks, start=1):
            text = c.get("text", "").strip().replace("\n", " ")
            page = c.get("metadata", {}).get("page", "?")
            lines.append(f"[{i}] (page {page}) {text[:400]}")
        return "\n".join(lines)

    async def update(self, state: SessionState) -> SessionState:
        topic = state.get("topic", "")
        classroom_id = state.get("classroom_id", "")

        rag = get_rag_service()
        chunks = rag.query(classroom_id=classroom_id, question=topic, k=6)
        state["rag_context"] = chunks

        user_msg = USER_TEMPLATE.format(
            topic=topic,
            classroom_id=classroom_id,
            rag_extracts=self._format_extracts(chunks),
        )

        try:
            response = self._get_llm().invoke([
                ("system", SYSTEM_PROMPT),
                ("user", user_msg),
            ])
            concept_map = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("CurriculumMapper JSON invalide : %s", exc)
            concept_map = {
                "core_concepts": [],
                "misconceptions": [],
                "prerequis": [],
                "learning_objectives": [],
                "error": f"JSON parse failed: {exc}",
            }
        except Exception as exc:
            logger.exception("CurriculumMapper LLM call failed")
            concept_map = {
                "core_concepts": [],
                "misconceptions": [],
                "prerequis": [],
                "learning_objectives": [],
                "error": str(exc),
            }

        state["concept_map"] = concept_map
        state["exam_status"] = "examining"
        return state


curriculum_mapper = CurriculumMapperAgent()
