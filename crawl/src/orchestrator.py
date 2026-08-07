"""Multi-threaded orchestrator: one worker per source, all run concurrently."""

from __future__ import annotations

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from .config import PER_SOURCE_DELAY, SOURCE_CITY_MAPS, SOURCE_TIMEOUT
from .http import HttpFetcher
from .models import Job, SearchQuery, SourceStatus, SearchResponse
from .sources import build_source, enabled_source_names
from .utils import normalize_city

log = logging.getLogger("crawler")


def _rank_by_level(target: Level, jobs: list[Job]) -> list[Job]:
    """Sort so postings closest to the target level surface first.

    An intern CV should see genuine `intern` ads on top, then fresher, then
    junior/unknown, then middle+ — instead of everything being mixed and sorted
    by date. Unknown-level jobs (VN boards label most IC ads "Nhân viên") rank
    after the explicit entry buckets and before senior groups.
    """
    from .source_profiles import get_profile

    rank_of = {
        "intern": 0,
        "fresher": 1,
        "junior": 2,
        "middle": 3,
        "senior": 4,
        "lead": 5,
        "manager": 5,
        "director": 5,
    }
    target_rank = rank_of.get(target.value, 2)
    prof_cache: dict[str, object] = {}

    def key(job: Job):
        prof = prof_cache.get(job.source)
        if prof is None:
            prof = get_profile(job.source)
            prof_cache[job.source] = prof
        detected = prof.detect(job)
        det_rank = rank_of.get(detected.value) if detected else None
        if det_rank is None:
            dist = 2.5  # unknown ("Nhân viên" etc.) — between junior and middle
        else:
            dist = abs(det_rank - target_rank)
        ts = job.posted_at.timestamp() if job.posted_at else 0.0
        return (dist, -ts)

    return sorted(jobs, key=key)


def _crawl(query: SearchQuery) -> tuple[list[Job], dict[str, SourceStatus], int]:
    """Run all requested sources and return deduped/capped jobs + per-source statuses.

    Internal pipeline shared by the CLI, the legacy `/api/search` endpoints and
    the versioned `/api/v1/*` endpoints.
    """
    start = time.monotonic()
    fetcher = HttpFetcher()
    sources = query.sources or enabled_source_names()
    valid = [s for s in sources if s in enabled_source_names()]

    # Cap parallel sources: the long poles are the heavy/stealth ones (Now both
    # crawl via the single shared Camoufox), and HTTP sources finish in ~0.5-3s.
    # Running all of them at once only spikes memory — quality (jobs) is
    # identical — so CRAWLER_SOURCE_CONCURRENCY keeps peak usage low enough for
    # a 2GB VPS. Default 4: one slot for the browser source + the fast API ones.
    concurrency = int(os.environ.get("CRAWLER_SOURCE_CONCURRENCY", "4"))
    max_workers = max(1, min(len(valid), concurrency))

    results: list[Job] = []
    statuses: dict[str, SourceStatus] = {}
    lock = __import__("threading").Lock()

    def worker(name: str):
        source = build_source(name, fetcher)
        city = normalize_city(query.location)
        if city and name in SOURCE_CITY_MAPS and city not in SOURCE_CITY_MAPS[name]:
            return name, "skipped", 0, f"city_not_supported: {city}", 0
        log.info(
            "[%s] started (level=%s, q=%r, pages=%d, sources=%s)",
            name,
            query.level.value if query.level else None,
            query.query,
            query.pages,
            ",".join(valid),
        )
        try:
            with source:
                jobs = source.fetch(query)
            with lock:
                for j in jobs:
                    if not j.url:
                        continue
                    results.append(j)
            log.info("[%s] done: %d jobs in %dms", name, len(jobs), source.elapsed_ms())
            return name, "ok", len(jobs), None, source.elapsed_ms()
        except Exception as e:  # noqa: BLE001
            log.warning(
                "[%s] failed after %dms: %s",
                name,
                int((time.monotonic() - source.started_at) * 1000),
                e,
            )
            return name, "error", 0, str(e)[:300], int((time.monotonic() - source.started_at) * 1000)

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(worker, name): name for name in valid}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                n, status, count, err, ms = fut.result()
                statuses[name] = SourceStatus(
                    source=name, status=status, count=count, error=err, elapsed_ms=ms
                )
            except Exception:  # noqa: BLE001
                statuses[name] = SourceStatus(source=name, status="error", error="worker crashed")

    for missing in valid:
        statuses.setdefault(missing, SourceStatus(source=missing, status="skipped"))

    # Dedup by (source, source_job_id) keeping order
    seen: set[tuple[str, str]] = set()
    deduped: list[Job] = []
    for j in results:
        key = (j.source, j.source_job_id)
        if key not in seen:
            seen.add(key)
            deduped.append(j)
    del results

    # Keyword matching (title contains all keywords)
    if query.keywords:
        kws = [k.lower() for k in query.keywords]
        deduped = [
            j
            for j in deduped
            if all(k in (j.title or "").lower() for k in kws)
        ]

    # Per-source cap
    per_source: dict[str, list[Job]] = {}
    for j in deduped:
        per_source.setdefault(j.source, []).append(j)
    capped: list[Job] = []
    for src_jobs in per_source.values():
        capped.extend(src_jobs[: query.max_results_per_source])
    if query.level:
        capped = _rank_by_level(query.level, capped)
    else:
        capped.sort(key=lambda j: (j.posted_at is not None, j.posted_at), reverse=True)

    elapsed_ms = int(time.monotonic() - start)
    log.info(
        "[crawl] finished: %d jobs from %d/%d sources in %dms (%s)",
        len(capped),
        sum(1 for s in statuses.values() if s.status == "ok"),
        len(valid),
        elapsed_ms,
        {
            name: f"{st.status}({st.count}){(' ' + st.error) if st.error else ''}"
            for name, st in sorted(statuses.items())
        },
    )
    return capped, statuses, elapsed_ms


def run_search(query: SearchQuery) -> SearchResponse:
    capped, statuses, elapsed_ms = _crawl(query)

    saved = 0
    if query.persist:
        from .db import init_db, persist_jobs

        init_db()
        saved = persist_jobs(capped)

    return SearchResponse(
        query=query,
        results=[j.to_output() for j in capped],
        per_source=statuses,
        total=len(capped),
        elapsed_ms=elapsed_ms,
        saved=saved,
    )


def run_search_contracts(
    query: SearchQuery,
) -> tuple[list[dict[str, Any]], dict[str, SourceStatus], int]:
    """Run the pipeline and serialize jobs with the canonical V1 wire contract."""
    capped, statuses, elapsed_ms = _crawl(query)
    return [j.to_contract() for j in capped], statuses, elapsed_ms
