"""Per-source configuration: level maps, keyword policy, job-type maps.

Every source declares how it expresses seniority (API ids, labels like
"Nhân viên", free text) and how strict the level policy is, so the crawler
produces the same canonical `level` and numeric `experience_min/max` for the
BE scoring regardless of the site's own vocabulary.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .models import Job, Level, SeniorityMatch
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
    "giám đốc": "head_director",
    "giam doc": "head_director",
    "trưởng phòng": "manager",
    "truong phong": "manager",
    "quản lý": "manager",
    "quan ly": "manager",
    "quản lý dự án": "manager",
    "trưởng nhóm": "tech_lead",
    "truong nhom": "tech_lead",
    "team lead": "tech_lead",
    "tech lead": "tech_lead",
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
    # UI/API taxonomy, e.g. VietnamWorks jobLevelId,
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
    # Some boards publish a coarse/default experience value in JSON-LD. Keep
    # that value for display/scoring, but do not let it manufacture seniority.
    allow_experience_seniority: bool = True

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
        for raw in (job.source_seniority_text, job.source_seniority_key):
            if raw:
                key = raw.strip().lower()
                canonical = self.raw_level_map.get(key)
                if canonical:
                    return Level(canonical)
        return detect_level(
            job.title,
            seniority_text=job.source_seniority_text,
            level_raw=job.source_seniority_key,
            body_text=job.description if self.detect_from_body else None,
        )

    def normalize(self, job: Job) -> Level | None:
        """Fill canonical level, experience years and stable labels in place."""
        parsed_min, parsed_max = parse_experience_years(job.experience)
        if job.experience_min is None:
            job.experience_min = parsed_min
        if job.experience_max is None:
            job.experience_max = parsed_max
        label = normalize_experience_text(job.experience)
        if label:
            job.experience = label
        detected = self.detect(job)
        if not job.seniority_matches:
            job.seniority_matches = self._map_seniority(job, detected)
        return detected

    def _map_seniority(self, job: Job, detected: Level | None) -> list[SeniorityMatch]:
        """Map one or more canonical levels without pretending broad native buckets are exact."""
        import re

        title = job.title.lower()
        explicit_patterns = [
            ("head_director", r"\b(director|head of|vp|cto|cio)\b|giám đốc"),
            ("manager", r"\b(engineering manager|development manager|project manager)\b|trưởng phòng|quản lý"),
            ("tech_lead", r"\b(tech(?:nical)? lead|team lead|lead developer|lead engineer)\b|trưởng nhóm"),
            ("principal", r"\bprincipal\b"),
            ("staff", r"\bstaff (?:engineer|developer)\b"),
            ("senior", r"\b(?:senior|sr\.?)(?:\b|_)|cao cấp"),
            ("middle", r"\b(?:middle|mid[- ]?level|mid)\b"),
            ("junior", r"\b(?:junior|jr\.?)\b"),
            ("fresher", r"\b(?:fresher|graduate)\b|mới tốt nghiệp"),
            ("intern", r"\b(?:intern|internship)\b|thực tập"),
        ]
        explicit = [code for code, pattern in explicit_patterns if re.search(pattern, title)]
        if explicit:
            return [
                SeniorityMatch(
                    code=code,
                    mapping_method="title_explicit",
                    confidence=0.99,
                    evidence={"title": job.title, "matched_codes": explicit},
                    is_primary=index == 0,
                )
                for index, code in enumerate(explicit)
            ]

        # Only precise native labels may decide a level. Broad labels such as
        # TopCV/VietnamWorks "Nhân viên" are intentionally absent from maps.
        if detected:
            return [SeniorityMatch(
                code=detected.value,
                mapping_method="native_exact",
                confidence=0.98,
                evidence={
                    "source_key": job.source_seniority_key,
                    "source_text": job.source_seniority_text,
                },
                is_primary=True,
            )]

        if not self.allow_experience_seniority:
            return []
        years = job.experience_min
        if years is None:
            return []
        if years < 1:
            candidates = ["fresher", "junior"]
        elif years < 2:
            candidates = ["junior"]
        elif years < 4:
            candidates = ["junior", "middle"]
        elif years < 6:
            candidates = ["middle", "senior"]
        else:
            candidates = ["senior"]
        return [SeniorityMatch(
            code=code,
            mapping_method="experience_range",
            confidence=0.9,
            evidence={"experience_min": job.experience_min, "experience_max": job.experience_max},
            is_primary=index == len(candidates) - 1,
        ) for index, code in enumerate(candidates)]

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
    allow_experience_seniority: bool = True,
) -> SourceProfile:
    return SourceProfile(
        name=name,
        supports_level=supports_level,
        level_filter_ids=level_filter_ids or {},
        raw_level_map={**VN_LEVEL_LABELS, **(extra_level_map or {})},
        job_type_map=job_type_map or VN_JOB_TYPES,
        max_years_by_target=max_years_by_target or {},
        detect_from_body=detect_from_body,
        allow_experience_seniority=allow_experience_seniority,
    )


PROFILES: dict[str, SourceProfile] = {
    # Source-side level filters, verified against each site's own UI/API:
    #   vietnamworks : jobLevelId (5=Nhân viên, every IC; 8/1/7/3 = intern/fresher/manager/director)
    #   itviec       : job_level_names[] (no "Middle" option: mid uses "Senior")
    #   topcv        : ?position= ("Cấp bậc" filter)
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
            "staff": ["1"],
            "principal": ["1"],
            "tech_lead": ["2"],
            "manager": ["3", "10"],
            "head_director": ["30", "25"],
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
            "staff": ["5"],
            "principal": ["5"],
            "tech_lead": ["5"],
            "manager": ["7"],
            "head_director": ["3"],
        },
        extra_level_map={
            # jobLevelId values give direct evidence for these buckets; id 5
            # (Nhân viên) is intentionally absent (no level signal on its own).
            "8": "intern",
            "1": "fresher",
            "7": "manager",
            "3": "head_director",
            # jobLevelVI labels
            "thực tập sinh": "intern",
            "chuyên viên": "middle",
            "chuyên gia": "senior",
            "quản lý": "manager",
            "trưởng phòng": "manager",
            "giám đốc": "head_director",
        },
    ),
    "itviec": _vn_profile(
        "itviec",
        supports_level=True,
        # job_level_names[] from the site's "Job level" filter. ITViec has no
        # "Middle" option: mid-level postings are published under "Senior".
        level_filter_ids={
            "intern": ["Internship"],
            "fresher": ["Fresher"],
            "junior": ["Junior"],
            "middle": ["Senior"],
            "senior": ["Senior"],
            "staff": ["Senior"],
            "principal": ["Senior"],
            "tech_lead": ["Manager"],
            "manager": ["Manager"],
            "head_director": ["Manager"],
        },
        # Live verification found unrelated postings all reporting 10 months
        # in JSON-LD. Preserve it as source data, never as level evidence.
        allow_experience_seniority=False,
    ),
}


def get_profile(name: str) -> SourceProfile:
    return PROFILES.get(name) or SourceProfile(name=name)
