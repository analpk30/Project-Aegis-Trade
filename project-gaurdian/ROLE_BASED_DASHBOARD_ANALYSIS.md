# Project Guardian: Detailed Role-Based Dashboard Analysis

## 1) What the product does (code-grounded)
Project Guardian is a role-aware front-office decision platform that combines:
- **RBAC-gated workflows** per persona (`src/lib/dataService.ts`, `PERSONA_CONFIG_MAP`)
- **Trade decisioning + justifications** (`src/pages/Trade.tsx`, `python_backend/app.py`)
- **Compliance intelligence (BaFin + pre-crime pattern checks)** (`src/pages/Bafin.tsx`, `src/pages/Trade.tsx`)
- **Client suitability and consent controls** (`src/pages/Clients.tsx`)
- **Risk monitoring and hedge recommendations** (`src/pages/Risk.tsx`)
- **Explainability and audit evidence** (`src/pages/Audit.tsx`, `src/components/WhyModal.tsx`, `src/components/XaiAuditDrawer.tsx`)
- **Executive value visibility** (`src/pages/Executive.tsx`)

The UI enforces access with `ProtectedRoute` and persona route claims, while the backend provides APIs for orders, clients, risk, audit, executive KPIs, search, and streaming pulse updates.

---

## 2) Exact roles defined in code
Roles are strictly defined in `src/types.ts` (`PersonaRole`) and mirrored in `python_backend/store.py` (`PERSONA_CONFIG`):
1. `Trader`
2. `Salesperson`
3. `Desk Head`
4. `Compliance (1st Line)`
5. `Central Compliance`
6. `Risk Officer`
7. `IT/Ops`
8. `Auditor`
9. `Wealth/Relationship Manager`
10. `Executive`

---

## 3) Access matrix from `PERSONA_CONFIG_MAP`

| Role | Default Route | Allowed Routes |
|---|---|---|
| `Trader` | `/trade` | `/home`, `/trade`, `/clients`, `/ideas`, `/audit` |
| `Salesperson` | `/clients` | `/home`, `/clients`, `/ideas`, `/trade`, `/audit` |
| `Desk Head` | `/home` | `/home`, `/trade`, `/clients`, `/ideas`, `/bafin`, `/risk`, `/audit` |
| `Compliance (1st Line)` | `/audit` | `/home`, `/trade`, `/clients`, `/bafin`, `/risk`, `/audit` |
| `Central Compliance` | `/bafin` | `/home`, `/bafin`, `/audit`, `/clients`, `/risk` |
| `Risk Officer` | `/risk` | `/home`, `/risk`, `/trade`, `/audit` |
| `IT/Ops` | `/clients` | `/home`, `/clients`, `/audit`, `/trade` |
| `Auditor` | `/audit` | `/home`, `/audit`, `/bafin`, `/clients`, `/trade`, `/risk`, `/executive` |
| `Wealth/Relationship Manager` | `/clients` | `/home`, `/clients`, `/ideas`, `/audit` |
| `Executive` | `/executive` | `/home`, `/executive`, `/trade`, `/clients`, `/ideas`, `/bafin`, `/risk`, `/audit` |

**Enforcement path:**
- `App.tsx` passes `allowedRoutes` into `ProtectedRoute` for every page route.
- `ProtectedRoute.tsx` blocks unauthorized views and suggests personas that can unlock the module.
- `Sidebar.tsx` visibly marks locked modules and lets users see what is unavailable for current role.

---

## 4) How key components make day jobs easier

### `App.tsx` (orchestration)
- Keeps one source of truth for active persona, active user, and allowed routes.
- Pulls initial persona from backend (`/api/auth/persona`) and updates route permissions live.
- Consumes SSE pulse stream (`/api/stream`) for live Guardian score.

**Day-job impact:** users avoid stale permissions and get immediate context when switching roles.

### `Navbar.tsx` (control plane)
- Persona switcher with role descriptions.
- Global server-side search (`/api/search`) across orders, clients, BaFin data.
- Alert bell fed by anomalies (`/api/risk/anomalies`).
- Guardian index status + dual-engine architecture visibility.

**Day-job impact:** faster navigation, fewer context switches, faster triage.

### `Sidebar.tsx` + `ProtectedRoute.tsx` (safe navigation)
- Shows all modules but marks locked ones.
- If blocked, displays authorized personas for that module and one-click persona switch suggestions.

**Day-job impact:** reduces confusion and ticket noise about “missing access.”

### `XaiAuditDrawer.tsx` + `WhyModal.tsx` (explainability)
- Persistent audit-access pattern from anywhere in app.
- Drill-down on reasoning payloads and decision history.

