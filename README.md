# TripBuddy AI — Agentic Multimodal Travel Assistant for Bengaluru

TripBuddy AI is a full-stack, multi-agent AI travel assistant engineered specifically for **Bengaluru, Karnataka, India**. It plans door-to-door journeys from point A to point B, compares **BMTC buses**, **Namma Metro (Purple & Green Lines)**, **pedestrian skywalks/walking**, and **last-mile auto-rickshaws**, answers natural-language travel queries in **English and Kannada (ಕನ್ನಡ)** using a grounded **Retrieval-Augmented Generation (RAG)** pipeline, and assists commuters proactively throughout their trip.

---

## Key Features & Honesty Guarantees

1. **12 Specialist AI Agents + Central Trip Orchestrator**: Explicit state-machine orchestration (`Intent Extraction → Clarification → Geospatial Resolution → Parallel Context Retrieval → Graph Route Optimization → Safety Validation → Human Approval Gate → Proactive Monitoring`).
2. **Graph-Based Multimodal Routing Engine**: Uses Dijkstra/A* over a connected graph of Namma Metro stations, BMTC bus corridors (`500-D`, `335-E`, `356-C`, `290-E`, `MF-12`, `600-F`), pedestrian skywalks, and metered auto connectors to generate **Fastest**, **Cheapest**, and **Best-Balanced** itineraries.
3. **Demo Mode vs. Live Mode Transparency**:
   - **Demo Mode (Default)**: Runs out-of-the-box without paid API keys using deterministic, clearly labeled Bengaluru schedule fixtures (`SCHEDULE_AND_DEMO_FIXTURE`). Never claims simulated data represents live GPS vehicle positions.
   - **Live Mode**: Connects to configured external providers and falls back safely when institutional credentials (such as BMTC GTFS-Realtime or commercial traffic APIs) are not present.
4. **Strict Booking Safety Gate**: Requires explicit user confirmation (`user_explicit_approval=True`) before generating an official booking handoff to BMRCL Namma Metro, BMTC, or Namma Yatri. Never collects payment card credentials or fabricates fake ticket confirmations.

---

## Supported Dependency Versions

- **Python**: `3.11+` (`FastAPI`, `Pydantic`, `SQLAlchemy`, `NumPy`, `SciPy`, `Pandas`, `Scikit-learn`, `PyTorch`, `Sentence-Transformers`)
- **Node.js**: `20.x LTS` (`React 18.3`, `TypeScript 5.6`, `Vite 5.4`, `Tailwind CSS 3.4`, `Leaflet 1.9` / `MapLibre GL 4.7`)
- **Database**: `PostgreSQL 16` with `PostGIS 3.4` and `pgvector` (plus automatic zero-config `SQLite3` fallback for local development and automated testing)
- **Cache & Workers**: `Redis 7.2` + `app.workers.runner`

---

## Quick Start & Installation

### 1. Environment Configuration

#### Linux / macOS
```bash
cp .env.example .env
```

#### Windows PowerShell
```powershell
Copy-Item .env.example .env
```

### 2. Option A — Run Complete Stack with Docker Compose
```bash
docker compose up --build
```
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`
- **Frontend Web App**: `http://localhost:5173`

### 3. Option B — Local Development Setup (Linux / macOS / Windows PowerShell)

#### Backend Setup, Migrations, Data Import & ML Training
```bash
# 1. Install dependencies (if using a fresh virtual environment)
cd backend
python3 -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Import verified Bengaluru landmarks, BMTC routes & Namma Metro stations
python3 ../scripts/import_transport_data.py

# 3. Train and evaluate ML regression & classification models
python3 ../scripts/train_and_evaluate_ml.py

# 4. Start the FastAPI backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Running Automated Tests

```bash
# Run complete backend unit, integration, routing, RAG, ML, security & E2E acceptance suite
cd backend
PYTHONPATH=. python3 -m unittest discover -s tests -p "test_*.py" -v
```

---

## Troubleshooting

- **Missing Institutional API Keys (BMTC GTFS-RT / TomTom Traffic)**: Keep `OPERATING_MODE=demo` in `.env` to run with deterministic schedule fixtures.
- **Port 8000 or 5173 Already in Use**: Change `PORT` in `.env` or pass `--port 8001` to `uvicorn`.
- **Browser Geolocation Denied**: Use the manual Bengaluru Hub selector in the Journey Planner; TripBuddy AI never tracks location without explicit user consent.
