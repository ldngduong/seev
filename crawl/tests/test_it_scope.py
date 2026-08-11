from src.category import CATEGORY_UUID_BY_ORDINAL
from datetime import datetime, timezone

from src.models import Job, SearchQuery, SeniorityMatch
from src.sources.base import BaseSource
from src.sources.vietnamworks import VietnamWorksSource


class DummySource(BaseSource):
    name = "topcv"


def canonical_job(**values):
    raw = {**values.pop("raw", {}), "deadline_source": "test_exact"}
    return Job(
        expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        seniority_matches=[SeniorityMatch(code="junior", mapping_method="title_explicit", confidence=0.99, is_primary=True)],
        raw=raw,
        **values,
    )


def test_base_source_drops_jobs_without_it_category_evidence():
    source = DummySource()
    jobs = [
            canonical_job(
            source="topcv",
            source_job_id="it-1",
            title="Backend Developer",
            url="https://example.com/it-1",
        ),
            canonical_job(
            source="topcv",
            source_job_id="sales-1",
            title="Sales Manager",
            url="https://example.com/sales-1",
        ),
    ]

    result = source.finish(SearchQuery(query="developer"), jobs)

    assert [job.source_job_id for job in result] == ["it-1"]
    assert result[0].category_id == CATEGORY_UUID_BY_ORDINAL[1001]


def test_topcv_ambiguous_product_role_requires_it_context():
    source = DummySource()
    jobs = [
            canonical_job(
            source="topcv",
            source_job_id="product-pharma",
            title="Product Manager Pharmaceutical",
            url="https://example.com/product-pharma",
            raw={"source_tags": ["Dược phẩm / Y tế"]},
        ),
            canonical_job(
            source="topcv",
            source_job_id="product-saas",
            title="Product Manager HR SaaS",
            url="https://example.com/product-saas",
            raw={"source_tags": ["IT - Phần mềm"]},
        ),
    ]

    result = source.finish(SearchQuery(query="Product Manager"), jobs)

    assert [job.source_job_id for job in result] == ["product-saas"]


def test_vietnamworks_enforces_native_it_parent_mapping():
    source = VietnamWorksSource()
    source._robust = FakeVietnamWorksFetcher()
    query = SearchQuery(
        query="manager",
        pages=1,
        source_category_filters={"vietnamworks": {"parent_id": "5"}},
    )

    result = source.fetch(query)

    assert [job.source_job_id for job in result] == ["101"]
    assert result[0].category_id == CATEGORY_UUID_BY_ORDINAL[1001]


def test_vietnamworks_fixed_page_uses_native_job_function_filter():
    source = VietnamWorksSource()
    fetcher = FakeVietnamWorksFetcher()
    source._robust = fetcher
    category_id = CATEGORY_UUID_BY_ORDINAL[1001]

    source.fetch(
        SearchQuery(
            crawl_url="https://www.vietnamworks.com/viec-lam?g=5&j=36",
            category_id=category_id,
            candidate_category_ids=[category_id],
            pages=1,
        )
    )

    native_filter = next(
        item for item in fetcher.payload["filter"] if item["field"] == "jobFunction"
    )
    assert native_filter["value"] == '[{"parentId":5,"childrenIds":[36]}]'


class FakeVietnamWorksFetcher:
    payload = None

    def post(self, *_args, **_kwargs):
        self.payload = _kwargs["json"]
        return FakeResponse()


class FakeResponse:
    def json(self):
        return {
            "meta": {"nbPages": 1},
            "data": [
                {
                    "jobId": 101,
                    "jobTitle": "Backend Developer",
                    "jobUrl": "https://example.com/101",
                    "expiredOn": "2099-01-01T00:00:00Z",
                    "yearsOfExperience": 3,
                    "jobFunction": {
                        "parentId": 5,
                        "parentName": "Information Technology/Telecommunications",
                        "children": [{"id": 36, "name": "Software Developer"}],
                    },
                },
                {
                    "jobId": 202,
                    "jobTitle": "Product Development Manager",
                    "jobUrl": "https://example.com/202",
                    "expiredOn": "2099-01-01T00:00:00Z",
                    "yearsOfExperience": 5,
                    "jobFunction": {
                        "parentId": 26,
                        "parentName": "Textiles, Garments/Footwear",
                        "children": [{"id": 99, "name": "Product Development"}],
                    },
                },
            ],
        }