**Day-job impact:** shorter explainability loop during reviews/escalations.

---

## 5) Module-to-work mapping (what each page solves)

### `/trade` — `Trade.tsx`
- Live order blotter, guardian score visualization, autopilot justification stream (`/api/orders/{id}/autopilot`), approval flow (`/api/orders/{id}/approve`), pre-crime match display.
- Offline deterministic fallback if backend stream is unavailable.

**Solves:** manual justifications, inconsistent execution rationale, slow approvals.

### `/clients` — `Clients.tsx`
- Unified client passport: KYC status, AML risk, MiFID suitability, division clearance, GDPR consent map, version history.

**Solves:** fragmented onboarding/compliance view and repeated client-data checks.

### `/ideas` — `Ideas.tsx`
- Approved idea cards pre-screened for suitability/consent, direct send-to-blotter action (`/api/ideas/{id}/send-to-blotter`).

**Solves:** idea-to-execution friction and non-compliant idea leakage.

### `/bafin` — `Bafin.tsx`
- Regulatory circular cards with explicit DO/DON’T controls.
- RAG-based query interface (`/api/bafin/interpret`) with fallback interpretation.

**Solves:** time spent decoding policy text into action-level decisions.

### `/risk` — `Risk.tsx`
- Anomaly detector cards and hedge recommendation cards with cost, capital impact, and efficiency scores.

**Solves:** delayed detection and non-systematic hedge selection.

### `/audit` — `Audit.tsx`
- Searchable/filterable immutable-style logs, per-record “Why?” inspection, export endpoint (`/api/audit/export`) with local fallback export.

**Solves:** slow evidence compilation and weak traceability.

### `/executive` — `Executive.tsx`
- KPI cards (hours saved, approval reduction, fines avoided, ROI), trend charts for monthly trajectory.

**Solves:** inability to connect controls to business impact.

### `/home` — `Home.tsx`
- Persona summary, module unlock matrix, guardian score breakdown, headline pre-crime interrupt scenario.

**Solves:** onboarding/time-to-context for each role at session start.

---

## 6) Role-by-role analysis: how this reduces daily workload

## 6.1 `Trader`
**Day job:** execute orders quickly with defensible best-execution rationale.

**Components that help:**
- `/trade` blotter + autopilot streaming justification.
- Pre-crime interrupt panel for risky orders.
- `/clients` to verify client suitability and consent before action.
- `/ideas` for pre-screened opportunities.
- `/audit` for decision evidence recall.

**Operational relief:**
- Cuts manual justification drafting.
- Reduces back-and-forth with compliance on “why this venue/size.”
- Speeds sign-off by attaching machine-generated rationale and score context.

## 6.2 `Salesperson`
**Day job:** propose client-relevant opportunities while respecting suitability and consent.

**Components that help:**
- `/clients` for profile, clearance, and GDPR scope checks.
- `/ideas` for compliant opportunity generation.
- `/trade` visibility to coordinate execution handoff.
- `/audit` for historical context.

**Operational relief:**
- Avoids pitching non-consented or non-suitable products.
- Shortens proposal cycle by reusing pre-screened ideas.
- Improves handoff quality to traders with less rework.

## 6.3 `Desk Head`
**Day job:** oversee desk quality, sign-offs, and aggregate risk/compliance posture.

**Components that help:**
- Broad route access: trade, clients, ideas, BaFin, risk, audit.
- `Home` unlock matrix + guardian breakdown for quick desk snapshot.
- `/risk` anomalies for immediate escalation.

**Operational relief:**
- Faster cross-module supervision in one place.
- Better sign-off quality with visible trade reasoning + risk context.
- Reduced management overhead from fragmented systems.

## 6.4 `Compliance (1st Line)`
**Day job:** intercept problematic trades early and enforce first-line controls.

**Components that help:**
- `/trade` pre-crime interrupt visibility.
- `/bafin` regulatory interpretation.
- `/clients` suitability + KYC/AML checks.
- `/risk` anomaly context and `/audit` full trace.

**Operational relief:**
- Earlier intervention before execution.
- Faster policy-to-decision translation.
- Lower manual burden for exception handling evidence.

## 6.5 `Central Compliance`
**Day job:** policy interpretation, consistency, and control governance.

**Components that help:**
- `/bafin` as primary route (RAG + DO/DON’T structure).
- `/audit` for institution-wide trace evidence.
- `/clients` and `/risk` for control-context checks.

**Operational relief:**
- Reduces legal-text interpretation latency.
- Standardizes policy application across desks.
- Improves response speed during regulatory queries.

