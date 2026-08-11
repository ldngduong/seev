"""Firecrawl client — lõi crawl cho các nguồn HTML.

Dùng `/v2/scrape` với `formats: ["rawHtml"]` (1 credit/page cơ bản, không
tăng giá so với markdown; tránh format json — LLM extraction tốn thêm credit).
`proxy: "auto"` thử basic trước, chỉ lên enhanced (+4 credits/page) khi basic
bị chặn. `maxAge: 0` để luôn fetch fresh (Firecrawl mặc định cache 2 ngày,
job cần tươi). Trả rawHtml đã render JS — parser bs4 của từng nguồn giữ nguyên.
"""

from __future__ import annotations

import logging
import json
import random
import threading
import time

import requests

from .config import (
    FIRECRAWL_API_KEY,
    FIRECRAWL_CONCURRENCY,
    FIRECRAWL_MAXAGE_MS,
    FIRECRAWL_PROXY,
    FIRECRAWL_TIMEOUT_MS,
    FIRECRAWL_URL,
    FIRECRAWL_WAIT_MS,
)

log = logging.getLogger("crawler")

# Semaphore GLOBAL cho cả process: nhiều request BE / nhiều source cùng lúc
# vẫn không vượt giới hạn concurrent browsers của plan (Free=2, Hobby=5).
# Vượt giới hạn -> Firecrawl trả 429 ngay, nên xếp hàng chờ là bắt buộc.
_FC_LOCK = threading.BoundedSemaphore(max(1, FIRECRAWL_CONCURRENCY))


def firecrawl_available() -> bool:
    return bool(FIRECRAWL_API_KEY)


def scrape_via_firecrawl(
    url: str,
    *,
    proxy: str | None = None,
    wait_ms: int | None = None,
    timeout_ms: int | None = None,
) -> str:
    """Scrape một trang qua Firecrawl v2, trả rawHtml (đã render JS).

    Trả `""` khi page lỗi (target 4xx/5xx) hoặc payload thiếu rawHtml.
    Raise RuntimeError khi API lỗi (429 kéo dài, 401 key sai, 5xx) để
    caller quyết định fail-fast.
    """
    if not firecrawl_available():
        raise RuntimeError("chưa cấu hình CRAWLER_FIRECRAWL_API_KEY")

    payload: dict = {
        "url": url,
        "formats": ["rawHtml"],
        "proxy": proxy or FIRECRAWL_PROXY,
        "maxAge": FIRECRAWL_MAXAGE_MS,
        "waitFor": wait_ms if wait_ms is not None else FIRECRAWL_WAIT_MS,
        "timeout": timeout_ms if timeout_ms is not None else FIRECRAWL_TIMEOUT_MS,
    }
    request_timeout = min(180, (timeout_ms or FIRECRAWL_TIMEOUT_MS) / 1000 + 30)

    last_err: Exception = RuntimeError("Firecrawl unreachable")
    for attempt in range(3):
        if attempt > 0:
            time.sleep(1.5 * (2 ** (attempt - 1)) + random.uniform(0, 1))
        with _FC_LOCK:
            r = requests.post(
                f"{FIRECRAWL_URL}/scrape",
                json=payload,
                headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
                timeout=request_timeout,
            )
        if r.status_code == 429:
            last_err = RuntimeError(
                "Firecrawl rate limit (429): tăng CRAWLER_FIRECRAWL_CONCURRENCY theo plan hoặc chờ nhịp"
            )
            log.warning("[firecrawl] 429 (lần %d) cho %s", attempt + 1, url[:90])
            continue
        if r.status_code in (401, 403):
            raise RuntimeError(f"Firecrawl auth lỗi (HTTP {r.status_code}): kiểm tra CRAWLER_FIRECRAWL_API_KEY")
        if r.status_code >= 500:
            last_err = RuntimeError(f"Firecrawl API lỗi (HTTP {r.status_code})")
            log.warning("[firecrawl] HTTP %d (lần %d) cho %s", r.status_code, attempt + 1, url[:90])
            continue
        if r.status_code >= 400:
            raise RuntimeError(f"Firecrawl HTTP {r.status_code}: {r.text[:200]}")

        try:
            data = r.json()
        except ValueError:
            raise RuntimeError(f"Firecrawl response không phải JSON: {r.text[:200]}")

        if not data.get("success"):
            raise RuntimeError(f"Firecrawl trả lỗi: {str(data.get('error'))[:200] or r.text[:200]}")

        d = data.get("data") or {}
        if d.get("metadata", {}).get("statusCode", 200) >= 400:
            log.warning(
                "[firecrawl] target HTTP %s (%s): %s",
                d["metadata"].get("statusCode"),
                url[:90],
                (d.get("metadata", {}).get("error") or "")[:120],
            )
            return ""

        html = d.get("rawHtml") or ""
        if not html:
            log.warning("[firecrawl] scrape rỗng: %s", url[:90])
        return html

    raise RuntimeError(f"Firecrawl thất bại sau retry: {last_err}")


