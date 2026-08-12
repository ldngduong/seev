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
import re
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
    last_err: Exception = RuntimeError("Firecrawl action unreachable")
    for attempt in range(3):
        if attempt > 0:
            time.sleep(1.5 * (2 ** (attempt - 1)) + random.uniform(0, 1))
        try:
            with _FC_LOCK:
                response = requests.post(
                    f"{FIRECRAWL_URL}/scrape",
                    json=payload,
                    headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
                    timeout=min(180, FIRECRAWL_TIMEOUT_MS / 1000 + 30),
                )
        except requests.RequestException as error:
            last_err = error
            log.warning(
                "[firecrawl] action transport lỗi (lần %d) cho %s: %s",
                attempt + 1,
                url[:90],
                error,
            )
            continue

        if response.status_code in (401, 403):
            raise RuntimeError(
                f"Firecrawl action auth lỗi (HTTP {response.status_code}): kiểm tra CRAWLER_FIRECRAWL_API_KEY"
            )
        if response.status_code == 429 or response.status_code >= 500:
            last_err = RuntimeError(f"Firecrawl action HTTP {response.status_code}")
            log.warning(
                "[firecrawl] action HTTP %d (lần %d) cho %s",
                response.status_code,
                attempt + 1,
                url[:90],
            )
            continue
        if response.status_code >= 400:
            raise RuntimeError(
                f"Firecrawl action HTTP {response.status_code}: {response.text[:1000]}"
            )

        try:
            data = response.json()
        except ValueError as error:
            last_err = error
            continue
        if not data.get("success"):
            error_text = str(data.get("error") or "unknown error")
            if re.search(r"fetch failed|timeout|network|socket|econnreset|etimedout", error_text, re.I):
                last_err = RuntimeError(error_text)
                log.warning(
                    "[firecrawl] action tạm lỗi (lần %d) cho %s: %s",
                    attempt + 1,
                    url[:90],
                    error_text[:160],
                )
                continue
            raise RuntimeError(f"Firecrawl action lỗi: {error_text}")

        result = data.get("data") or {}
        html = result.get("rawHtml") or ""
        if not html:
            last_err = RuntimeError("Firecrawl action trả rawHtml rỗng")
            continue
        returns = ((result.get("actions") or {}).get("javascriptReturns") or [])
        value = returns[-1].get("value") if returns and isinstance(returns[-1], dict) else None
        return html, value

    raise RuntimeError(f"Firecrawl action thất bại sau retry: {last_err}")


def scrape_job_list_with_details(
    url: str,
    *,
    link_selector: str,
    batch_size: int,
) -> tuple[str, list[dict]]:
    """Discover cards and hydrate exact job details in one billed browser scrape.

    Detail pages are fetched from the already-open, same-origin category page.
    Besides JSON-LD metadata we keep only the employer-authored sections needed
    for matching. Navigation, benefits, company marketing and related jobs are
    deliberately excluded here instead of being cleaned later by the AI.
    """
    script = r"""(async () => {
      const selector = __SELECTOR__;
      const urls=[...new Set([...document.querySelectorAll(selector)].map(a=>a.href.split('?')[0]))].slice(0,__BATCH_SIZE__);
      const out=[]; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let cursor=0;
      const normalized=value=>(value||'').replace(/\s+/g,' ').trim().toLowerCase();
      const textOf=node=>{if(!node)return null;const clone=node.cloneNode(true);clone.querySelectorAll('script,style,button,a.apply-now,form').forEach(el=>el.remove());clone.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));clone.querySelectorAll('li').forEach(el=>el.append('\n'));const value=(clone.textContent||'').replace(/\u00a0/g,' ').replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();return value||null};
      const section=(doc,labels,source)=>{const heading=[...doc.querySelectorAll('h1,h2,h3,h4')].find(el=>labels.some(label=>normalized(el.textContent)===label||normalized(el.textContent).startsWith(label)));if(!heading)return null;let box=null;if(source==='topcv')box=heading.closest('.box-job-information-detail-item');if(source==='itviec')box=heading.closest('.paragraph');box=box||heading.parentElement;if(!box)return null;const clone=box.cloneNode(true);clone.querySelectorAll('h1,h2,h3,h4').forEach(el=>el.remove());return textOf(clone)};
      const worker=async()=>{while(cursor<urls.length){const url=urls[cursor++];try{
        let response;for(let attempt=0;attempt<3;attempt++){response=await fetch(url,{credentials:'include'});if(response.status!==429)break;await sleep(900*(attempt+1));}
        const html=await response.text();const doc=new DOMParser().parseFromString(html,'text/html');
        const posting=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(s=>{try{return JSON.parse(s.textContent)}catch{return null}}).filter(Boolean).find(v=>v['@type']==='JobPosting');
        const source=location.hostname.includes('topcv')?'topcv':'itviec';
        const description=source==='topcv'?section(doc,['mô tả công việc'],source):section(doc,['job description','mô tả công việc'],source);
        const requirements=source==='topcv'?section(doc,['yêu cầu ứng viên'],source):section(doc,['your skills and experience','requirements','kỹ năng và kinh nghiệm','yêu cầu công việc'],source);
        out.push({url,status:response.status,datePosted:posting?.datePosted??null,validThrough:posting?.validThrough??null,employmentType:posting?.employmentType??null,occupationalCategory:posting?.occupationalCategory??null,monthsOfExperience:posting?.experienceRequirements?.monthsOfExperience??null,skills:posting?.skills??null,description,requirements,detailSource:`${source}_structured_json`,detailParserVersion:2});
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
