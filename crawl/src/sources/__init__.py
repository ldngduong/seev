"""Source registry & factory."""

from __future__ import annotations

from ..config import DISABLED_SOURCES
from ..http import HttpFetcher
from .base import BaseSource
from .careerviet import CareerVietSource
from .indeed import IndeedSource
from .itviec import ITViecSource
from .jobsgo import JobsGoSource
from .topcv import TopCVSource
from .topdev import TopDevSource
from .viecoi import ViecOiSource
from .vietnamworks import VietnamWorksSource

_ALL_SOURCES: list[type[BaseSource]] = [
    VietnamWorksSource,
    TopDevSource,
    ITViecSource,
    TopCVSource,
    IndeedSource,
    JobsGoSource,
    ViecOiSource,
    CareerVietSource,
]

NAME_TO_CLASS = {cls.name: cls for cls in _ALL_SOURCES}


def available_sources() -> list[str]:
    return [cls.name for cls in _ALL_SOURCES if cls.name not in DISABLED_SOURCES]


def build_source(name: str, fetcher: HttpFetcher) -> BaseSource:
    cls = NAME_TO_CLASS[name]
    src = cls()
    src._fetcher = fetcher  # noqa: SLF001
    return src


def enabled_source_names() -> list[str]:
    return [cls.name for cls in _ALL_SOURCES if cls.name not in DISABLED_SOURCES]
