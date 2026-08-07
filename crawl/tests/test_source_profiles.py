"""Unit tests for per-source seniority/level profiles."""

from __future__ import annotations

from src.models import Job, Level, SearchQuery
from src.source_profiles import PROFILES, _vn_profile


def topcv_filter_values():
    profile = PROFILES["topcv"]
    # entry targets expand to the entry pool (50=thực tập sinh, 1=Nhân viên)
    assert profile.level_filter_values(Level.INTERN) == ["50", "1"]
    assert profile.level_filter_values(Level.JUNIOR) == ["50", "1"]
    assert profile.level_filter_values(Level.MANAGER) == ["3", "10"]
    assert profile.level_filter_values(None) == []


def test_vn_profile_detects_canonical_level():
    profile = PROFILES["topcv"]
    job = Job(
        source="topcv",
        source_job_id="1",
        title="Frontend Developer",
        url="https://topcv.vn/1",
        seniority_text="Chuyên viên",
    )
    assert profile.detect(job) == Level.MIDDLE
    job2 = Job(
        source="topcv",
        source_job_id="2",
        title="Frontend Developer",
        url="https://topcv.vn/2",
        seniority_text="Thực tập sinh",
    )
    assert profile.detect(job2) == Level.INTERN
    # "Nhân viên" is neutral (covers every IC), experience caps do the cut
    job3 = Job(
        source="topcv",
        source_job_id="3",
        title="Frontend Developer",
        url="https://topcv.vn/3",
        seniority_text="Nhân viên",
    )
    assert profile.detect(job3) is None


def test_vietnamworks_detects_id_and_label():
    profile = PROFILES["vietnamworks"]
    job = Job(
        source="vietnamworks",
        source_job_id="5",
        title="Backend Developer",
        url="https://vietnamworks.com/job/5",
        level="7",
    )
    assert profile.detect(job) == Level.MANAGER
    job2 = Job(
        source="vietnamworks",
        source_job_id="8",
        title="Backend Developer",
        url="https://vietnamworks.com/job/8",
        seniority_text="Thực tập sinh",
    )
    assert profile.detect(job2) == Level.INTERN
    # id 5 (Nhân viên) is intentionally not level evidence
    job3 = Job(
        source="vietnamworks",
        source_job_id="5b",
        title="Backend Developer",
        url="https://vietnamworks.com/job/5b",
        level="5",
    )
    assert profile.detect(job3) is None


def test_topdev_maps_level_string():
    profile = PROFILES["topdev"]
    job = Job(
        source="topdev",
        source_job_id="9",
        title="Engineer",
        url="https://topdev.vn/9",
        level="Senior",
    )
    assert profile.detect(job) == Level.SENIOR
    assert profile.name == "topdev"
    assert profile.supports_level is True
    assert profile.level_filter_ids["intern"] == ["1616"]
    assert profile.level_filter_values(Level.INTERN) == ["1616", "12507", "1617"]

    profile_vnw = PROFILES["vietnamworks"]
    assert profile_vnw.level_filter_values(Level.INTERN) == ["8", "1", "5"]
    assert profile_vnw.level_filter_values(Level.MANAGER) == ["7"]

    profile_it = PROFILES["itviec"]
    assert profile_it.level_filter_values(Level.INTERN) == ["Internship", "Fresher", "Junior"]
    assert profile_it.level_filter_values(Level.MIDDLE) == ["Senior"]


def test_normalize_sets_canonical_level_and_experience():
    profile = PROFILES["topcv"]
    job = Job(
        source="topcv",
        source_job_id="10",
        title="Thực tập sinh PHP Developer",
        url="https://topcv.vn/10",
        experience="Dưới 1 năm",
    )
    profile.normalize(job)
    assert job.level == "intern"
    assert job.experience == "Dưới 1 năm"
    assert job.experience_min == 0.0
    assert job.experience_max == 1.0


def test_accepts_enforces_level_and_experience():
    profile = PROFILES["topcv"]
    # detected level above target -> reject
    job = Job(
        source="topcv",
        source_job_id="11",
        title="Chuyên viên Frontend",
        url="https://topcv.vn/11",
    )
    assert profile.accepts(Level.INTERN, job) is False
    assert profile.accepts(Level.MIDDLE, job) is True
    # no level evidence, exp over intern cap (2y) -> reject
    job2 = Job(
        source="topcv",
        source_job_id="12",
        title="Frontend Developer",
        url="https://topcv.vn/12",
        experience="2 năm",
    )
    assert profile.accepts(Level.INTERN, job2) is False
    assert profile.accepts(Level.JUNIOR, job2) is True


def test_profile_maps_job_type():
    profile = _vn_profile("x")
    assert profile.map_job_type("Toàn thời gian") == "full_time"
    assert profile.map_job_type("full time") == "full_time"
    assert profile.map_job_type("bán thời gian") == "part_time"
    assert profile.map_job_type("Không biết") is None


def test_all_sources_registered():
    for name in (
        "topcv",
        "vietnamworks",
        "topdev",
        "itviec",
        "jobsgo",
        "viecoi",
        "indeed",
    ):
        assert name in PROFILES, f"missing profile for {name}"
        assert PROFILES[name].name == name