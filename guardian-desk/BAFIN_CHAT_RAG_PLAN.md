# BaFin Conversational RAG — Implementation Plan

Upgrade `/api/bafin/interpret` from a stateless one-shot Q&A into a **multi-turn chat with
follow-up support**, grounded in a **growing BaFin corpus**, using in-memory state only.

**Explicit non-goal:** Dialogflow CX / Vertex AI Search / Agent Builder. All session and
retrieval logic stays inside the existing `python_backend` process. See "Rejected alternatives".

---

## Current state (verified)

| Concern | Today | Location |
| --- | --- | --- |
| Conversation memory | **None.** New `uuid` session per request. | `ai_engine.py:74` |
| Retrieval | **None.** `doc_context[:3]` — first 3 docs, ignores query. | `app.py:447`, `ai_engine.py:203` |
| Event loop | New loop created + closed per call. | `ai_engine.py:113-129` |
| Runner lifetime | New `InMemoryRunner` per call, then `.close()`. | `ai_engine.py:76,100` |
| Deps | `google-adk` / `google-genai` **not in `requirements.txt`, not installed.** | `python_backend/requirements.txt` |
| Net effect | Endpoint **always** returns the hardcoded fallback string. | `ai_engine.py:232-249` |

Runtime: Python 3.13. Backend `python_backend/app.py` on :5050 (`ThreadingMixIn` — concurrent
requests are real). Frontend Vite on :3000, proxies `/api` → `127.0.0.1:5050`, 600s timeout.

---

## Target architecture

```
ChatModal.tsx  --{query, chatSessionId}-->  POST /api/bafin/interpret
                                                    |
                                    retrieval.retrieve(query, k=4)
                                    (embedding cache + cosine rank)
                                                    |
                                    chat_sessions.get_or_create(chatSessionId)
                                                    |
                              ONE module-level InMemoryRunner (many ADK sessions)
                                    submitted to ONE background event loop
                                                    |
                                          Gemini via Vertex AI (ADC)
                                                    |
                                    audit.log_audit_event(+ retrieved doc ids)
```

Two design decisions that differ from the naive approach:

1. **One shared runner, many sessions.** `InMemoryRunner` constructs its own
   `InMemorySessionService`. A runner created per request (or even per chat) gets an empty
   store, so history is lost. We hold **one** runner at module level and create/reuse ADK
   sessions inside it, keyed by the frontend's `chatSessionId`.
2. **One long-lived background event loop.** The current per-call
   `new_event_loop()`/`close()` is only safe because nothing survives between calls. Once a
   runner is long-lived, any loop-bound resource it holds (async HTTP client, `asyncio.Lock`)
   breaks when the loop that created it is closed. So: a single daemon thread running one
   loop forever, with work submitted via `asyncio.run_coroutine_threadsafe(...)`.

---

## File-by-file changes

### NEW `python_backend/async_runtime.py`
Single background event loop shared by all ADK calls.
- Daemon thread started lazily on first use, running `loop.run_forever()`.
- `submit(coro, timeout)` → `asyncio.run_coroutine_threadsafe(coro, loop).result(timeout)`.
- Replaces `ai_engine._run_async`. Timeout default 120s (proxy allows 600s).

### NEW `python_backend/chat_sessions.py`
In-memory conversation registry.
- `_SESSIONS: Dict[str, dict]` → `{'adk_session_id', 'created_at', 'last_active', 'turns'}`.
- Module-level lazily-built singleton `InMemoryRunner` for the BaFin agent.
- `get_or_create_session(chat_session_id)` — creates the ADK session on first use, returns
  the ADK session id; refreshes `last_active`.
- `threading.Lock` around all mutation (server is threaded).
- **Eviction:** lazy sweep on each access — drop sessions idle > `SESSION_TTL_SECONDS`
  (default 1800) and cap total at `MAX_SESSIONS` (default 200, evict least-recently-used).
  No background thread needed.
- `reset_session(chat_session_id)` for an explicit "clear chat" control.

### NEW `python_backend/retrieval.py`
Query-aware retrieval over a growing corpus.
- `_EMBEDDING_CACHE: Dict[str, list[float]]` keyed by announcement `id`.
- `_ensure_embeddings(announcements)` — embeds only ids not already cached, so adding a
  circular costs one call once, never again. Model via `VERTEX_EMBEDDING_MODEL`
  (default `text-embedding-005`), same ADC auth as Gemini.
- `retrieve(query, announcements, k=4)` → top-k by
  `vector_engine.cosine_similarity` (**reuse existing helper as-is**, `vector_engine.py:3-11`).
- `_keyword_fallback(query, announcements, k)` — term-overlap scoring over title/summary/text,
  used when embedding calls fail. Mirrors the try/except→fallback idiom already in `ai_engine.py`.
  Strictly better than today's `[:3]` even with zero AI availability.
- Returns `(docs, doc_ids, mode)` where mode ∈ `embedding` | `keyword` — surfaced for audit.

### EDIT `python_backend/ai_engine.py`
- Delete `_run_async`; call `async_runtime.submit` instead.
- `_run_adk_agent(agent, prompt, session_id)` → uses the shared runner + passed session id;
  **no** `create_session` per call, **no** `runner.close()` (runner is long-lived).
- `interpret_bafin_rules(query, chat_session_id=None, announcements=None)`:
  - drops the `doc_context` param (retrieval is now internal),
  - builds the prompt with retrieved docs only,
  - returns `retrievedIds` and `retrievalMode` in addition to existing
    `text` / `model` / `latencyMs` / `fallbackUsed` keys (**existing keys unchanged** — audit
    logging and the MiFID path both depend on them).
