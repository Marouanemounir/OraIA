# Architecture — Socratic Viva v2

## High-Level Overview

```
Student (browser/app)
        │  WebSocket (audio/text)
        ▼
  FastAPI Backend
        │
        ├── REST API (/api/auth, /api/classrooms, /api/courses, /api/exams)
        │
        └── WebSocket /ws/exam/{session_id}
                │
                ▼
         LangGraph Pipeline
         ┌─────────────────────────────────────────────────┐
         │                                                 │
         │  [Orchestrator] ──routes──► [Interrogator]      │
         │       ▲                         │               │
         │       │                    [Fact-Checker]       │
         │       │                         │               │
         │       │                    [Grader]             │
         │       │                         │               │
         │       └──── [Curriculum Mapper] │               │
         │             [Pedagogical Agent]─┘               │
         └─────────────────────────────────────────────────┘
                │
                ├── ChromaDB (RAG — course vectors)
                ├── Groq API (LLM + STT + TTS)
                └── SQLite DB (users, sessions, results)
```

## Agent Responsibilities

| Agent | Input | Output |
|-------|-------|--------|
| Orchestrator | SessionState | Next agent name |
| Interrogator | History + topics_pending | Socratic question |
| Fact-Checker | Student answer + RAG chunks | Correctness verdict |
| Grader | Per-turn scores | running_score + bloom_level |
| Curriculum Mapper | RAG + covered topics | concept_map update |
| Pedagogical Agent | struggling signals | Hint / rephrased question |

## Data Flow (single exam turn)

1. Student sends audio → STT (Groq Whisper) → plain text
2. Guardrails sanitise input
3. SessionState updated with student message
4. Orchestrator routes → Fact-Checker
5. Fact-Checker: RAG retrieve → LLM verdict → state updated
6. Orchestrator routes → Grader → score updated
7. Orchestrator routes → Interrogator → next question generated
8. TTS synthesises question audio
9. Agent response + audio streamed back to client

## Storage

- **SQLite** — users, classrooms, enrollments, courses, exam_sessions
- **ChromaDB** — one collection per course (PDF chunks + embeddings)
- **Local filesystem** — raw PDF uploads (`uploads/`)

## Security

- JWT (HS256) with 24h expiry
- Role-based access (teacher / student) enforced at router level
- Input guardrails (prompt-injection filtering)
- Output guardrails (policy filter)
