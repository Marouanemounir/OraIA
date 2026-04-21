"""Voice service — Speech-To-Text and Text-To-Speech via Groq."""
from typing import Optional


class VoiceService:
    def __init__(self):
        # TODO: initialize Groq client with settings.GROQ_API_KEY
        self._client = None

    async def transcribe(self, audio_bytes: bytes, language: str = "fr") -> str:
        """Convert audio bytes to text using Groq Whisper STT."""
        # TODO: call groq.audio.transcriptions.create with whisper-large-v3
        raise NotImplementedError

    async def synthesize(self, text: str, voice: str = "default") -> bytes:
        """Convert text to speech audio bytes (MP3/Opus)."""
        # TODO: call Groq TTS endpoint (or fallback to edge-tts / pyttsx3)
        # NOTE: Groq TTS API may be under active development — check docs
        raise NotImplementedError


voice_service = VoiceService()
