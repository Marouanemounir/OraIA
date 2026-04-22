"""Interrogator — Socratic adaptive question generator (the only visible agent)."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from langchain_groq import ChatGroq

from app.agents.state import SessionState

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """Tu es un examinateur socratique expérimenté qui mène un examen oral.

Règles ABSOLUES :
1. Ne confirme JAMAIS et n'infirme JAMAIS directement la réponse de l'étudiant.
2. Pose UNE seule question ouverte, adaptative, qui force l'étudiant à creuser ou à se justifier.
3. Adapte-toi à la langue de l'étudiant (français ou anglais selon ses derniers messages).
4. Sois encourageant mais exigeant.
5. Phrases COURTES — maximum 200 caractères par phrase (contrainte TTS Orpheus).
6. Maximum 2 phrases au total.
7. Aucun markdown, aucune liste, aucun préfixe ("Question :", etc.). Juste la question.
8. Si la concept_map a des concepts non couverts, oriente progressivement vers eux.
9. Si l'agent pédagogique recommande "simplify" : pose une question plus accessible.
   "deepen" : approfondis le concept en cours.
   "redirect" : reformule pour corriger une misconception sans la nommer.
   "challenge" : pose une question plus difficile au niveau Bloom supérieur."""


USER_TEMPLATE = """Sujet : {topic}
Tour : {current_turn}/{max_turns}

Concepts du cours (concept_map) :
{concepts_summary}
Concepts déjà abordés : {covered}
Concepts non encore abordés : {uncovered}

Dernier verdict du fact-checker :
{verdict_json}

Stratégie pédagogique recommandée :
{insight_json}

Conversation récente :
{recent_history}

Génère la prochaine question (une seule, courte)."""


class InterrogatorAgent:
    """Generates the next Socratic question — the only agent visible to the student."""

    MAX_CHARS_PER_SENTENCE = 200

    def __init__(self) -> None:
        self._llm = None

    def _get_llm(self) -> ChatGroq:
        if self._llm is None:
            self._llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=300,
            )
        return self._llm

    def _summarise_concepts(self, concept_map: Dict[str, Any]) -> str:
        concepts = concept_map.get("core_concepts", []) or []
        if not concepts:
            return "(non disponible)"
        return ", ".join(c.get("name", "?") for c in concepts[:8])

    def _coverage(self, history: List[Dict[str, str]], concept_map: Dict[str, Any]):
        concepts = [c.get("name", "") for c in (concept_map.get("core_concepts") or []) if c.get("name")]
        if not concepts:
            return "(?)", "(?)"
        text = " ".join(m.get("content", "") for m in history).lower()
        covered = [c for c in concepts if c.lower() in text]
        uncovered = [c for c in concepts if c not in covered]
        return ", ".join(covered) or "(aucun)", ", ".join(uncovered) or "(aucun)"

    def _recent_history(self, history: List[Dict[str, str]], n: int = 4) -> str:
        if not history:
            return "(début de l'examen — pose une question d'ouverture sur le sujet)"
        tail = history[-n:]
        return "\n".join(f"- {m.get('role', '?')}: {m.get('content', '')}" for m in tail)

    def _enforce_sentence_limit(self, text: str) -> str:
        text = text.strip().strip('"').strip("`")
        # split into sentences, truncate any that exceed the cap
        parts = re.split(r"(?<=[.?!])\s+", text)
        clipped = []
        for p in parts:
            p = p.strip()
            if not p:
                continue
            if len(p) > self.MAX_CHARS_PER_SENTENCE:
                p = p[: self.MAX_CHARS_PER_SENTENCE - 1].rstrip() + "?"
            clipped.append(p)
        return " ".join(clipped[:2])  # max 2 sentences

    async def run(self, state: SessionState) -> SessionState:
        concept_map = state.get("concept_map", {}) or {}
        history = state.get("conversation_history", []) or []
        covered, uncovered = self._coverage(history, concept_map)

        user_msg = USER_TEMPLATE.format(
            topic=state.get("topic", ""),
            current_turn=state.get("current_turn", 0),
            max_turns=state.get("max_turns", 8),
            concepts_summary=self._summarise_concepts(concept_map),
            covered=covered,
            uncovered=uncovered,
            verdict_json=json.dumps(state.get("fact_check_verdict", {}) or {}, ensure_ascii=False),
            insight_json=json.dumps(state.get("pedagogical_insight", {}) or {}, ensure_ascii=False),
            recent_history=self._recent_history(history),
        )

        try:
            response = self._get_llm().invoke([
                ("system", SYSTEM_PROMPT),
                ("user", user_msg),
            ])
            question = self._enforce_sentence_limit(response.content)
        except Exception as exc:
            logger.exception("Interrogator LLM call failed")
            question = "Pouvez-vous reformuler votre raisonnement ?"

        history.append({"role": "examiner", "content": question})
        state["conversation_history"] = history
        return state


interrogator = InterrogatorAgent()
