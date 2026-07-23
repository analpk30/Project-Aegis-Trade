# Cross-Market Anomaly Engine — Implementation Plan

Turn `/api/risk/anomalies` from **2 hardcoded cards** into a **live, computed
cross-market anomaly detector**: a multivariate statistical model (Mahalanobis
distance over a rolling covariance matrix) on a synthetic-but-calibrated market
simulation, with a Hawkes-process contagion forecast that predicts spillover to
specific client books.

**Explicit non-goal:** RAG / document Q&A (that's the BaFin flow). The core here
is numerical linear algebra + point-process math. An *optional* LLM layer only
narrates computed numbers — it never makes the decision.

---

## Current state (verified)

| Concern | Today | Location |
| --- | --- | --- |
| Anomaly data | **100% hardcoded** — 2 dicts, `deviationSigma` typed by hand (3.82, 2.45) | `store.py:351` `seed_anomalies()` |
| Endpoint | Pure passthrough of `store.anomalies`, no computation | `app.py` `/api/risk/anomalies` |
| Detection | **None exists.** No time series, no model | — |
| "Cross-market" | Label only — nothing is actually multivariate | `Risk.tsx` header |
| `affectedClients` | Stored but **never joined** to clients/orders | `store.py:359` |
| SSE `/api/stream` | **Fake stream** — writes one pulse then returns; EventSource auto-reconnects (≈ slow polling) | `app.py` |
| numpy | **2.4.4 installed** | venv |
| Consumers | `Risk.tsx` cards, `Navbar.tsx` bell (count+list), SSE `unreadAlertsCount` | — |
| Frontend live-ness | `EventSource('/api/stream')` already wired; anomalies fetched **once on mount** | `App.tsx:47`, `Risk.tsx:14`, `Navbar.tsx:58` |

Runtime: single-process threaded HTTP server (`ThreadingMixIn`). Frontend Vite,
proxying `/api` → :5050.

---

## Target architecture

```
market_sim.py  (correlated OU process, regime switch, seeded)
     │  advances one tick per interval  ── background daemon thread
     ▼
anomaly_engine.py
     ├─ rolling covariance window  → Mahalanobis distance  → true σ + which market drove it
     ├─ Hawkes intensity           → contagion probability + forecast horizon
     └─ impact mapper: stressed factor's assetClass ∩ client holdings/orders → affectedClients
     │  writes computed MarketAnomaly[] into store.anomalies (under lock)
     ▼
store.anomalies ──GET /api/risk/anomalies──▶ Risk.tsx cards (poll ~2–3s)
     (SAME MarketAnomaly shape)          └──▶ Navbar bell (unchanged)

POST /api/risk/simulate-shock  →  flips sim to stressed regime  (deterministic demo trigger)
```

**The seam that keeps it low-friction:** `/api/risk/anomalies` keeps returning
`MarketAnomaly[]`. Consumers never change. New quant fields are **optional
additions** to the type, so existing renders keep working mid-migration.

---

## Data synthesis (no external feed)

Detection runs on **synthetic market risk factors**, calibrated to real historical
regimes via **hardcoded constants** (means, vols, correlations) — no API, no
dataset file. The app's existing **trade/client data** is reused only for the
impact layer (who is exposed), never for detection.

**Risk-factor vector** (what the engine watches): BTP 10Y, Bund 10Y (→ BTP–Bund
spread), EUR/USD spot, EUR/USD 1M vol, iTraxx Crossover 5Y, iTraxx Main 5Y, 5Y
EUR swap. **Calibration:** per-factor mean, daily vol, OU mean-reversion speed, a
normal correlation matrix, and a **stressed correlation matrix** (the regime the
shock switches to).

**The demo-critical property:** the stressed regime must break *correlation*
while keeping each factor's marginal range normal — so per-metric z-scores see
nothing but Mahalanobis spikes. If that break isn't convincing, the flagship
anomaly won't fire. Tune the generator before anything downstream.

---

## File-by-file changes

### NEW `python_backend/market_sim.py`
Synthetic multivariate market generator.
- `MarketDataSource` seam + `SyntheticMarketSource` implementation (so a real
  feed can swap in later without touching the engine).
- Correlated Ornstein–Uhlenbeck paths from the calibration constants; `step()`
  advances one tick and returns the current risk-factor vector.
- `set_regime('normal'|'stressed')` — the regime switch the shock endpoint flips.
- Fixed seed for deterministic demos.

### NEW `python_backend/anomaly_engine.py`
The math.
- Rolling window of recent vectors; `numpy.cov` → covariance, `numpy.linalg.pinv`
  → inverse (pinv guards singular windows); **Mahalanobis distance** = the true
  multivariate σ.
- **Per-market attribution**: decompose the quadratic form to name which factor
  drove the deviation (fills `metric` / `description` from real numbers).
- **Hawkes intensity**: self-exciting point process over flagged events →
  `contagionProbability` + forecast horizon.
- **Impact mapper**: intersect the stressed factor's `assetClass` with client
  holdings/orders/suitability from `store` → `affectedClients` (activates the
  dangling link).
- `build_anomalies()` → returns `MarketAnomaly`-shaped dicts (existing fields +
  optional `mahalanobisDistance`, `contagionProbability`, `contributingMarkets`,
  `forecastHorizonMins`).

### NEW `python_backend/anomaly_runtime.py`  (or fold into app.py boot)
- Daemon thread: every N seconds, `market_sim.step()` → `anomaly_engine.build_anomalies()`
  → replace `store.anomalies` under a `threading.Lock` (same idiom as
  `chat_sessions`). Starts at server boot, dies with the process.

### EDIT `python_backend/store.py`
- `seed_anomalies()` → seed the engine's *initial* state (or leave 2 static as a
  cold-start fallback until the first tick). `store.anomalies` still exists and
  keeps the same shape; it's now written by the runtime thread.

