"""TopCV source — server-rendered search page sau Cloudflare.

Nguồn nguy hiểm: requests thuần bị Cloudflare chặn 100% (403/429 hoặc
challenge), nên `prefer_bypass=True` — đi thẳng BrightData Web Unlocker API,
không thử requests lãng phí. Khi bypass hoạt động chỉ fetch page đầu
(`_bypass=True` -> pages=1) để tiết kiệm phí BrightData.
"""

from __future__ import annotations

import logging
import re

from bs4 import BeautifulSoup

from ..brightdata import is_cloudflare_page
from ..config import TOPCV_CITY_PARAMS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import normalize_city, parse_salary_vnd, parse_vn_date, slugify
from .base import BaseSource

log = logging.getLogger("crawler")

BASE = "https://www.topcv.vn"


class TopCVSource(BaseSource):
    name = "topcv"
    supports_location = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name, prefer_bypass=True)
        self._bypass = False

    # ------------------------------------------------------------------ fetch
    def _get_html(self, url: str) -> str:
        """Fetch qua BrightData (prefer_bypass). Raise khi fail để báo lỗi nguồn."""
        resp = self._robust.get(url)
        self._bypass = self._robust.bypass_used
        return resp.text

    def fetch(self, query: SearchQuery) -> list[Job]:
        profile = get_profile(self.name)
        if query.location and query.location.lower() == "remote":
            keyword = f"remote {query.query}"
            city = None
        else:
            keyword = query.query
            city = normalize_city(query.location)
        kw_slug = slugify(keyword)
        jobs: list[Job] = []
        seen: set[str] = set()
        # BrightData tốn phí mỗi request, chỉ fetch page đầu khi bypass.
        pages = query.pages if not self._bypass else 1
        # ?position= accepts one value per request; entry targets fan out over
        # their pool (50=thực tập sinh, 1=Nhân viên) and the merged results are
        # cut precisely by the post-crawl policy.
        position_values = profile.level_filter_values(query.level)
        for position in position_values or [None]:
            for page in range(1, pages + 1):
                if city and city in TOPCV_CITY_PARAMS:
                    cslug, kl, loc = TOPCV_CITY_PARAMS[city]
                    url = (
                        f"{BASE}/tim-viec-lam-{kw_slug}-tai-{cslug}-{kl}"
                        f"?type_keyword=1&sba=1&locations={loc}"
                    )
                else:
                    url = f"{BASE}/tim-viec-lam-{kw_slug}?type_keyword=1&sba=1"
                if position:
                    url += f"&position={position}"
                if page > 1:
                    url += f"&page={page}"
                html = self._get_html(url)
                if is_cloudflare_page(html):
                    log.warning("[topcv] CF block on page %d", page)
                    break
                soup = BeautifulSoup(html, "html.parser")
                items = soup.select("div.job-item-search-result, div.job-item")
                if not items:
                    break
                found = 0
                for item in items:
                    title_a = item.select_one("h3.title a, .title a")
                    if not title_a:
                        continue
                    title = title_a.get_text(" ", strip=True)
                    href = title_a.get("href") or ""
                    jid = item.get("data-job-id") or ""
                    if not jid:
                        m = re.search(r"/(\d+)\.html", href)
                        jid = m.group(1) if m else href
                    if not jid or jid in seen:
                        continue
                    seen.add(jid)
                    found += 1
                    comp_a = item.select_one("a.company .company-name, .company-name")
                    company = comp_a.get_text(strip=True) if comp_a else None
                    sal_el = item.select_one("label.salary span, .salary span")
                    salary_text = sal_el.get_text(strip=True) if sal_el else None
                    loc_el = item.select_one(".city-text, label.address")
                    loc_text = loc_el.get_text(" ", strip=True) if loc_el else None
                    exp_el = item.select_one("[class*='exp'] span, .exp span")
                    exp = exp_el.get_text(strip=True) if exp_el else None
                    logo_img = item.select_one(".avatar img")
                    logo = None
                    if logo_img:
                        logo = logo_img.get("src") or logo_img.get("data-src")
                    upd_el = item.select_one(".label-update")
                    posted_text = upd_el.get_text(" ", strip=True) if upd_el else None
                    if posted_text:
                        posted_text = (posted_text.replace("Đăng", "").replace("Cập nhật", "")).strip()
                    skills = [
                        t.get_text(strip=True)
                        for t in item.select(".item-tag")
                        if t.get_text(strip=True) and "kinh nghiệm" not in t.get_text(strip=True).lower()
                    ]
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
                        experience=exp,
                        posted_at=parse_vn_date(posted_text),
                        skills=[s for s in skills if s],
                        logo=logo,
                    )
                    jobs.append(job)
                if self._bypass:
                    return self.finish(query, jobs, city)
                if found == 0:
                    break
        return self.finish(query, jobs, city)
