"""Cross-market anomaly detection over the market simulation.

Core idea: maintain a rolling window of recent factor *increments*, learn their
covariance, and score each new increment by its Mahalanobis distance from that
distribution. Unlike per-factor z-scores, Mahalanobis accounts for the
*correlation* between markets — so it catches a correlation break (e.g. BTP and
Bund decoupling) even when each factor's own move looks normal. That is what
"cross-market" actually means.

This module holds the detector primitives (step 1–2). Impact mapping (step 3)
and the Hawkes contagion layer (step 4) build on top.
"""

from datetime import datetime

import numpy as np

from market_sim import FACTORS, N

# Severity thresholds on the equivalent-sigma metric.
RED_SIGMA = 4.0      # structural break — escalate
AMBER_SIGMA = 2.5    # elevated — surface a dedicated card

# Factor → how it presents on the risk dashboard.
FACTOR_META = {
    'BTP_10Y':      {'assetClass': 'Rates',  'metric': 'Italian BTP 10Y / Bund Spread Correlation'},
    'BUND_10Y':     {'assetClass': 'Rates',  'metric': 'German Bund 10Y Yield'},
    'EURUSD':       {'assetClass': 'FX',     'metric': 'EUR/USD Spot'},
    'EURUSD_VOL':   {'assetClass': 'FX',     'metric': 'EUR/USD 1M Implied Volatility Surface'},
    'ITRAXX_XOVER': {'assetClass': 'Credit', 'metric': 'iTraxx Europe Crossover 5Y'},
    'ITRAXX_MAIN':  {'assetClass': 'Credit', 'metric': 'iTraxx Main 5Y'},
    'EUR_5Y_SWAP':  {'assetClass': 'Rates',  'metric': '5Y EUR Swap Rate'},
}

_ACTION_RED = {
    'Rates':  'Freeze automated execution on rate-sensitive instruments; escalate to 1st Line Risk review.',
    'Credit': 'Suspend new credit-line exposure; trigger 2nd Line Risk sign-off before booking.',
    'FX':     'Widen FX pricing spreads and re-hedge implied-vol exposure immediately.',
    'Equities': 'Halt structured-note issuance; re-run suitability on affected books.',
}
_ACTION_AMBER = 'Elevated cross-market correlation — monitor closely; no automated block required yet.'


def _chi2_to_sigma(d2: float, k: int) -> float:
    """Convert a squared-Mahalanobis (~chi-square_k) to an equivalent Gaussian σ.

    Real risk desks quote anomalies as "an N-sigma event" = the one-sided Gaussian
    deviation with the same tail probability. Uses the Wilson–Hilferty transform
    (chi-square -> normal), which needs no scipy and is accurate in the tail. In a
    normal regime d2 ≈ k so σ ≈ 0–1.5; under a structural break σ climbs sharply.
    """
    if d2 <= 0 or k <= 0:
        return 0.0
    c = 2.0 / (9.0 * k)
    z = ((d2 / k) ** (1.0 / 3.0) - (1.0 - c)) / np.sqrt(c)
    return float(max(0.0, z))


class MahalanobisDetector:
    """Rolling-window multivariate anomaly scorer."""

    def __init__(self, window: int = 250, min_samples: int = 60):
        self._window = window
        self._min_samples = min_samples
        self._buf = []  # recent increment vectors

    def observe(self, increment: np.ndarray):
        """Add an increment to the rolling window (call every tick)."""
        self._buf.append(np.asarray(increment, dtype=float))
        if len(self._buf) > self._window:
            self._buf.pop(0)

    def _stats(self):
        data = np.array(self._buf)
        mean = data.mean(axis=0)
        cov = np.cov(data.T)
        # pinv guards singular / degenerate windows.
        inv = np.linalg.pinv(cov)
        std = data.std(axis=0)
        std = np.where(std < 1e-9, 1e-9, std)
        return mean, inv, std

    def ready(self) -> bool:
        return len(self._buf) >= self._min_samples

    def score(self, increment: np.ndarray) -> dict:
        """Score one increment. Returns Mahalanobis σ, per-factor z, and attribution.

        Call `observe` with normal-regime data to warm the window, then `score`
        each new increment. Scoring does not mutate the window — observe
        separately so the baseline can be held or slowly rolled as desired.
        """
        increment = np.asarray(increment, dtype=float)
        if not self.ready():
            return {'ready': False, 'mahalanobis': 0.0, 'maxZ': 0.0}

        mean, inv, std = self._stats()
        delta = increment - mean

        # Squared Mahalanobis (~chi-square_k), then the raw distance and the
        # equivalent-sigma tail metric used as the headline number.
        d2 = float(max(0.0, delta @ inv @ delta))
        maha = float(np.sqrt(d2))
        sigma = _chi2_to_sigma(d2, N)

        # Per-factor z-scores (what a univariate monitor would see).
        z = delta / std
        abs_z = np.abs(z)

        # Attribution: each factor's contribution to the quadratic form.
        contrib = delta * (inv @ delta)
        order = np.argsort(contrib)[::-1]
        contributing = [FACTORS[i] for i in order if contrib[i] > 0][:3]

        return {
            'ready': True,
            'mahalanobis': maha,
            'sigma': sigma,
            'maxZ': float(abs_z.max()),
            'perFactorZ': {FACTORS[i]: float(z[i]) for i in range(N)},
            'contributingMarkets': contributing,
        }


