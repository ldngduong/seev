"""ITViec source — server-side rendered HTML.

Nguồn nguy hiểm: requests thuần bị chặn (404/429 bot-fingerprint + rate
limit), nên `prefer_bypass=True` — đi thẳng BrightData Web Unlocker API.
Khi bypass hoạt động chỉ fetch page đầu để tiết kiệm phí.
"""

from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from ..config import ITVIEC_CITY_SLUGS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_salary_vnd, parse_vn_date
from .base import BaseSource

log = logging.getLogger("crawler")

BASE = "https://itviec.com"


class ITViecSource(BaseSource):
    name = "itviec"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name, prefer_bypass=True)
        self._bypass = False

    def _get_html(self, url: str) -> str:
        """Fetch qua BrightData (prefer_bypass). Raise khi fail để báo lỗi nguồn."""
        resp = self._robust.get(url)
        self._bypass = self._robust.bypass_used
        return resp.text

    def fetch(self, query: SearchQuery) -> list[Job]:
        profile = get_profile(self.name)
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        pages = query.pages if not self._bypass else 1
        for page in range(1, pages + 1):
            params: dict = {"query": query.query}
            level_values = profile.level_filter_values(query.level)
            if level_values:
                # doseq=True -> repeated &job_level_names[]=Internship&...=Fresher
                # params. Without it urllib renders one literal-list value that
                # ITViec ignores (the level filter silently never applied).
                params["job_level_names[]"] = level_values
            if city and city in ITVIEC_CITY_SLUGS:
                params["city"] = ITVIEC_CITY_SLUGS[city]
            if page > 1:
                params["page"] = page
            from urllib.parse import urlencode

            url = f"{BASE}/it-jobs?{urlencode(params, doseq=True)}"
            html = self._get_html(url)
            soup = BeautifulSoup(html, "html.parser")
            cards = soup.select("div.job-card")
            if not cards:
                break
            for card in cards:
                title_a = card.select_one("h3 a")
                if not title_a:
                    continue
                title = title_a.get_text(strip=True)
                href = title_a.get("href") or ""
                job_slug = href.rstrip("/").split("/")[-1]
                job_slug = job_slug.split("?")[0]
                jid = job_slug.split("-")[-1] if "-" in job_slug else job_slug
                if not jid or jid in seen:
                    continue
                seen.add(jid)

                company = None
                for a in card.select("a[href*='/companies/']"):
                    t = a.get_text(strip=True)
                    if t:
                        company = t
                        break
                salary_text = None
                salary_el = card.select_one(".sign-in-view-salary")
                if salary_el and "sign in" not in salary_el.get_text(strip=True).lower():
                    salary_text = salary_el.get_text(strip=True)
                elif card.select_one(".salary a"):
                    salary_text = card.select_one(".salary a").get_text(strip=True)
                loc_text = None
                pin = card.select_one("use[href*='map-pin']")
                if pin:
                    svg = pin.find_parent("svg")
                    if svg is not None:
                        nxt = svg.find_next_sibling("div")
                        if nxt is not None:
                            loc_text = nxt.get("title") or nxt.get_text(strip=True) or None

                posted_el = card.select_one("span.small-text")
                posted_text = posted_el.get_text(strip=True) if posted_el else None
                logo_img = card.select_one("img.logo-employer-card, .logo-employer-card img") or card.select_one(".job-card img[src*='active_storage']")
                logo = None
                if logo_img:
                    logo = logo_img.get("src") or logo_img.get("data-src")
                    if logo and logo.startswith("/"):
                        logo = BASE + logo
                skills = []
                for a in card.select("a[href*='/it-jobs/']"):
                    t = a.get_text(strip=True)
                    href = a.get("href") or ""
                    is_skill = "click_source" in (a.get("click_source") or href) or "Skill" in (a.get("click_source") or "")
                    if t and is_skill and t not in skills:
                        skills.append(t)
                lo, hi, cur = parse_salary_vnd(salary_text)
                job = Job(
                    source=self.name,
                    source_job_id=jid,
                    title=title,
                    company=company,
                    url=f"{BASE}/it-jobs/{job_slug}",
                    location=loc_text,
                    salary_min=lo,
                    salary_max=hi,
                    salary_currency=cur,
                    salary_text=salary_text,
                    posted_at=parse_vn_date(posted_text),
                    job_type="internship" if "intern" in title.lower() else None,
                    logo=logo,
                    skills=skills,
                )
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
                if len(jobs) >= query.max_results_per_source * (page):
                    break
        return self.finish(query, jobs, city)
