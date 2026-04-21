"""Fact-checker — RAG + optional web search validation."""
from app.agents.state import SessionState


class FactCheckerAgent:
    """
    Validates the student's last answer against:
    1. Course materials (ChromaDB RAG)
    2. Web search fallback (DuckDuckGo)
    Updates state.retrieved_chunks and state.fact_check_verdict.
    """

    async def run(self, state: SessionState) -> SessionState:
        # TODO: retrieve relevant chunks via rag_service.retrieve()
        # TODO: use LLM to assess whether student answer is correct
        # TODO: optionally call DuckDuckGoSearchRun for web validation
        # TODO: set state.fact_check_verdict = True/False
        # TODO: set state.retrieved_chunks
        raise NotImplementedError


fact_checker = FactCheckerAgent()
