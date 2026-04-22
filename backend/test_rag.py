import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.rag_service import RAGService

# ── 1. Init ──────────────────────────────────────────────────────
rag = RAGService()
print("✓ RAGService initialisé")

# ── 2. Indexer un PDF ────────────────────────────────────────────
# Remplace par le chemin d'un vrai PDF uploadé au Sprint 1
PDF_PATH = "./uploads/ton_fichier.pdf"
CLASSROOM_ID = "test_class_001"

if not os.path.exists(PDF_PATH):
    # Crée un PDF minimal de test si tu n'en as pas
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt="Les algorithmes de tri sont fondamentaux en informatique.", ln=True)
        pdf.cell(200, 10, txt="Le tri rapide a une complexite O(n log n) en moyenne.", ln=True)
        pdf.cell(200, 10, txt="Le tri par insertion est efficace pour les petits tableaux.", ln=True)
        pdf.cell(200, 10, txt="Le tri fusion garantit O(n log n) dans tous les cas.", ln=True)
        pdf.output(PDF_PATH)
        print(f"✓ PDF de test créé : {PDF_PATH}")
    except ImportError:
        print("⚠  Installe fpdf2 : pip install fpdf2")
        print(f"   Ou place un vrai PDF dans : {PDF_PATH}")
        sys.exit(1)

chunk_count = rag.index_document(
    classroom_id=CLASSROOM_ID,
    file_path=PDF_PATH,
    material_id=1
)
print(f"✓ Indexation terminée : {chunk_count} chunks créés")

# ── 3. Vérifier les stats ────────────────────────────────────────
stats = rag.get_collection_stats(CLASSROOM_ID)
print(f"✓ Stats ChromaDB : {stats}")

# ── 4. Tester une query ──────────────────────────────────────────
results = rag.query(
    classroom_id=CLASSROOM_ID,
    question="Quelle est la complexité du tri rapide ?",
    k=3
)
print(f"\n✓ Query RAG — {len(results)} résultats :")
for i, r in enumerate(results):
    score = r.get('score', 'N/A')
    content = r.get('content', str(r))
    score_str = f"{score:.3f}" if isinstance(score, float) else str(score)
    print(f"  [{i+1}] score={score_str} | {content[:100]}...")

print("\n✅ RAG OK — ChromaDB fonctionne correctement")
print("   → Tu peux lancer test_agents.py")
