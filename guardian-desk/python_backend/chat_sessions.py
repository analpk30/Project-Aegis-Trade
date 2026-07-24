"""In-memory multi-turn conversation registry for the BaFin RAG chat.

The whole point of this module: ADK's session service already provides
conversation memory, but only if the SAME runner and SAME session id are reused
across turns. The old code minted a fresh uuid session per request, discarding
all history. Here we hold ONE persistent runner and map each frontend
`chatSessionId` to one ADK session, so follow-up questions resolve context from
earlier turns.

State is pure in-memory (dies on restart, single-process only) — consistent with
the rest of this backend. Sessions are evicted by idle-TTL and an LRU cap so a
long-running demo cannot grow memory unbounded.
"""

import os
import threading
import time
import uuid

import async_runtime
from resilience import call_with_retry

try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    from google.genai import types
    _ADK_AVAILABLE = True
except ImportError:
    Agent = None  # type: ignore
    InMemoryRunner = None  # type: ignore
    types = None  # type: ignore
    _ADK_AVAILABLE = False

_APP_NAME = 'project_guardian'
_USER_ID = 'compliance_engine'
_VERTEX_MODEL = os.environ.get('VERTEX_GEMINI_MODEL', 'gemini-2.5-flash')

SESSION_TTL_SECONDS = int(os.environ.get('BAFIN_SESSION_TTL', '1800'))  # 30 min idle
MAX_SESSIONS = int(os.environ.get('BAFIN_MAX_SESSIONS', '200'))

_BAFIN_AGENT_INSTRUCTION = """You are a Senior Regulatory Legal Officer specializing in BaFin circulars, GwG money laundering laws, and MiFID II compliance.
Answer regulatory queries using the provided BaFin circular context and the earlier turns of this conversation.

Instructions:
1. Provide a crisp, structured compliance summary (100-150 words).
2. Explicitly cite the relevant BaFin Circular numbers or GwG sections.
3. List 2 concrete actionable DOs and 2 DONTs for traders or sales officers.
4. For follow-up questions, resolve pronouns and ellipsis against the earlier turns rather than asking the user to repeat context.
"""

# chat_session_id -> {'adk_session_id', 'created_at', 'last_active'}
_SESSIONS = {}
_SESSIONS_LOCK = threading.Lock()

_runner = None
_runner_lock = threading.Lock()


def is_available() -> bool:
    """True if the ADK stack is importable (creds are checked separately at call time)."""
    return _ADK_AVAILABLE


def _get_runner():
    """Lazily build the one persistent BaFin runner shared across all sessions."""
    global _runner
    if not _ADK_AVAILABLE:
        return None
    if _runner is not None:
        return _runner
    with _runner_lock:
        if _runner is None:
            agent = Agent(
                name='bafin_interpretation_agent',
                model=_VERTEX_MODEL,
                description='Interprets BaFin circulars and GwG rules via Vertex AI, with multi-turn memory.',
                instruction=_BAFIN_AGENT_INSTRUCTION,
            )
            _runner = InMemoryRunner(agent=agent, app_name=_APP_NAME)
    return _runner


def _evict_locked(now: float):
    """Drop idle-expired sessions, then enforce the LRU cap. Caller holds the lock."""
    expired = [cid for cid, s in _SESSIONS.items() if now - s['last_active'] > SESSION_TTL_SECONDS]
    for cid in expired:
        _SESSIONS.pop(cid, None)

    if len(_SESSIONS) > MAX_SESSIONS:
        # Evict least-recently-active first.
        ordered = sorted(_SESSIONS.items(), key=lambda kv: kv[1]['last_active'])
        for cid, _ in ordered[: len(_SESSIONS) - MAX_SESSIONS]:
            _SESSIONS.pop(cid, None)


def _get_or_create_adk_session(chat_session_id: str) -> str:
    """Return the ADK session id for a chat, creating it (and the ADK session) if new.

    The registry lock makes insertion atomic, so a given chatSessionId maps to
    exactly one ADK session and create_session is called once. This assumes turns
    for a single chatSessionId are issued sequentially — which the frontend
    guarantees by disabling send while a turn is in flight. Distinct chats use
    distinct ids and never interact.
    """
    now = time.time()
    runner = _get_runner()
    with _SESSIONS_LOCK:
        _evict_locked(now)
        existing = _SESSIONS.get(chat_session_id)
        if existing is not None:
            existing['last_active'] = now
            return existing['adk_session_id']
        adk_session_id = f'bafin-{uuid.uuid4().hex[:12]}'
        _SESSIONS[chat_session_id] = {
            'adk_session_id': adk_session_id,
            'created_at': now,
            'last_active': now,
        }

    # Create the backing ADK session outside the registry lock (it hits the loop).
    async_runtime.submit(
        runner.session_service.create_session(
            app_name=_APP_NAME,
            user_id=_USER_ID,
            session_id=adk_session_id,
        )
    )
    return adk_session_id


async def _run_turn_async(runner, adk_session_id: str, prompt: str) -> str:
    message = types.Content(role='user', parts=[types.Part(text=prompt)])
    final_text = ''
    async for event in runner.run_async(
        user_id=_USER_ID,
        session_id=adk_session_id,
        new_message=message,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            chunks = [p.text for p in event.content.parts if getattr(p, 'text', None)]
            final_text = '\n'.join(chunks).strip()
    return final_text


def run_bafin_turn(chat_session_id: str, prompt: str) -> str:
    """Run one conversational turn on the shared runner, preserving prior history.

    Raises if ADK/creds are unavailable — the caller (ai_engine) handles the
    deterministic fallback, exactly as the one-shot path does.
    """
    runner = _get_runner()
    if runner is None:
        raise RuntimeError('ADK unavailable for BaFin chat session')
    adk_session_id = _get_or_create_adk_session(chat_session_id)
    # Retry transient 429s against the same session. A retried turn may re-append
    # the user message to history (harmless: the model still answers the latest
    # question); acceptable given this project's tight Vertex quota.
    return call_with_retry(
        lambda: async_runtime.submit(_run_turn_async(runner, adk_session_id, prompt)),
        label='bafin-turn',
    )


def reset_session(chat_session_id: str) -> bool:
    """Forget a conversation (frontend 'clear chat'). Returns True if one existed."""
    with _SESSIONS_LOCK:
        entry = _SESSIONS.pop(chat_session_id, None)
    if entry is None:
        return True
    runner = _get_runner()
    if runner is not None:
        try:
            async_runtime.submit(
                runner.session_service.delete_session(
                    app_name=_APP_NAME,
                    user_id=_USER_ID,
                    session_id=entry['adk_session_id'],
                )
            )
        except Exception:
            pass  # best-effort; the mapping is already gone
    return True


def session_count() -> int:
    with _SESSIONS_LOCK:
        return len(_SESSIONS)
