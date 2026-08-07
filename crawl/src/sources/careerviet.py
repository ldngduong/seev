"""CareerViet source — Next.js listing; job data nằm trong RSC payload.

Nguồn an toàn: requests trước; 403/429/Cloudflare -> BrightData unlocker.
Listing là trang Next.js App Router: 50 jobs/page nằm trong JSON `initialJobs`
nhúng trong RSC payload (`self.__next_f.push([1,"..."]`).

URL đã verify (08/2026):
  keyword        : /viec-lam/{kw}-k-vi.html
  keyword + page : /viec-lam/{kw}-k-trang-{n}-vi.html
  keyword + city : /viec-lam/{kw}-kl{loc}-vi.html   (loc id = CAREERVIET_CITY_IDS)

Cấp bậc (level) không có filter phía nguồn (giống jobsgo/viecoi/indeed) nên
post-crawl policy trong `finish()` + AI scoring quyết định.
"""

from __future__ import annotations

import json
import logging
import re

from ..config import CAREERVIET_CITY_IDS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_iso, parse_salary_vnd, slugify
from .base import BaseSource

log = logging.getLogger("crawler")

BASE = "https://careerviet.vn"

_PUSH_RE = re.compile(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)')
_SCRIPT_RE = re.compile(r"<script[^>]*>(.*?)</script>", re.S)


def parse_initial_jobs(html: str) -> list[dict]:
    """Trích danh sách job từ RSC payload Next.js của trang listing."""
    dec = json.JSONDecoder()
    for script in _SCRIPT_RE.findall(html):
        for chunk in _PUSH_RE.findall(script):
            try:
                txt = json.loads('"' + chunk + '"')
            except Exception:  # noqa: BLE001
                continue
            idx = txt.find('"initialJobs":')
            if idx < 0:
                continue
            try:
                obj, _ = dec.raw_decode(txt[idx + len('"initialJobs":'):])
            except Exception:  # noqa: BLE001
                continue
            data = obj.get("data") or []
            if isinstance(data, list) and data:
                return data
    return []


class CareerVietSource(BaseSource):
    name = "careerviet"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name)

    def fetch(self, query: SearchQuery) -> list[Job]:
        city = normalize_city(query.location)
        kw = slugify(query.query)
        jobs: list[Job] = []
        seen: set[str] = set()
        for page in range(1, query.pages + 1):
            if city and city in CAREERVIET_CITY_IDS:
                url = f"{BASE}/viec-lam/{kw}-kl{CAREERVIET_CITY_IDS[city]}-vi.html"
            elif page == 1:
                url = f"{BASE}/viec-lam/{kw}-k-vi.html"
            else:
                url = f"{BASE}/viec-lam/{kw}-k-trang-{page}-vi.html"
            html = self._robust.get(url).text
            if not html:
                break
            items = parse_initial_jobs(html)
            if not items:
                break
            for it in items:
                jid = it.get("job_id") or ""
                if not jid or jid in seen:
                    continue
                seen.add(jid)
                title = it.get("job_title") or ""
                locs = it.get("location_name") or []
                sal = it.get("job_salary_string")
                lo, hi, cur = parse_salary_vnd(sal)
                lo_exp, hi_exp = it.get("job_experience"), it.get("job_to_experience")
                exp = None
                if lo_exp or hi_exp:
                    exp = f"{lo_exp} - {hi_exp} năm" if lo_exp != hi_exp else f"{lo_exp} năm"
                url = it.get("job_link") or ""
                if "/en/" in url:
                    url = url.replace("/en/", "/vi/", 1)
                job = Job(
                    source=self.name,
                    source_job_id=jid,
                    title=title,
                    company=it.get("emp_name"),
                    url=url,
                    location=", ".join(locs) if locs else None,
                    salary_min=lo,
                    salary_max=hi,
                    salary_currency=cur,
                    salary_text=sal,
                    experience=exp,
                    posted_at=parse_iso(it.get("job_active_date")),
                    expires_at=parse_iso(it.get("job_last_date")),
                    logo=it.get("emp_logo"),
                )
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
                if len(jobs) >= query.max_results_per_source:
                    break
            if len(jobs) >= query.max_results_per_source or len(items) < 50:
                break
        return self.finish(query, jobs, city)
