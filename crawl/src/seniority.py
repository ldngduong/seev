"""Canonical seniority / experience handling shared by every source.

Each source feeds raw text raw (title, seniority text, experience label, API
level id/string) into these helpers; the outputs are normalized to the
canonical `Level` enum plus numeric experience years so the BE scoring and the
post-crawl level policy can reason consistently.

Detection order matters: more specific groups (leadership, senior) are checked
before broad ones (junior, intern) so a title like "Lead Senior Engineer"
resolves to `lead` rather than `senior`.
"""

from __future__ import annotations

import re

from .models import Level

_LEVEL_ORDER: dict[Level, int] = {
    Level.INTERN: 0,
    Level.FRESHER: 1,
    Level.JUNIOR: 2,
    Level.MIDDLE: 3,
    Level.SENIOR: 4,
    Level.STAFF: 5,
    Level.PRINCIPAL: 6,
    Level.TECH_LEAD: 5,
    Level.MANAGER: 5,
    Level.HEAD_DIRECTOR: 7,
}

# Most-specific first per level group (checks in this order).
_LEVEL_ALIASES: dict[Level, tuple[str, ...]] = {
    Level.HEAD_DIRECTOR: ("giám đốc", "giam doc", "director", "head of", "vp "),
    Level.MANAGER: (
        "trưởng phòng",
        "truong phong",
        "quản lý",
        "quan ly",
        "manager",
    ),
    Level.TECH_LEAD: (
        "tech lead",
        "team lead",
        "lead",
        "leader",
        "trưởng nhóm",
        "truong nhom",
    ),
    Level.PRINCIPAL: ("principal", "principal engineer", "principal developer", "principal scientist"),
    Level.STAFF: ("staff", "staff engineer", "staff developer", "staff scientist"),
    Level.SENIOR: (
        "senior",
        "sr.",
        " sr ",
        "sr ",
        "cao cấp",
        "cao cap",
        "cấp cao",
        "cap cao",
        "experienced",
        "chuyên gia",
        "chuyen gia",
    ),
    Level.MIDDLE: (
        "middle",
        "mid level",
        "mid-",
        "trung cấp",
        "trung cap",
        "chuyên viên",
        "chuyen vien",
    ),
    Level.JUNIOR: (
        "junior",
        "jr.",
        " jr ",
        "entry level",
        "entry-level",
        # NOTE: "nhân viên" (staff/employee) is deliberately NOT evidence here —
        # VN boards label nearly every individual-contributor posting that way,
        # so using it as a junior signal would drop all entry jobs.
    ),
    Level.FRESHER: (
        "fresher",
        "mới tốt nghiệp",
        "moi tot nghiep",
        "new graduate",
        "graduate",
    ),
    Level.INTERN: (
        "thực tập sinh",
        "thuc tap sinh",
        "thực tập",
        "thuc tap",
        "internship",
        "intern",
        "trainee",
    ),
}

# Compact phrase "boundaries" so short tokens don't false-positive inside words.
_RE_STRIP = re.compile(r"[^a-z0-9]+")


def _norm(value: str | None) -> str:
    return _RE_STRIP.sub(" ", (value or "").lower())


def _has(normalized: str, phrase: str) -> bool:
    if not phrase:
        return False
    target = " ".join(_RE_STRIP.sub(" ", phrase.lower()).split())
    if not target:
        return False
    return re.search(rf"(^| ){re.escape(target)}( |$)", normalized) is not None


def detect_level(
    title: str | None = None,
    *,
    seniority_text: str | None = None,
    level_raw: str | None = None,
    body_text: str | None = None,
    exclude_body: bool = False,
) -> Level | None:
    """Resolve the most senior group found in the provided signals."""
    for group in (
        Level.HEAD_DIRECTOR,
        Level.MANAGER,
        Level.TECH_LEAD,
        Level.PRINCIPAL,
        Level.STAFF,
        Level.SENIOR,
        Level.MIDDLE,
        Level.JUNIOR,
        Level.FRESHER,
        Level.INTERN,
    ):
        aliases = _LEVEL_ALIASES[group]
        norm_title = _norm(title)
        if any(_has(norm_title, a) for a in aliases):
            return group
        seniority = seniority_text or level_raw
        norm_extra = _norm(seniority)
        if any(_has(norm_extra, a) for a in aliases):
            return group
        if not exclude_body and body_text:
            norm_body = _norm(body_text)
            if any(_has(norm_body, a) for a in aliases):
                return group
    return None


