"""ChromaDB-backed vector memory for long-term topic memory."""
from __future__ import annotations

import os

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings

_client: chromadb.PersistentClient | None = None


def get_chroma() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        path = get_settings().chroma_path
        os.makedirs(path, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=path, settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _client


def user_collection():
    return get_chroma().get_or_create_collection(
        name="user_memory",
        metadata={"hnsw:space": "cosine"},
    )


def upsert_weakness(
    *, user_id: str, topic: str, content: str, weakness: float, vector_id: str | None = None
) -> str:
    """Store or update a topic weakness vector for the user."""
    col = user_collection()
    vid = vector_id or f"{user_id}:{topic}".replace(" ", "_").lower()
    col.upsert(
        ids=[vid],
        documents=[content],
        metadatas=[{"user_id": user_id, "topic": topic, "weakness": float(weakness)}],
    )
    return vid


def get_top_weak_topics(user_id: str, k: int = 3) -> list[dict]:
    """Return top-k weak topics for the user, sorted by weakness desc."""
    col = user_collection()
    res = col.get(where={"user_id": user_id}, include=["metadatas", "documents"])
    items = []
    for meta, doc in zip(res.get("metadatas", []), res.get("documents", [])):
        if not meta:
            continue
        items.append(
            {
                "topic": meta.get("topic", ""),
                "weakness": float(meta.get("weakness", 0.0)),
                "content": doc,
            }
        )
    items.sort(key=lambda x: x["weakness"], reverse=True)
    return items[:k]


def query_similar(user_id: str, text: str, k: int = 5) -> list[dict]:
    """Semantic search over the user's memory."""
    col = user_collection()
    res = col.query(
        query_texts=[text],
        where={"user_id": user_id},
        n_results=k,
        include=["metadatas", "documents", "distances"],
    )
    out: list[dict] = []
    for i, doc in enumerate(res.get("documents", [[]])[0]):
        meta = res.get("metadatas", [[]])[0][i]
        dist = res.get("distances", [[]])[0][i]
        out.append({"topic": meta.get("topic", ""), "content": doc, "distance": dist})
    return out