## 6.6 `Risk Officer`
**Day job:** detect anomalies, quantify exposure, and optimize hedging.

**Components that help:**
- `/risk` anomaly detector + hedge recommender.
- `/trade` for trade-level context.
- `/audit` for event provenance and model traceability.

**Operational relief:**
- Quicker anomaly triage and containment.
- More systematic hedging choices using explicit efficiency/capital metrics.
- Better post-event review with linked evidence.

## 6.7 `IT/Ops`
**Day job:** maintain data integrity, operational continuity, and support diagnostics.

**Components that help:**
- `/clients` data completeness and consistency checks.
- `/trade` operational state visibility.
- `/audit` change/event tracking.
- `Navbar` search + alerts for support triage.

**Operational relief:**
- Faster incident triage using centralized logs and search.
- Easier validation of data drift and synchronization issues.
- Reduced dependence on ad hoc extraction scripts.

## 6.8 `Auditor`
**Day job:** independently verify decisions, controls, and evidence integrity.

**Components that help:**
- `/audit` as default route with export capability.
- Access to `/trade`, `/clients`, `/bafin`, `/risk`, `/executive` for cross-checking.
- `Why` modal for explanation-level inspection.

**Operational relief:**
- Fewer manual evidence collection cycles.
- Faster sampling and trace reconstruction.
- Clearer audit narratives tied to score/model/latency.

## 6.9 `Wealth/Relationship Manager`
**Day job:** manage HNW relationships with compliant, tailored ideas.

**Components that help:**
- `/clients` for HNW profile and consent scope.
- `/ideas` for pre-screened opportunity shortlists.
- `/audit` for client-discussion defensibility.

**Operational relief:**
- Lower risk of unsuitable recommendations.
- Faster curation of client-ready ideas.
- Better client trust through explainable recommendations.

## 6.10 `Executive`
**Day job:** steer outcomes, monitor ROI, and defend governance posture.

**Components that help:**
- `/executive` KPI + trend dashboard.
- Read access across all strategic modules.
- `/audit` for governance evidence.

**Operational relief:**
- Converts control performance into business metrics.
- Speeds board-level reporting.
- Reduces ambiguity in investment decisions about platform value.

---

## 7) Backend endpoints that enable these workflows
Key endpoints in `python_backend/app.py`:
- `GET /api/auth/persona`, `POST /api/auth/persona`
- `GET /api/orders`, `POST /api/orders/{id}/autopilot`, `POST /api/orders/{id}/approve`
- `GET /api/clients`
- `GET /api/ideas`, `POST /api/ideas/{id}/send-to-blotter`
- `GET /api/bafin`, `POST /api/bafin/interpret`
- `GET /api/risk/anomalies`, `GET /api/risk/hedges/{position}`
- `GET /api/audit`, `POST /api/audit/export`
- `GET /api/executive/kpis`
- `GET /api/search`
- `GET /api/stream`

These APIs are directly used by `src/lib/dataService.ts` and page-level `fetch(...)` calls.

---

## 8) Practical strengths for presentation
- **Role-contextual UX:** each persona lands on a default route aligned to daily responsibilities.
- **Explicit control surfaces:** locked/unlocked modules and access explanations are visible, not hidden.
- **Decision explainability:** every critical action can be traced with reasoning payload, score, model, and latency.
- **Operational resilience:** client-side deterministic fallbacks keep workflows usable during backend outages.
- **Business translation:** executive module quantifies impact in time, risk, and € terms.

---

## 9) Precision notes from current implementation
- Role ACL is consistently defined in both frontend (`PERSONA_CONFIG_MAP`) and backend (`PERSONA_CONFIG`).
- `Audit` persona filter dropdown currently lists: `Trader`, `Salesperson`, `Desk Head`, `Compliance (1st Line)`, `Central Compliance`, `Risk Officer`, `Auditor`, `Executive` (it does not include `IT/Ops` and `Wealth/Relationship Manager` in the selector UI).
- Sidebar text says RBAC is enforced on all API endpoints; in practice, route-level gating is explicit in frontend and persona-switch validation exists in backend.

---

## 10) Concise talk track (60–90 seconds)
Project Guardian makes each front-office and control persona faster by placing the exact controls, data, and AI explanations they need behind role-specific access. Traders and sales reduce execution friction via autopilot justifications and pre-screened ideas, compliance and risk get earlier, evidence-rich interventions through pre-crime and anomaly modules, auditors and executives get end-to-end traceability and measurable ROI. The result is lower decision latency, higher consistency, and stronger governance with less manual overhead.
