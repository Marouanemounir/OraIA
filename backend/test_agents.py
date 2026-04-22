import sys, os, asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.agents.graph import run_exam_turn
from app.agents.state import SessionState

async def main():
    print("=" * 55)
    print("  TEST DES AGENTS — ora.IA")
    print("=" * 55)

    # ── 1. Créer un SessionState initial ─────────────────────
    state: SessionState = {
        "classroom_id": "test_class_001",
        "student_id": "student_42",
        "topic": "Les algorithmes de tri",
        "concept_map": {},
        "conversation_history": [],
        "current_turn": 0,
        "max_turns": 8,
        "fact_check_verdict": {},
        "grading_rubric": {},
        "pedagogical_insight": {},
        "final_report": {},
        "exam_status": "mapping",
        "rag_context": []
    }
    print("\n[1] SessionState créé ✓")

    # ── 2. Premier appel : génération de la carte conceptuelle ──
    print("\n[2] CurriculumMapper (exam_status='mapping')...")
    state = await run_exam_turn(state, "")

    print(f"    exam_status → {state['exam_status']}")
    if state.get("concept_map"):
        cm = state["concept_map"]
        concepts = cm.get("core_concepts", [])
        print(f"    concept_map → {len(concepts)} concepts générés")
        if concepts:
            print(f"    Premier concept : {concepts[0].get('name', '?')}")
        print("    ✓ CurriculumMapper OK")
    else:
        print("    ✗ concept_map vide — vérifie curriculum_mapper.py")

    # ── 3. Réponse correcte de l'étudiant ───────────────────
    print("\n[3] FactChecker + Grader + Interrogator + PedagogicalAgent...")
    student_msg = "Le tri rapide utilise la récursivité et a une complexité O(n log n) en moyenne."
    state = await run_exam_turn(state, student_msg)

    verdict = state.get("fact_check_verdict", {})
    if verdict:
        print(f"    FactChecker verdict  : {verdict.get('verdict', '?')}")
        print(f"    Confiance            : {verdict.get('confidence', '?')}")
        print("    ✓ FactChecker OK")
    else:
        print("    ✗ fact_check_verdict vide")

    rubric = state.get("grading_rubric", {})
    if rubric:
        print(f"    Grader score total   : {rubric.get('total', '?')}/100")
        print("    ✓ Grader OK")
    else:
        print("    ✗ grading_rubric vide")

    history = state.get("conversation_history", [])
    examiner_msgs = [m for m in history if m.get("role") == "examiner"]
    if examiner_msgs:
        last_q = examiner_msgs[-1].get("content", "")
        print(f"    Interrogator dit     : \"{last_q[:80]}...\"")
        print("    ✓ Interrogator OK")
    else:
        print("    ✗ Pas de message examiner dans l'historique")

    insight = state.get("pedagogical_insight", {})
    if insight:
        print(f"    Bloom level          : {insight.get('bloom_level', '?')}")
        print(f"    Stratégie            : {insight.get('strategy', '?')}")
        print("    ✓ Agent Pédagogique OK")
    else:
        print("    ✗ pedagogical_insight vide")

    # ── 4. Réponse incorrecte ──────────────────────────────
    print("\n[4] Test avec une réponse incorrecte...")
    state = await run_exam_turn(
        state,
        "Le tri rapide a une complexité O(n²) dans tous les cas."
    )
    v2 = state.get("fact_check_verdict", {})
    print(f"    Verdict : {v2.get('verdict', '?')}")
    if v2.get("verdict") in ["INCORRECT", "PARTIALLY_CORRECT"]:
        print("    ✓ FactChecker détecte bien les erreurs")
    else:
        print("    ⚠  FactChecker n'a pas détecté l'erreur — vérifie le prompt")

    print("\n" + "=" * 55)
    print("  ✅ TESTS TERMINÉS")
    print(f"  Turns effectués : {state['current_turn']}")
    print("=" * 55)

asyncio.run(main())