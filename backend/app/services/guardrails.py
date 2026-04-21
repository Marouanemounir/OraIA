"""Guardrails — input sanitisation and output filtering."""
from typing import Optional


class Guardrails:
    # Keywords/patterns that must never appear in agent output
    _BLOCKED_PATTERNS: list[str] = []

    def sanitize_input(self, text: str) -> str:
        """Strip prompt-injection attempts and PII from student input."""
        # TODO: implement regex-based and LLM-based sanitisation
        return text.strip()

    def filter_output(self, text: str) -> str:
        """Ensure agent output does not contain harmful or off-topic content."""
        # TODO: check against _BLOCKED_PATTERNS and policy rules
        return text

    def is_on_topic(self, text: str, course_topic: str) -> bool:
        """Return False if student input is clearly off-topic for the course."""
        # TODO: lightweight classifier or keyword heuristic
        return True


guardrails = Guardrails()
