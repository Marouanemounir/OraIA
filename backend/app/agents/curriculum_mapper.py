"""Curriculum mapper — concept map generation and topic tracking."""
from app.agents.state import SessionState


class CurriculumMapperAgent:
    """
    Builds and updates a concept map of the course.
    Tracks which topics have been covered and identifies gaps.
    """

    async def initialize(self, state: SessionState) -> SessionState:
        """Parse course RAG chunks to build initial topic list."""
        # TODO: extract main concepts from course via LLM + RAG
        # TODO: populate state.topics_pending
        raise NotImplementedError

    async def update(self, state: SessionState) -> SessionState:
        """Refresh concept map after a set of turns."""
        # TODO: mark covered topics, detect gaps, update state.concept_map
        raise NotImplementedError


curriculum_mapper = CurriculumMapperAgent()
