"""LangGraph graph definition — wires all agents together."""
from langgraph.graph import StateGraph, END

from app.agents.state import SessionState
from app.agents.orchestrator import orchestrator
from app.agents.interrogator import interrogator
from app.agents.fact_checker import fact_checker
from app.agents.grader import grader
from app.agents.curriculum_mapper import curriculum_mapper
from app.agents.pedagogical_agent import pedagogical_agent


def build_graph() -> StateGraph:
    graph = StateGraph(SessionState)

    # Register nodes
    graph.add_node("orchestrator", lambda s: s)  # TODO: replace with orchestrator.route wrapper
    graph.add_node("interrogator", interrogator.run)
    graph.add_node("fact_checker", fact_checker.run)
    graph.add_node("grader", grader.score_turn)
    graph.add_node("curriculum_mapper", curriculum_mapper.update)
    graph.add_node("pedagogical_agent", pedagogical_agent.run)

    # Entry point
    graph.set_entry_point("orchestrator")

    # Conditional routing from orchestrator
    graph.add_conditional_edges(
        "orchestrator",
        lambda s: orchestrator.route(s),
        {
            "interrogator": "interrogator",
            "fact_checker": "fact_checker",
            "grader": "grader",
            "curriculum_mapper": "curriculum_mapper",
            "pedagogical_agent": "pedagogical_agent",
        },
    )

    # All agents return to orchestrator except grader which ends
    for node in ["interrogator", "fact_checker", "curriculum_mapper", "pedagogical_agent"]:
        graph.add_edge(node, "orchestrator")

    graph.add_edge("grader", END)

    return graph.compile()


# Singleton compiled graph
exam_graph = build_graph()
