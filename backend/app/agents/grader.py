"""Grader — live scoring per turn + final report at end of session."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from langchain_groq import ChatGroq

from app.agents.state import SessionState

logger = logging.getLogger(__name__)


SCORE_UPDATE_SYSTEM = """Tu es un évaluateur académique rigoureux notant un examen oral en direct.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "factual_accuracy": 0-25,
  "depth_of_understanding": 0-25,
  "critical_reasoning": 0-25,
  "communication_clarity": 0-25,
  "total": 0-100,
  "bloom_level": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "linguistic_quality": {
    "grammar": 0-10,
    "technical_vocabulary": 0-10,
    "expression_clarity": 0-10
  }
}

Règles :
- factual_accuracy reflète la justesse vis-à-vis du verdict du fact-checker
- depth_of_understanding mesure la profondeur, les nuances, les liens entre concepts
- critical_reasoning évalue l'argumentation et la pensée critique
- communication_clarity juge la structure et la clarté du discours
- total = somme des 4 critères principaux
- bloom_level = niveau cognitif démontré DANS CE TOUR
- linguistic_quality évalue la grammaire, le vocabulaire technique, et la clarté d'expression"""


FINAL_REPORT_SYSTEM = """Tu es un évaluateur académique générant le rapport final d'un examen oral.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "final_score": 0-100,
  "grade": "A" | "B" | "C" | "D" | "F",
  "bloom_level_reached": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "factual_accuracy_avg": 0-25,
  "depth_of_understanding_avg": 0-25,
  "critical_reasoning_avg": 0-25,
  "communication_clarity_avg": 0-25,
  "linguistic_quality_summary": {
    "grammar": 0-10,
    "technical_vocabulary": 0-10,
    "expression_clarity": 0-10
  },
  "qualitative_feedback": "string (3-5 phrases)"
}

Échelle de notes :
- A : 85-100  | B : 70-84  | C : 55-69  | D : 40-54  | F : 0-39
- 3-6 strengths concrètes basées sur la conversation
- 3-6 weaknesses précises et actionnables
- bloom_level_reached = niveau MAXIMAL atteint de manière stable"""


SCORE_USER_TEMPLATE = """Sujet : {topic}
Tour actuel : {current_turn}/{max_turns}

Dernier échange :
{recent_exchange}

Verdict du fact-checker :
{verdict_json}

Score courant (avant ce tour) :
{previous_score}

Évalue ce tour et renvoie le JSON du nouveau score."""


FINAL_USER_TEMPLATE = """Sujet : {topic}
Nombre de tours : {turn_count}

Conversation complète :
{full_conversation}

Scores agrégés sur la session (un objet par tour) :
{score_history}

Concept map du cours :
{concepts_summary}

Génère le rapport final JSON."""


class GraderAgent:
    """Two modes: SCORE_UPDATE (per turn) and FINAL_REPORT (end of session)."""

    BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]

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

    def _recent_exchange(self, history: List[Dict[str, str]]) -> str:
        if not history:
            return "(aucun échange)"
        tail = history[-2:]
        return "\n".join(f"- {m.get('role', '?')}: {m.get('content', '')}" for m in tail)

    def _full_conversation(self, history: List[Dict[str, str]]) -> str:
        if not history:
            return "(vide)"
        return "\n".join(f"- {m.get('role', '?')}: {m.get('content', '')}" for m in history)

    def _summarise_concepts(self, concept_map: Dict[str, Any]) -> str:
        concepts = concept_map.get("core_concepts", []) or []
        if not concepts:
            return "(non disponible)"
        return ", ".join(c.get("name", "?") for c in concepts[:8])

    async def score_turn(self, state: SessionState) -> SessionState:
        verdict = state.get("fact_check_verdict", {}) or {}
        previous = state.get("grading_rubric", {}) or {}

        user_msg = SCORE_USER_TEMPLATE.format(
            topic=state.get("topic", ""),
            current_turn=state.get("current_turn", 0),
            max_turns=state.get("max_turns", 8),
            recent_exchange=self._recent_exchange(state.get("conversation_history", [])),
            verdict_json=json.dumps(verdict, ensure_ascii=False),
            previous_score=json.dumps(previous, ensure_ascii=False) if previous else "(aucun)",
        )

        try:
            response = self._get_llm().invoke([
                ("system", SCORE_UPDATE_SYSTEM),
                ("user", user_msg),
            ])
            rubric = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("Grader (score) JSON invalide : %s", exc)
            rubric = {
                "factual_accuracy": 0,
                "depth_of_understanding": 0,
                "critical_reasoning": 0,
                "communication_clarity": 0,
                "total": 0,
                "bloom_level": "Remember",
                "linguistic_quality": {"grammar": 0, "technical_vocabulary": 0, "expression_clarity": 0},
                "error": str(exc),
            }
        except Exception as exc:
            logger.exception("Grader (score) LLM call failed")
            rubric = {
                "factual_accuracy": 0,
                "depth_of_understanding": 0,
                "critical_reasoning": 0,
                "communication_clarity": 0,
                "total": 0,
                "bloom_level": "Remember",
                "linguistic_quality": {"grammar": 0, "technical_vocabulary": 0, "expression_clarity": 0},
                "error": str(exc),
            }

        # Append history (kept inside the rubric dict so finalize can aggregate)
        history = previous.get("turn_scores", []) if isinstance(previous, dict) else []
        rubric["turn_scores"] = history + [
            {k: rubric.get(k) for k in (
                "factual_accuracy",
                "depth_of_understanding",
                "critical_reasoning",
                "communication_clarity",
                "total",
                "bloom_level",
                "linguistic_quality",
            )}
        ]

        state["grading_rubric"] = rubric
        return state

    async def finalize(self, state: SessionState) -> SessionState:
        rubric = state.get("grading_rubric", {}) or {}
        history = rubric.get("turn_scores", [])

        user_msg = FINAL_USER_TEMPLATE.format(
            topic=state.get("topic", ""),
            turn_count=state.get("current_turn", 0),
            full_conversation=self._full_conversation(state.get("conversation_history", [])),
            score_history=json.dumps(history, ensure_ascii=False, indent=2),
            concepts_summary=self._summarise_concepts(state.get("concept_map", {}) or {}),
        )

        try:
            response = self._get_llm().invoke([
                ("system", FINAL_REPORT_SYSTEM),
                ("user", user_msg),
            ])
            report = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("Grader (final) JSON invalide : %s", exc)
            report = {
                "final_score": 0,
                "grade": "F",
                "bloom_level_reached": "Remember",
                "strengths": [],
                "weaknesses": [],
                "qualitative_feedback": f"JSON parse failed: {exc}",
            }
        except Exception as exc:
            logger.exception("Grader (final) LLM call failed")
            report = {
                "final_score": 0,
                "grade": "F",
                "bloom_level_reached": "Remember",
                "strengths": [],
                "weaknesses": [],
                "qualitative_feedback": f"LLM error: {exc}",
            }

        state["final_report"] = report
        return state


grader = GraderAgent()