### EDIT `python_backend/app.py`
- `/api/risk/anomalies` (GET): **unchanged body** — still `{'anomalies': store.anomalies}`.
- NEW `POST /api/risk/simulate-shock` → `market_sim.set_regime('stressed')`,
  returns `{'success': True, 'regime': 'stressed'}`. The demo trigger.
- Optional NEW `POST /api/risk/simulate-reset` → back to normal regime.
- Start the anomaly runtime thread in `run_server()` boot.
- Audit: log each RED anomaly transition via `log_audit_event` (module
  'Cross-Market Risk Engine') — reuses existing audit, gives the XAI trail.

### EDIT `src/types.ts`
- Add **optional** fields to `MarketAnomaly`: `mahalanobisDistance?`,
  `contagionProbability?`, `contributingMarkets?: string[]`, `forecastHorizonMins?`.
  Additive — existing code compiles unchanged.

### EDIT `src/pages/Risk.tsx`
- Add a **polling** `setInterval` (~2–3s) re-calling `fetchAnomalies()` so cards
  update live (currently fetch-once).
- Add a **"Trigger Market Shock"** button → `POST /api/risk/simulate-shock`.
- Render the new fields when present (σ = Mahalanobis, contagion %, contributing
  markets, "spillover forecast"). Existing card layout stays.

### EDIT `src/lib/dataService.ts`
- `fetchAnomalies` unchanged (contract preserved). 1B `globalStore` fallback stays.

### `src/components/Navbar.tsx`
- **Untouched.** Reads count + list off the same shape.

### NEW (optional) `src/components/AnomalySparkline.tsx`
- Live σ time-series mini-chart per anomaly — the biggest visual "wow", but
  strictly optional. Only sizable frontend piece.

### EDIT `tests/`
- `test_market_sim.py` — regime switch changes correlation while marginals stay in
  range (the break exists). Offline, deterministic (seeded).
- `test_anomaly_engine.py` — **the money test**: on a stressed window, Mahalanobis
  exceeds threshold while per-factor z-scores do not; attribution names the right
  market; pinv handles a singular window. Offline.
