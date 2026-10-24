# TripBuddy AI — Bengaluru Agentic Travel Assistant

TripBuddy AI is a project for exploring multimodal journey planning in Bengaluru, with a React/TypeScript interface and a planned FastAPI, RAG, route-optimization and multi-agent backend.

- **Repository:** https://github.com/santhoshparthasarathy25-prog/TripBuddy-Ai
- **Static project homepage:** https://santhoshparthasarathy25-prog.github.io/TripBuddy-Ai/
- **Primary city:** Bengaluru, Karnataka, India

## Current repository status

The repository includes a React/Vite frontend source set at the repository root (App.tsx, main.tsx, api.ts, BengaluruMap.tsx, index.css, and configuration files), sample Bengaluru transport data, project architecture notes, and a FastAPI entry-point file.

**Important:** The repository's current file layout is not yet consistent with all backend and Docker configuration paths. For example, main.py imports modules from an app/ package that is not present in the current root listing, while the Dockerfiles/Compose file refer to backend/, frontend/src/, scripts/, and infrastructure/ paths. Consequently, the complete backend and Docker setup cannot be considered verified or runnable from the current repository snapshot. Restore the missing source directories from the complete project archive before claiming the full stack works.

The root index.html is a lightweight GitHub Pages landing page. It is a project overview and **not** the interactive React app or a live travel service.

## Frontend: local development

Requirements: Node.js 20 LTS or compatible current LTS and npm.

From the repository root:

```bash
npm install
npm run dev
```

Vite is configured to serve the UI on port 5173. API calls require a running backend; the frontend alone does not provide live route, traffic, GPS vehicle, booking, or advisory data.

To build/type-check the frontend:

```bash
npm run typecheck
npm run build
```

If a command fails, read the first reported TypeScript/build error and resolve it before deploying.

## Backend and Docker

The backend is intended to use FastAPI, SQLAlchemy, PostgreSQL/PostGIS or SQLite fallback, Redis, ML utilities and a RAG pipeline. However, restore the missing backend/app/, scripts/, infrastructure/, and related expected source directories from the complete archive before using the backend commands or Docker Compose. The current repository snapshot has not been verified as a runnable full-stack deployment.

Do not use docker compose up --build until those paths and the Compose configuration have been checked.

## Planned capabilities

- Multimodal journey options across BMTC, Namma Metro, walking and last-mile links
- Route comparison for travel time and estimated cost
- Natural-language travel help with retrieval-augmented generation (RAG)
- Specialist-agent workflow for intent, location, routing, safety and trip monitoring
- English and Kannada support as implementation permits

These are project goals and code-architecture areas, not a guarantee that all features are currently connected to live providers.

## Live data, privacy and safety

- Sample schedules and fixtures must be labelled as demo data; they are not live GPS vehicle positions.
- Access to the user's location should require browser permission and explicit consent.
- Official transit, traffic, weather and booking integrations may require provider access, API credentials or institutional approval.
- Never commit .env, API keys, passwords, private keys, database dumps or personal data. Use .env.example as a template and keep real values in an ignored local .env file.

## Repository map

- index.html — static project overview for GitHub Pages
- App.tsx, main.tsx, api.ts, BengaluruMap.tsx, index.css — frontend source files currently at root
- package.json, vite.config.ts, tsconfig.json — frontend tooling
- main.py, config.py, requirements.txt — backend entry/configuration files; expected supporting package tree must be restored
- ARCHITECTURE.md, SECURITY_AUDIT.md — design and security notes
- JSON files — Bengaluru location, transit and knowledge fixtures

## Contributing

1. Make changes on a feature branch.
2. Keep secrets and local environment files out of commits.
3. Run the frontend type-check/build and any available tests.
4. Clearly document which functionality is demo-only and which has been tested against real providers.