def _level(sigma: float) -> str:
    if sigma >= RED_SIGMA:
        return 'RED'
    if sigma >= AMBER_SIGMA:
        return 'AMBER'
    return 'GREEN'


def build_anomalies(score: dict, now_iso: str = None, exposure: dict = None, contagion: dict = None) -> list:
    """Turn a detector score into MarketAnomaly-shaped cards for the dashboard.

    Emits a composite cross-market monitor card always (so the module has a live
    heartbeat), plus a per-asset-class card for each cluster driving an elevated
    anomaly. Shape is backward-compatible with the existing hardcoded anomalies.

    - `exposure` (step 3): {assetClass: {'clients': [ids], 'notionalEur': float}} —
      real affected client books, computed from open orders.
    - `contagion` (step 4): {'probability': float, 'horizonMins': int} — Hawkes
      forecast of the anomaly cascading in the near term.
    """
    now_iso = now_iso or (datetime.utcnow().isoformat() + 'Z')
    if not score.get('ready'):
        return []

    sigma = score['sigma']
    maha = score['mahalanobis']
    contributing = score.get('contributingMarkets', [])
    # Prefer a hysteresis-stabilised level from the runtime; fall back to a
    # direct threshold on sigma for standalone callers/tests.
    level = score.get('level') or _level(sigma)
    exposure = exposure or {}
    contagion = contagion or {}
    elevated = level != 'GREEN'

    def _exposure_for(asset_classes):
        clients, notional = [], 0.0
        for ac in asset_classes:
            e = exposure.get(ac)
            if not e:
                continue
            for cid in e.get('clients', []):
                if cid not in clients:
                    clients.append(cid)
            notional += e.get('notionalEur', 0.0)
        return clients, notional

    def _card(cid, asset_class, metric, lvl, drivers, desc, action, classes_for_exposure):
        clients, notional = _exposure_for(classes_for_exposure)
        card = {
            'id': cid,
            'timestamp': now_iso,
            'assetClass': asset_class,
            'metric': metric,
            'deviationSigma': round(sigma, 2),
            'affectedClients': clients,
            'alertLevel': lvl,
            'description': desc,
            'recommendedAction': action,
            # Additive quant fields (optional on the frontend type):
            'mahalanobisDistance': round(maha, 2),
            'contributingMarkets': drivers,
            'exposedNotionalEur': round(notional),
        }
        # Contagion forecast only when the anomaly is elevated (calm = no forecast).
        if elevated and contagion:
            card['contagionProbability'] = round(contagion.get('probability', 0.0), 3)
            card['forecastHorizonMins'] = contagion.get('horizonMins', 15)
        return card

    # Asset classes implicated by the driving factors.
    contributing_classes = []
    for f in contributing:
        ac = FACTOR_META.get(f, {}).get('assetClass')
        if ac and ac not in contributing_classes:
            contributing_classes.append(ac)

    # Optional contagion clause for descriptions.
    def _contagion_clause():
        if elevated and contagion:
            p = contagion.get('probability', 0.0)
            h = contagion.get('horizonMins', 15)
            return f" Hawkes contagion model: {p*100:.0f}% probability of cascade within {h} min."
        return ""

    # 1) Composite cross-market card — always present.
    lead_class = contributing_classes[0] if contributing_classes else 'Rates'
    drivers_h = ', '.join(FACTOR_META.get(f, {}).get('metric', f) for f in contributing[:3]) or 'none'
    composite = _card(
        'ANOM-XMKT',
        lead_class,
        'Cross-Market Correlation Structure',
        level,
        contributing,
        (
            (
                f"Multivariate anomaly at {sigma:.1f}σ (Mahalanobis {maha:.1f}). "
                f"Primary drivers: {drivers_h}. "
                f"Per-factor moves remain within normal single-market tolerance — the anomaly is in the "
                f"joint correlation structure, not any one instrument." + _contagion_clause()
            )
            if elevated else
            f"Cross-market correlation structure nominal ({sigma:.1f}σ). No structural break detected."
        ),
        _ACTION_RED.get(lead_class, _ACTION_AMBER) if level == 'RED' else _ACTION_AMBER,
        contributing_classes or [lead_class],
    )
    cards = [composite]

    # 2) Per-asset-class cards for the clusters driving an elevated anomaly.
    if elevated:
        for ac in contributing_classes:
            drivers = [f for f in contributing if FACTOR_META.get(f, {}).get('assetClass') == ac]
            metric = FACTOR_META.get(drivers[0], {}).get('metric', f'{ac} Cluster') if drivers else f'{ac} Cluster'
            cards.append(_card(
                f'ANOM-{ac.upper()}',
                ac,
                metric,
                level,
                drivers,
                (
                    f"{ac} cluster implicated in the {sigma:.1f}σ cross-market anomaly "
                    f"(drivers: {', '.join(FACTOR_META.get(f, {}).get('metric', f) for f in drivers)})."
                    + _contagion_clause()
                ),
                _ACTION_RED.get(ac, _ACTION_AMBER) if level == 'RED' else _ACTION_AMBER,
                [ac],
            ))

    return cards
