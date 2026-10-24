from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure scripts directory is importable for initial fixture seeding
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.api.v1.routes import router as v1_router
from app.config import settings
from app.database.db import db_manager
from app.ml.models import run_all_ml_evaluations_and_persist
from app.rag.pipeline import rag_pipeline
from app.security.auth import rate_limiter
from app.security.logging_redactor import get_privacy_logger
from scripts.import_transport_data import import_all_default_fixtures

logger = get_privacy_logger("tripbuddy.main")


def initialize_application_state() -> Dict[str, Any]:
    db_manager.run_migrations_and_seed()
    import_summary = import_all_default_fixtures()
    rag_summary = rag_pipeline.ingest_default_corpus()
    ml_summary = run_all_ml_evaluations_and_persist()
    logger.info("TripBuddy AI initialized in '%s' mode.", settings.operating_mode)
    return {
        "imports": import_summary,
        "rag": rag_summary,
        "ml": ml_summary,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_application_state()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "TripBuddy AI — Agentic Multimodal Travel Assistant for Bengaluru, Karnataka, India "
        "(BMTC Buses, Namma Metro, Walking & Multimodal Routing with LangGraph-style Multi-Agent Orchestration, RAG & ML)."
    ),
    lifespan=lifespan,
)

# Secure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# Sliding-Window Rate Limiting & Privacy Redaction Middleware
@app.middleware("http")
async def rate_limit_and_security_headers_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not rate_limiter.check(client_ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "rate_limit_exceeded",
                "message": "Too many requests. Please slow down.",
            },
        )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Operating-Mode"] = settings.operating_mode
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "request_validation_failed",
            "details": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.get("/health", tags=["System Health"])
async def health_check() -> Dict[str, Any]:
    """Verify database connectivity, loaded Bengaluru locations, RAG chunks, and operating mode."""
    with db_manager.session() as conn:
        loc_count = conn.execute("SELECT COUNT(*) AS c FROM geographic_locations").fetchone()["c"]
        rag_count = conn.execute("SELECT COUNT(*) AS c FROM rag_chunks").fetchone()["c"]

    if loc_count == 0:
        initialize_application_state()
        with db_manager.session() as conn:
            loc_count = conn.execute("SELECT COUNT(*) AS c FROM geographic_locations").fetchone()["c"]
            rag_count = conn.execute("SELECT COUNT(*) AS c FROM rag_chunks").fetchone()["c"]

    return {
        "status": "healthy",
        "service": settings.app_name,
        "operating_mode": settings.operating_mode,
        "database_connected": True,
        "bengaluru_locations_loaded": loc_count,
        "rag_chunks_indexed": rag_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(v1_router, prefix=settings.api_v1_prefix)
