"""Pedagogical agent — Bloom-level analysis, strategy choice, remediation plan."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from langchain_groq import ChatGroq

from app.agents.state import SessionState

logger = logging.getLogger(__name__)


STRATEGY_SYSTEM = """Tu es un expert en pédagogie analysant l'évolution d'un examen oral.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "bloom_level": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "strategy": "simplify" | "deepen" | "redirect" | "challenge",
  "recurring_misconceptions": ["string", ...],
  "next_focus": "string"
}

Règles de stratégie :
- "simplify" : l'étudiant est perdu, scores bas, beaucoup d'erreurs → revenir aux bases
- "deepen" : l'étudiant maîtrise, demander plus de profondeur sur le même concept
- "redirect" : misconception récurrente → corriger sans le brusquer
- "challenge" : Bloom Analyze ou + atteint de manière stable → pousser plus haut
- recurring_misconceptions : liste des erreurs vues 2 fois ou plus dans la session
- next_focus : un concept précis sur lequel concentrer la prochaine question"""


REMEDIATION_SYSTEM = """Tu es un expert en pédagogie générant un plan de remédiation final.

Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans texte avant ni après.

Schéma exact attendu :
{
  "bloom_level": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  "strategy": "remediation_final",
  "recurring_misconceptions": ["string", ...],
  "remediation_plan": [
    {
      "concept": "string",
      "issue": "string",
      "action": "string (suggestion concrète)",
      "rag_references": [{"source": "string", "page": int}, ...]
    }
  ]
}

Règles :
- 3 à 6 entrées dans remediation_plan, ordonnées par priorité
- rag_references pointe vers les pages exactes du cours utiles à la révision
- Reprends les misconceptions détectées tout au long de l'examen
- Sois concret et actionnable"""


STRATEGY_USER_TEMPLATE = """Tour : {current_turn}/{max_turns}

Verdict du fact-checker pour ce tour :
{verdict_json}

Score (rubric) courant :
{rubric_json}

Misconceptions vues précédemment :
{previous_misconceptions}

Conversation récente :
{recent_history}

Concept map :
{concepts_summary}

Renvoie le JSON de stratégie."""


REMEDIATION_USER_TEMPLATE = """Sujet : {topic}

Conversation complète :
{full_conversation}

Score final agrégé :
{rubric_json}

Concept map :
{concepts_summary}

Misconceptions accumulées :
{all_misconceptions}

Extraits RAG disponibles (pour les références de page) :
{rag_extracts}

Génère le plan de remédiation JSON."""


class PedagogicalAgent:
    """Reads verdict + rubric to recommend a teaching strategy or final remediation."""

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

    def _summarise_concepts(self, concept_map: Dict[str, Any]) -> str:
        concepts = concept_map.get("core_concepts", []) or []
        if not concepts:
            return "(non disponible)"
        return ", ".join(c.get("name", "?") for c in concepts[:8])

    def _recent_history(self, history: List[Dict[str, str]], n: int = 4) -> str:
        if not history:
            return "(début)"
        return "\n".join(
            f"- {m.get('role', '?')}: {m.get('content', '')}" for m in history[-n:]
        )

    def _full_conversation(self, history: List[Dict[str, str]]) -> str:
        if not history:
            return "(vide)"
        return "\n".join(f"- {m.get('role', '?')}: {m.get('content', '')}" for m in history)

    def _format_rag(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "(aucun)"
        out = []
        for i, c in enumerate(chunks, start=1):
            meta = c.get("metadata", {}) or {}
            src = meta.get("source", "?")
            page = meta.get("page", "?")
            text = (c.get("text") or "")[:200].replace("\n", " ")
            out.append(f"[{i}] {src} p.{page} — {text}")
        return "\n".join(out)

    async def run(self, state: SessionState) -> SessionState:
        previous = state.get("pedagogical_insight", {}) or {}

        user_msg = STRATEGY_USER_TEMPLATE.format(
            current_turn=state.get("current_turn", 0),
            max_turns=state.get("max_turns", 8),
            verdict_json=json.dumps(state.get("fact_check_verdict", {}) or {}, ensure_ascii=False),
            rubric_json=json.dumps(state.get("grading_rubric", {}) or {}, ensure_ascii=False),
            previous_misconceptions=json.dumps(
                previous.get("recurring_misconceptions", []), ensure_ascii=False
            ),
            recent_history=self._recent_history(state.get("conversation_history", [])),
            concepts_summary=self._summarise_concepts(state.get("concept_map", {}) or {}),
        )

        try:
            response = self._get_llm().invoke([
                ("system", STRATEGY_SYSTEM),
                ("user", user_msg),
            ])
            insight = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("PedagogicalAgent (strategy) JSON invalide : %s", exc)
            insight = {
                "bloom_level": "Remember",
                "strategy": "simplify",
                "recurring_misconceptions": previous.get("recurring_misconceptions", []),
                "next_focus": state.get("topic", ""),
                "error": str(exc),
            }
        except Exception as exc:
            logger.exception("PedagogicalAgent (strategy) LLM call failed")
            insight = {
                "bloom_level": "Remember",
                "strategy": "simplify",
                "recurring_misconceptions": previous.get("recurring_misconceptions", []),
                "next_focus": state.get("topic", ""),
                "error": str(exc),
            }

        state["pedagogical_insight"] = insight
        return state

    async def remediation(self, state: SessionState) -> SessionState:
        previous = state.get("pedagogical_insight", {}) or {}
        all_misconceptions: List[str] = list(previous.get("recurring_misconceptions", []))
        verdict = state.get("fact_check_verdict", {}) or {}
        all_misconceptions.extend(verdict.get("misconceptions_detected", []) or [])

        user_msg = REMEDIATION_USER_TEMPLATE.format(
            topic=state.get("topic", ""),
            full_conversation=self._full_conversation(state.get("conversation_history", [])),
            rubric_json=json.dumps(state.get("grading_rubric", {}) or {}, ensure_ascii=False),
            concepts_summary=self._summarise_concepts(state.get("concept_map", {}) or {}),
            all_misconceptions=json.dumps(list(set(all_misconceptions)), ensure_ascii=False),
            rag_extracts=self._format_rag(state.get("rag_context", []) or []),
        )

        try:
            response = self._get_llm().invoke([
                ("system", REMEDIATION_SYSTEM),
                ("user", user_msg),
            ])
            insight = json.loads(response.content)
        except json.JSONDecodeError as exc:
            logger.error("PedagogicalAgent (remediation) JSON invalide : %s", exc)
            insight = {
                "bloom_level": previous.get("bloom_level", "Remember"),
                "strategy": "remediation_final",
                "recurring_misconceptions": list(set(all_misconceptions)),
                "remediation_plan": [],
                "error": str(exc),
            }
        except Exception as exc:
            logger.exception("PedagogicalAgent (remediation) LLM call failed")
            insight = {
                "bloom_level": previous.get("bloom_level", "Remember"),
                "strategy": "remediation_final",
                "recurring_misconceptions": list(set(all_misconceptions)),
                "remediation_plan": [],
                "error": str(exc),
            }

        state["pedagogical_insight"] = insight
        return state


pedagogical_agent = PedagogicalAgent()
