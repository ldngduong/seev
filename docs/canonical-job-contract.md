# Canonical job contract

## Admission invariants

A record may enter `job_posts` only when all conditions are true:

1. `job_category_id` exists in the active DB taxonomy and is supported by the selected native source mapping.
2. At least one canonical seniority code exists, is selectable for that category, and carries mapping evidence.
3. `expired_at` is an exact source value, is later than `posted_at` (when present), and is still in the future.

The crawler and backend both enforce these rules. Research additionally filters `expired_at > NOW()`; the scheduled category crawl deletes expired rows before discovery.

## Exact source fields

| Source | Category evidence | Seniority evidence | Exact expiry |
|---|---|---|---|
| TopCV | Verified fixed `category_family` page mapped by `source_category_mappings` | JSON-LD `occupationalCategory`, explicit title tokens, JSON-LD `experienceRequirements.monthsOfExperience` | JSON-LD `validThrough` (`deadline_source=topcv_json_ld`) |
| ITViec | Verified IT keyword/category page mapped by `source_category_mappings` | Explicit title tokens only; JSON-LD `monthsOfExperience` is retained but never manufactures a level because live samples expose coarse/default values | JSON-LD `validThrough` (`deadline_source=itviec_json_ld`) |
| VietnamWorks | Search API `jobFunction` parent/child mapped by `source_category_mappings` | `jobLevelId`/`jobLevelVI`, explicit title tokens and `yearsOfExperience`; `Nhân viên` is never treated as an exact level | API `expiredOn` (`deadline_source=vietnamworks_api`) |

No source uses `datePosted + N days`, crawl time, or `last_seen_at` as a deadline.

## Multi-seniority model

`job_posts.level`, `job_posts.seniority_text`, `job_posts.seniority_level_id`, and `job_posts.seniority_level_name` were removed. Canonical assignments live in `job_post_seniority_levels`:

- `job_post_id`
- `seniority_level_id`
- `mapping_method`: `native_exact`, `title_explicit`, or `experience_range`
- `confidence`
- `evidence`
- `is_primary`

Broad native labels (`Nhân viên`, ITViec's broad `Senior` pool) cannot become an exact canonical assignment by themselves. Explicit multi-level titles produce multiple relations; otherwise experience ranges may deliberately overlap adjacent levels.

ITViec list and same-origin detail JSON-LD are collected in one Firecrawl browser scrape. `monthsOfExperience` is stored numerically in years and displayed as human-readable months/years (for example `10 tháng`, `3 năm 1 tháng`), with `experience_quality=source_reported_unverified`. It can support later scoring, but cannot be the sole seniority evidence for ITViec.

## Source coverage

The current seed contains 29 TopCV mappings, 24 ITViec mappings, and 20 VietnamWorks mappings for 24 canonical categories. A missing source/category mapping is intentional and means “skip this category on this source”; it must not fall back to a broad page.

Shared native pages receive DB category names and aliases in the crawl request. Python may classify only within those supplied candidate UUIDs and fails closed when no DB alias matches.
