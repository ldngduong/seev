"""ViecOi source — rendered listing, guarded by bot checks.

Nguồn an toàn: requests trước; 403/429/Cloudflare -> BrightData unlocker.
"""

from __future__ import annotations

from bs4 import BeautifulSoup

from ..config import VIECO_CITY_PARAMS
from ..models import Job, SearchQuery
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_salary_vnd, parse_vn_date, slugify
from .base import BaseSource
import re


class ViecOiSource(BaseSource):
    name = "viecoi"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name)



    def fetch(self, query: SearchQuery) -> list[Job]:
        # ViecOi exposes no seniority filter -> keyword stays clean and the
        # post-crawl policy in `finish()` filters by detected level + exp.
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        for page in range(1, query.pages + 1):
            kw = slugify(query.query)
            if city and city in VIECO_CITY_PARAMS:
                cslug, cid = VIECO_CITY_PARAMS[city]
                url = f"https://viecoi.vn/tim-viec/key-{kw}-{cslug}-{cid}.html"
            else:
                url = f"https://viecoi.vn/tim-viec/key-{kw}.html"
            if page > 1:
                url += f"?page={page}"
            html = self._robust.get(url).text
            if not html:
                break
            soup = BeautifulSoup(html, "html.parser")
            items = soup.select("div.vo-jobs-item.item_job")
            if not items:
                break
            if not items:
                break
            found = 0
            for item in items:
                link = item.select_one("a.title_container, a#link_job")
                if not link:
                    link = item.select_one("a[href*='/viec-lam/']")
                if not link:
                    continue
                href = link.get("href") or ""
                title = link.get("title") or link.get_text(" ", strip=True)
                if title.startswith("Việc làm "):
                    title = title[len("Việc làm ") :]
                jid = item.get("data-job-id") or ""
                if not jid:
                    m = re.search(r"-(\d+)\.html", href)
                    jid = m.group(1) if m else href
                if not jid or jid in seen:
                    continue
                seen.add(jid)
                found += 1
                comp_el = item.select_one("[class*='company']")
                company = comp_el.get_text(" ", strip=True) if comp_el else None
                sal_el = item.select_one(".job_overflow.icon-hight-light .added-detail-information")
                salary_text = sal_el.get_text(" ", strip=True) if sal_el else None
                loc_el = item.select_one(".location-container")
                loc_text = loc_el.get_text(" ", strip=True) if loc_el else None
                dead_el = None
                for div in item.select(".job_overflow"):
                    t = div.get_text(" ", strip=True)
                    if t and re.search(r"\d{1,2}/\d{1,2}/\d{4}", t):
                        dead_el = div
                        break
                deadline_text = dead_el.get_text(" ", strip=True) if dead_el else None
                skills = [t.get_text(strip=True) for t in item.select("[class*='tag'] span, [class*='skill']")]
                lo, hi, cur = parse_salary_vnd(salary_text)
                job = Job(
                    source=self.name,
                    source_job_id=jid,
                    title=title,
                    company=company,
                    url=href.split("?")[0],
                    location=loc_text,
                    salary_min=lo,
                    salary_max=hi,
                    salary_currency=cur,
                    salary_text=salary_text,
                    expires_at=parse_vn_date(deadline_text),
                    skills=[s for s in skills if s],
                )
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
            if found == 0:
                break
        return self.finish(query, jobs, city)
