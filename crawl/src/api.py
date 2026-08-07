"""FastAPI application: single unified API for all sources."""

from __future__ import annotations

import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError

from .brightdata import brightdata_available
from .models import CONTRACT_VERSION, Level, SearchQuery, SearchResponse
from .orchestrator import run_search, run_search_contracts
from .sources import available_sources

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(
    title="Job Crawler API",
    description="Unified job search across VietnamWorks, TopDev, ITViec, TopCV, Indeed, JobsGo, ViecOi, CareerViet. Multi-threaded, BrightData bypass.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_SECURITY = HTTPBearer(auto_error=False)
_EXPECTED_TOKEN = os.environ.get("CRAWLER_BEARER_TOKEN")


def _require_bearer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_SECURITY),
) -> None:
    """Enforce `CRAWLER_BEARER_TOKEN` when configured (optional in dev)."""
    if not _EXPECTED_TOKEN:
        return
    if credentials is None or credentials.credentials != _EXPECTED_TOKEN:
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")


@app.get("/health")
def health():
    return {"status": "ok", "sources": available_sources(), "brightdata": brightdata_available()}


@app.get("/sources")
def list_sources():
    return {"sources": available_sources()}


@app.post("/api/search", response_model=SearchResponse)
def search(payload: SearchQuery):
    return run_search(payload)


@app.get("/api/search")
def search_get(
    query: str = Query(..., description="Job title / keyword, e.g. python developer"),
    location: str | None = Query(None, description="City: Ho Chi Minh / Hanoi / Da Nang / remote ..."),
    level: Level | None = Query(None, description="intern/fresher/junior/middle/senior/lead/manager/director"),
    keywords: str | None = Query(None, description="Comma-separated extra keywords"),
    sources: str | None = Query(None, description="Comma-separated source names (default all)"),
    max_results_per_source: int = Query(25, ge=1, le=200),
    pages: int = Query(1, ge=1, le=10),
    days: int | None = Query(None, ge=1, le=365, description="Only jobs posted within last N days"),
    persist: bool = Query(False, description="Save crawled jobs into PostgreSQL (upsert)"),
):
    try:
        q = SearchQuery(
            query=query,
            location=location,
            level=level,
            keywords=[k.strip() for k in (keywords or "").split(",") if k.strip()],
            sources=[s.strip() for s in sources.split(",") if s.strip()] if sources else None,
            max_results_per_source=max_results_per_source,
            pages=pages,
            days=days,
            persist=persist,
        )
    except ValidationError as e:
        return JSONResponse(status_code=422, content={"detail": e.errors()})
    return run_search(q)


@app.post("/api/v1/search", response_model=SearchResponse)
def search_contract(payload: SearchQuery, response: Response, _: None = Depends(_require_bearer)):
    """Versioned search — jobs serialized with the canonical V1 contract."""
    return _run_contract(payload, response)


@app.post("/api/v1/sources/{source}/search", response_model=SearchResponse)
def search_source_contract(
    source: str,
    payload: SearchQuery,
    response: Response,
    _: None = Depends(_require_bearer),
):
    """Versioned single-source search so BE can run/retry sources independently."""
    if source not in available_sources():
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")
    payload.sources = [source]
    return _run_contract(payload, response)


def _run_contract(payload: SearchQuery, response: Response | None = None) -> SearchResponse:
    results, statuses, elapsed_ms = run_search_contracts(payload)
    if response is not None:
        response.headers["X-Contract-Version"] = str(CONTRACT_VERSION)
    return SearchResponse(
        query=payload,
        results=results,
        per_source=statuses,
        total=len(results),
        elapsed_ms=elapsed_ms,
    )
