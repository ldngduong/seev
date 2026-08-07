"""Contract tests: every job emitted to the BE must satisfy the V1 schema."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.models import CONTRACT_VERSION, CrawledJobV1, Job

REQUIRED_KEYS = [
    "contract_version",
    "source",
    "source_job_id",
    "title",
    "company_name",
    "source_url",
    "salary_text",
    "salary_min",
    "salary_max",
    "salary_currency",
    "locations",
    "seniority_text",
    "experience_min",
    "experience_max",
    "job_type",
    "level",
    "experience",
    "skills",
    "posted_at",
    "expired_at",
    "logo",
    "raw",
]


def make_job(**overrides) -> Job:
    base = dict(
        source="vietnamworks",
        source_job_id="42",
        title="Python Developer",
        company="ACME Co",
        url="https://www.vietnamworks.com/job/42",
        location="Ho Chi Minh",
        locations=["Ho Chi Minh"],
        salary_min=1000,
        salary_max=2000,
        salary_currency="USD",
        salary_text="1,000 - 2,000 USD",
        job_type="full_time",
        level="senior",
        experience="5 years",
        seniority_text="Senior",
        skills=["python", "django"],
        posted_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
        expires_at=datetime(2026, 9, 1, tzinfo=timezone.utc),
        logo="https://ex/logo.png",
        raw={"source_payload": "debug"},
    )
    base.update(overrides)
    return Job(**base)


def test_contract_has_all_required_keys():
    contract = make_job().to_contract()
    assert set(REQUIRED_KEYS) == set(contract.keys()), (
        f"missing={set(REQUIRED_KEYS) - set(contract.keys())} "
        f"unexpected={set(contract.keys()) - set(REQUIRED_KEYS)}"
    )


def test_contract_validates_as_crawled_job_v1():
    contract = make_job().to_contract()
    parsed = CrawledJobV1.model_validate(contract)
    assert parsed.contract_version == CONTRACT_VERSION
    assert parsed.title == "Python Developer"
    assert parsed.company_name == "ACME Co"
    assert parsed.source_url == "https://www.vietnamworks.com/job/42"


def test_contract_dates_are_iso_strings():
    contract = make_job().to_contract()
    assert contract["posted_at"] == "2026-08-01T00:00:00+00:00"
    assert contract["expired_at"] == "2026-09-01T00:00:00+00:00"


def test_contract_forbids_unknown_fields():
    job = make_job()
    with pytest.raises(ValidationError):
        CrawledJobV1.model_validate({**job.to_contract(), "bogus_field": 1})


def test_locations_falls_back_to_location_string():
    contract = make_job(location="Ho Chi Minh; Hanoi", locations=[]).to_contract()
    assert contract["locations"] == ["Ho Chi Minh", "Hanoi"]


def test_locations_prefer_explicit_list():
    contract = make_job(location="Ho Chi Minh", locations=["HCM", "HN"]).to_contract()
    assert contract["locations"] == ["HCM", "HN"]


def test_nullable_fields_default_to_none():
    contract = make_job(
        company=None,
        salary_min=None,
        salary_max=None,
        salary_text=None,
        salary_currency=None,
        seniority_text=None,
        experience_min=None,
        experience_max=None,
        job_type=None,
        level=None,
        experience=None,
        posted_at=None,
        expires_at=None,
        logo=None,
    ).to_contract()
    for key, value in contract.items():
        if key in {"contract_version", "source", "source_job_id", "title", "source_url", "locations", "skills", "raw"}:
            continue
        assert value is None, f"{key} should be None, got {value!r}"


@pytest.mark.parametrize(
    "missing",
    ["source", "source_job_id", "title", "source_url"],
)
def test_required_fields_are_mandatory(missing):
    contract = make_job().to_contract()
    with pytest.raises(ValidationError):
        CrawledJobV1.model_validate({**contract, missing: None})
