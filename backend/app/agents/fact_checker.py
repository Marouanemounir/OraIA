"""Fact-checker — RAG + optional DuckDuckGo validation of student answers."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from langchain_groq import ChatGroq

from app.agents.state import SessionState
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)

try:
    from ddgs import DDGS  # ddgs is the new package name for duckduckgo-search
except ImportError:  # pragma: no cover
    try:
        from duckduckgo_search import DDGS  # legacy import path
    except ImportError:
        DDGS = None


SYSTEM_PROMPT = """Tu es un fact-checker pédagogique rigoureux.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "verdict": "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | "RED_FLAG",
  "confidence": 0.0-1.0,
  "explanation": "string (1-2 phrases, concise)",
  "matched_concepts": ["string", ...],
  "misconceptions_detected": ["string", ...]
}

Règles d'évaluation :
- CORRECT : la réponse est exacte et complète vis-à-vis du cours
- PARTIALLY_CORRECT : la réponse contient des éléments justes mais incomplets ou imprécis
- INCORRECT : la réponse est fausse mais sans danger
- RED_FLAG : la réponse contient une erreur grave, dangereuse ou une hallucination flagrante
- Base-toi PRIORITAIREMENT sur les extraits du cours fournis
- N'invente jamais de faits absents des sources
- Identifie les misconceptions parmi celles listées dans la concept_map quand pertinent"""


USER_TEMPLATE = """Question / contexte de la conversation :
{conversation_tail}

Réponse de l'étudiant à évaluer :
\"\"\"{student_answer}\"\"\"

Concepts clés du cours (concept_map) :
{concepts_summary}

Misconceptions connues :
{misconceptions_list}

Extraits pertinents du cours (RAG) :
{rag_extracts}

Recherche web complémentaire :
{web_results}

Évalue la réponse et renvoie le JSON."""


class FactCheckerAgent:
    """Validates the student's last answer against course materials and the web."""

    def __init__(self) -> None:
        self._llm = None

    def _get_llm(self) -> ChatGroq:
        if self._llm is None:
            self._llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0,
                model_kwargs={"response_format": {"type": "json_object"}},
            )
        return self._llm

    def _format_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "(aucun extrait pertinent trouvé)"
        out = []
        for i, c in enumerate(chunks, start=1):
            text = (c.get("text") or "").strip().replace("\n", " ")
            page = c.get("metadata", {}).get("page", "?")
            out.append(f"[{i}] (page {page}) {text[:400]}")
        return "\n".join(out)

    def _conversation_tail(self, history: List[Dict[str, str]], n: int = 3) -> str:
        if not history:
            return "(début de l'examen — pas encore de question posée)"
        tail = history[-n:]
        return "\n".join(f"- {m.get('role', '?')}: {m.get('content', '')}" for m in tail)

    def _summarise_concepts(self, concept_map: Dict[str, Any]) -> str:
        concepts = concept_map.get("core_concepts", []) or []
        if not concepts:
            return "(aucun)"
        return ", ".join(c.get("name", "?") for c in concepts[:8])

    def _list_misconceptions(self, concept_map: Dict[str, Any]) -> str:
        miscs = concept_map.get("misconceptions", []) or []
        if not miscs:
            return "(aucune répertoriée)"
        return "; ".join(str(m) for m in miscs[:6])

    def _web_search(self, query: str, max_results: int = 3) -> str:
        if DDGS is None:
            return "(DuckDuckGo non disponible)"
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
            if not results:
                return "(aucun résultat web)"
            lines = []
            for r in results:
                title = r.get("title", "")
                body = (r.get("body") or "")[:200]
                lines.append(f"- {title} : {body}")
            return "\n".join(lines)
        except Exception as exc:
            logger.warning("DuckDuckGo search failed: %s", exc)
            return f"(recherche web indisponible : {exc})"

    @staticmethod
    def _last_student_message(history: List[Dict[str, str]]) -> str:
        for m in reversed(history or []):
            if m.get("role") == "student":
                return m.get("content", "")
        return ""

    async def run(self, state: SessionState) -> SessionState:
        classroom_id = state.get("classroom_id", "")
        concept_map = state.get("concept_map", {}) or {}
        student_answer = self._last_student_message(state.get("conversation_history", []))

        rag = get_rag_service()
        chunks = rag.query(classroom_id=classroom_id, question=student_answer, k=4)
        state["rag_context"] = chunks

        topic = state.get("topic", "")
        web_query = f"{topic} {student_answer}".strip()[:200]
        web_results = self._web_search(web_query)

        user_msg = USER_TEMPLATE.format(
            conversation_tail=self._conversation_tail(state.get("conversation_history", [])),
            student_answer=student_answer,
            concepts_summary=self._summarise_concepts(concept_map),
            misconceptions_list=self._list_misconceptions(concept_map),
            rag_extracts=self._format_chunks(chunks),
            web_results=web_results,
        )

        try:
            response = self._get_llm().invoke([
                ("system", SYSTEM_PROMPT),
                ("user", user_msg),
            ])
            verdict = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("FactChecker JSON invalide : %s", exc)
            verdict = {
                "verdict": "INCORRECT",
                "confidence": 0.0,
                "explanation": f"JSON parse failed: {exc}",
                "matched_concepts": [],
                "misconceptions_detected": [],
            }
        except Exception as exc:
            logger.exception("FactChecker LLM call failed")
            verdict = {
                "verdict": "INCORRECT",
                "confidence": 0.0,
                "explanation": f"LLM error: {exc}",
                "matched_concepts": [],
                "misconceptions_detected": [],
            }

        state["fact_check_verdict"] = verdict
        return state


fact_checker = FactCheckerAgent()