def detect_level_from_text(value: str | None) -> Level | None:
    return detect_level(value)


# ---------------------------------------------------------------------------
# Experience parsing (Vietnamese + English)
# ---------------------------------------------------------------------------

_EXP_PATTERNS: list[re.Pattern] = [
    # "Từ 2 đến 4 năm", "2 đến 4 năm", "2 - 4 năm", "2-4 năm", "1 tới 3 năm"
    re.compile(
        r"(?<![\d.])(?:từ|tu|between)?\s*(\d{1,2})\s*(?:-|–|to|den|toi|đến|tới)\s*(\d{1,2})(?![\d.])\s*(?:năm|nam|years?|yrs?|yr)\b",
        re.I,
    ),
    # plain "3 năm kinh nghiệm", "3 years experience"
    re.compile(r"(?<![\d.])(\d{1,2}(?:[.,]\d+)?)(?![\d.])\s*(?:năm|nam|years?|yrs?|yr)\b", re.I),
    # "(X-Y)" ranges written like "2 - 3", "1 to 2"
    re.compile(r"(?<![\d.])(?:(\d{1,2})\s*(?:-|–|to|đến|tới)\s*(\d{1,2}))(?![\d.])\s*(?:năm|nam|years?|yrs?|yr)?\b", re.I),
]

_MONTHS = re.compile(r"(?<!\d)(\d{1,3})(?!\d)\s*(?:tháng|thang|months?|mos?)\b", re.I)
_YEARS_AND_MONTHS = re.compile(
    r"(?<!\d)(\d{1,2})\s*(?:năm|nam|years?|yrs?|yr)\s*(\d{1,2})\s*(?:tháng|thang|months?|mos?)\b",
    re.I,
)

_DUOI_1 = re.compile(r"(?:dưới|duoi|less than|under)\s*(\d{1,2})\s*(?:năm|nam|years?|yrs?|yr)\b", re.I)
_TREN_ = re.compile(r"(?:trên|tren|over|more than|\+)\s*(\d{1,2})\s*(?:năm|nam|years?|yrs?|yr)\b", re.I)
_PLUS_N_ = re.compile(r"(\d{1,2})\+\s*(?:năm|nam|years?|yrs?|yr)\b", re.I)
_TOI_THIEU = re.compile(r"(?:tối thiểu|toi thieu|tối đa|toi da|at least|max|up to|tối đa)\s*(\d{1,2})\s*(?:năm|nam|years?|yrs?|yr)\b", re.I)


def parse_experience_years(text: str | None) -> tuple[float | None, float | None]:
    """Parse a Vietnamese/English experience label into (min_years, max_years).

    Examples:
      "Dưới 1 năm"      -> (0, 1)
      "1 năm"           -> (1, 1)
      "2 - 3 năm"       -> (2, 3)
      "Trên 5 năm"      -> (5, 99)
      "Không yêu cầu"   -> (0, 0)
      "3 years"         -> (3, 3)
      None/"Cạnh tranh" -> (None, None)
    """
    if not text:
        return None, None
    t = text.strip()
    low = t.lower()
    if any(k in low for k in ("không yêu cầu", "khong yeu cau", "no experience", "none", "0 năm")):
        return 0.0, 0.0

    combined = _YEARS_AND_MONTHS.search(low)
    if combined:
        years = float(combined.group(1)) + float(combined.group(2)) / 12
        return years, years

    months = _MONTHS.search(low)
    if months:
        years = float(months.group(1)) / 12
        return years, years

    m = _DUOI_1.search(low)
    if m:
        return 0.0, float(m.group(1))
    m = _TREN_.search(low)
    if m:
        return float(m.group(1)), 99.0
    m = _PLUS_N_.search(low)
    if m:
        return float(m.group(1)), 99.0
    m = _TOI_THIEU.search(low)
    if m and "tối đa" not in low:
        return float(m.group(1)), 99.0
    if "tối đa" in low:
        m = _TOI_THIEU.search(low)
        if m:
            return 0.0, float(m.group(1))

    # range pattern first (most specific)
    for pattern in (_EXP_PATTERNS[0], _EXP_PATTERNS[2]):
        m = pattern.search(low)
        if m and m.groups()[0] and m.groups()[1]:
            lo, hi = float(m.group(1)), float(m.group(2))
            if lo <= hi:
                return lo, hi
    m = _EXP_PATTERNS[1].search(low)
    if m:
        v = float(m.group(1).replace(",", "."))
        return v, v
    return None, None


