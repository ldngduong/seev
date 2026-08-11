"""Base source interface: every job source implements `fetch(query)` and returns list[Job]."""

from __future__ import annotations

import time
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
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

    def fixed_page_url(self, query: SearchQuery, page: int) -> str | None:
        if not query.crawl_url:
            return None
        if page <= 1:
            return query.crawl_url
        parts = urlsplit(query.crawl_url)
        params = dict(parse_qsl(parts.query, keep_blank_values=True))
        params["page"] = str(page)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(params), parts.fragment))

    def validate_fixed_page(self, query: SearchQuery, html: str) -> None:
        if not query.crawl_url or not query.expected_source_label:
            return
        normalize = lambda value: " ".join(  # noqa: E731
            "".join(
                char
                for char in unicodedata.normalize("NFD", value.lower())
                if not unicodedata.combining(char)
            ).split()
        )
        if normalize(query.expected_source_label) not in normalize(html):
            raise ValueError(
                f"category_mapping_drift: expected label {query.expected_source_label!r} "
                f"was not found at {query.crawl_url}"
            )

    def finish(self, query: SearchQuery, jobs: list[Job], city: Optional[str] = None) -> list[Job]:
        """Normalize metadata and keep only jobs proven to belong to IT.

        Level classification is deliberately NOT filtered here: the AI scoring
        stage downstream decides between match / suggestion / reject. Only
        structural filters (category, city, recency) are applied. Category is
        fail-closed: a search result without evidence for one of Seev's 24 IT
        leaf categories must never enter the canonical job database.
        """
        from ..category import has_sufficient_it_evidence, resolve_category
        from ..source_profiles import get_profile

        profile = get_profile(self.name)
        from datetime import datetime, timezone

        kept: list[Job] = []
        for job in jobs:
            profile.normalize(job)
            # A verified fixed native leaf page is itself strong taxonomy
            # evidence. Sources validate the page label before producing jobs.
            if query.crawl_url and query.category_id and len(query.candidate_category_ids) <= 1:
                job.category_id = query.category_id
                from ..category import CATEGORY_NAMES

                job.category_name = CATEGORY_NAMES.get(query.category_id)
                job.raw["category_evidence"] = {
                    "kind": "native_fixed_page",
                    "url": query.crawl_url,
                    "label": query.expected_source_label,
                }
            if job.category_id is None:
                classification_text = (
                    job.title
                    if len(query.candidate_category_ids) > 1
                    else " ".join([job.title, *job.skills])
                )
                if len(query.candidate_category_ids) > 1 and query.category_candidates:
                    cid, cname = self._resolve_db_candidate(classification_text, query.category_candidates)
                else:
                    cid, cname = resolve_category(classification_text, query.category_id)
                job.category_id = cid
                job.category_name = cname
            if (
                query.candidate_category_ids
                and job.category_id not in query.candidate_category_ids
            ):
                continue
            if query.crawl_url and len(query.candidate_category_ids) > 1:
                job.raw["category_evidence"] = {
                    "kind": "native_fixed_page_plus_title_classifier",
                    "url": query.crawl_url,
                    "label": query.expected_source_label,
                    "candidates": query.candidate_category_ids,
                }
            evidence = " ".join(
                [
                    job.title,
                    *job.skills,
                    *[str(value) for value in job.raw.get("source_tags", [])],
                ]
            )
            has_category = bool(job.category_id)
            has_seniority = bool(job.seniority_matches)
            has_exact_active_deadline = bool(
                job.expires_at
                and job.raw.get("deadline_source")
                and job.expires_at > datetime.now(timezone.utc)
            )
            if not (has_category and has_seniority and has_exact_active_deadline):
                continue
            if query.crawl_url or has_sufficient_it_evidence(
                self.name, job.category_id, evidence
            ):
                kept.append(job)
        return self.filter_city(self.filter_recent(kept, query.days), city)

    @staticmethod
    def _resolve_db_candidate(text: str, candidates: dict[str, list[str]]) -> tuple[str | None, str | None]:
        """Fail-closed title classifier whose vocabulary comes from the DB seed."""
        import re
        import unicodedata

        normalized = " ".join(
            "".join(c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c)).split()
        )
        matches: list[tuple[int, str, str]] = []
        for category_id, labels in candidates.items():
            best = 0
            name = labels[0] if labels else category_id
            for label in labels:
                needle = " ".join(
                    "".join(c for c in unicodedata.normalize("NFD", label.lower()) if not unicodedata.combining(c)).split()
                )
                if needle and re.search(rf"(^|\W){re.escape(needle)}($|\W)", normalized):
                    best = max(best, len(needle))
            if best:
                matches.append((best, category_id, name))
        if not matches:
            return None, None
        _, category_id, name = max(matches)
        return category_id, name

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
