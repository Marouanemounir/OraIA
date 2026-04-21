"""Interrogator — Socratic dialogue agent."""
from app.agents.state import SessionState


class InterrogatorAgent:
    """
    Generates the next Socratic question based on the conversation history,
    current Bloom level, and topics pending.
    """

    async def run(self, state: SessionState) -> SessionState:
        """
        Produce the next agent utterance and append it to state.messages.
        Returns updated state.
        """
        # TODO: build prompt from state.messages + state.topics_pending
        # TODO: call Groq LLM via langchain_groq.ChatGroq
        # TODO: apply guardrails.filter_output()
        # TODO: append Message(role="agent", agent="interrogator", content=...) to state
        raise NotImplementedError


interrogator = InterrogatorAgent()
