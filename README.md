# BhoomiSync — Build Walkthrough

## ✅ Build Status
| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `next build` | **Succeeded** (10.7s compile, 5 pages generated) |
| Routes | `/` (Map View), `/analytics` (Dashboard) |

---

## What Was Built

### 📁 Project Structure
```
BhoomiSync/
├── docker-compose.yml          # 4-service orchestration
├── .env.example                # All env vars documented
├── db/
│   └── init.sql                # PostGIS schema + indexes
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint + lifespan
│   │   ├── database.py         # Async SQLAlchemy engine
│   │   ├── models.py           # 6 ORM models (PostGIS geometry)
│   │   ├── schemas.py          # Pydantic v2 response schemas
│   │   └── routers/
│   │       ├── parcels.py      # ULPIN lookup, fuzzy search, spatial query
│   │       ├── analytics.py    # City overview + revenue metrics
│   │       └── conflicts.py    # Detection engine + REST endpoints
│   └── scripts/
│       └── seed_data.py        # 30 synthetic Bengaluru parcels
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx       # Root layout (Sidebar + Topbar)
    │   │   ├── page.tsx         # Map view (default)
    │   │   └── analytics/page.tsx
    │   ├── components/
    │   │   ├── layout/          # Sidebar, Topbar
    │   │   ├── map/             # MapView, LayerControl, DrawTool, TimeSlider
    │   │   ├── sidebar/         # PlotProfile + 4 independent panels
    │   │   └── analytics/       # CityOverview, RevenueGrid
    │   └── lib/
    │       ├── api.ts           # Typed API client + SWR fetcher
    │       └── store.ts         # Zustand global store
    └── next.config.ts
```

---

## How Each PLAN.md Requirement Was Implemented

| Requirement | Implementation |
|---|---|
| Map Rendering Bottleneck | **MapLibre GL JS + pg_tileserv MVT** — no raw GeoJSON sent to browser |
| Async Cross-Dept. Fetching | Each sidebar panel uses **independent `useSWR` hook** — one slow API never blocks others |
| Complex State Management | **Zustand flat store** — components subscribe via selectors, no re-render cascades |
| Fuzzy Search | PostgreSQL **`pg_trgm` `similarity()`** on owner name + address — typo tolerant |
| Spatial Query Tool | Draw polygon → POST to `/api/parcels/spatial-query` → aggregated stats card |
| Conflict Engine | **asyncio background task** — 3 detection rules, runs on startup + every 6h |
| Time Slider | Range input scrubbing ownership history, shows owner active at each year |
| Layer Control | 4 toggleable overlays: water lines, power grid, tax heatmap, zoning polygon |

---

## Running the Platform

### Option A — Docker Compose (Full Stack)
```bash
# Copy env
cp .env.example .env

# Start everything
docker-compose up

# In another terminal — seed the database
docker exec bhoomisync_backend python -m scripts.seed_data
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- pg_tileserv (MVT tiles): http://localhost:7800
- PostgreSQL: localhost:5432

### Option B — Local Dev
```bash
# Terminal 1: Start DB
docker-compose up db pg_tileserv

# Terminal 2: Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql+asyncpg://bhoomi:bhoomi_secret@localhost:5432/landstack uvicorn app.main:app --reload

# Terminal 3: Seed data
cd backend
DATABASE_URL_SYNC=postgresql://bhoomi:bhoomi_secret@localhost:5432/landstack python -m scripts.seed_data

# Terminal 4: Frontend
cd frontend
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/parcels/{ulpin}` | Core parcel metadata |
| GET | `/api/parcels/{ulpin}/ownership` | Current owner + deed history |
| GET | `/api/parcels/{ulpin}/fiscal` | 5-year tax records |
| GET | `/api/parcels/{ulpin}/utilities` | Electricity + water |
| GET | `/api/parcels/{ulpin}/infrastructure` | Physical assets + violations |
| GET | `/api/search?q={query}` | Fuzzy search (ULPIN/owner/address) |
| POST | `/api/parcels/spatial-query` | Spatial aggregation for drawn polygon |
| GET | `/api/analytics/city-overview` | City-wide stats |
| GET | `/api/analytics/revenue` | Revenue + collection metrics |
| GET | `/api/conflicts/active` | Active conflict alerts |
| POST | `/api/conflicts/run-detection` | Trigger manual detection |

---

## Conflict Detection Rules
1. **TAX_DEFAULTER_ACTIVE_UTILITY** (High) — Tax defaulter with active utilities → subsidy abuse flag
2. **ZONING_CONSUMPTION_MISMATCH** (Medium) — Residential zone, >800kWh/month electricity → illegal commercial use
3. **APPROVED_PLAN_WITH_VIOLATIONS** (High) — Approved building plan + active violations → inspection required
