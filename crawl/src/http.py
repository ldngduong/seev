"""HTTP client with anti-bot friendly defaults: rotating UA, retries, rate limiting.

Blocked responses (403/429) degrade to the BrightData Web Unlocker API instead
of the retired proxy/browser stack.
"""

from __future__ import annotations

import random
import threading
import time
from urllib.parse import urljoin

import requests

from .brightdata import brightdata_available, fetch_via_brightdata
from .config import (
    HEADERS_TEMPLATE,
    MAX_RETRIES,
    PER_SOURCE_DELAY,
    REQUEST_TIMEOUT,
    RETRY_BACKOFF,
    USER_AGENTS,
)


class RateLimiter:
    """Minimal token-bucket limiter shared by all sources."""

    def __init__(self, per_second: float = 4.0):
        self._rate = per_second
        self._tokens = per_second
        self._lock = threading.Lock()
        self._updated = time.monotonic()

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            self._tokens = min(self._rate, self._tokens + (now - self._updated) * self._rate)
            self._updated = now
            if self._tokens < 1:
                wait = (1 - self._tokens) / self._rate
                time.sleep(wait)
                self._tokens = 0.0
                self._updated = time.monotonic()
            else:
                self._tokens -= 1


SHARED_LIMITER = RateLimiter()


def build_headers(user_agent: str | None = None) -> dict[str, str]:
    headers = dict(HEADERS_TEMPLATE)
    headers["User-Agent"] = user_agent or random.choice(USER_AGENTS)
    return headers


class HttpFetcher:
    """Thread-safe HTTP fetcher with UA rotation, retry & backoff."""

    def __init__(self, timeout: float = REQUEST_TIMEOUT, limiter: RateLimiter | None = None):
        self.timeout = timeout
        self.limiter = limiter or SHARED_LIMITER
        self._session_local = threading.local()

    @property
    def session(self) -> requests.Session:
        sess = getattr(self._session_local, "session", None)
        if sess is None:
            sess = requests.Session()
            self._session_local.session = sess
        return sess

    def get(self, url: str, *, params: dict | None = None, headers: dict | None = None, **kw) -> requests.Response:
        return self._request("GET", url, params=params, headers=headers, **kw)

    def post(self, url: str, *, json: dict | None = None, headers: dict | None = None, **kw) -> requests.Response:
        return self._request("POST", url, json=json, headers=headers, **kw)

    def _request(self, method: str, url: str, **kw) -> requests.Response:
        headers = kw.pop("headers", None) or build_headers()
        last_err: Exception | None = None
        for attempt in range(MAX_RETRIES):
            if self.limiter:
                self.limiter.acquire()
            try:
                resp = self.session.request(method, url, headers=headers, timeout=self.timeout, **kw)
                if resp.status_code in (403, 429) and attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF * (2**attempt) + random.uniform(0, 0.5))
                    last_err = RuntimeError(f"HTTP {resp.status_code}")
                    continue
                if resp.status_code >= 500 and attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF * (2**attempt) + random.uniform(0, 0.5))
                    last_err = RuntimeError(f"HTTP {resp.status_code}")
                    continue
                resp.raise_for_status()
                return resp
            except requests.RequestException as e:
                last_err = e
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF * (2**attempt) + random.uniform(0, 0.5))
        if brightdata_available():
            body = fetch_via_brightdata(url, method=method, json_body=kw.get("json"), params=kw.get("params"))
            if body:
                resp = requests.Response()
                resp.status_code = 200
                resp._content = body.encode("utf-8")
                resp.encoding = "utf-8"
                return resp
        raise RuntimeError(f"Request failed after {MAX_RETRIES} attempts: {last_err}")


def absolute_url(base: str, href: str) -> str:
    return urljoin(base, href)
