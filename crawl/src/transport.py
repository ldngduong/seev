"""Transport chung cho các nguồn: requests thuần + BrightData bypass.

Thay cho browser.py cũ (Camoufox/Playwright) và curl_cffi — đã loại toàn bộ:

  Nguồn an toàn (jobsgo, viecoi, vietnamworks, topdev):
    1. requests (UA quay vòng, retry 2 lần).
    2. 403/429 hoặc Cloudflare challenge -> BrightData Web Unlocker API.
  Nguồn nguy hiểm (indeed, topcv, itviec):
    Đi thẳng BrightData (`prefer_bypass=True`) — requests thường bị chặn
    100%, thử trước chỉ tốn thời gian và làm nặng thêm rate-limit.
  Vẫn fail: raise RuntimeError -> source báo lỗi riêng, pipeline tiếp tục.
"""

from __future__ import annotations

import logging
import random
import time

import requests

from .brightdata import brightdata_available, fetch_via_brightdata, is_cloudflare_page
from .config import HEADERS_TEMPLATE, RETRY_BACKOFF, USER_AGENTS

log = logging.getLogger("crawler")


class _Resp:
    """Response wrapper chung cho requests và BrightData path."""

    __slots__ = ("status_code", "text", "ok")

    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text
        self.ok = 200 <= status_code < 300

    def json(self):
        import json

        return json.loads(self.text)


class RobustFetcher:
    """Transport chống block.

    `prefer_bypass=True` cho nguồn luôn bị chặn (indeed, topcv, itviec):
    gọi thẳng BrightData, không thử requests. Mặc định (nguồn an toàn):
    requests trước; 403/429 hoặc Cloudflare interstitial -> BrightData.
    JSON mode fallback coi rendered body như payload. Mọi fail đều raise
    RuntimeError để source báo lỗi riêng và pipeline tiếp tục.
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

    def _request(self, method: str, url: str, **kw) -> _Resp:
        if not self.prefer_bypass:
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
                    if r.status_code in (403, 429):
                        last = RuntimeError(f"HTTP {r.status_code} (blocked)")
                    elif not self.json_mode and is_cloudflare_page(r.text):
                        last = RuntimeError("Cloudflare challenge served with HTTP 200")
                    else:
                        return _Resp(r.status_code, r.text)
                except Exception as e:  # noqa: BLE001
                    last = e
                if attempt == 0:
                    time.sleep(RETRY_BACKOFF + random.uniform(0, 0.5))
        else:
            last = RuntimeError(f"{self.name} đi thẳng BrightData")

        if not brightdata_available():
            raise RuntimeError(
                f"{self.name} unreachable (bị chặn, chưa cấu hình CRAWLER_BRIGHTDATA_KEY): {last}"
            )

        log.warning("[%s] thử BrightData unlocker cho %s", self.name, url)
        self.bypass_used = True
        body = fetch_via_brightdata(
            url, method=method, json_body=kw.get("json"), params=kw.get("params")
        )
        if body:
            return _Resp(200, body)
        raise RuntimeError(f"{self.name} unreachable after BrightData: {last}")

    def get(self, url: str, **kw) -> _Resp:
        return self._request("get", url, **kw)

    def post(self, url: str, **kw) -> _Resp:
        return self._request("post", url, **kw)

