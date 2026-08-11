import pytest

from src.category import CATEGORY_UUID_BY_ORDINAL, resolve_category


@pytest.mark.parametrize(
    "title,expected_id",
    [
        ("Senior Backend Engineer", 1001),
        ("Frontend React Developer", 1002),
        ("Full-stack Software Engineer", 1003),
        ("Automation QA Engineer", 1102),
        ("Network Engineer", 1302),
        ("RPA Developer", 1502),
        ("Product Manager", 1602),
    ],
)
def test_resolve_it_category_from_explicit_title(title, expected_id):
    category_id, category_name = resolve_category(title)

    assert category_id == CATEGORY_UUID_BY_ORDINAL[expected_id]
    assert category_name


def test_requested_category_is_not_used_as_fallback():
    assert resolve_category("Nhân viên văn phòng", 1001) == (None, None)


def test_longest_alias_wins_for_automation_qa():
    assert resolve_category("Senior QA Automation Engineer")[0] == CATEGORY_UUID_BY_ORDINAL[1102]


@pytest.mark.parametrize(
    "title,expected_id",
    [
        ("Chuyên Viên Lập Trình Backend", 1001),
        ("Kỹ Sư Dữ Liệu", 1202),
        ("Chuyên Viên Quản Trị Hệ Thống", 1302),
        ("Quản Lý Dự Án CNTT", 1603),
    ],
)
def test_resolve_vietnamese_it_titles(title, expected_id):
    assert resolve_category(title)[0] == CATEGORY_UUID_BY_ORDINAL[expected_id]
