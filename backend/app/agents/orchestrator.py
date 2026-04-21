"""Orchestrator — deterministic routing between agents."""
from app.agents.state import SessionState


class OrchestratorAgent:
    """
    Decides which agent handles the next step based on session state.
    No LLM call — pure deterministic logic.
    """

    MAX_TURNS = 20

    def route(self, state: SessionState) -> str:
        """Return the name of the next agent node."""
        if state.exam_finished or state.turn_count >= self.MAX_TURNS:
            return "grader"  # Final grading pass

        if state.remediation_needed:
            return "pedagogical_agent"

        if state.turn_count % 5 == 0 and state.turn_count > 0:
            return "curriculum_mapper"  # Periodic concept-map refresh

        # Default flow: fact-check → interrogate
        if state.current_student_input and state.fact_check_verdict is None:
            return "fact_checker"

        return "interrogator"


orchestrator = OrchestratorAgent()