def normalize_experience_text(text: str | None) -> str | None:
    """Return a terse, stable experience label for display / DB text field."""
    lo, hi = parse_experience_years(text)
    if lo is None:
        return (text or "").strip()[:80] or None
    if hi == 99.0:
        return f"Trên {int(lo)} năm" if lo else text
    if lo == 0:
        return f"Dưới {int(hi)} năm"
    if abs(lo - hi) < 0.01:
        if not float(lo).is_integer():
            total_months = round(lo * 12)
            years, months = divmod(total_months, 12)
            if years and months:
                return f"{years} năm {months} tháng"
            if months:
                return f"{months} tháng"
            return f"{years} năm"
        return f"{int(lo)} năm" if lo > 0 else "Không yêu cầu"
    return f"{int(lo)} - {int(hi)} năm"


def level_rank(level: Level | None) -> int | None:
    if level is None:
        return None
    return _LEVEL_ORDER.get(level)


def level_is_at_most(candidate: Level | None, upper: Level | None) -> bool:
    """True when candidate seniority is at or below `upper` (None upper = pass)."""
    if candidate is None or upper is None:
        return True
    cr, ur = _LEVEL_ORDER.get(candidate), _LEVEL_ORDER.get(upper)
    if cr is None or ur is None:
        return True
    return cr <= ur


# Max years that "no explicit level evidence" jobs may demand for a given target
# group before we drop them in the post-crawl policy.
MAX_YEARS_BY_TARGET: dict[Level, float] = {
    Level.INTERN: 2.0,
    Level.FRESHER: 2.0,
    Level.JUNIOR: 3.0,
    Level.MIDDLE: 5.0,
    Level.SENIOR: 99.0,
    Level.STAFF: 99.0,
    Level.PRINCIPAL: 99.0,
    Level.TECH_LEAD: 99.0,
    Level.MANAGER: 99.0,
    Level.HEAD_DIRECTOR: 99.0,
}


# Highest detected level group a job may claim for a given target CV level.
# Entry targets (intern/fresher/junior) also accept junior postings — VN boards
# label most entry jobs "Nhân viên" (now neutral) and "Junior", which interns
# realistically target; only middle+ is clearly out of reach.
_ALLOWED_DETECTED_RANK: dict[Level, int] = {
    Level.INTERN: _LEVEL_ORDER[Level.JUNIOR],
    Level.FRESHER: _LEVEL_ORDER[Level.JUNIOR],
    Level.JUNIOR: _LEVEL_ORDER[Level.JUNIOR],
    Level.MIDDLE: _LEVEL_ORDER[Level.MIDDLE],
    Level.SENIOR: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
    Level.STAFF: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
    Level.PRINCIPAL: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
    Level.TECH_LEAD: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
    Level.MANAGER: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
    Level.HEAD_DIRECTOR: _LEVEL_ORDER[Level.HEAD_DIRECTOR],
}


def allowed_by_level_policy(
    target: Level,
    detected: Level | None,
    exp_min: float | None,
    exp_max: float | None,
    *,
    max_years: float | None = None,
) -> bool:
    """Apply the per-source level policy for a job seeker of `target` level.

    - Detected level evidence must be within the target's reach (an intern CV
      does not match `middle`/`senior` postings, but junior postings are fine).
    - When there is no level evidence we fall back to the experience range and
      require it to be within `max_years` (default -> MAX_YEARS_BY_TARGET).
    """
    if detected is not None:
        allowed = _ALLOWED_DETECTED_RANK.get(target, _LEVEL_ORDER[Level.HEAD_DIRECTOR])
        if level_rank(detected) is not None and level_rank(detected) > allowed:
            return False
    if exp_min is None and exp_max is None:
        return True
    cap = max_years if max_years is not None else MAX_YEARS_BY_TARGET.get(target, 99.0)
    effective_min = exp_min if exp_min is not None else (exp_max or 0.0)
    return effective_min < cap
