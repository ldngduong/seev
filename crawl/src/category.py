"""Canonical IT role taxonomy.

The ids below are internal Seev ids seeded by the backend migration. Native
job-board ids live in source_category_mappings and must never appear here.
"""

from __future__ import annotations

import re
import unicodedata


CATEGORY_UUID_BY_ORDINAL = {
    ordinal: f"10000000-0000-4000-8000-{ordinal:012d}"
    for ordinal in (
        1001, 1002, 1003, 1004, 1005, 1006, 1101, 1102, 1201, 1202,
        1203, 1204, 1301, 1302, 1303, 1304, 1401, 1501, 1502, 1601,
        1602, 1603, 1701, 1801,
    )
}

_CATEGORY_NAMES_BY_ORDINAL: dict[int, str] = {
    1001: "Backend Engineering",
    1002: "Frontend Engineering",
    1003: "Full-stack Engineering",
    1004: "Mobile Engineering",
    1005: "Desktop Application Development",
    1006: "Software & Solution Architecture",
    1101: "Manual QA / Software Testing",
    1102: "Automation QA / SDET",
    1201: "Data Analyst / Business Intelligence",
    1202: "Data Engineering",
    1203: "Data Science",
    1204: "AI / Machine Learning Engineering",
    1301: "DevOps / Cloud / SRE",
    1302: "System & Network Engineering",
    1303: "Database Administration",
    1304: "IT Support / Helpdesk",
    1401: "Cybersecurity",
    1501: "Embedded Systems / IoT",
    1502: "RPA / Software Automation",
    1601: "Business Analysis",
    1602: "Product Management",
    1603: "IT Project / Delivery / Scrum",
    1701: "UI / UX / Product Design",
    1801: "Game Development",
}
CATEGORY_NAMES = {
    CATEGORY_UUID_BY_ORDINAL[ordinal]: name
    for ordinal, name in _CATEGORY_NAMES_BY_ORDINAL.items()
}

_CATEGORY_ALIASES_BY_ORDINAL: dict[int, tuple[str, ...]] = {
    1001: ("backend developer", "backend engineer", "back end developer", "java developer", ".net developer", "php developer", "golang developer", "nodejs developer", "lập trình backend", "lập trình viên backend"),
    1002: ("frontend developer", "frontend engineer", "front end developer", "react developer", "vue developer", "angular developer", "lập trình frontend", "lập trình viên frontend"),
    1003: (
        "fullstack developer",
        "full stack developer",
        "full-stack developer",
        "fullstack engineer",
        "full stack software engineer",
    ),
    1004: ("mobile developer", "android developer", "ios developer", "flutter developer", "react native developer"),
    1005: ("desktop developer", "desktop application", "wpf developer", "windows developer"),
    1006: ("software architect", "solution architect", "solutions architect", "system architect"),
    1102: ("automation tester", "automation qa", "qa automation", "test automation", "sdet", "quality engineer", "kiểm thử tự động"),
    1101: ("manual tester", "manual qa", "software tester", "qa engineer", "quality assurance", "kiểm thử phần mềm", "nhân viên kiểm thử"),
    1201: ("data analyst", "business intelligence", "bi developer", "bi analyst", "analytics engineer", "phân tích dữ liệu", "chuyên viên dữ liệu"),
    1202: ("data engineer", "etl developer", "big data engineer", "data platform engineer", "kỹ sư dữ liệu"),
    1203: ("data scientist", "decision scientist", "applied scientist"),
    1204: ("machine learning engineer", "ml engineer", "ai engineer", "ai developer", "nlp engineer", "computer vision engineer"),
    1301: ("devops engineer", "cloud engineer", "site reliability engineer", "sre", "platform engineer", "cloud architect"),
    1302: ("network engineer", "system engineer", "system administrator", "sysadmin", "network administrator", "infrastructure engineer", "quản trị hệ thống", "quản trị mạng", "kỹ sư mạng"),
    1303: ("database administrator", "database engineer", "dba", "quản trị cơ sở dữ liệu"),
    1304: ("it support", "technical support", "helpdesk", "service desk", "desktop support", "hỗ trợ công nghệ thông tin", "nhân viên it"),
    1401: ("security engineer", "security analyst", "cybersecurity", "information security", "soc analyst", "penetration tester", "pentester"),
    1501: ("embedded engineer", "embedded developer", "firmware engineer", "iot engineer", "embedded systems"),
    1502: ("rpa developer", "rpa engineer", "software automation", "workflow automation"),
    1601: ("business analyst", "it business analyst", "system analyst", "product analyst", "phân tích nghiệp vụ", "chuyên viên ba"),
    1602: ("product manager", "product owner", "associate product manager", "quản lý sản phẩm số"),
    1603: ("it project manager", "technical project manager", "scrum master", "delivery manager", "program manager", "project coordinator", "quản lý dự án cntt", "quản lý dự án công nghệ thông tin"),
    1701: ("ui ux designer", "ui/ux designer", "product designer", "ux designer", "ui designer", "ux researcher", "interaction designer"),
    1801: ("game developer", "game programmer", "unity developer", "unreal developer"),
}
CATEGORY_ALIASES = {
    CATEGORY_UUID_BY_ORDINAL[ordinal]: aliases
    for ordinal, aliases in _CATEGORY_ALIASES_BY_ORDINAL.items()
}

_NON_ALNUM = re.compile(r"[^a-z0-9+#.]+")

# These titles are also common outside technology. TopCV has no single
# job-function filter for all IT roles, so they require an extra IT marker
# from the title or the source's industry/tag metadata.
_AMBIGUOUS_TOPCV_CATEGORIES = {
    CATEGORY_UUID_BY_ORDINAL[ordinal] for ordinal in (1101, 1601, 1602, 1603)
}
_IT_CONTEXT_MARKERS = (
    "it",
    "cntt",
    "công nghệ thông tin",
    "software",
    "phần mềm",
    "saas",
    "digital",
    "fintech",
    "technology",
    "tech",
    "system",
    "hệ thống",
    "web",
    "mobile",
    "platform",
    "cloud",
)


def _norm(value: str | None) -> str:
    ascii_value = unicodedata.normalize("NFD", (value or "").replace("đ", "d").replace("Đ", "D"))
    ascii_value = "".join(char for char in ascii_value if not unicodedata.combining(char))
    return " ".join(_NON_ALNUM.sub(" ", ascii_value.lower()).split())


def resolve_category(
    text: str,
    _requested_category_id: str | None = None,
) -> tuple[str | None, str | None]:
    """Classify only when the title/metadata contains explicit evidence.

    The requested category is deliberately not a fallback: a targeted search
    can still return unrelated jobs, which must remain unclassified.
    """
    normalized = _norm(text)
    matches: list[tuple[int, str]] = []
    for category_id, aliases in CATEGORY_ALIASES.items():
        best = max((len(_norm(alias)) for alias in aliases if _contains(normalized, alias)), default=0)
        if best:
            matches.append((best, category_id))
    if not matches:
        return None, None
    _, category_id = max(matches)
    return category_id, CATEGORY_NAMES[category_id]


def has_sufficient_it_evidence(
    source: str,
    category_id: str | None,
    text: str,
) -> bool:
    if category_id is None:
        return False
    if source != "topcv" or category_id not in _AMBIGUOUS_TOPCV_CATEGORIES:
        return True

    normalized = _norm(text)
    return any(_contains(normalized, marker) for marker in _IT_CONTEXT_MARKERS)


def _contains(normalized: str, alias: str) -> bool:
    target = _norm(alias)
    return re.search(rf"(^| ){re.escape(target)}( |$)", normalized) is not None
