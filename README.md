# Socratic Viva v2

> AI-powered multi-agent oral examination platform

## Overview

Socratic Viva v2 is a platform that conducts adaptive oral exams via a pipeline of specialised AI agents:
- **Orchestrator** — deterministic routing (no LLM cost)
- **Interrogator** — Socratic dialogue generation (Groq LLM)
- **Fact-Checker** — answer validation via RAG (ChromaDB) + web search
- **Grader** — live scoring aligned to Bloom's taxonomy
- **Curriculum Mapper** — concept coverage tracking
- **Pedagogical Agent** — adaptive remediation and hints

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend API | FastAPI + SQLAlchemy (SQLite) |
| Agent pipeline | LangGraph + LangChain-Groq |
| Vector store | ChromaDB + sentence-transformers |
| Voice | Groq Whisper (STT) + Groq TTS |
| Frontend | Next.js (to be scaffolded) |
| Containerisation | Docker + Docker Compose |

---

## Setup

### 1. Clone & configure

```bash
git clone <repo-url>
cd socratic-viva-v2
cp .env.example .env
# Fill in GROQ_API_KEY and SECRET_KEY in .env
```

### 2. Backend (local dev)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

### 3. Frontend (not yet scaffolded)

```bash
cd frontend
npx create-next-app@latest .
# Follow Next.js setup prompts
```

### 4. Docker Compose

```bash
docker-compose up --build
```

---

## Project Structure

```
socratic-viva-v2/
├── backend/
│   ├── app/
│   │   ├── agents/      # LangGraph multi-agent pipeline
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── routers/     # FastAPI route handlers
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── services/    # RAG, Voice, Guardrails
│   │   └── websocket/   # Real-time exam session handler
│   └── requirements.txt
├── frontend/            # Next.js app (to be initialised)
└── docs/
    ├── architecture.md
    └── impacts.md
```

---

## Development Roadmap

- [ ] Auth service (JWT register/login)
- [ ] Classroom CRUD + invite code enrollment
- [ ] PDF ingestion pipeline (RAG service)
- [ ] LangGraph agent implementations
- [ ] WebSocket exam session (STT → agents → TTS)
- [ ] Next.js frontend scaffold
- [ ] Teacher dashboard (results, concept maps)
- [ ] Deployment (Railway / Render)
