"""Source registry & factory."""

from __future__ import annotations

from ..config import DISABLED_SOURCES
from .base import BaseSource
from .itviec import ITViecSource
from .topcv import TopCVSource
from .vietnamworks import VietnamWorksSource

_ALL_SOURCES: list[type[BaseSource]] = [
    VietnamWorksSource,
    ITViecSource,
    TopCVSource,
]

NAME_TO_CLASS = {cls.name: cls for cls in _ALL_SOURCES}


def available_sources() -> list[str]:
    return [cls.name for cls in _ALL_SOURCES if cls.name not in DISABLED_SOURCES]


def build_source(name: str) -> BaseSource:
    return NAME_TO_CLASS[name]()


def enabled_source_names() -> list[str]:
    return [cls.name for cls in _ALL_SOURCES if cls.name not in DISABLED_SOURCES]
