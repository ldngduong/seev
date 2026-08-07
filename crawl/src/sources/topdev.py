"""TopDev source — public JSON API (no auth).

Transport chạy qua `RobustFetcher` (requests; 403/429 -> BrightData unlocker,
JSON mode coi rendered body như payload).
"""

from __future__ import annotations

from ..config import TOPDEV_REGION_IDS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import contains_city, normalize_city, parse_iso, parse_vn_date
from .base import BaseSource

API_BASE = "https://api.topdev.vn/td/v2"

JOB_FIELDS = (
    "id,title,salary,slug,company,expires,job_types_str,job_levels_str,addresses,detail_url,job_url,"
    "refreshed,contract_types_str,experiences_str,skills_arr,responsibilities_original,requirements_original"
)
COMPANY_FIELDS = "tagline,image_logo,image_cover,company_size"

JOB_TYPE_MAP = {
    "Fulltime": "full_time",
    "Part-time": "part_time",
    "Freelance": "contract",
    "Contract": "contract",
    "Internship": "internship",
}
CONTRACT_MAP = {
    "Fulltime": "full_time",
    "Part-time": "part_time",
    "Contract": "contract",
    "Internship": "internship",
    "Temporary": "contract",
}


class TopDevSource(BaseSource):
    name = "topdev"
    supports_location = True
    supports_level = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name, json_mode=True)

    def fetch(self, query: SearchQuery) -> list[Job]:
        city = normalize_city(query.location)
        jobs: list[Job] = []
        seen: set[str] = set()
        for page in range(1, query.pages + 1):
            params = {
                "keyword": query.query,
                "page": page,
                "page_size": 20,
                "fields[job]": JOB_FIELDS,
                "fields[company]": COMPANY_FIELDS,
            }
            if city and city in TOPDEV_REGION_IDS:
                params["region_ids"] = TOPDEV_REGION_IDS[city]
            # job_levels_ids supports a comma-separated list of the taxonomy ids
            # (1616/12507/1617 = intern/fresher/nha vien for entry targets).
            level_values = get_profile(self.name).level_filter_values(query.level)
            if level_values:
                params["job_levels_ids"] = ",".join(level_values)

            resp = self._robust.get(f"{API_BASE}/jobs/search/v2", params=params)
            data = resp.json()
            items = data.get("data") or []
            if not items:
                break
            for item in items:
                jid = str(item.get("id") or item.get("owned_id") or "")
                if not jid or jid in seen:
                    continue
                seen.add(jid)
                salary = item.get("salary") or {}
                company = item.get("company") or {}

                def _num(v):
                    if isinstance(v, (int, float)) and v > 0:
                        return int(v)
                    if isinstance(v, str) and v.replace(".", "", 1).isdigit():
                        return int(float(v))
                    return None

                def _num0(*vals):
                    n = _num(vals[0]) if vals else None
                    for v in vals[1:]:
                        n = n or _num(v)
                        if n:
                            break
                    return n if n else 0

                loc_text = None
                loc_list: list[str] = []
                addrs = item.get("addresses") or {}
                full = addrs.get("full_addresses") or []
                if full:
                    loc_list = list(dict.fromkeys(full))
                    loc_text = ", ".join(loc_list)
                elif addrs.get("address_region_list"):
                    loc_list = list(dict.fromkeys(addrs["address_region_list"]))
                    loc_text = ", ".join(loc_list)
                if city and loc_text and not contains_city(loc_text, city):
                    continue

                expires = item.get("expires") or {}
                refreshed = item.get("refreshed") or {}
                job = Job(
                    source=self.name,
                    source_job_id=jid,
                    title=item.get("title") or "",
                    company=(company.get("display_name") or ""),
                    url=item.get("detail_url") or item.get("job_url") or "",
                    location=loc_text,
                    locations=loc_list,
salary_min=_num0(
                        salary.get("min_filter"), salary.get("min"), salary.get("min_estimate")
                    ),
                    salary_max=_num0(
                        salary.get("max_filter"), salary.get("max"), salary.get("max_estimate")
                    ),
                    salary_currency=(salary.get("currency") or salary.get("currency_estimate") or "VND"),
                    salary_text=str(salary.get("value")) if salary.get("value") else None,
                    job_type=JOB_TYPE_MAP.get(item.get("job_types_str") or "") or CONTRACT_MAP.get(
                        item.get("contract_types_str") or ""
                    ),
                    level=item.get("job_levels_str"),
                    experience=item.get("experiences_str"),
                    posted_at=parse_iso(refreshed.get("datetime") or refreshed.get("date"))
                    or parse_vn_date(refreshed.get("since")),
                    expires_at=parse_iso(expires.get("datetime") or expires.get("date")),
                    skills=[
                        s
                        for s in ((item.get("skills_arr") or []) + (company.get("skills_arr") or []))
                        if isinstance(s, str)
                    ],
                    logo=company.get("image_logo") or company.get("image_cover"),
                    raw={"slug": item.get("slug"), "company_size": company.get("company_size")},
                )
                jobs.append(job)
            meta = data.get("meta") or {}
            if page >= (meta.get("last_page") or 1):
                break
        return self.finish(query, jobs, city)
