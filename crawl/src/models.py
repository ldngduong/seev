"""Unified data models for the job crawler."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

CONTRACT_VERSION = 3


class SeniorityMatch(BaseModel):
    """Canonical DB seniority code with auditable source evidence."""

    code: str
    mapping_method: str
    confidence: float = Field(ge=0, le=1)
    evidence: dict[str, Any] = Field(default_factory=dict)
    is_primary: bool = False


class Level(str, Enum):
    INTERN = "intern"
    FRESHER = "fresher"
    JUNIOR = "junior"
    MIDDLE = "middle"
    SENIOR = "senior"
    STAFF = "staff"
    PRINCIPAL = "principal"
    TECH_LEAD = "tech_lead"
    MANAGER = "manager"
    HEAD_DIRECTOR = "head_director"


class JobType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    REMOTE = "remote"
    UNKNOWN = "unknown"


class Job(BaseModel):
    """Normalized job representation shared across all sources."""

    source: str
    source_job_id: str
    title: str
    company: Optional[str] = None
    url: str
    location: Optional[str] = None
    locations: list[str] = Field(default_factory=list)
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_text: Optional[str] = None
    job_type: Optional[str] = None
    experience: Optional[str] = None
    source_seniority_key: Optional[str] = None
    source_seniority_text: Optional[str] = None
    seniority_matches: list[SeniorityMatch] = Field(default_factory=list)
    experience_min: Optional[float] = None
    experience_max: Optional[float] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    skills: list[str] = Field(default_factory=list)
    logo: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None
    requirements: Optional[str] = None
    detail_source: Optional[str] = None
    detail_parser_version: Optional[int] = None
    # Canonical Seev IT category. Native source categories remain in raw.
    category_id: Optional[str] = None
    category_name: Optional[str] = None

    def to_output(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_job_id": self.source_job_id,
            "title": self.title,
            "company": self.company,
            "url": self.url,
            "location": self.location or self.locations_to_text(),
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "salary_currency": self.salary_currency,
            "salary_text": self.salary_text,
            "job_type": self.job_type,
            "experience": self.experience,
            "source_seniority_key": self.source_seniority_key,
            "source_seniority_text": self.source_seniority_text,
            "seniority_matches": [match.model_dump() for match in self.seniority_matches],
            "experience_min": self.experience_min,
            "experience_max": self.experience_max,
            "posted_at": self.posted_at.isoformat() if self.posted_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "skills": self.skills,
            "locations": self.locations,
            "logo": self.logo,
            "description": self.description,
            "requirements": self.requirements,
            "detail_source": self.detail_source,
            "detail_parser_version": self.detail_parser_version,
        }

    def locations_to_text(self) -> str | None:
        if self.location:
            return self.location
        if self.locations:
            return "; ".join(dict.fromkeys(self.locations))
        return None

    def to_contract(self) -> dict[str, Any]:
        """V1 wire contract consumed by the BE (`/api/v1/*`)."""
        locations = list(self.locations)
        if not locations and self.location:
            locations = [
                part.strip()
                for part in self.location.replace("\n", ";").split(";")
                if part.strip()
            ]
        contract = CrawledJobV1(
            source=self.source,
            source_job_id=self.source_job_id,
            title=self.title,
            company_name=self.company,
            source_url=self.url,
            salary_text=self.salary_text,
            salary_min=self.salary_min,
            salary_max=self.salary_max,
            salary_currency=self.salary_currency,
            locations=locations,
            source_seniority_key=self.source_seniority_key,
            source_seniority_text=self.source_seniority_text,
            seniority_matches=self.seniority_matches,
            experience_min=self.experience_min,
            experience_max=self.experience_max,
            job_type=self.job_type,
            experience=self.experience,
            skills=self.skills,
            posted_at=self.posted_at.isoformat() if self.posted_at else None,
            expired_at=self.expires_at.isoformat() if self.expires_at else None,
            logo=self.logo,
            category_id=self.category_id,
            category_name=self.category_name,
            raw=self.raw,
            description=self.description,
            requirements=self.requirements,
            detail_source=self.detail_source,
            detail_parser_version=self.detail_parser_version,
        )
        return contract.model_dump()


class CrawledJobV1(BaseModel):
    """Canonical job JSON returned to the BE (contract version 1.

    Field names and semantics mirror `CrawledJob` in the BE:
    `be/src/modules/crawler/types/crawled-job.type.ts`.
    """

    model_config = ConfigDict(extra="forbid")

    contract_version: int = CONTRACT_VERSION
    source: str
    source_job_id: str
    title: str
    company_name: Optional[str] = None
    source_url: str
    salary_text: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    locations: list[str] = Field(default_factory=list)
    source_seniority_key: Optional[str] = None
    source_seniority_text: Optional[str] = None
    seniority_matches: list[SeniorityMatch] = Field(default_factory=list)
    experience_min: Optional[float] = None
    experience_max: Optional[float] = None
    job_type: Optional[str] = None
    experience: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    posted_at: Optional[str] = None
    expired_at: Optional[str] = None
    logo: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None
    requirements: Optional[str] = None
    detail_source: Optional[str] = None
    detail_parser_version: Optional[int] = None


class SearchQuery(BaseModel):
    """User-facing search input (same shape for every source)."""

    query: str = Field("", description="Live-search keyword. Empty for fixed category-page crawling.")
    location: Optional[str] = Field(
        None,
        description="Location: city name or alias, e.g. 'Ho Chi Minh', 'Hanoi', 'Da Nang', 'remote'. "
        "Normalized automatically per source.",
    )
    level: Optional[Level] = Field(
        None, description="Required level: intern / fresher / junior / middle / senior / lead / manager"
    )
    category_id: Optional[str] = Field(None, description="Canonical Seev IT category UUID used as classification context")
    candidate_category_ids: list[str] = Field(
        default_factory=list,
        description="Allowed canonical categories for a broader native page. The title classifier must choose one.",
    )
    category_candidates: dict[str, list[str]] = Field(
        default_factory=dict,
        description="DB-provided category name/aliases keyed by canonical UUID for shared native pages.",
    )
    crawl_url: Optional[str] = Field(
        None,
        description="Verified fixed category page. When present, sources must not build a keyword/level/location search.",
    )
    expected_source_label: Optional[str] = Field(
        None,
        description="Native category label expected on the fixed page; used as a drift guard.",
    )
    source_category_filters: dict[str, dict[str, str]] = Field(
        default_factory=dict,
        description="Native filter payload keyed by source; canonical ids are never source ids.",
    )
    keywords: list[str] = Field(default_factory=list, description="Extra keywords to match against title")
    sources: Optional[list[str]] = Field(
        default=None, description="Sources to query (default: all enabled). e.g. ['vietnamworks','itviec']"
    )
    max_results_per_source: int = Field(25, ge=1, le=200, description="Max jobs per source")
    pages: int = Field(1, ge=1, le=10, description="How many result pages to walk per source")
    days: Optional[int] = Field(
        None, ge=1, le=365, description="Only return jobs posted within the last N days (None = all)"
    )


class SourceStatus(BaseModel):
    source: str
    status: str = "ok"  # ok | skipped | error
    count: int = 0
    error: Optional[str] = None
    elapsed_ms: int = 0


class SearchResponse(BaseModel):
    query: SearchQuery
    results: list[dict[str, Any]]
    per_source: dict[str, SourceStatus]
    total: int
    elapsed_ms: int


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
