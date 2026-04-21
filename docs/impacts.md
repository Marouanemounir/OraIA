# Impacts & Considerations — Socratic Viva v2

## Pedagogical Impact

- **Adaptive difficulty** — Bloom taxonomy progression prevents both boredom and frustration
- **Immediate feedback** — live scoring gives students real-time awareness of performance
- **Concept coverage** — curriculum mapper ensures no topic is skipped
- **Remediation** — pedagogical agent prevents students from getting stuck

## Technical Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Groq API rate limits | Medium | Exponential backoff + queue |
| LLM hallucination in fact-checker | High | RAG ground truth + web search |
| ChromaDB cold-start latency | Low | Persistent volume mount |
| STT transcription errors (accents) | Medium | Text fallback input |
| WebSocket connection drops | Medium | Reconnect + state recovery from DB |

## Ethical Considerations

- **Privacy** — audio transcripts stored; must comply with GDPR / local regulations
- **Bias** — LLM grader may be biased against non-native speakers; calibration needed
- **Transparency** — students must know they are being evaluated by AI
- **Accessibility** — text input fallback required for students with speech difficulties

## Scalability Path

1. **Phase 1** — SQLite + local ChromaDB (dev / small deployment)
2. **Phase 2** — PostgreSQL + managed ChromaDB / Qdrant
3. **Phase 3** — Horizontal scaling via Redis-backed session state

## Cost Estimate (per exam session)

| Resource | Approx. cost |
|----------|-------------|
| Groq LLM (20 turns × ~500 tokens) | ~$0.002 |
| Groq Whisper (20 turns × ~30s audio) | ~$0.01 |
| ChromaDB (self-hosted) | $0 |
| **Total per session** | **~$0.012** |
