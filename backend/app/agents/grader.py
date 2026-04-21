"""Grader — live scoring and Bloom taxonomy assessment."""
from app.agents.state import SessionState


class GraderAgent:
    """
    Updates running_score and bloom_level after each student turn.
    Produces final grading_details at end of session.
    """

    BLOOM_LEVELS = [
        "Knowledge", "Comprehension", "Application",
        "Analysis", "Synthesis", "Evaluation",
    ]

    async def score_turn(self, state: SessionState) -> SessionState:
        """Evaluate current student answer and update running_score."""
        # TODO: LLM call with rubric prompt (correctness, depth, clarity)
        # TODO: update state.running_score and state.bloom_level
        raise NotImplementedError

    async def finalize(self, state: SessionState) -> dict:
        """Generate complete grading_details for the session."""
        # TODO: aggregate per-turn scores
        # TODO: compute final_score (0-100), bloom_level_reached
        # TODO: generate qualitative feedback per topic
        raise NotImplementedError


grader = GraderAgent()
