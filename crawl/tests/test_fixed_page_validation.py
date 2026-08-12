"""Regression tests for native category page drift validation."""

from src.models import SearchQuery
from src.sources.base import BaseSource


def test_fixed_page_label_accepts_slash_order_change_in_page_heading():
    query = SearchQuery(
        crawl_url="https://www.topcv.vn/category-321",
        expected_source_label="Product Manager/Product Owner",
    )
    html = "<html><head><title>Jobs</title></head><body><h1>Tuyển dụng Product Owner/Product Manager</h1></body></html>"

    BaseSource().validate_fixed_page(query, html)


def test_fixed_page_label_rejects_unrelated_page():
    query = SearchQuery(
        crawl_url="https://www.topcv.vn/category-321",
        expected_source_label="Product Owner/Product Manager",
    )
    html = "<html><head><title>Frontend jobs</title></head><body><h1>Frontend Developer</h1></body></html>"

    try:
        BaseSource().validate_fixed_page(query, html)
    except ValueError as error:
        assert "category_mapping_drift" in str(error)
    else:
        raise AssertionError("unrelated category page must fail closed")
