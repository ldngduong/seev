"""Base source interface: every job source implements `fetch(query)` and returns list[Job]."""

from __future__ import annotations

import time
from typing import Optional

from ..models import Job, SearchQuery


class BaseSource:
    name: str = "base"
    enabled: bool = True
    needs_browser: bool = False
    supports_location: bool = True
    supports_level: bool = False

    def __init__(self, fetcher=None):
        self._fetcher = fetcher
        self.started_at: float = 0.0

    def __enter__(self):
        self.started_at = time.monotonic()
        return self

    def __exit__(self, *exc):
        return False

    def fetch(self, query: SearchQuery) -> list[Job]:
        raise NotImplementedError

    def finish(self, query: SearchQuery, jobs: list[Job], city: Optional[str] = None) -> list[Job]:
        """Normalize seniority/experience metadata and keep every crawled job.

        Level classification is deliberately NOT filtered here: the AI scoring
        stage downstream decides between match / suggestion / reject. Only
        structural filters (city, recency) are applied. `level` stays on the
        job as crawled metadata for context.
        """
        from ..source_profiles import get_profile

        profile = get_profile(self.name)
        kept: list[Job] = []
        for job in jobs:
            profile.normalize(job)
            kept.append(job)
        return self.filter_city(self.filter_recent(kept, query.days), city)

    def elapsed_ms(self) -> int:
        return int((time.monotonic() - self.started_at) * 1000)

    def filter_recent(self, jobs: list[Job], days: Optional[int]) -> list[Job]:
        if not days:
            return jobs
        from datetime import datetime, timedelta, timezone

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return [j for j in jobs if j.posted_at is None or j.posted_at >= cutoff]

    def filter_city(self, jobs: list[Job], city: Optional[str]) -> list[Job]:
        if not city:
            return jobs
        from ..utils import contains_city

        return [j for j in jobs if contains_city(j.location, city)]
