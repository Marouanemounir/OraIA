"""Pedagogical agent — adaptive strategy and remediation."""
from app.agents.state import SessionState


class PedagogicalAgent:
    """
    Decides remediation strategy when a student is struggling.
    Can lower Bloom level, provide progressive hints, or rephrase questions.
    """

    async def run(self, state: SessionState) -> SessionState:
        """Produce a remediation or hint utterance."""
        # TODO: choose strategy based on state.hint_level and state.bloom_level
        # TODO: generate hint/explanation via LLM
        # TODO: increment state.hint_level
        # TODO: set state.remediation_needed = False after intervention
        # TODO: append Message to state.messages
        raise NotImplementedError


pedagogical_agent = PedagogicalAgent()
