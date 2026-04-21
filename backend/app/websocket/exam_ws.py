"""WebSocket endpoint for real-time exam sessions."""
import json
from fastapi import WebSocket, WebSocketDisconnect

from app.agents.graph import exam_graph
from app.agents.state import SessionState, Message
from app.services.voice_service import voice_service
from app.services.guardrails import guardrails


async def exam_websocket_handler(websocket: WebSocket, session_id: int):
    """
    Protocol:
      Client → Server: JSON { type: "audio", data: "<base64>" }
                    or { type: "text",  data: "<plain text>" }
      Server → Client: JSON { type: "agent_turn", agent: str, text: str,
                               audio: "<base64>", score: float }
               + JSON { type: "session_end", final_score: float, details: {...} }
    """
    await websocket.accept()
    try:
        # TODO: authenticate token from query params
        # TODO: load ExamSession from DB, init SessionState
        # TODO: run exam_graph.astream(state) on each student turn
        # TODO: stream agent responses back to client
        # TODO: persist session updates to DB at each turn
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)

            if payload.get("type") == "text":
                student_text = guardrails.sanitize_input(payload["data"])
            elif payload.get("type") == "audio":
                import base64
                audio_bytes = base64.b64decode(payload["data"])
                student_text = await voice_service.transcribe(audio_bytes)
            else:
                continue

            # TODO: invoke graph, stream responses
            await websocket.send_text(json.dumps({
                "type": "agent_turn",
                "agent": "interrogator",
                "text": f"[STUB] Received: {student_text}",
                "audio": None,
                "score": 0.0,
            }))

    except WebSocketDisconnect:
        # TODO: mark session as aborted if not completed
        pass
