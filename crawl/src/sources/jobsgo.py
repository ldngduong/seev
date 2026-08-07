"""JobsGo source — rendered listing, guarded by bot checks.

Nguồn an toàn: requests trước; 403/429/Cloudflare -> BrightData unlocker.
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from ..config import JOBSGO_CITY_SLUGS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_salary_vnd, parse_vn_date, slugify
from .base import BaseSource


class JobsGoSource(BaseSource):
    name = "jobsgo"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name)



    def fetch(self, query: SearchQuery) -> list[Job]:
        profile = get_profile(self.name)
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        kw = slugify(query.query)
        base = f"https://jobsgo.vn/viec-lam-{kw}"
        if city and city in JOBSGO_CITY_SLUGS:
            base += f"-tai-{JOBSGO_CITY_SLUGS[city]}"
        base += ".html"
        for page in range(1, query.pages + 1):
            url = f"{base}?page={page}" if page > 1 else base
            html = self._robust.get(url).text
            if not html:
                break
            soup = BeautifulSoup(html, "html.parser")
            zero = soup.find("meta", {"name": "description"})
            if zero and re.search(r"Tuyển dụng 0 việc làm", zero.get("content", "")):
                break
            cards = soup.select("div.card.job-card")
            if not cards:
                break
            found = 0
            for card in cards:
                link = card.select_one("h3.job-title a, a[href*='/viec-lam/']")
                if not link:
                    continue
                href = link.get("href") or ""
                title = link.get("title") or link.get_text(strip=True)
                m = re.search(r"-(\d+)\.html", href)
                jid = m.group(1) if m else href
                if jid in seen:
                    continue
                seen.add(jid)
                found += 1
                comp_a = card.select_one("a.company-title, a[href*='/tuyen-dung/']")
                company = comp_a.get("title") or comp_a.get_text(strip=True) if comp_a else None
                salary_text = loc_text = None
                meta_spans = card.select("div.text-primary > span, div.text-primary span")
                for span in meta_spans:
                    t = span.get_text(strip=True)
                    if not t or t == "|":
                        continue
                    if salary_text is None:
                        salary_text = t
                    else:
                        loc_text = t
                        break
                exp = None
                job_type = None
                posted_text = None
                for badge in card.select(".badge"):
                    t = badge.get_text(strip=True)
                    if not t:
                        continue
                    badge_label = badge.get("title") or ""
                    if "kinh nghiệm" in badge_label:
                        exp = t
                    elif "Loại hình" in badge_label:
                        job_type = profile.map_job_type(t)
                    elif "cập nhật" in badge_label or "đăng" in badge_label:
                        posted_text = t
                logo_img = card.select_one("a.image-wrapper img")
                logo = logo_img.get("src") if logo_img else None
                lo, hi, cur = parse_salary_vnd(salary_text)
                job = Job(
                    source=self.name,
                    source_job_id=str(card.get("data-id") or jid),
                    title=title,
                    company=company,
                    url=href.split("?")[0],
                    location=loc_text,
                    salary_min=lo,
                    salary_max=hi,
                    salary_currency=cur,
                    salary_text=salary_text,
                    experience=exp,
                    job_type=job_type,
                    posted_at=parse_vn_date(posted_text),
                    logo=logo,
                )
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
            if found == 0:
                break
        return self.finish(query, jobs, city)
