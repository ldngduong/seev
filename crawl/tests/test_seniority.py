"""Unit tests for seniority/experience normalization and the level policy."""

from __future__ import annotations

import pytest

from src.models import Level
from src.seniority import (
    allowed_by_level_policy,
    detect_level,
    level_is_at_most,
    normalize_experience_text,
    parse_experience_years,
)


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Dưới 1 năm", (0.0, 1.0)),
        ("Dưới 2 năm", (0.0, 2.0)),
        ("1 năm", (1.0, 1.0)),
        ("2 - 3 năm", (2.0, 3.0)),
        ("2-3 năm", (2.0, 3.0)),
        ("Từ 2 đến 4 năm", (2.0, 4.0)),
        ("Trên 5 năm", (5.0, 99.0)),
        ("3+ năm", (3.0, 99.0)),
        ("Không yêu cầu", (0.0, 0.0)),
        ("3 years", (3.0, 3.0)),
        ("2 năm kinh nghiệm", (2.0, 2.0)),
        ("10 tháng", (10 / 12, 10 / 12)),
        ("0.833333 năm", (0.833333, 0.833333)),
        ("3 năm 1 tháng", (3 + 1 / 12, 3 + 1 / 12)),
        ("Không yêu cầu kinh nghiệm", (0.0, 0.0)),
        (None, (None, None)),
        ("Cạnh tranh", (None, None)),
    ],
)
def test_parse_experience_years(text, expected):
    assert parse_experience_years(text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Dưới 1 năm", "Dưới 1 năm"),
        ("0 - 1 năm", "Dưới 1 năm"),
        ("2 năm", "2 năm"),
        ("Trên 5 năm", "Trên 5 năm"),
        ("2 - 3 năm", "2 - 3 năm"),
        ("10 tháng", "10 tháng"),
        ("0.833333 năm", "10 tháng"),
        ("3.083333 năm", "3 năm 1 tháng"),
        ("3 năm 1 tháng", "3 năm 1 tháng"),
        (None, None),
    ],
)
def test_normalize_experience_text(text, expected):
    assert normalize_experience_text(text) == expected


@pytest.mark.parametrize(
    "title,expected",
    [
        ("Thực tập sinh Frontend Developer", Level.INTERN),
        ("Frontend Developer Intern", Level.INTERN),
        ("Fresher Python Developer", Level.FRESHER),
        ("Chuyên viên Java", Level.MIDDLE),
        ("Senior Backend Engineer", Level.SENIOR),
        ("Staff Frontend Engineer", Level.STAFF),
        ("Principal Frontend Engineer", Level.PRINCIPAL),
        ("Software Architect", None),
        ("Tech Lead", Level.TECH_LEAD),
        ("Trưởng phòng IT", Level.MANAGER),
        ("Giám đốc Công nghệ", Level.HEAD_DIRECTOR),
        ("Backend Developer", None),
        # "Nhân viên" is neutral: VN boards label every IC posting that way
        ("Nhân viên PHP", None),
    ],
)
def test_detect_level_from_title(title, expected):
    assert detect_level(title) == expected


def test_detect_level_prefers_most_senior_group():
    assert detect_level("Lead Senior Engineer") == Level.TECH_LEAD
    assert detect_level("Senior Manager") == Level.MANAGER


def test_detect_level_from_seniority_text():
    # "Nhân viên" is neutral (covers every IC) -> no seniority signal
    assert detect_level("Backend Developer", seniority_text="Nhân viên") is None
    assert detect_level("Backend Developer", seniority_text="Trưởng nhóm") == Level.TECH_LEAD


@pytest.mark.parametrize(
    "candidate,upper,expected",
    [
        (Level.INTERN, Level.INTERN, True),
        (Level.INTERN, Level.JUNIOR, True),
        (Level.JUNIOR, Level.INTERN, False),
        (Level.SENIOR, Level.MIDDLE, False),
        (None, Level.INTERN, True),
    ],
)
def test_level_is_at_most(candidate, upper, expected):
    assert level_is_at_most(candidate, upper) is expected


def test_policy_rejects_detected_level_above_target():
    # entry targets (intern CV) accept up to junior postings, not middle+
    assert allowed_by_level_policy(Level.INTERN, Level.JUNIOR, None, None) is True
    assert allowed_by_level_policy(Level.INTERN, Level.MIDDLE, None, None) is False
    assert allowed_by_level_policy(Level.INTERN, Level.INTERN, None, None) is True
    assert allowed_by_level_policy(Level.JUNIOR, Level.MIDDLE, None, None) is False


def test_policy_falls_back_to_experience_cap_when_level_unknown():
    # intern cap = 2 years -> "2 năm" excluded, "Dưới 1 năm" kept
    assert allowed_by_level_policy(Level.INTERN, None, 2.0, 2.0) is False
    assert allowed_by_level_policy(Level.INTERN, None, 0.0, 1.0) is True
    assert allowed_by_level_policy(Level.INTERN, None, None, None) is True
    # junior cap = 3 years
    assert allowed_by_level_policy(Level.JUNIOR, None, 5.0, 99.0) is False
    assert allowed_by_level_policy(Level.JUNIOR, None, 2.0, 2.0) is True


def test_policy_never_rejects_senior_targets():
    assert allowed_by_level_policy(Level.SENIOR, None, 20.0, 99.0) is True
    assert allowed_by_level_policy(Level.MANAGER, None, 30.0, 99.0) is True
