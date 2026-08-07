"""CLI entrypoint for the job crawler."""

from __future__ import annotations

import argparse
import json
import sys

from src.models import SearchQuery
from src.orchestrator import run_search
from src.sources import available_sources


def main() -> int:
    p = argparse.ArgumentParser(description="Multi-source job crawler (VN job boards)")
    p.add_argument("query", nargs="?", help="Job keyword, e.g. 'python developer'")
    p.add_argument("-l", "--location", help="City: 'Ho Chi Minh', 'Hanoi', 'Da Nang', 'remote'...")
    p.add_argument("--level", help="intern/fresher/junior/middle/senior/lead/manager/director")
    p.add_argument("-k", "--keywords", help="Comma-separated extra keywords to filter")
    p.add_argument("-s", "--sources", help="Comma-separated source names (default all)")
    p.add_argument("--pages", type=int, default=1)
    p.add_argument("--max", type=int, default=25, help="Max results per source")
    p.add_argument("--days", type=int, default=None, help="Only jobs from last N days")
    p.add_argument("--no-description", action="store_true", help="Skip fetching descriptions")
    p.add_argument("--list-sources", action="store_true", help="List available sources and exit")
    p.add_argument("-o", "--output", help="Write JSON result to file")
    args = p.parse_args()

    if args.list_sources:
        print("\n".join(available_sources()))
        return 0
    if not args.query:
        p.print_help()
        return 1

    q = SearchQuery(
        query=args.query,
        location=args.location,
        level=args.level,
        keywords=[k.strip() for k in (args.keywords or "").split(",") if k.strip()],
        sources=[s.strip() for s in args.sources.split(",") if s.strip()] if args.sources else None,
        max_results_per_source=args.max,
        pages=args.pages,
        days=args.days,
        include_description=not args.no_description,
    )
    resp = run_search(q)
    payload = resp.model_dump()

    print(f"=== {resp.total} jobs from {len(resp.per_source)} sources in {resp.elapsed_ms} ms ===")
    for name, st in resp.per_source.items():
        flag = "OK " if st.status == "ok" else "ERR" if st.status == "error" else "SKIP"
        err = f" ({st.error})" if st.error else ""
        print(f"  [{flag}] {name:<12} {st.count:>3} jobs  {st.elapsed_ms}ms{err}")
    print()
    for j in resp.results:
        print(f"[{j['source']}] {j['title'][:60]}")
        print(f"    {j.get('company') or '?'} | {j.get('location') or '?'} | {j.get('salary_text') or '?'}")
        print(f"    {j['url']}")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
