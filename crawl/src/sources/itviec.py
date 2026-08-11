"""ITViec source — Firecrawl same-origin list + exact detail JSON-LD."""

from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from ..config import ITVIEC_CITY_SLUGS, ITVIEC_DETAIL_BATCH_SIZE
from ..firecrawl import scrape_job_list_with_details
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..utils import contains_city, normalize_city, parse_iso, parse_salary_vnd, parse_vn_date
from .base import BaseSource

log = logging.getLogger("crawler")

BASE = "https://itviec.com"


class ITViecSource(BaseSource):
    name = "itviec"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._bypass = False
        self._details: dict[str, dict] = {}

    def _get_html(self, url: str) -> str:
        html, details = scrape_job_list_with_details(
            url,
            link_selector='div.job-card h3 a[href*="/it-jobs/"]',
            batch_size=ITVIEC_DETAIL_BATCH_SIZE,
        )
        self._bypass = True
        self._details = {
            str(item.get("url", "")).split("?")[0]: item for item in details
        }
        return html

    def _apply_detail(self, job: Job) -> None:
        detail = self._details.get(job.url.split("?")[0])
        if not detail or detail.get("status") != 200:
            return
        job.posted_at = parse_iso(detail.get("datePosted")) or job.posted_at
        job.expires_at = parse_iso(detail.get("validThrough"))
        employment = detail.get("employmentType")
        if isinstance(employment, str):
            job.job_type = get_profile(self.name).map_job_type(employment.replace("_", " "))
        skills = detail.get("skills")
        if isinstance(skills, str):
            job.skills = list(dict.fromkeys([*job.skills, *[s.strip() for s in skills.split(",") if s.strip()]]))
        months = detail.get("monthsOfExperience")
        if isinstance(months, (int, float)) and months >= 0:
            years = float(months) / 12
            job.experience_min = years
            job.experience_max = years
            whole_years, remaining_months = divmod(int(months), 12)
            if whole_years and remaining_months:
                job.experience = f"{whole_years} năm {remaining_months} tháng"
            elif whole_years:
                job.experience = f"{whole_years} năm"
            else:
                job.experience = f"{int(months)} tháng"
            job.raw["experience_source"] = "itviec_json_ld"
            job.raw["experience_months"] = months
            job.raw["experience_quality"] = "source_reported_unverified"
        job.raw["deadline_source"] = "itviec_json_ld"
        job.raw["seniority_source"] = "itviec_title"

    def fetch(self, query: SearchQuery) -> list[Job]:
        profile = get_profile(self.name)
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        pages = query.pages if not self._bypass else 1
        # ITViec is IT-only. Canonical ids are metadata, never native filters.
        for page in range(1, pages + 1):
            fixed_url = self.fixed_page_url(query, page)
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

            url = fixed_url or f"{BASE}/it-jobs?{urlencode(params, doseq=True)}"
            html = self._get_html(url)
            self.validate_fixed_page(query, html)
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
                self._apply_detail(job)
                if city and job.location and not contains_city(job.location, city):
                    continue
                jobs.append(job)
                if len(jobs) >= query.max_results_per_source * (page):
                    break
        return self.finish(query, jobs, city)
