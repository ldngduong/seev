"""BrightData Web Unlocker — lớp bypass trả phí cho các nguồn bị chặn.

Transport mới của crawler (đã loại proxy pool / Camoufox / Playwright):

  1. `requests` thuần (UA quay vòng) — nhanh, miễn phí.
  2. Nếu 403/429 hoặc Cloudflare challenge -> gọi BrightData Web Unlocker API.
  3. Vẫn fail -> source báo lỗi riêng, pipeline tiếp tục (fail-fast, không
     chờ browser 2 phút nữa).

Cấu hình (crawl/.env):

  CRAWLER_BRIGHTDATA_KEY       API key (Bearer token) — có là bật bypass
  CRAWLER_BRIGHTDATA_URL       mặc định https://api.brightdata.com/request
  CRAWLER_BRIGHTDATA_ZONE      mặc định web_unlocker1
  CRAWLER_BRIGHTDATA_COUNTRY   mã ISO nguồn (vd "vn"), tùy chọn

Gọi API:
  POST https://api.brightdata.com/request
  Authorization: Bearer <key>
  {"zone": "web_unlocker1", "url": ..., "format": "raw"}
"""

from __future__ import annotations

import json
import logging

import requests

from .config import (
    BRIGHTDATA_COUNTRY,
    BRIGHTDATA_KEY,
    BRIGHTDATA_URL,
    BRIGHTDATA_ZONE,
)

log = logging.getLogger("crawler")

_CF_MARKERS = (
    "Just a moment",
    "cf-mitigated",
    "cf-error-details",
    "Cloudflare Ray ID",
    "challenge-form",
    "cf-chl-",
)


def is_cloudflare_page(html: str) -> bool:
    """True khi body giống trang challenge Cloudflare/Akamai.

    Marker set được chọn dè dặt — đã verify với trang thật của các board VN
    nên không false-positive (vd "challenge-platform" xuất hiện trong GTM/ad
    script của trang thường nên KHÔNG dùng; "Chờ một chút" xuất hiện cả trong
    trang thật của ViecOi nên cũng KHÔNG dùng).
    """
    return any(marker in html for marker in _CF_MARKERS)


def brightdata_available() -> bool:
    """True khi đã cấu hình BrightData API key."""
    return bool(BRIGHTDATA_KEY)


def fetch_via_brightdata(
    url: str,
    *,
    method: str = "GET",
    json_body: dict | None = None,
    params: dict | None = None,
) -> str:
    """Fetch URL qua BrightData Web Unlocker API.

    Trả raw body ('' khi fail bất kỳ) để caller degrade gọn. Mọi request chỉ
    được gửi khi có key — không có key thì hàm trả '' ngay.
    """
    if not BRIGHTDATA_KEY:
        return ""

    if params:
        from requests.models import PreparedRequest

        prepared = PreparedRequest()
        prepared.prepare(method=method.upper(), url=url, params=params)
        url = prepared.url

    payload: dict = {"zone": BRIGHTDATA_ZONE, "url": url, "format": "raw"}
    if BRIGHTDATA_COUNTRY:
        payload["country"] = BRIGHTDATA_COUNTRY
    headers = {"Authorization": f"Bearer {BRIGHTDATA_KEY}"}
    if method.upper() != "GET":
        payload["method"] = method.upper()
        if json_body is not None:
            payload["body"] = json.dumps(json_body)
            headers["Content-Type"] = "application/json"

    try:
        resp = requests.post(BRIGHTDATA_URL, json=payload, headers=headers, timeout=60)
    except Exception as e:  # noqa: BLE001
        log.warning("[brightdata] request error for %s: %s", url, e)
        return ""
    if resp.status_code != 200:
        log.warning("[brightdata] HTTP %s for %s: %s", resp.status_code, url, resp.text[:200])
        return ""

    try:
        data = resp.json()
    except ValueError:
        data = None
    if isinstance(data, dict) and "status_code" in data:
        status = int(data.get("status_code") or 200)
        body = data.get("body")
        if isinstance(body, list):
            body = "".join(str(b) for b in body)
        if status >= 400:
            log.warning("[brightdata] target HTTP %s for %s", status, url)
            return ""
        if isinstance(body, str) and body:
            if is_cloudflare_page(body):
                log.warning("[brightdata] vẫn nhận Cloudflare challenge cho %s", url)
                return ""
            return body
    if isinstance(data, dict) and data.get("message"):
        log.warning("[brightdata] API error cho %s: %s", url, data["message"])
        return ""
    return resp.text
