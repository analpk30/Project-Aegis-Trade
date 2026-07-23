"""Query-aware retrieval over the BaFin announcement corpus.

Replaces the previous naive `doc_context[:3]` slice (which ignored the query and
broke as soon as the corpus grew past what fits in a prompt) with embedding-based
semantic ranking, plus a keyword-overlap fallback that works with zero AI
availability.

State is a single in-memory dict keyed by announcement id, so adding a circular
costs exactly one embedding call once, and never again. Nothing here persists
across a process restart — matching the rest of this single-process backend.

Reuses `vector_engine.cosine_similarity` (the same helper the pre-crime modeler
uses) rather than introducing a second similarity implementation.
"""

import os
import re
import threading

from resilience import call_with_retry
from vector_engine import cosine_similarity

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    genai_types = None  # type: ignore
    _GENAI_AVAILABLE = False

_EMBEDDING_MODEL = os.environ.get('VERTEX_EMBEDDING_MODEL', 'text-embedding-005')

# announcement id -> embedding vector (list[float])
_EMBEDDING_CACHE = {}
_CACHE_LOCK = threading.Lock()

_client = None
_client_lock = threading.Lock()

# Common words we never want to drive keyword-fallback ranking.
_STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'is',
    'are', 'we', 'can', 'do', 'does', 'what', 'which', 'with', 'near', 'be',
    'this', 'that', 'it', 'as', 'by', 'from', 'our', 'if', 'client',
}


def _get_client():
    """Lazily build a Vertex AI genai client from ADC. Returns None if unavailable."""
    global _client
    if not _GENAI_AVAILABLE:
        return None
    project = os.environ.get('GOOGLE_CLOUD_PROJECT') or os.environ.get('GCP_PROJECT')
    if not project:
        return None
    if _client is not None:
        return _client
    with _client_lock:
        if _client is None:
            location = os.environ.get('GOOGLE_CLOUD_LOCATION', 'us-central1')
            _client = genai.Client(vertexai=True, project=project, location=location)
    return _client


def _doc_text(ann: dict) -> str:
    """Flatten an announcement into a single string for embedding / keyword search."""
    parts = [
        ann.get('title', ''),
        ann.get('category', ''),
        ' '.join(ann.get('assetClasses', []) or []),
        ann.get('summary', ''),
        ann.get('text', ''),
    ]
    return '\n'.join(p for p in parts if p)


def _embed(texts: list, task_type: str) -> list:
    """Embed a list of texts. Raises on failure (callers handle the fallback).

    Retries transient 429s with backoff — the embedding endpoint shares the same
    tight quota as generation, and a fresh request each attempt is safe.
    """
    client = _get_client()
    if client is None:
        raise RuntimeError('genai client unavailable (no ADK/genai or no GCP project)')
    config = None
    if genai_types is not None:
        config = genai_types.EmbedContentConfig(task_type=task_type)

    def _once():
        resp = client.models.embed_content(
            model=_EMBEDDING_MODEL,
            contents=texts,
            config=config,
        )
        return [list(e.values) for e in resp.embeddings]

    return call_with_retry(_once, label='embedding')


def _ensure_embeddings(announcements: list) -> bool:
    """Ensure every announcement id has a cached embedding.

    Only uncached ids are sent to the API, so corpus growth costs one call per new
    document, once. Returns True if the full corpus is embedded, False if the
    embedding backend was unavailable (caller should use the keyword fallback).
    """
    missing = []
    with _CACHE_LOCK:
        for ann in announcements:
            if ann['id'] not in _EMBEDDING_CACHE:
                missing.append(ann)

    if missing:
        vectors = _embed([_doc_text(a) for a in missing], 'RETRIEVAL_DOCUMENT')
        with _CACHE_LOCK:
            for ann, vec in zip(missing, vectors):
                _EMBEDDING_CACHE[ann['id']] = vec

    with _CACHE_LOCK:
        return all(a['id'] in _EMBEDDING_CACHE for a in announcements)


def _tokenize(text: str) -> set:
    return {t for t in re.findall(r'[a-z0-9]+', text.lower()) if t not in _STOPWORDS and len(t) > 2}


def _keyword_fallback(query: str, announcements: list, k: int) -> list:
    """Rank by term overlap between query and document. Deterministic, no AI.

    Strictly better than a fixed `[:3]` slice: an off-topic query still surfaces
    the most lexically relevant circulars rather than always the first three.
    """
    q_terms = _tokenize(query)
    scored = []
    for ann in announcements:
        d_terms = _tokenize(_doc_text(ann))
        overlap = len(q_terms & d_terms)
        scored.append((overlap, ann))
    # Stable sort: preserve original corpus order on ties.
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [ann for _, ann in scored[:k]]


def retrieve(query: str, announcements: list, k: int = 4):
    """Return the top-k most relevant announcements for a query.

    Returns (docs, doc_ids, mode) where mode is 'embedding' or 'keyword'. The
    embedding path falls back to keyword scoring on any failure (no creds, API
    error, empty query), so a caller always gets a usable ranked subset.
    """
    if not announcements:
        return [], [], 'keyword'

    k = max(1, min(k, len(announcements)))

    if query and query.strip():
        try:
            if _ensure_embeddings(announcements):
                q_vec = _embed([query], 'RETRIEVAL_QUERY')[0]
                with _CACHE_LOCK:
                    scored = [
                        (cosine_similarity(q_vec, _EMBEDDING_CACHE[a['id']]), a)
                        for a in announcements
                    ]
                scored.sort(key=lambda pair: pair[0], reverse=True)
                docs = [a for _, a in scored[:k]]
                return docs, [a['id'] for a in docs], 'embedding'
        except Exception as e:
            print(f"[Retrieval] Embedding retrieval failed ({e}); using keyword fallback.")

    docs = _keyword_fallback(query, announcements, k)
    return docs, [a['id'] for a in docs], 'keyword'


def format_context(docs: list) -> str:
    """Render retrieved announcements into the RAG context block for the prompt."""
    return "\n---\n".join(_doc_text(a) for a in docs)
