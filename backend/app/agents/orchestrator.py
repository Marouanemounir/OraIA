"""Orchestrator — pure deterministic routing based on exam_status."""
from __future__ import annotations

from typing import Literal

from app.agents.state import SessionState

EntryNode = Literal["curriculum_mapper", "fact_checker", "grader_final", "end"]


class OrchestratorAgent:
    """No LLM call — decides which node enters the pipeline based on exam_status."""

    DEFAULT_MAX_TURNS = 8

    @staticmethod
    def _max_turns(state: SessionState) -> int:
        return state.get("max_turns") or OrchestratorAgent.DEFAULT_MAX_TURNS

    def route(self, state: SessionState) -> EntryNode:
        status = state.get("exam_status", "mapping")

        if status == "mapping":
            return "curriculum_mapper"

        if status == "examining":
            if state.get("current_turn", 0) >= self._max_turns(state):
                return "grader_final"
            return "fact_checker"

        if status == "grading_final":
            return "grader_final"

        return "end"


orchestrator = OrchestratorAgent()
