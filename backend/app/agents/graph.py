"""LangGraph graph definition — wires all agents and exposes run_exam_turn."""
from __future__ import annotations

import logging
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.curriculum_mapper import curriculum_mapper
from app.agents.fact_checker import fact_checker
from app.agents.grader import grader
from app.agents.interrogator import interrogator
from app.agents.orchestrator import orchestrator
from app.agents.pedagogical_agent import pedagogical_agent
from app.agents.state import SessionState

logger = logging.getLogger(__name__)


def _build_graph():
    g = StateGraph(SessionState)

    # Each turn-pipeline node
    g.add_node("curriculum_mapper", curriculum_mapper.update)
    g.add_node("fact_checker", fact_checker.run)
    g.add_node("grader_score", grader.score_turn)
    g.add_node("pedagogical_strategy", pedagogical_agent.run)
    g.add_node("interrogator", interrogator.run)
    g.add_node("grader_final", grader.finalize)
    g.add_node("pedagogical_remediation", pedagogical_agent.remediation)

    # Entry routing — orchestrator decides which pipeline to enter
    g.add_conditional_edges(
        START,
        lambda s: orchestrator.route(s),
        {
            "curriculum_mapper": "curriculum_mapper",
            "fact_checker": "fact_checker",
            "grader_final": "grader_final",
            "end": END,
        },
    )

    # Linear pipelines (deterministic)
    g.add_edge("curriculum_mapper", END)
    g.add_edge("fact_checker", "grader_score")
    g.add_edge("grader_score", "pedagogical_strategy")
    g.add_edge("pedagogical_strategy", "interrogator")
    g.add_edge("interrogator", END)
    g.add_edge("grader_final", "pedagogical_remediation")
    g.add_edge("pedagogical_remediation", END)

    return g.compile(checkpointer=MemorySaver())


# Singleton compiled graph
exam_graph = _build_graph()


def _thread_id(state: SessionState) -> str:
    return f"{state.get('classroom_id', '?')}::{state.get('student_id', '?')}"


async def run_exam_turn(state: SessionState, student_message: str) -> SessionState:
    """Advance the exam by one turn.

    - First call (exam_status="mapping"): builds the concept map.
    - During "examining": appends the student message, runs
      fact_checker → grader_score → pedagogical_strategy → interrogator.
    - When max_turns is reached: runs grader_final → pedagogical_remediation
      and sets exam_status="complete".
    """
    state.setdefault("conversation_history", [])
    state.setdefault("current_turn", 0)
    state.setdefault("max_turns", 8)
    state.setdefault("exam_status", "mapping")

    # Append the student turn (and increment counter) when in examining mode
    if student_message and state.get("exam_status") == "examining":
        state["conversation_history"].append({"role": "student", "content": student_message})
        state["current_turn"] = state.get("current_turn", 0) + 1

    config: dict[str, Any] = {"configurable": {"thread_id": _thread_id(state)}}

    # First pass through the graph
    state = await exam_graph.ainvoke(state, config=config)

    # If we exhausted turns during this pass, transition to grading_final
    # and run an extra pass to produce the report + remediation plan.
    if (
        state.get("exam_status") == "examining"
        and state.get("current_turn", 0) >= state.get("max_turns", 8)
    ):
        state["exam_status"] = "grading_final"
        state = await exam_graph.ainvoke(state, config=config)

    if state.get("exam_status") == "grading_final" and state.get("final_report"):
        state["exam_status"] = "complete"

    return state
