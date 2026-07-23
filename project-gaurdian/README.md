# Project Guardian - Local Execution Guide

Project Guardian is a dual-engine AI Compliance & Front-Office Trading platform. It connects a **React + Vite** frontend with a standalone **Python AI Engine** backend.

---

## Prerequisites

1. **Node.js** (v18.x or higher) - [Download Node.js](https://nodejs.org/)
2. **Python** (v3.8 or higher) - [Download Python](https://www.python.org/)
   - *Windows users:* During Python installation, make sure to check **"Add Python to PATH"**.

---

## Running Locally

### Step 1: Install Frontend Dependencies
```bash
npm install
```

---

### Step 2: Run Backend and Frontend

#### **Option A: Run Python Backend separately (Pure Python, no npm wrapper)**

1. **In Terminal 1 — Start the Python Backend directly:**
   ```bash
   python python_backend/app.py
   # or on macOS/Linux:
   python3 python_backend/app.py
   ```
   *(Starts the Python HTTP API server on `http://127.0.0.1:5000`)*

2. **In Terminal 2 — Start the React Frontend:**
   ```bash
   npx vite
   # or:
   npm run dev:frontend
   ```
   *(Starts Vite on `http://localhost:3000` and automatically proxies `/api` calls to `http://127.0.0.1:5000`)*

---

#### **Option B: Run both simultaneously via single command**
```bash
npm run dev
```

---

## Access the Application
Open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Optional: Gemini AI Integration
To enable live Google Gemini AI capabilities, create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If no key is supplied, the Python engine operates with the built-in deterministic BaFin & GwG compliance rule system).*
