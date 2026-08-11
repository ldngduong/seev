"""Transport chung cho các nguồn: Firecrawl (HTML) + requests thuần (JSON API).

  Nguồn HTML (topcv, itviec):
    Lấy qua Firecrawl `/v2/scrape` (rawHtml đã render JS, `proxy: auto`).
    Fail nhanh nếu chưa có key — không thử requests trước (bị chặn 100%
    ở các nguồn này, thử chỉ tốn thời gian).
  Nguồn JSON API (vietnamworks):
    `json_mode=True` — requests thuần (0 credit Firecrawl), chỉ retry;
    không có lớp bypass nữa.
  Mọi fail đều raise RuntimeError -> source báo lỗi riêng, pipeline tiếp tục.
"""

from __future__ import annotations

import logging
import random
import time

import requests

from .config import HEADERS_TEMPLATE, RETRY_BACKOFF, USER_AGENTS
from .firecrawl import firecrawl_available, scrape_via_firecrawl

log = logging.getLogger("crawler")


class _Resp:
    """Response wrapper chung cho requests và Firecrawl path."""

    __slots__ = ("status_code", "text", "ok")

    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text
        self.ok = 200 <= status_code < 300

    def json(self):
        import json

        return json.loads(self.text)


class RobustFetcher:
    """Transport: Firecrawl cho HTML, requests cho JSON API.

    `prefer_bypass=True` (topcv, itviec): thẳng Firecrawl proxy auto.
    Nguồn an toàn: Firecrawl với proxy auto (basic 1 credit; enhanced chỉ khi
    cần). `json_mode=True` (vietnamworks): requests thuần, không qua
    Firecrawl. `bypass_used` báo Firecrawl đã chạy để source giới hạn số trang
    (mỗi trang = 1 credit) cho các nguồn đi thẳng Firecrawl.
    """

    def __init__(
        self,
        name: str,
        json_mode: bool = False,
        prefer_bypass: bool = False,
    ):
        self.name = name
        self.json_mode = json_mode
        self.prefer_bypass = prefer_bypass
        self.bypass_used = False
        self._session = requests.Session()
        self._session.headers.update(dict(HEADERS_TEMPLATE))

    @staticmethod
    def _url_with_params(url: str, params: dict | None) -> str:
        if not params:
            return url
        from urllib.parse import urlencode

        sep = "&" if "?" in url else "?"
        return f"{url}{sep}{urlencode(params)}"

    def _request(self, method: str, url: str, **kw) -> _Resp:
        # ---- Firecrawl path: mọi HTML page đều qua đây ----
        if not self.json_mode:
            if not firecrawl_available():
                raise RuntimeError(
                    f"{self.name} unreachable: chưa cấu hình CRAWLER_FIRECRAWL_API_KEY"
                )
            if method.lower() != "get":
                raise RuntimeError(f"{self.name}: Firecrawl chỉ hỗ trợ GET")
            full_url = self._url_with_params(url, kw.get("params"))
            body = scrape_via_firecrawl(full_url)
            if body:
                self.bypass_used = True
                return _Resp(200, body)
            raise RuntimeError(f"{self.name} unreachable after Firecrawl (target lỗi hoặc rỗng)")

        # ---- JSON API path: requests thuần, retry có backoff ----
        headers = kw.pop("headers", None)
        if headers:
            merged = dict(self._session.headers)
            merged.update(headers)
            self._session.headers.update(merged)
        kw.setdefault("timeout", 30)

        last: Exception = RuntimeError(f"{self.name} unreachable")
        for attempt in range(2):
            try:
                r = self._session.request(method, url, **kw)
                if r.status_code in (403, 429, 500, 502, 503):
                    last = RuntimeError(f"HTTP {r.status_code} (blocked)")
                else:
                    return _Resp(r.status_code, r.text)
            except Exception as e:  # noqa: BLE001
                last = e
            if attempt == 0:
                time.sleep(RETRY_BACKOFF + random.uniform(0, 0.5))
        raise RuntimeError(f"{self.name} unreachable after requests: {last}")

    def get(self, url: str, **kw) -> _Resp:
        return self._request("get", url, **kw)

    def post(self, url: str, **kw) -> _Resp:
        return self._request("post", url, **kw)
