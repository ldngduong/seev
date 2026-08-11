"""VietnamWorks source — public no-auth REST API.

Transport chạy qua `RobustFetcher` requests thuần (`json_mode=True`), 0 credit Firecrawl.
"""

from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

from ..config import VIETNAMWORKS_CITY_IDS
from ..models import Job, SearchQuery
from ..source_profiles import get_profile
from ..transport import RobustFetcher
from ..utils import contains_city, parse_iso
from .base import BaseSource

API_URL = "https://ms.vietnamworks.com/job-search/v1.0/search"

TYPE_MAP = {1: "full_time", 2: "part_time", 3: "contract", 4: "internship"}


class VietnamWorksSource(BaseSource):
    name = "vietnamworks"
    supports_location = True
    supports_level = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._robust = RobustFetcher(self.name, json_mode=True)

    def fetch(self, query: SearchQuery) -> list[Job]:
        city = query.location
        city_key = None
        if city:
            from ..utils import normalize_city

            city_key = normalize_city(city)

        jobs: list[Job] = []
        seen: set[str] = set()
        city_code = VIETNAMWORKS_CITY_IDS.get(city_key) if city_key else None
        native_parent_id = query.source_category_filters.get(self.name, {}).get(
            "parent_id"
        )
        native_child_id = None
        if query.crawl_url:
            params = parse_qs(urlsplit(query.crawl_url).query)
            native_parent_id = (params.get("g") or [None])[0]
            native_child_id = (params.get("j") or [None])[0]
            if not native_parent_id or not native_child_id:
                raise ValueError(
                    f"invalid VietnamWorks fixed category URL: {query.crawl_url}"
                )
        # jobLevelId accepts one value per request, so entry targets fan out
        # over their pool (8=thực tập sinh, 1=mới tốt nghiệp, 5=Nhân viên) and
        # results are merged; the post-crawl policy does the precise cut.
        level_values = get_profile(self.name).level_filter_values(query.level)
        for lid in level_values or [None]:
            for page in range(0, query.pages):
                payload: dict = {
                    "userId": 0,
                    "query": query.query,
                    "filter": [],
                    "ranges": [],
                    "order": [],
                    "hitsPerPage": query.max_results_per_source,
                    "page": page,
                    "retrieveFields": [
                        "address", "benefits", "jobTitle", "salaryMax", "isSalaryVisible",
                        "jobLevelVI", "isShowLogo", "salaryMin", "companyLogo", "userId",
                        "jobLevel", "jobLevelId", "jobId", "jobUrl", "companyId", "approvedOn",
                        "isAnonymous", "alias", "expiredOn", "industries", "industriesV3",
                        "workingLocations", "services", "companyName", "salary", "onlineOn",
                        "onlineOnText", "simpleServices", "visibilityDisplay", "isShowLogoInSearch",
                        "priorityOrder", "skills", "profilePublishedSiteMask", "jobDescription",
                        "jobRequirement", "prettySalary", "requiredCoverLetter",
                        "employerBenefits", "workingTime", "jobDescriptionNew", "jobRequirementNew",
                        "typeWorkingId", "yearsOfExperience", "salaryCurrency", "createdOn",
                        "jobFunction",
                    ],
                }
                filters: list[dict] = []
                if city_code:
                    filters = [
                        {"field": "workingLocations.cityId", "value": str(city_code)},
                        {"field": "workingLocations.districtId", "value": f'[{{"cityId":{city_code},"districtId":[-1]}}]'},
                    ]
                if native_parent_id and native_child_id:
                    import json

                    filters.append(
                        {
                            "field": "jobFunction",
                            "value": json.dumps(
                                [
                                    {
                                        "parentId": int(native_parent_id),
                                        "childrenIds": [int(native_child_id)],
                                    }
                                ],
                                separators=(",", ":"),
                            ),
                        }
                    )
                if lid:
                    filters.append({"field": "jobLevelId", "value": str(lid)})
                payload["filter"] = filters

                resp = self._robust.post(API_URL, json=payload)
                data = resp.json()
                items = data.get("data") or []
                if not items:
                    break
                for item in items:
                    jf = item.get("jobFunction") or {}
                    if native_parent_id and str(jf.get("parentId")) != str(
                        native_parent_id
                    ):
                        continue
                    child_ids = {
                        str(child.get("id")) for child in (jf.get("children") or [])
                    }
                    if native_child_id and str(native_child_id) not in child_ids:
                        continue
                    jid = str(item.get("jobId") or "")
                    if not jid or jid in seen:
                        continue
                    seen.add(jid)
                    loc_parts = []
                    for wl in item.get("workingLocations") or []:
                        name = wl.get("cityNameVI") or wl.get("cityName")
                        addr = wl.get("address")
                        part = (addr + (", " + name if name else "")) if addr else (name or "")
                        if part:
                            loc_parts.append(part)
                    loc_text = "; ".join(dict.fromkeys(loc_parts)) or None
                    loc_list = list(dict.fromkeys(loc_parts))
                    if city and not contains_city(loc_text or "", city_key):
                        continue

                    years = item.get("yearsOfExperience")
                    exp = None
                    if isinstance(years, (int, float)) and years > 0:
                        exp = f"{int(years)} năm"

                    # Native jobFunction is classification evidence only. Its
                    # ids/names are never used as canonical Seev ids.
                    category_id = category_name = None
                    parent_name = jf.get("parentNameVI") or jf.get("parentName") or ""
                    child_name = (jf.get("children") or [{}])[0].get("nameVI") or \
                        (jf.get("children") or [{}])[0].get("name") or ""
                    from ..category import resolve_category

                    if (
                        query.crawl_url
                        and query.category_id
                        and len(query.candidate_category_ids) <= 1
                    ):
                        from ..category import CATEGORY_NAMES

                        category_id = query.category_id
                        category_name = CATEGORY_NAMES.get(category_id)
                    else:
                        category_id, category_name = resolve_category(
                            " ".join([item.get("jobTitle") or "", parent_name, child_name]),
                            query.category_id,
                        )

                    job = Job(
                        source=self.name,
                        source_job_id=jid,
                        title=item.get("jobTitle") or "",
                        company=item.get("companyName"),
                        url=item.get("jobUrl") or f"https://www.vietnamworks.com/job/{jid}",
                        location=loc_text,
                        locations=loc_list,
                        salary_min=item.get("salaryMin") if item.get("isSalaryVisible") else None,
                        salary_max=item.get("salaryMax") if item.get("isSalaryVisible") else None,
                        salary_currency=item.get("salaryCurrency") or "VND",
                        salary_text=item.get("prettySalary"),
                        job_type=TYPE_MAP.get(item.get("typeWorkingId")),
                        source_seniority_key=str(item.get("jobLevelId") or "") or None,
                        experience=exp,
                        source_seniority_text=item.get("jobLevelVI") or item.get("jobLevel") or None,
                        posted_at=parse_iso(item.get("approvedOn") or item.get("createdOn")),
                        expires_at=parse_iso(item.get("expiredOn")),
                        skills=[s.get("skillName") for s in (item.get("skills") or []) if s.get("skillName")],
                        logo=item.get("companyLogo"),
                        category_id=category_id,
                        category_name=category_name,
                        raw={
                            "companyId": item.get("companyId"),
                            "jobLevelId": item.get("jobLevelId"),
                            "jobFunction": jf,
                            "deadline_source": "vietnamworks_api",
                            "seniority_source": "vietnamworks_api",
                        },
                    )
                    jobs.append(job)
                total_pages = int((data.get("meta") or {}).get("nbPages") or 0)
                if page + 1 >= total_pages:
                    break
        return self.finish(query, jobs, city_key)