- `generate_mifid_justification` — **behaviour must not change.** It shares
  `_run_adk_agent`/`_configure_vertex_ai`, so it gets the new loop + runner plumbing but keeps
  a fresh throwaway session per call (it is genuinely one-shot). Regression-check it.

### EDIT `python_backend/app.py`
- `/api/bafin/interpret` (line ~445): read `chatSessionId` from body; stop building the
  `docs` list (retrieval owns that now); pass `store.bafin_announcements` through.
- Response gains `chatSessionId`, `retrievedAnnouncementIds`, `retrievalMode`.
  `interpretation` / `matchingAnnouncements` / `auditEntry` keys **unchanged** so the existing
  UI keeps working mid-migration.
- `matchingAnnouncements` becomes the *retrieved* subset rather than the whole corpus
  (that is the point of retrieval) — Bafin.tsx renders the full list from `/api/bafin`
  separately, so the card grid is unaffected.
- Audit `reasoning_payload` gains retrieved doc ids + retrieval mode — real compliance
  traceability for *why* the model answered as it did.
- NEW `POST /api/bafin/chat/reset` → `chat_sessions.reset_session`.

### EDIT `python_backend/requirements.txt`
Currently unrelated packages (`pyodide`, `jnius`, `xmlrpclib`, `js`, …) — stale/wrong file.
Replace with what the backend actually imports: `google-adk`, `google-genai`,
`google-cloud-aiplatform`. Stdlib-only elsewhere (`http.server`, `json`, `math`).

### NEW `src/components/BafinChatModal.tsx`
- Follows `WhyModal.tsx` conventions exactly (fixed overlay, `#0F1115` panel, `#1F2937`
  borders, lucide icons, `isOpen`/`onClose` props).
- `chatSessionId` minted once via `crypto.randomUUID()` on open, held in state, sent every turn.
- Message list `{role, text, retrievedIds?}`; posts `{query, chatSessionId}`; appends rather
  than replacing. Shows cited circular ids per answer.
- Reuses the existing offline-fallback idiom from `Bafin.tsx:41-57`.

### EDIT `src/pages/Bafin.tsx`
- Add "Ask Follow-up / Open Chat" entry point that opens the modal.
- Keep the existing one-shot search box working during migration; retire it once chat lands.

### EDIT `tests/`
Extend the `test_bafin_isolated.py` pattern (skips cleanly when `GOOGLE_CLOUD_PROJECT` unset):
- `test_retrieval.py` — keyword fallback ranks a KYC/UBO query above the benchmark-fixing
  circular; embedding cache computes each id at most once.
- `test_chat_sessions.py` — same `chatSessionId` reuses one ADK session; TTL eviction fires;
  concurrent access is lock-safe. Runs **without** GCP creds.
- `test_bafin_followup.py` — live, skipped without creds: turn 2 ("what about for a PENDING
  KYC client?") resolves context from turn 1.

---

## Sequencing (each step independently verifiable)

| # | Step | Done when |
| --- | --- | --- |
| 1 | Fix `requirements.txt`; install; confirm live Vertex/ADK call | `pytest tests/test_bafin_isolated.py` returns `fallbackUsed=False` |
| 2 | `retrieval.py` + wire into existing endpoint (**no sessions yet**) | KYC query returns the GwG circular first, not `[:3]`; keyword fallback tested offline |
| 3 | `async_runtime.py` + `chat_sessions.py`; refactor `_run_adk_agent` | curl two turns with same `chatSessionId` → turn 2 resolves a pronoun/ellipsis from turn 1; MiFID AutoPilot regression-checked |
| 4 | `BafinChatModal.tsx` + Bafin.tsx entry point | Follow-ups work in browser; offline fallback intact |
| 5 | Hardening: TTL/LRU eviction, lock audit, `/chat/reset`, timeouts | Eviction + concurrency tests green |

Steps 2 and 3 are the substance and are deliberately separable — step 2 improves answer
quality on its own even if step 3 slips.

---

## Risks / open items

- **ADK session API shape** (`session_service.create_session` / `delete_session` kwargs) is
  unverified — package isn't installed yet. Confirm during step 1; may adjust `chat_sessions.py`.
- **Prompt growth.** Long chats + retrieved docs per turn inflate tokens. Mitigation: cap
  history at N recent turns (`MAX_HISTORY_TURNS`, default 10) and retrieve `k=4` not the corpus.
- **Existing broken import.** `src/lib/dataService.ts:1` imports `../backend/dataStore`, whose
  directory is **deleted on disk** (5 unstaged deletions in `git status`). The frontend
  offline-fallback path is currently broken; step 4 will trip over it. Decide: restore the
  files or strip the `globalStore` fallbacks. **Needs a call before step 4.**
- **Single-process assumption.** In-memory sessions/embeddings die on restart and are not
  shared across instances. Correct for the hackathon demo (`npm run dev:backend` = one
  process); would need Redis/Firestore for multi-instance HA.
- **Cost.** One embedding call per new circular (cached forever) + one Gemini call per turn.
  Negligible against the ~EUR 200 budget.

---

## Rejected alternatives

| Option | Why not |
| --- | --- |
| Dialogflow CX (intent-based) | Nothing to route — one intent, no slot-filling. Adds an agent console + fulfillment webhook that would just call this same backend. |
| Dialogflow CX data-store agent + Vertex AI Search | Genuinely fits *managed* RAG (and the APIs/roles are already enabled on the project), but it is a whole new product surface for a 3-document corpus. Revisit at hundreds of documents or if non-engineers must curate the corpus. |
| Redis / Firestore sessions | Correct for production HA; unnecessary while the backend is a single process. |

The deciding factor: ADK's session service **already provides** multi-turn memory — the current
code simply discards it by minting a fresh session id every call. Follow-ups need that bug
fixed, not a new product.