def scrape_with_javascript(url: str, script: str) -> tuple[str, object | None]:
    """One billed scrape: return rendered list HTML plus same-origin JS result."""
    if not firecrawl_available():
        raise RuntimeError("chưa cấu hình CRAWLER_FIRECRAWL_API_KEY")
    payload = {
        "url": url,
        "formats": ["rawHtml"],
        "proxy": FIRECRAWL_PROXY,
        "maxAge": FIRECRAWL_MAXAGE_MS,
        "waitFor": FIRECRAWL_WAIT_MS,
        "timeout": FIRECRAWL_TIMEOUT_MS,
        "actions": [{"type": "executeJavascript", "script": script}],
    }
    with _FC_LOCK:
        response = requests.post(
            f"{FIRECRAWL_URL}/scrape",
            json=payload,
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
            timeout=min(180, FIRECRAWL_TIMEOUT_MS / 1000 + 30),
        )
    if response.status_code >= 400:
        raise RuntimeError(f"Firecrawl action HTTP {response.status_code}: {response.text[:1000]}")
    data = response.json()
    if not data.get("success"):
        raise RuntimeError(f"Firecrawl action lỗi: {data.get('error')}")
    result = data.get("data") or {}
    returns = ((result.get("actions") or {}).get("javascriptReturns") or [])
    value = returns[-1].get("value") if returns and isinstance(returns[-1], dict) else None
    return result.get("rawHtml") or "", value


def scrape_job_list_with_details(
    url: str,
    *,
    link_selector: str,
    batch_size: int,
) -> tuple[str, list[dict]]:
    """Discover cards and hydrate their JobPosting JSON-LD in one browser scrape."""
    script = r"""(async () => {
      const selector = __SELECTOR__;
      const urls=[...new Set([...document.querySelectorAll(selector)].map(a=>a.href.split('?')[0]))].slice(0,__BATCH_SIZE__);
      const out=[]; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let cursor=0;
      const worker=async()=>{while(cursor<urls.length){const url=urls[cursor++];try{
        let response;for(let attempt=0;attempt<3;attempt++){response=await fetch(url,{credentials:'include'});if(response.status!==429)break;await sleep(900*(attempt+1));}
        const html=await response.text();const doc=new DOMParser().parseFromString(html,'text/html');
        const posting=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(s=>{try{return JSON.parse(s.textContent)}catch{return null}}).filter(Boolean).find(v=>v['@type']==='JobPosting');
        out.push({url,status:response.status,datePosted:posting?.datePosted??null,validThrough:posting?.validThrough??null,employmentType:posting?.employmentType??null,occupationalCategory:posting?.occupationalCategory??null,monthsOfExperience:posting?.experienceRequirements?.monthsOfExperience??null,skills:posting?.skills??null});
        await sleep(200);
      }catch(error){out.push({url,error:String(error)})}}};
      await Promise.all(Array.from({length:Math.min(2,urls.length)},worker));return out;
    })()"""
    script = script.replace("__SELECTOR__", json.dumps(link_selector)).replace(
        "__BATCH_SIZE__", str(max(1, batch_size))
    )
    html, value = scrape_with_javascript(url, script)
    details = [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []
    return html, details
