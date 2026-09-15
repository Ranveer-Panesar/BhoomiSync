"""
FastAPI application entrypoint for SUTRA / Land Stack.
Mounts all routers, configures CORS, and runs the Conflict Detection
engine as a background task on startup.
"""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import parcels, analytics, conflicts, complaints


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: kick off conflict detection engine."""
    from .routers.conflicts import run_conflict_detection_loop
    task = asyncio.create_task(run_conflict_detection_loop())
    app.state.conflict_task = task
    yield
    task.cancel()


app = FastAPI(
    title="SUTRA — Land Stack API",
    description="Unified GIS-based Digital Public Infrastructure for Land Records (SIH2026)",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(parcels.router,    prefix="/api", tags=["Parcels"])
app.include_router(analytics.router,  prefix="/api", tags=["Analytics"])
app.include_router(conflicts.router,  prefix="/api", tags=["Conflicts"])
app.include_router(complaints.router, prefix="/api", tags=["Complaints"])


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "sutra-api"}
