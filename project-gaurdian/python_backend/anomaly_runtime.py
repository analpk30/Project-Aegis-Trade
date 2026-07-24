"""Background anomaly engine — advances the market sim and refreshes store.anomalies.

One daemon thread ticks the synthetic market, scores each new increment with the
Mahalanobis detector, and rebuilds `store.anomalies` in place. The endpoint
(`GET /api/risk/anomalies`) and every consumer keep reading the same shape — they
never know the data went from hand-typed to computed.

Baseline hygiene: the detector only learns from calm ticks. When an anomaly is
active (sigma elevated) we stop updating the covariance window, so a burst of
stress can't poison the baseline and the RED state persists for the demo — a
standard "don't adapt during an anomaly" practice.

Pure in-memory, single process, daemon thread — consistent with the rest of the
backend. Falls back silently (leaving the seeded anomalies) if numpy/import fails.
"""

import threading
import time
from collections import Counter, deque
from datetime import datetime

_thread = None
_lock = threading.Lock()
_started = False

_source = None
_detector = None
_hawkes = None
_ewma_sigma = 0.0  # smoothed anomaly sigma (raw per-tick score is chi-square-noisy)
_display_level = 'GREEN'  # hysteresis-stabilised alert level (anti-flapping)
_last_maha = 0.0
_ready = False

# Compute is decoupled from display: the model advances on the fast COMPUTE tick
# (fine-grained sparkline + responsive Hawkes/detector), but the served snapshot
# only refreshes on the slower DISPLAY cadence (readable) — or immediately when
# the alert level changes, so a shock still surfaces promptly.
TICK_SECONDS = float(1.0)     # compute cadence (fast: fine sparkline + responsive model)
DISPLAY_SECONDS = float(4.0)  # display/publish cadence (readable) — 5 compute ticks per publish
WARMUP_TICKS = 260  # enough for detector.ready() with margin
EWMA_ALPHA = 0.28   # smoothing responsiveness (lower = steadier number, slower ramp)
FREEZE_SIGMA = 2.0  # above this (smoothed) we stop learning — don't adapt to anomalies
CONTAGION_TRIGGER = 2.5   # raw sigma above which a Hawkes event is recorded
CONTAGION_HORIZON = 10.0  # forecast horizon (ticks) ~ presented as "15 min"
FORECAST_MINS = 15
SIGMA_HISTORY_LEN = 60  # fine-grained sparkline buffer (one point per compute tick)

# Stabilised attribution: the displayed driving markets are the top contributors
# accumulated over the current episode, not the noisy single-tick attribution —
# so the card set holds steady instead of reshuffling every tick.
_sigma_history = deque(maxlen=SIGMA_HISTORY_LEN)
_contagion_history = deque(maxlen=SIGMA_HISTORY_LEN)
_attrib_counts = Counter()
_tick_count = 0
_last_publish_tick = 0

# Hysteresis bands: harder to enter a level than to leave it, so the displayed
# severity doesn't flap while the noisy signal straddles a threshold.
_RED_UP, _RED_DOWN = 4.0, 3.0
_AMBER_UP, _AMBER_DOWN = 2.5, 1.5

# Hysteresis bands: harder to enter a level than to leave it, so the displayed
# severity doesn't flap while the noisy signal straddles a threshold.
_RED_UP, _RED_DOWN = 4.0, 3.0
_AMBER_UP, _AMBER_DOWN = 2.5, 1.5


def _hysteresis(prev: str, sigma: float) -> str:
    if prev == 'RED':
        return 'RED' if sigma >= _RED_DOWN else ('AMBER' if sigma >= _AMBER_DOWN else 'GREEN')
    if prev == 'AMBER':
        if sigma >= _RED_UP:
            return 'RED'
        return 'AMBER' if sigma >= _AMBER_DOWN else 'GREEN'
    # prev GREEN
    if sigma >= _RED_UP:
        return 'RED'
    return 'AMBER' if sigma >= _AMBER_UP else 'GREEN'


def _init_engine():
    global _source, _detector, _hawkes
    from market_sim import SyntheticMarketSource
    from anomaly_engine import MahalanobisDetector
    from hawkes import HawkesContagion
    _source = SyntheticMarketSource(seed=42)
    _detector = MahalanobisDetector(window=250, min_samples=60)
    _hawkes = HawkesContagion(mu=0.02, alpha=0.15, beta=0.30)
    # Warm the baseline on calm data so the first served state is meaningful.
    for _ in range(WARMUP_TICKS):
        _source.step()
        _detector.observe(_source.last_increment())


