"""Shared helpers: HTML cleaning, date parsing, location/level normalization."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from bs4 import BeautifulSoup

from .config import CITY_ALIASES


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def clean_html(html: str | None, max_len: int = 100_000) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()[:max_len]


def normalize_city(location: str | None) -> str | None:
    """Map a free-text location to a canonical city key (e.g. 'ho chi minh')."""
    if not location:
        return None
    low = unicodedata.normalize("NFC", location).lower().strip()
    for city, aliases in CITY_ALIASES.items():
        for alias in aliases:
            if alias in low:
                return city
    return None


def parse_salary_vnd(text: str | None) -> tuple[int | None, int | None, str | None]:
    """Best-effort parse of Vietnamese salary strings like '17 - 34 triệu', '1,000 - 1,500 USD'."""
    if not text:
        return None, None, None
    t = text.strip()
    mult = 1
    currency = "VND"
    if "triệu" in t or re.search(r"\btr\b", t.lower()):
        mult, currency = 1_000_000, "VND"
    elif "tỷ" in t:
        mult, currency = 1_000_000_000, "VND"
    elif "usd" in t.lower():
        mult, currency = 1, "USD"
    nums = []
    for token in re.findall(r"[\d.,]+", t):
        token = token.replace(",", "")
        try:
            nums.append(float(token))
        except ValueError:
            pass
    if not nums:
        return None, None, None
    lo = min(nums)
    hi = max(nums)
    return int(lo * mult), int(hi * mult), currency


def contains_city(text: str | None, city: str | None) -> bool:
    """Check whether a location text mentions a city (client-side filtering)."""
    if not city:
        return True
    if not text:
        return True
    for alias in CITY_ALIASES.get(city, []):
        if alias in unicodedata.normalize("NFC", text).lower():
            return True
    return False


LEVEL_KEYWORDS: list[tuple[str, list[str]]] = [
    ("head_director", ["giám đốc", "director", "head of"]),
    ("manager", ["manager", "quản lý", "trưởng phòng", "head of"]),
    ("tech_lead", ["tech lead", "team lead", "lead "]),
    ("principal", ["principal engineer", "principal developer"]),
    ("staff", ["staff engineer", "staff developer"]),
    ("senior", ["senior", "cao cấp", "sr."]),
    ("middle", ["middle", "mid", "trung cấp"]),
    ("junior", ["junior", "nhân viên", "jun."]),
    ("fresher", ["fresher", "mới tốt nghiệp", "new graduate"]),
    ("intern", ["intern", "thực tập", "internship"]),
]


def infer_level(title: str | None) -> str | None:
    if not title:
        return None
    low = title.lower()
    for level, kws in LEVEL_KEYWORDS:
        for kw in kws:
            if kw in low:
                return level
    return None


def parse_iso(s: str | None) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def parse_vn_date(s: str | None) -> Optional[datetime]:
    """Parse '31/08/2026', '04/08/2026', '14 ngày trước', '5 hours ago' etc."""
    if not s:
        return None
    t = s.strip()
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if m:
        d, mo, y = map(int, m.groups())
        try:
            return datetime(y, mo, d, tzinfo=timezone.utc)
        except ValueError:
            return None
    now = datetime.now(timezone.utc)
    m = re.match(r"(\d+)\s*(ngày|days?|hours?|giờ|tuần|weeks?|tháng|months?|minutes?|phút|năm|years?)\s*(trước|ago)?", t.lower())
    if m:
        n = int(m.group(1))
        unit = m.group(2)
        if unit.startswith("ngày") or unit.startswith("day"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(days=n)
        if unit.startswith("giờ") or unit.startswith("hour"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(hours=n)
        if unit.startswith("phút") or unit.startswith("minute"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(minutes=n)
        if unit.startswith("tuần") or unit.startswith("week"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(weeks=n)
        if unit.startswith("tháng") or unit.startswith("month"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(days=n * 30)
        if unit.startswith("năm") or unit.startswith("year"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(days=n * 365)
    m = re.match(r"(?:Posted|Đăng|Đã đăng|Updated|Cập nhật)\s*(\d+)\s*(ngày|giờ|phút|days?|hours?|minutes?|tuần|tháng)", t, re.I)
    if m:
        n = int(m.group(1))
        unit = m.group(2).lower()
        if unit.startswith(("ngày", "day")):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(days=n)
        if unit.startswith(("giờ", "hour")):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(hours=n)
        if unit.startswith(("phút", "minute")):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(minutes=n)
        if unit.startswith("tuần"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(weeks=n)
        if unit.startswith("tháng"):
            return now.replace(microsecond=0) - __import__("datetime").timedelta(days=n * 30)
    return None
