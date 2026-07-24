"""Synthetic multivariate market simulator — the detection input.

Detection needs a stream of correlated market observations that doesn't exist in
the app today. Rather than a live feed (none available), we generate a
calibrated simulation: mean-reverting factor levels driven by correlated
increments, with a switchable correlation regime.

The point is NOT fake numbers — it's a controllable stochastic process whose
*correlation structure* we can break on command, so the cross-market detector has
a real, reproducible anomaly to catch. Calibration constants below are anchored
to real historical regimes (levels, daily vols, cross-asset correlations).

A `MarketDataSource` seam lets a real feed swap in later without touching the
engine. Everything here is numpy + a fixed seed for deterministic demos.
"""

import threading

import numpy as np

# Risk factors the detector watches. BTP/Bund is the flagship pair.
FACTORS = [
    'BTP_10Y',      # Italian 10Y yield (%)
    'BUND_10Y',     # German 10Y yield (%)
    'EURUSD',       # EUR/USD spot
    'EURUSD_VOL',   # EUR/USD 1M implied vol (%)
    'ITRAXX_XOVER', # iTraxx Europe Crossover 5Y (bps)
    'ITRAXX_MAIN',  # iTraxx Main 5Y (bps)
    'EUR_5Y_SWAP',  # 5Y EUR swap rate (%)
]
N = len(FACTORS)

# Mean levels (historical anchors).
MU = np.array([3.90, 2.40, 1.08, 7.0, 300.0, 60.0, 2.50])

# Daily increment volatilities (same in both regimes — so per-factor z-scores
# stay in-range and only the *correlation* changes under stress).
VOL = np.array([0.045, 0.035, 0.004, 0.35, 5.5, 1.6, 0.032])

# Gentle mean reversion keeps levels bounded around MU.
THETA = np.array([0.02, 0.02, 0.02, 0.05, 0.03, 0.03, 0.02])

# --- Correlation regimes -----------------------------------------------------
# Normal: rates (BTP/Bund/swap) form a VERY tight cluster (stable spreads); credit
# (Xover/Main) a second tight cluster; the two blocks only mildly linked. The
# tighter the normal coupling, the more improbable — and higher-sigma — a
# correlation break becomes.
_CORR_NORMAL = np.array([
    #BTP   BUND  EURUSD EVOL  XOVER MAIN  SWAP
    [1.00, 0.97, -0.10, 0.15, 0.45, 0.40, 0.95],
    [0.97, 1.00, -0.08, 0.10, 0.35, 0.30, 0.97],
    [-0.10,-0.08, 1.00,-0.35,-0.20,-0.18,-0.08],
    [0.15, 0.10, -0.35, 1.00, 0.40, 0.35, 0.10],
    [0.45, 0.35, -0.20, 0.40, 1.00, 0.93, 0.38],
    [0.40, 0.30, -0.18, 0.35, 0.93, 1.00, 0.32],
    [0.95, 0.97, -0.08, 0.10, 0.38, 0.32, 1.00],
])

# Stressed: BTP violently LEAVES the rates cluster (spread blows out) and JOINS
# the credit/vol stress cluster — the eurozone-crisis signature. Bund & swap stay
# tightly coupled. Marginal vols are UNCHANGED, so univariate monitors see a
# normal-sized move on every single factor; only the joint structure is violated.
_CORR_STRESSED = np.array([
    #BTP   BUND  EURUSD EVOL  XOVER MAIN  SWAP
    [1.00,-0.65, -0.20, 0.70, 0.92, 0.82, -0.55],
    [-0.65,1.00, -0.05, 0.00, 0.05, 0.05, 0.96],
    [-0.20,-0.05, 1.00,-0.45,-0.35,-0.30,-0.05],
    [0.70, 0.00, -0.45, 1.00, 0.70, 0.60, 0.05],
    [0.92, 0.05, -0.35, 0.70, 1.00, 0.92, 0.10],
    [0.82, 0.05, -0.30, 0.60, 0.92, 1.00, 0.08],
    [-0.55,0.96, -0.05, 0.05, 0.10, 0.08, 1.00],
])


def _nearest_psd_cholesky(corr: np.ndarray, vol: np.ndarray) -> np.ndarray:
    """Return L (lower-tri) with L@L.T = covariance, clipping to nearest PSD.

    Hand-authored correlation matrices aren't guaranteed positive semi-definite;
    clip negative eigenvalues to a small floor, rebuild, then Cholesky.
    """
    cov = np.outer(vol, vol) * corr
    # Symmetrize + eigen-clip for numerical PSD safety.
    cov = (cov + cov.T) / 2.0
    vals, vecs = np.linalg.eigh(cov)
    vals = np.clip(vals, 1e-12, None)
    cov_psd = (vecs * vals) @ vecs.T
    # Small diagonal loading guarantees Cholesky succeeds.
    cov_psd += np.eye(len(vol)) * 1e-10
    return np.linalg.cholesky(cov_psd)


class MarketDataSource:
    """Interface seam — a real feed can implement this later."""

    def step(self) -> np.ndarray:
        raise NotImplementedError

    def current(self) -> np.ndarray:
        raise NotImplementedError


class SyntheticMarketSource(MarketDataSource):
    def __init__(self, seed: int = 42):
        self._rng = np.random.default_rng(seed)
        self._level = MU.copy()
        self._regime = 'normal'
        self._chol = {
            'normal': _nearest_psd_cholesky(_CORR_NORMAL, VOL),
            'stressed': _nearest_psd_cholesky(_CORR_STRESSED, VOL),
        }
        self._last_increment = np.zeros(N)
        self._lock = threading.Lock()

    def set_regime(self, regime: str):
        if regime not in ('normal', 'stressed'):
            raise ValueError(f'unknown regime: {regime}')
        with self._lock:
            self._regime = regime

    def regime(self) -> str:
        return self._regime

    def step(self) -> np.ndarray:
        """Advance one tick: draw a correlated increment, mean-revert, return level."""
        with self._lock:
            z = self._rng.standard_normal(N)
            increment = self._chol[self._regime] @ z
            reversion = THETA * (MU - self._level)
            self._level = self._level + reversion + increment
            self._last_increment = increment
            return self._level.copy()

    def last_increment(self) -> np.ndarray:
        return self._last_increment.copy()

    def current(self) -> np.ndarray:
        return self._level.copy()
