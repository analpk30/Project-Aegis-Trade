"""Hawkes self-exciting point process — contagion forecasting.

Market stress is not memoryless: one dislocation raises the odds of the next
(volatility clusters, contagion spreads). A Hawkes process models exactly that —
each event temporarily lifts the intensity of future events via an exponential
excitation kernel. Reactive monitors say "an anomaly happened"; this predicts
"the anomaly is likely to cascade in the next N minutes."

Intensity:  λ(t) = μ + Σ_{t_i < t} α · exp(−β (t − t_i))

We maintain the self-excited term recursively in O(1):
  - each tick:      excited *= exp(−β · dt)
  - on an event:    excited += α

Stability requires the branching ratio n = α/β < 1 (each event spawns <1 offspring
on average). Pure math, no external deps beyond the stdlib.
"""

import math


class HawkesContagion:
    def __init__(self, mu: float = 0.02, alpha: float = 0.15, beta: float = 0.30):
        assert alpha < beta, 'branching ratio alpha/beta must be < 1 for stability'
        self.mu = mu
        self.alpha = alpha
        self.beta = beta
        self._excited = 0.0

    @property
    def branching_ratio(self) -> float:
        return self.alpha / self.beta

    def decay(self, dt: float = 1.0):
        """Advance time one tick — the excitation decays exponentially."""
        self._excited *= math.exp(-self.beta * dt)

    def record_event(self):
        """Register an anomaly event — lifts near-term contagion intensity."""
        self._excited += self.alpha

    def intensity(self) -> float:
        return self.mu + self._excited

    def contagion_probability(self, horizon: float = 10.0) -> float:
        """P(≥1 self-excited follow-on event within `horizon` ticks).

        Expected offspring over the horizon for an exponential kernel:
            Λ = μ·H + (excited/β)·(1 − exp(−β·H))
        Then P(≥1) = 1 − exp(−Λ)  (Poisson tail).
        """
        excited_mass = (self._excited / self.beta) * (1.0 - math.exp(-self.beta * horizon))
        lam = self.mu * horizon + excited_mass
        return 1.0 - math.exp(-lam)

    def reset(self):
        self._excited = 0.0
