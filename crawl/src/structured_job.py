"""Deterministic schema.org JobPosting extraction (no LLM inference)."""

from __future__ import annotations

import json
from typing import Any

from bs4 import BeautifulSoup


def extract_job_posting(html: str) -> dict[str, Any] | None:
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            value = json.loads(script.get_text())
        except (TypeError, ValueError):
            continue
        queue = value if isinstance(value, list) else [value]
        for item in queue:
            if not isinstance(item, dict):
                continue
            graph = item.get("@graph")
            candidates = graph if isinstance(graph, list) else [item]
            for candidate in candidates:
                if isinstance(candidate, dict) and candidate.get("@type") == "JobPosting":
                    return candidate
    return None


def months_of_experience(posting: dict[str, Any]) -> float | None:
    requirement = posting.get("experienceRequirements")
    if not isinstance(requirement, dict):
        return None
    months = requirement.get("monthsOfExperience")
    if isinstance(months, (int, float)) and months >= 0:
        return float(months)
    return None

