"""RAG service — ingestion PDF, chunking, embeddings, recherche via ChromaDB."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.database import SessionLocal
from app.models.course import CourseMaterial

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 50


class RAGService:
    """Service singleton — utilise get_rag_service() plutôt que le constructeur."""

    def __init__(self) -> None:
        persist_dir = settings.CHROMA_PERSIST_DIR
        Path(persist_dir).mkdir(parents=True, exist_ok=True)

        logger.info("Initialisation ChromaDB (persist_directory=%s)", persist_dir)
        self._client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        logger.info("Chargement modèle d'embeddings '%s'", EMBEDDING_MODEL_NAME)
        self._embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)

        self._splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=CHUNK_SIZE_TOKENS,
            chunk_overlap=CHUNK_OVERLAP_TOKENS,
        )

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _collection_name(classroom_id: str | int) -> str:
        return f"classroom_{classroom_id}"

    def _get_or_create_collection(self, classroom_id: str | int):
        return self._client.get_or_create_collection(name=self._collection_name(classroom_id))

    def _try_get_collection(self, classroom_id: str | int):
        try:
            return self._client.get_collection(name=self._collection_name(classroom_id))
        except Exception:
            return None

    def _extract_pages(self, file_path: str) -> List[Tuple[int, str]]:
        """Retourne [(page_num, text), ...] en sautant les pages vides."""
        try:
            reader = PdfReader(file_path)
        except Exception as exc:
            logger.exception("Lecture PDF impossible : %s", file_path)
            raise ValueError(f"PDF illisible ou corrompu : {exc}") from exc

        pages: List[Tuple[int, str]] = []
        for i, page in enumerate(reader.pages, start=1):
            try:
                text = (page.extract_text() or "").strip()
            except Exception as exc:
                logger.warning("Extraction page %d échouée : %s", i, exc)
                continue
            if text:
                pages.append((i, text))
        return pages

    # ── Public API ────────────────────────────────────────────────────────

    def index_document(
        self,
        classroom_id: str | int,
        file_path: str,
        material_id: int,
    ) -> int:
        """Indexe un PDF dans la collection de la classroom.

        Retourne le nombre de chunks créés et met à jour
        CourseMaterial.chunk_count en base.
        """
        logger.info(
            "Indexation material_id=%d classroom=%s file=%s",
            material_id, classroom_id, file_path,
        )

        pages = self._extract_pages(file_path)
        if not pages:
            logger.warning("Aucun texte extractible dans %s", file_path)
            return 0

        source_name = Path(file_path).name
        ids: List[str] = []
        docs: List[str] = []
        metas: List[Dict[str, Any]] = []

        for page_num, page_text in pages:
            for idx, chunk in enumerate(self._splitter.split_text(page_text)):
                ids.append(f"m{material_id}_p{page_num}_c{idx}")
                docs.append(chunk)
                metas.append({
                    "material_id": material_id,
                    "source": source_name,
                    "page": page_num,
                    "chunk_index": idx,
                })

        if not docs:
            logger.warning("Aucun chunk produit pour material_id=%d", material_id)
            return 0

        embeddings = self._embedder.encode(
            docs, convert_to_numpy=True, show_progress_bar=False,
        ).tolist()

        collection = self._get_or_create_collection(classroom_id)
        collection.add(ids=ids, documents=docs, metadatas=metas, embeddings=embeddings)

        # Persiste chunk_count dans CourseMaterial
        db = SessionLocal()
        try:
            material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
            if material is not None:
                material.chunk_count = len(docs)
                db.commit()
        finally:
            db.close()

        logger.info("Indexation OK : %d chunks pour material_id=%d", len(docs), material_id)
        return len(docs)

    def query(
        self,
        classroom_id: str | int,
        question: str,
        k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recherche sémantique dans la collection de la classroom.

        Retourne une liste de dicts :
        {id, text, score, metadata: {source, page, material_id, chunk_index}}
        Liste vide si la collection n'existe pas ou est vide.
        """
        collection = self._try_get_collection(classroom_id)
        if collection is None:
            logger.warning("Collection inexistante pour classroom=%s", classroom_id)
            return []

        count = collection.count()
        if count == 0:
            return []

        query_emb = self._embedder.encode(
            [question], convert_to_numpy=True, show_progress_bar=False,
        ).tolist()

        results = collection.query(
            query_embeddings=query_emb,
            n_results=min(k, count),
        )

        ids = (results.get("ids") or [[]])[0]
        docs = (results.get("documents") or [[]])[0]
        metas = (results.get("metadatas") or [[]])[0]
        dists = (results.get("distances") or [[]])[0]

        out: List[Dict[str, Any]] = []
        for i, cid in enumerate(ids):
            distance = dists[i] if i < len(dists) else None
            score = (1.0 - float(distance)) if distance is not None else None
            out.append({
                "id": cid,
                "text": docs[i] if i < len(docs) else "",
                "score": score,
                "metadata": metas[i] if i < len(metas) else {},
            })
        return out

    def get_collection_stats(self, classroom_id: str | int) -> Dict[str, Any]:
        """Nombre de chunks et de documents uniques indexés pour la classroom."""
        collection = self._try_get_collection(classroom_id)
        if collection is None:
            return {"classroom_id": str(classroom_id), "chunks": 0, "documents": 0}

        chunks = collection.count()
        data = collection.get()
        metas = data.get("metadatas") or []
        unique_materials = {m.get("material_id") for m in metas if m}
        return {
            "classroom_id": str(classroom_id),
            "chunks": chunks,
            "documents": len(unique_materials),
        }


# ── Singleton lazy ────────────────────────────────────────────────────────
_instance: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Retourne l'instance singleton (créée à la première utilisation)."""
    global _instance
    if _instance is None:
        _instance = RAGService()
    return _instance
