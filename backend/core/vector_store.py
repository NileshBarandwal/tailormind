import hashlib
from typing import Any

import chromadb

from backend.core.config import PROJECT_ROOT


CHROMA_DIR = PROJECT_ROOT / ".chroma"


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class VectorStore:
    def __init__(self) -> None:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    def get_or_create_collection(self, name: str) -> chromadb.Collection:
        return self.client.get_or_create_collection(name=name)

    def add_chunks(
        self,
        collection_name: str,
        chunks: list[str],
        metadatas: list[dict[str, Any]],
        ids: list[str],
    ) -> None:
        if not (len(chunks) == len(metadatas) == len(ids)):
            raise ValueError(
                "chunks, metadatas, and ids must have the same length"
            )

        collection = self.get_or_create_collection(collection_name)
        enriched = []
        for chunk, meta in zip(chunks, metadatas):
            enriched.append({**meta, "sha256": _sha256(chunk)})

        collection.add(documents=chunks, metadatas=enriched, ids=ids)

    def query(
        self,
        collection_name: str,
        query_text: str,
        n_results: int = 5,
    ) -> list[dict[str, Any]]:
        collection = self.get_or_create_collection(collection_name)
        raw = collection.query(query_texts=[query_text], n_results=n_results)

        documents = (raw.get("documents") or [[]])[0]
        metadatas = (raw.get("metadatas") or [[]])[0]
        distances = (raw.get("distances") or [[]])[0]
        ids = (raw.get("ids") or [[]])[0]

        results: list[dict[str, Any]] = []
        for chunk_id, text, meta, dist in zip(ids, documents, metadatas, distances):
            stored_hash = (meta or {}).get("sha256")
            recomputed = _sha256(text)
            if stored_hash != recomputed:
                raise ValueError(
                    f"SHA-256 mismatch for chunk id={chunk_id}: "
                    f"stored={stored_hash} recomputed={recomputed}"
                )
            results.append(
                {
                    "text": text,
                    "metadata": meta,
                    "distance": dist,
                    "verified": True,
                }
            )
        return results

    def delete_collection(self, name: str) -> None:
        self.client.delete_collection(name=name)
