"""One long-lived asyncio event loop, shared by all ADK calls.

Why this exists: the previous approach created a fresh event loop per request
(`new_event_loop()` ... `loop.close()`). That is only safe when nothing survives
between calls. Once we hold a long-lived `InMemoryRunner` (to keep conversation
history across turns), any loop-bound resource it owns — async HTTP clients,
`asyncio.Lock`s — would break the moment the loop that created it is closed.

So we run exactly one event loop on one daemon thread for the process lifetime,
and submit coroutines to it from the HTTP server's worker threads via
`run_coroutine_threadsafe`. Thread-safe, no per-call loop churn.
"""

import asyncio
import threading

_loop = None
_thread = None
_lock = threading.Lock()

DEFAULT_TIMEOUT = 120.0  # seconds; the vite proxy tolerates up to 600s.


def _ensure_loop():
    """Start the background loop thread once, lazily."""
    global _loop, _thread
    if _loop is not None:
        return _loop
    with _lock:
        if _loop is None:
            loop = asyncio.new_event_loop()

            def _run():
                asyncio.set_event_loop(loop)
                loop.run_forever()

            t = threading.Thread(target=_run, name='adk-async-loop', daemon=True)
            t.start()
            _loop = loop
            _thread = t
    return _loop


def submit(coro, timeout: float = DEFAULT_TIMEOUT):
    """Run a coroutine on the shared loop from a sync (worker-thread) caller.

    Blocks the calling thread until the coroutine completes or `timeout` elapses.
    Propagates exceptions (including concurrent.futures.TimeoutError) to the caller.
    """
    loop = _ensure_loop()
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout)
