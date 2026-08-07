"""Per-source configuration: level maps, keyword policy, job-type maps.

Every source declares how it expresses seniority (API ids, labels like
"Nhân viên", free text) and how strict the level policy is, so the crawler
produces the same canonical `level` and numeric `experience_min/max` for the
BE scoring regardless of the site's own vocabulary.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .models import Job, Level, SearchQuery
from .seniority import (
    allowed_by_level_policy,
    detect_level,
    normalize_experience_text,
    parse_experience_years,
)

# Common Vietnamese seniority labels -> canonical level. Sites may reuse it via
# `vn_label_map` or declare their own `raw_level_map`.
#
# NOTE: "nhân viên" (staff/employee) is intentionally NOT mapped: VN boards
# label almost every individual-contributor posting that way, so treating it as
# a junior signal would drop all entry jobs. Experience caps handle filtering.
VN_LEVEL_LABELS: dict[str, str] = {
    "giám đốc": "director",
    "giam doc": "director",
    "trưởng phòng": "manager",
    "truong phong": "manager",
    "quản lý": "manager",
    "quan ly": "manager",
    "quản lý dự án": "manager",
    "trưởng nhóm": "lead",
    "truong nhom": "lead",
    "team lead": "lead",
    "tech lead": "lead",
    "chuyên gia": "senior",
    "chuyen gia": "senior",
    "cao cấp": "senior",
    "cao cap": "senior",
    "chuyên viên": "middle",
    "chuyen vien": "middle",
    "thực tập sinh": "intern",
    "thuc tap sinh": "intern",
    "thực tập": "intern",
    "thuc tap": "intern",
    "internship": "intern",
    "intern": "intern",
}

VN_JOB_TYPES: dict[str, str] = {
    "toàn thời gian": "full_time",
    "toan thoi gian": "full_time",
    "full time": "full_time",
    "full-time": "full_time",
    "bán thời gian": "part_time",
    "ban thoi gian": "part_time",
    "part time": "part_time",
    "part-time": "part_time",
    "thực tập": "internship",
    "thuc tap": "internship",
    "internship": "internship",
    "hợp đồng": "contract",
    "hop dong": "contract",
    "contract": "contract",
    "tạm thời": "contract",
    "tam thoi": "contract",
    "temporary": "contract",
    "freelance": "contract",
    "làm việc từ xa": "remote",
    "lam viec tu xa": "remote",
    "remote": "remote",
}


# Entry targets pull the whole entry pool: VN boards classify entry jobs
# loosely (a "Nhân viên" posting is usually Junior/Fresher work), so we send
# every entry-level id and let the post-crawl policy pick precisely.
_ENTRY_LEVELS = (Level.INTERN, Level.FRESHER, Level.JUNIOR)


@dataclass
class SourceProfile:
    name: str
    supports_level: bool = False
    # canonical Level.value -> source-side filter values (from the site's own
    # UI/API taxonomy, e.g. VietnamWorks jobLevelId, TopDev job_levels_ids,
    # ITViec job_level_names[], TopCV ?position=).
    level_filter_ids: dict[str, list[str]] = field(default_factory=dict)
    # raw source level label/id (lowercased) -> canonical Level.value
    raw_level_map: dict[str, str] = field(default_factory=dict)
    # display text -> canonical job_type
    job_type_map: dict[str, str] = field(default_factory=dict)
    # canonical Level.value -> max experience years when level is not detected
    max_years_by_target: dict[str, float] = field(default_factory=dict)
    # consider the job body when detecting level (off by default: body text is
    # noisy, e.g. "hỗ trợ nhân viên" inside job).
    detect_from_body: bool = False

    # ------------------------------------------------------------ level query
    def level_filter_values(self, level: Level | None) -> list[str]:
        """Source-side filter values to send for `level` ([] = no filter).

        Entry targets expand to the union of intern+fresher+junior values so
        sources that classify entry postings thinly still surface them; the
        post-crawl policy in `finish()` does the precise cut.
        """
        if level is None:
            return []
        if level in _ENTRY_LEVELS:
            pool: list[str] = []
            for lv in _ENTRY_LEVELS:
                for v in self.level_filter_ids.get(lv.value, []):
                    if v not in pool:
                        pool.append(v)
            return pool
        return list(self.level_filter_ids.get(level.value, []))

    # ------------------------------------------------------------------ level
    def detect(self, job: Job) -> Optional[Level]:
        for raw in (job.seniority_text, job.level):
            if raw:
                key = raw.strip().lower()
                canonical = self.raw_level_map.get(key)
                if canonical:
                    return Level(canonical)
        return detect_level(
            job.title,
            seniority_text=job.seniority_text,
            level_raw=job.level,
            body_text=job.description if self.detect_from_body else None,
        )

    def normalize(self, job: Job) -> Level | None:
        """Fill canonical level, experience years and stable labels in place."""
        job.experience_min, job.experience_max = parse_experience_years(job.experience)
        label = normalize_experience_text(job.experience)
        if label:
            job.experience = label
        detected = self.detect(job)
        if detected:
            job.level = detected.value
        return detected

    def accepts(self, target: Level, job: Job) -> bool:
        detected = self.detect(job)
        cap = self.max_years_by_target.get(target.value)
        if job.experience_min is None and job.experience_max is None:
            exp_min, exp_max = parse_experience_years(job.experience)
        else:
            exp_min, exp_max = job.experience_min, job.experience_max
        return allowed_by_level_policy(
            target,
            detected,
            exp_min,
            exp_max,
            max_years=cap,
        )

    def map_job_type(self, raw: str | None) -> str | None:
        if not raw:
            return None
        key = raw.strip().lower()
        if key in self.job_type_map:
            return self.job_type_map[key]
        for label, canonical in self.job_type_map.items():
            if label in key:
                return canonical
        return None


def _vn_profile(
    name: str,
    *,
    supports_level: bool = False,
    level_filter_ids: dict[str, list[str]] | None = None,
    extra_level_map: dict[str, str] | None = None,
    job_type_map: dict[str, str] | None = None,
    max_years_by_target: dict[str, float] | None = None,
    detect_from_body: bool = False,
) -> SourceProfile:
    return SourceProfile(
        name=name,
        supports_level=supports_level,
        level_filter_ids=level_filter_ids or {},
        raw_level_map={**VN_LEVEL_LABELS, **(extra_level_map or {})},
        job_type_map=job_type_map or VN_JOB_TYPES,
        max_years_by_target=max_years_by_target or {},
        detect_from_body=detect_from_body,
    )


PROFILES: dict[str, SourceProfile] = {
    # Source-side level filters, verified against each site's own UI/API:
    #   vietnamworks : jobLevelId (5=Nhân viên, every IC; 8/1/7/3 = intern/fresher/manager/director)
    #   topdev       : job_levels_ids (ids from /td/v2/taxonomies?fields=job_levels)
    #   itviec       : job_level_names[] (no "Middle" option: mid uses "Senior")
    #   topcv        : ?position= ("Cấp bậc" filter)
    #   jobsgo/viecoi/indeed : no usable seniority filter on the search side ->
    #                          keyword stays clean and the post-crawl policy filters.
    "topcv": _vn_profile(
        "topcv",
        supports_level=True,
        # ?position= values from the site's own "Cấp bậc" filter:
        # 50=Thực tập sinh, 1=Nhân viên, 2=Trưởng nhóm, 3=Trưởng/Phó phòng,
        # 10=Quản lý/Giám sát, 25=Phó giám đốc, 30=Giám đốc
        level_filter_ids={
            "intern": ["50"],
            "fresher": ["1"],
            "junior": ["1"],
            "middle": ["1"],
            "senior": ["1"],
            "lead": ["2"],
            "manager": ["3", "10"],
            "director": ["30", "25"],
        },
    ),
    "vietnamworks": _vn_profile(
        "vietnamworks",
        supports_level=True,
        # jobLevelId verified against the live search API (id -> jobLevelVI):
        # 5=Nhân viên (every IC, incl. junior/mid/senior titles), 8=Thực tập
        # sinh/Sinh viên, 1=Mới Tốt Nghiệp, 7=Trưởng phòng, 3=Giám Đốc và Cấp
        # Cao Hơn. One jobLevelId value per request.
        level_filter_ids={
            "intern": ["8"],
            "fresher": ["1"],
            "junior": ["5"],
            "middle": ["5"],
            "senior": ["5"],
            "lead": ["5"],
            "manager": ["7"],
            "director": ["3"],
        },
        extra_level_map={
            # jobLevelId values give direct evidence for these buckets; id 5
            # (Nhân viên) is intentionally absent (no level signal on its own).
            "8": "intern",
            "1": "fresher",
            "7": "manager",
            "3": "director",
            # jobLevelVI labels
            "thực tập sinh": "intern",
            "chuyên viên": "middle",
            "chuyên gia": "senior",
            "quản lý": "manager",
            "trưởng phòng": "manager",
            "giám đốc": "director",
        },
    ),
    "topdev": _vn_profile(
        "topdev",
        supports_level=True,
        # ids from GET /td/v2/taxonomies?fields=job_levels (current taxonomy):
        # 1616=Thực tập(Intern), 12507=Mới tốt nghiệp(Fresher), 1617=Nhân viên(Junior),
        # 12506=Chuyên viên(Middle), 8665=Chuyên viên cấp cao(Senior),
        # 7276=Trưởng nhóm(Leader), 1620=Trưởng phòng(Manager), 11029=Giám đốc(Director)
        level_filter_ids={
            "intern": ["1616"],
            "fresher": ["12507"],
            "junior": ["1617"],
            "middle": ["12506"],
            "senior": ["8665"],
            "lead": ["7276"],
            "manager": ["1620"],
            "director": ["11029"],
        },
        extra_level_map={
            # job_levels_str labels from the live API ("Chuyên viên cấp cao"
            # for senior) — exact-match keys, checked before the title/alias
            # detection so senior postings don't degrade to middle.
            "chuyên viên cấp cao": "senior",
            "chuyên viên cao cấp": "senior",
            "phó giám đốc": "director",
            "phó trưởng nhóm": "lead",
            "phó phòng": "manager",
            "mới tốt nghiệp": "fresher",
            "intern": "intern",
            "internship": "intern",
            "fresher": "fresher",
            "junior": "junior",
            "jr": "junior",
            "middle": "middle",
            "mid": "middle",
            "senior": "senior",
            "sr": "senior",
            "lead": "lead",
            "leader": "lead",
            "manager": "manager",
            "director": "director",
        },
        job_type_map={
            "fulltime": "full_time",
            "full time": "full_time",
            "part-time": "part_time",
            "part time": "part_time",
            "freelance": "contract",
            "contract": "contract",
            "internship": "internship",
            "temporary": "contract",
        },
    ),
    "itviec": _vn_profile(        "itviec",
        supports_level=True,
        # job_level_names[] from the site's "Job level" filter. ITViec has no
        # "Middle" option: mid-level postings are published under "Senior".
        level_filter_ids={
            "intern": ["Internship"],
            "fresher": ["Fresher"],
            "junior": ["Junior"],
            "middle": ["Senior"],
            "senior": ["Senior"],
            "lead": ["Manager"],
            "manager": ["Manager"],
            "director": ["Manager"],
        },
    ),
    "jobsgo": _vn_profile(
        "jobsgo",
    ),
    "viecoi": _vn_profile(
        "viecoi",
    ),
    "careerviet": _vn_profile(
        "careerviet",
        extra_level_map={
            "intern": "intern",
            "internship": "intern",
            "thực tập sinh": "intern",
            "fresher": "fresher",
            "mới tốt nghiệp": "fresher",
            "junior": "junior",
            "jr": "junior",
            "middle": "middle",
            "mid": "middle",
            "senior": "senior",
            "sr": "senior",
            "lead": "lead",
            "leader": "lead",
            "manager": "manager",
            "director": "director",
        },
        job_type_map=VN_JOB_TYPES,
    ),
    "indeed": _vn_profile(
        "indeed",
        extra_level_map={
            "intern": "intern",
            "internship": "intern",
            "trainee": "intern",
            "fresher": "fresher",
            "junior": "junior",
            "jr": "junior",
            "middle": "middle",
            "mid": "middle",
            "senior": "senior",
            "sr": "senior",
            "lead": "lead",
            "leader": "lead",
            "manager": "manager",
            "director": "director",
        },
        job_type_map=VN_JOB_TYPES,
    ),
}


def get_profile(name: str) -> SourceProfile:
    return PROFILES.get(name) or SourceProfile(name=name)