- `test_hawkes.py` — intensity rises after clustered events, decays otherwise.
- `test_impact_mapping.py` — a stressed Rates factor lists the Rates-exposed
  clients from `store`. Offline.

---

## Sequencing (each step independently verifiable)

| # | Step | Done when |
| --- | --- | --- |
| 1 | **Spike:** `market_sim.py` + Mahalanobis in a script; dump series + σ to CSV | Numeric proof: stressed regime spikes Mahalanobis where z-score is flat. **Go/no-go gate for the whole idea** |
| 2 | `anomaly_engine.build_anomalies()` (Mahalanobis + attribution) → `MarketAnomaly` dicts; runtime thread writes `store.anomalies`; endpoint unchanged | `GET /api/risk/anomalies` returns **computed** anomalies with real σ, live-updating |
| 3 | Impact mapping → real `affectedClients` from client/order exposure | Stressed Rates anomaly lists the rates-exposed client IDs, not a static array |
| 4 | Hawkes contagion layer → `contagionProbability` + forecast | Cascade probability computed and rises under clustered stress |
| 5 | Frontend: optional type fields, `Risk.tsx` polling + Trigger-Shock button + new-field render | Click shock → cards visibly spike within one poll; contagion % + contributing markets show |
| 6 | *Optional:* `AnomalySparkline.tsx` live chart; *optional:* LLM narrator for `description`/`recommendedAction` from computed numbers | Live σ chart animates; prose is generated from real state (not hardcoded) |

Steps 1–2 are the substance and deliver a real detector on their own. 3–4 add the
differentiated story (client contagion, Hawkes). 5 makes it demoable. 6 is polish.

---

## Impacts / blast radius

- **Endpoint contract preserved** → `Risk.tsx`, `Navbar.tsx`, SSE `unreadAlertsCount`
  keep working with zero changes to the shape they consume.
- **Type change is additive** → no frontend breakage; new fields optional.
- **`store.anomalies` now mutated by a background thread** → must hold a lock on
  write; readers (endpoint) get a consistent list. Same concurrency idiom as
  `chat_sessions`.
- **`seed_anomalies` semantics shift** (static → initial/cold-start) → the only
  behavioral change to existing code, and it's backward-compatible.
- **New shock endpoints** are purely additive.

---

## Risks / open items

- **The simulator is demo-critical.** Weak correlation break ⇒ no visible anomaly.
  Mitigation: step-1 spike is a hard gate; tune before building downstream.
- **Live-ness needs the polling line.** Without the `Risk.tsx` interval, cards
  update only on page load. (Real SSE loop is the heavier alternative — not needed.)
- **Singular covariance** on short/degenerate windows → use `numpy.linalg.pinv`
  and a minimum-window guard before scoring.
- **Background-thread lifecycle** → daemon, started once at boot; guard `store`
  writes with a lock.
- **Honesty framing:** never present synthetic output as real market data — it is
  a *calibrated market simulator*; the **math** is real and feed-swappable via the
  `MarketDataSource` seam.
- **Hawkes calibration** is the least-familiar piece; if it slips, ship steps 1–3
  (Mahalanobis + impact) which already stand on their own.

---

## Rejected alternatives

| Option | Why not |
| --- | --- |
| RAG / LLM to "detect" anomalies | Wrong tool for a numerical problem; hallucination risk; and it repeats the BaFin flavor the brief explicitly rules out |
| Real market-data feed (ECB SDW, stooq, Yahoo) | No legitimate source available; adds network deps + mid-demo flakiness. Synthesize instead; keep the feed seam for later |
| Plain rolling z-score / EWMA only | Real detection but not *cross-market* — loses the correlation-break differentiator that makes the story |
| Agentic LLM "risk investigator" | Genuinely agentic but leans on LLM orchestration — closer in flavor to what we already built; less differentiated than the quant route |

**Deciding factor:** anomaly detection is a numerical / time-series problem, so a
mathematical model is the *native* tool — and Mahalanobis + Hawkes is both
finance-legitimate and unexpected at a hackathon, which is exactly the selling
point. The endpoint contract barely moves; the value is that the numbers become
real.
