"""Bounded retry with exponential backoff for transient Vertex AI failures.

This hackathon project has tight gemini-2.5-flash quota: firing a few calls in
quick succession returns 429 RESOURCE_EXHAUSTED. Without a retry, a single 429
drops the request straight to the deterministic fallback, so under demo load
users would silently get canned answers instead of live ones.

The retry runs on the HTTP worker thread (the caller of async_runtime.submit),
so time.sleep here never blocks the shared event loop.
"""

import time

# Retry only on transient capacity/rate errors — never on auth (403), bad
# requests (400), or programming errors, which retries cannot fix.
_TRANSIENT_MARKERS = ('429', 'RESOURCE_EXHAUSTED', 'RESOURCE EXHAUSTED', 'UNAVAILABLE', '503')


def is_transient_error(exc: Exception) -> bool:
    text = str(exc)
    if any(m in text for m in _TRANSIENT_MARKERS):
        return True
    name = type(exc).__name__
    return 'ResourceExhausted' in name or 'ServiceUnavailable' in name


def call_with_retry(fn, *, attempts: int = 3, base_delay: float = 1.0, max_delay: float = 8.0, label: str = 'vertex'):
    """Call `fn` (a zero-arg callable), retrying transient failures with backoff.

    `fn` must be safe to invoke multiple times — each attempt should build a fresh
    coroutine / request. Non-transient errors and the final attempt re-raise
    immediately.
    """
    last_exc = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            if not is_transient_error(e) or i == attempts - 1:
                raise
            delay = min(max_delay, base_delay * (2 ** i))
            print(f"[Resilience] {label} transient error (attempt {i + 1}/{attempts}): {str(e)[:120]} — retrying in {delay:.1f}s")
            time.sleep(delay)
    # Unreachable (loop either returns or raises), but keeps type-checkers happy.
    raise last_exc