def _exposure_from_orders(store) -> dict:
    """Map each asset class to the client books exposed to it, from open orders.

    Activates the previously-dangling `affectedClients` link: an anomaly in a
    given asset class now names the actual clients holding positions there.
    """
    exposure = {}
    for o in store.orders:
        ac = o.get('assetClass')
        if not ac:
            continue
        e = exposure.setdefault(ac, {'clients': [], 'notionalEur': 0.0})
        cid = o.get('clientId')
        if cid and cid not in e['clients']:
            e['clients'].append(cid)
        e['notionalEur'] += float(o.get('sizeEur', 0) or 0)
    return exposure


def _compute_tick() -> bool:
    """Advance the model one COMPUTE step. Updates internal state; publishes nothing.

    Returns True if the (hysteresis) alert level changed this tick — the loop uses
    that to publish immediately so a shock/reset surfaces without display lag.
    """
    global _ewma_sigma, _display_level, _last_maha, _ready, _tick_count
    _tick_count += 1
    _source.step()
    inc = _source.last_increment()
    score = _detector.score(inc)
    _hawkes.decay(1.0)

    prev_level = _display_level
    if score.get('ready'):
        _ready = True
        _ewma_sigma = EWMA_ALPHA * score['sigma'] + (1 - EWMA_ALPHA) * _ewma_sigma
        raw = score['sigma']
        _last_maha = score['mahalanobis']
        _display_level = _hysteresis(_display_level, _ewma_sigma)
        # New episode → reset accumulated attribution so drivers reflect this event.
        if _display_level != prev_level:
            _attrib_counts.clear()
        for f in score.get('contributingMarkets', []):
            _attrib_counts[f] += 1
        if raw >= CONTAGION_TRIGGER:
            _hawkes.record_event()
        # Learn only from calm periods (freeze baseline while an anomaly is active).
        if _ewma_sigma < FREEZE_SIGMA and raw < FREEZE_SIGMA:
            _detector.observe(inc)
        _sigma_history.append(round(_ewma_sigma, 2))
        _contagion_history.append(round(_hawkes.contagion_probability(CONTAGION_HORIZON), 3))
    else:
        _detector.observe(inc)

    return _display_level != prev_level


def _publish(store):
    """Rebuild the served snapshot from current (stabilised) state."""
    from anomaly_engine import build_anomalies
    if not _ready:
        return
    # Stable drivers: top contributors accumulated over the episode, not per-tick.
    stable_drivers = [f for f, _ in _attrib_counts.most_common(3)]
    score = {
        'ready': True,
        'sigma': _ewma_sigma,
        'mahalanobis': _last_maha,
        'contributingMarkets': stable_drivers,
        'level': _display_level,
    }
    exposure = _exposure_from_orders(store)
    contagion = {
        'probability': _hawkes.contagion_probability(CONTAGION_HORIZON),
        'horizonMins': FORECAST_MINS,
    }
    now_iso = datetime.utcnow().isoformat() + 'Z'
    anomalies = build_anomalies(score, now_iso, exposure=exposure, contagion=contagion)
    if anomalies:
        anomalies[0]['sigmaHistory'] = list(_sigma_history)  # fine-grained sparkline
        anomalies[0]['contagionHistory'] = list(_contagion_history)  # secondary series
    with _lock:
        store.anomalies = anomalies


def _tick_once(store):
    """Compute + publish in one call (used by tests and the initial seed)."""
    _compute_tick()
    _publish(store)


def _run_loop(store):
    global _last_publish_tick
    while True:
        try:
            level_changed = _compute_tick()
            due = (_tick_count - _last_publish_tick) * TICK_SECONDS >= DISPLAY_SECONDS
            if level_changed or due:
                _publish(store)
                _last_publish_tick = _tick_count
        except Exception as e:
            print(f"[AnomalyEngine] tick error: {e}")
        time.sleep(TICK_SECONDS)


def start_engine(store):
    """Idempotently start the background engine. Safe if numpy/import fails."""
    global _thread, _started
    with _lock:
        if _started:
            return
        _started = True
    try:
        _init_engine()
        # Seed one immediate computed state so the first request isn't stale.
        _tick_once(store)
        _thread = threading.Thread(target=_run_loop, args=(store,), name='anomaly-engine', daemon=True)
        _thread.start()
        print(f"[AnomalyEngine] online — compute {TICK_SECONDS}s, display {DISPLAY_SECONDS}s")
    except Exception as e:
        print(f"[AnomalyEngine] disabled ({e}); keeping seeded anomalies")


def set_regime(regime: str) -> str:
    """Flip the market regime (the demo shock trigger). Returns the active regime."""
    if _source is None:
        raise RuntimeError('anomaly engine not started')
    _source.set_regime(regime)
    return _source.regime()


def current_regime() -> str:
    return _source.regime() if _source is not None else 'unknown'
