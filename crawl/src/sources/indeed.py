"""Indeed (Vietnam) source — chặn bot, chạy qua BrightData Web Unlocker.

Nguồn nguy hiểm: Indeed chặn client không-phải-browser. `jobs.vn.indeed.com`
trả trang "Authenticating..." -> redirect login ngay cả qua BrightData; chỉ
`vn.indeed.com` (+ country vn trong BD) trả job cards. Fetch thẳng qua
BrightData Web Unlocker API (`prefer_bypass=True`). Không có key BrightData
thì nguồn fail nhanh, không nói nguồn khác. Không có filter level phía nguồn
nên post-crawl policy trong `finish()` lo phần level + experience.
"""

from __future__ import annotations

from bs4 import BeautifulSoup

from ..config import INDEED_CITY_PARAMS
from ..models import Job, SearchQuery
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_iso
from .base import BaseSource

BASE = "https://vn.indeed.com"


class IndeedSource(BaseSource):
    name = "indeed"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name, prefer_bypass=True)
        self._bypass = False

    def _fetch_listing(self, url: str) -> str:
        resp = self._robust.get(url)
        self._bypass = self._robust.bypass_used
        return resp.text

    def fetch(self, query: SearchQuery) -> list[Job]:
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        pages = query.pages if not self._bypass else 1
        for page in range(1, pages + 1):
            params = {"q": query.query, "sort": "date"}
            if city and city in INDEED_CITY_PARAMS:
                params["l"] = INDEED_CITY_PARAMS[city]
            if page > 1:
                params["start"] = (page - 1) * 10
            from urllib.parse import urlencode

            url = f"{BASE}/jobs?{urlencode(params)}"
            html = self._fetch_listing(url)
            if not html:
                break
            soup = BeautifulSoup(html, "html.parser")
            cards = soup.select("div.job_seen_beacon, .tapItem")
            if not cards:
                html = self._fetch_listing(url)
                if not html:
                    break
                soup = BeautifulSoup(html, "html.parser")
                cards = soup.select("div.job_seen_beacon, .tapItem")
            if not cards:
                break
            for card in cards:
                a = card.select_one("a.jcs-JobTitle") or card.select_one("h2 a")
                if not a:
                    continue
                jk = a.get("data-jk") or ""
                title = a.get_text(strip=True)
                if not jk or jk in seen:
                    continue
                seen.add(jk)
                comp_el = card.select_one("[data-testid='company-name'], .companyName")
                company = comp_el.get_text(strip=True) if comp_el else None
                loc_el = card.select_one("[data-testid='text-location'], .companyLocation")
                loc_text = loc_el.get_text(" ", strip=True) if loc_el else None
                sal_el = card.select_one("[data-testid='attribute_snippet_testid'], .salary-snippet")
                salary_text = sal_el.get_text(" ", strip=True) if sal_el else None
                exp_el = card.select_one(".job-snippet, .snippet")
                exp = exp_el.get_text(" ", strip=True) if exp_el else None
                job = Job(
                    source=self.name,
                    source_job_id=jk,
                    title=title,
                    company=company,
                    url=f"{BASE}/viewjob?jk={jk}",
                    location=loc_text,
                    salary_text=salary_text,
                    experience=exp,
                    posted_at=parse_iso(None),
                )
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
                if len(jobs) >= query.max_results_per_source * (page):
                    break
        return self.finish(query, jobs, city)
