"""Regression tests for Firecrawl action transport reliability."""

from __future__ import annotations

import requests

import src.firecrawl as firecrawl


class _Response:
    def __init__(self, status_code: int, data: dict, text: str = ""):
        self.status_code = status_code
        self._data = data
        self.text = text

    def json(self):
        return self._data


def test_action_retries_transient_fetch_failure(monkeypatch):
    responses = iter(
        [
            _Response(200, {"success": False, "error": "fetch failed"}),
            _Response(
                200,
                {
                    "success": True,
                    "data": {
                        "rawHtml": "<html><h1>Backend Developer</h1></html>",
                        "actions": {"javascriptReturns": [{"value": [{"id": 1}]}]},
                    },
                },
            ),
        ]
    )
    monkeypatch.setattr(firecrawl, "FIRECRAWL_API_KEY", "test-key")
    monkeypatch.setattr(firecrawl.requests, "post", lambda *args, **kwargs: next(responses))
    monkeypatch.setattr(firecrawl.time, "sleep", lambda _: None)

    html, value = firecrawl.scrape_with_javascript("https://itviec.com/it-jobs/backend-developer", "return []")

    assert "Backend Developer" in html
    assert value == [{"id": 1}]


def test_action_retries_transport_exception(monkeypatch):
    calls = 0

    def post(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise requests.ConnectionError("fetch failed")
        return _Response(
            200,
            {"success": True, "data": {"rawHtml": "<html>ok</html>", "actions": {}}},
        )

    monkeypatch.setattr(firecrawl, "FIRECRAWL_API_KEY", "test-key")
    monkeypatch.setattr(firecrawl.requests, "post", post)
    monkeypatch.setattr(firecrawl.time, "sleep", lambda _: None)

    html, value = firecrawl.scrape_with_javascript("https://itviec.com", "return null")

    assert html == "<html>ok</html>"
    assert value is None
    assert calls == 2
