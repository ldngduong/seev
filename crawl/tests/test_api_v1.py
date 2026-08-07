"""API v1 contract endpoint tests (no network: pipeline is stubbed)."""

from __future__ import annotations

from fastapi.testclient import TestClient

import src.api as api_module
from src.models import CONTRACT_VERSION, Job

client = TestClient(api_module.app)


def _stub_pipeline(monkeypatch, jobs: list[Job]):
    contracts = [j.to_contract() for j in jobs]

    def fake_run(query):
        statuses = {}
        for c in contracts:
            statuses.setdefault(c["source"], {"source": c["source"], "status": "ok", "count": 1})
        return contracts, statuses, 12

    monkeypatch.setattr(api_module, "run_search_contracts", fake_run)


def test_search_contract_returns_v1_shape(monkeypatch):
    _stub_pipeline(
        monkeypatch,
        [Job(source="topcv", source_job_id="1", title="Backend Dev", url="https://ex/job/1")],
    )
    resp = client.post("/api/v1/search", json={"query": "backend"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    job = body["results"][0]
    assert job["contract_version"] == CONTRACT_VERSION
    assert job["source_job_id"] == "1"
    assert job["source_url"] == "https://ex/job/1"
    assert job["locations"] == []


def test_contract_version_header(monkeypatch):
    _stub_pipeline(monkeypatch, [])
    resp = client.post("/api/v1/search", json={"query": "backend"})
    assert resp.headers.get("x-contract-version") == str(CONTRACT_VERSION)


def test_per_source_endpoint_unknown_source():
    resp = client.post(
        "/api/v1/sources/not-a-source/search",
        json={"query": "backend", "sources": ["topcv"]},
    )
    assert resp.status_code == 400


def test_per_source_endpoint_known_source(monkeypatch):
    _stub_pipeline(
        monkeypatch,
        [Job(source="topcv", source_job_id="7", title="Frontend", url="https://ex/job/7")],
    )
    resp = client.post(
        "/api/v1/sources/topcv/search",
        json={"query": "frontend", "max_results_per_source": 10},
    )
    assert resp.status_code == 200
    assert resp.json()["results"][0]["source"] == "topcv"
    assert resp.headers.get("x-contract-version") == str(CONTRACT_VERSION)


def test_bearer_token_is_enforced_when_configured(monkeypatch):
    _stub_pipeline(monkeypatch, [])
    monkeypatch.setattr(api_module, "_EXPECTED_TOKEN", "s3cret")
    resp = client.post("/api/v1/search", json={"query": "backend"})
    assert resp.status_code == 401
    resp = client.post(
        "/api/v1/search",
        json={"query": "backend"},
        headers={"authorization": "Bearer s3cret"},
    )
    assert resp.status_code == 200
