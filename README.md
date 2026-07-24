Aegis Trade

Aegis Tradeis a persona-driven AI compliance and front-office trading cockpit. It combines a **React + Vite** web app with a **Python AI engine** to simulate a regulated trading environment with approvals, compliance checks, auditability, and risk monitoring.

## What It Does

The product is organized around role-based workflows for traders, sales, compliance, risk, auditors, and executives. Each persona sees a different slice of the platform, with route access and data tailored to their responsibilities.

Core capabilities include:

- **MiFID II AutoPilot blotter** for trade review, justifications, and approvals.
- **Client passports** with KYC, AML, suitability, and GDPR consent data.
- **BaFin rulebook RAG** for regulatory interpretation and Q&A.
- **Cross-market risk monitoring** with anomaly detection and hedging recommendations.
- **Immutable XAI audit trail** with searchable reasoning logs and export support.
- **Executive ROI dashboard** showing time saved, approval speed, fine avoidance, and overall return.

## Suggested Name

The simplest name that still fits the product is **Guardian Desk**. It is short, easy to remember, and reflects the app’s purpose as a desk-level control surface for trading, compliance, and risk.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Recharts
- **Backend:** Python HTTP server with modular AI and rules engines
- **Data:** Seeded JSON datasets for orders, clients, ideas, hedges, BaFin notices, and anomalies
- **AI / Retrieval:** Gemini integration with deterministic local fallback logic

## Main Screens

- **Home** - landing dashboard with persona switching, guardian score, and module access overview.
- **Trade** - live order blotter with justification generation and approval flow.
- **Clients** - unified client risk passports and consent matrix.
- **Ideas** - pre-screened trade ideas and routing into the blotter.
- **BaFin** - regulatory rulebook explorer and chat assistant.
- **Risk** - cross-market anomaly detection and hedging recommendations.
- **Audit** - immutable audit log explorer with export.
- **Executive** - KPI dashboard for leadership reporting.

## Local Development

### Prerequisites

- Node.js 18 or newer
- Python 3.8 or newer

### Install Dependencies

```bash
npm install
```

### Run the App

Run both frontend and backend together:

```bash
npm run dev
```

This starts:

- the Python backend on `http://127.0.0.1:5000`
- the Vite frontend on `http://localhost:3000`

If you want to run them separately:

```bash
python3 python_backend/app.py
npm run dev:frontend
```

## Optional Gemini Setup

Create a `.env` file in the project root if you want live Gemini-backed responses:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If no key is provided, the backend uses deterministic local rule and retrieval fallbacks.

## Project Layout

- `src/` - React app, pages, components, and UI helpers
- `python_backend/` - backend HTTP API, scoring, retrieval, and AI logic
- `data/` - seeded datasets used by the app
- `terraform/` - example infrastructure definitions

## Notes

The app is designed for the hackathon environment and uses local fallback data if backend services are unavailable. The README is intended to summarize the product itself, while environment-specific hackathon instructions live in the repository root.
