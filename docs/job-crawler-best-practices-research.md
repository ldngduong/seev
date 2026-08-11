# Nghiên cứu phương án crawler tối ưu cho TopCV và ITViec

Ngày kiểm chứng: 11/08/2026  
Phạm vi: crawler việc làm CNTT của Seev, ưu tiên deadline chính xác, category/seniority đúng và chi phí Firecrawl thấp.

## Kết luận điều hành

Không có API công khai hoặc endpoint list nào trả đủ deadline cho toàn bộ job của cả TopCV và ITViec. Các repo crawler công khai cũng đều phải vào detail khi cần dữ liệu đầy đủ. Tuy nhiên, điều đó **không đồng nghĩa phải trả một Firecrawl credit cho mỗi detail**.

Phương án tốt nhất cho Seev là một pipeline riêng theo từng source:

1. **TopCV:** dùng Firecrawl cloud để mở một trang cùng origin, rồi dùng một action `executeJavascript` gọi nền nhiều URL list/detail trong chính browser session đó. Parse `JobPosting` JSON-LD bằng JavaScript thuần và trả về mảng nhỏ. Benchmark thật đã lấy 20 detail trong một `/scrape`, chỉ tốn **1 credit**, proxy `basic`; 17 job thành công ở concurrency 5 và 18 job ở concurrency 2, phần còn lại bị TopCV trả 429. Vì vậy production nên dùng batch 10–15 URL, concurrency 1–2, retry queue qua lượt sau.
2. **ITViec:** không dùng Firecrawl làm đường chính. Từ máy crawler hiện tại, list, `/content` và full detail đều trả HTTP 200. Full detail có `JobPosting.validThrough` chính xác. Dùng HTTP session có browser fingerprint (`curl_cffi`), throttling và chỉ vào detail cho job mới. Firecrawl same-origin batch chỉ là fallback khi direct HTTP thực sự bị challenge.
3. **VietnamWorks:** giữ API-first hiện tại vì API đã trả deadline.

Điểm quan trọng nhất là tách rõ `discovery` và `enrichment`, dedupe bằng `(source, source_job_id)` trước enrichment, và chỉ enrich job mới/thiếu deadline. Không recrawl detail của toàn bộ job mỗi cron.

## Bằng chứng thực nghiệm

### TopCV

Trang category Software Engineer hiện trả 409 kết quả và 50 card ở trang đầu. Raw HTML list khoảng 2 MB nhưng không có deadline. Trang full detail có JSON-LD `JobPosting` với các field quan trọng:

- `datePosted`
- `validThrough`
- `employmentType`
- `occupationalCategory`
- `experienceRequirements.monthsOfExperience`
- title, company, location, salary và description

Benchmark trong cùng một Firecrawl browser:

| Phép thử | Kết quả | Credit |
|---|---:|---:|
| 8 request `/job-view-detail` trong một scrape action | 8/8 HTTP 200, nhưng endpoint này không có deadline | 1 |
| 8 full-detail fetch trong một interact session | 8/8 có `validThrough` | tính theo thời gian |
| 20 full-detail, concurrency 5, một scrape action | 17/20 có deadline, 3 job bị 429 | 1 |
| 20 full-detail, concurrency 2 + retry/backoff | 18/20 có deadline, 2 job vẫn bị 429 | 1 |

Các artifact kiểm chứng nằm trong `.firecrawl/` (đã git-ignore):

- `topcv-full-detail-single-scrape-test.json`
- `topcv-full-detail-throttled-test.json`
- `topcv-detail-fields-test.json`
- `topcv-batch-deadline-test.json`

Ví dụ dữ liệu lấy trực tiếp từ JSON-LD detail:

```json
{
  "title": "Team Lead – Platform Core",
  "datePosted": "2026-07-31",
  "validThrough": "2026-08-30T23:59:59+07:00",
  "employmentType": "FULL_TIME",
  "occupationalCategory": "Trưởng nhóm",
  "experienceRequirements": {
    "monthsOfExperience": 60
  }
}
```

Firecrawl xác nhận `executeJavascript` có thể trả dữ liệu qua `actions.javascriptReturns`. Base scrape dùng `basic` là 1 credit; `auto` chỉ tăng lên 5 khi phải retry thành công bằng enhanced proxy. Interact code-only tính 2 credits/phút. Trong phiên benchmark kéo dài 202,7 giây, Firecrawl tính 7 credits; vì vậy action ngắn trong `/scrape` phù hợp batch định kỳ hơn giữ interact session lâu.

### ITViec

Kiểm chứng trực tiếp từ máy crawler:

| URL | HTTP | Dung lượng tải | Nội dung |
|---|---:|---:|---|
| `/it-jobs` | 200 | ~66,9 KB | list card và URL job |
| `/{job-slug}/content` | 200 | ~4,9 KB | mô tả/requirements, không có deadline |
| full detail `/{job-slug}` | 200 | ~58,9 KB nén | JSON-LD có exact deadline |

Mẫu 11 detail thành công liên tiếp đều có `validThrough = datePosted + 35 ngày`. Đây chỉ là quan sát, **không được dùng làm luật suy diễn**, vì ITViec có thể thay đổi thời hạn và list có job được bump/re-rank. Source of truth vẫn phải là `validThrough` trên detail.

Sitemap ITViec chỉ liệt kê homepage, company và các landing page theo skill/title; không liệt kê individual job detail. `/content` tuy nhẹ nhưng không có deadline. Do đó best path là full detail trực tiếp cho job mới, parse JSON-LD, không dùng Firecrawl.

## Đánh giá endpoint và repo công khai

### TopCV

- `api-featured-jobs` có `remain_deadline_by_day/hour`, nhưng chỉ phục vụ nhóm featured trên homepage và dùng taxonomy rộng, không bao phủ ổn định toàn bộ job trong 24 category DB.
- `/job-view-detail?id=...` trả HTML quick-view, nhưng phép thử thực tế không thấy deadline/cấp bậc đầy đủ.
- Full detail có JSON-LD chuẩn và là nguồn dữ liệu sạch nhất.
- Các repo TopCV được kiểm tra (`IT-Jobs-TopCV-Crawler`, `scraping-topcv`, `TopCV-scraper`, `scraping-topcvvn-scrapy`) đều follow URL detail để lấy deadline/cấp bậc hoặc dữ liệu đầy đủ; không repo nào tìm được batch API công khai trả deadline cho toàn corpus. Một repo còn ghi rõ bị giới hạn request rate.

### ITViec

- List HTML không có exact deadline.
- `/content` là partial HTML nhẹ nhưng không có `validThrough`.
- Full detail có JSON-LD `JobPosting` với exact `datePosted`, `validThrough`, employment type, experience months, skills, location và description.
- Repo `haucongle/itviec-scraper` dùng Playwright + Cheerio, detail concurrency, checkpoint/resume và cookie state. Repo `tcd93/python-web-scraping` phát hiện `/content` bằng DevTools nhưng vẫn gọi từng job; không có batch deadline endpoint.

## Kiến trúc đề xuất

### 1. Discovery

Mỗi crawl category trả một tập record mỏng:

```text
source, source_job_id, source_url, title, company,
list_location, list_salary, list_experience,
source_category_config_id, discovered_at
```

Ngay sau discovery:

- Reject trang `totalJob = 0` nhưng chứa recommended cards không thuộc category.
- Dedupe trong run và với DB bằng `(source, source_job_id)`.
- Ghi quan hệ nhiều-nhiều job ↔ category vì một job có thể xuất hiện ở nhiều fixed category page.
- Chỉ đẩy job mới, job thiếu deadline hoặc job cần revalidation vào enrichment queue.

### 2. TopCV discovery batching

Không gọi Firecrawl một lần cho mỗi category URL nếu có thể gom cùng-origin:

- Mở một anchor page TopCV bằng `/v2/scrape`.
- `executeJavascript` nhận 3–5 fixed category URLs.
- `fetch` từng URL với concurrency 1–2 trong browser origin đã qua Cloudflare.
- Parse card bằng `DOMParser`, trả mảng nhỏ qua `actions.javascriptReturns`.
- Dedupe trung tâm trước khi enrichment.

Với 24 category, batch 4 category/action cần khoảng 6 base scrapes thay vì 24. Đây là suy luận kiến trúc dựa trên cơ chế same-origin đã được benchmark thành công với full-detail; cần load-test riêng trước production.

### 3. TopCV detail enrichment batching

- Chunk 10–15 URL mới mỗi action.
- Concurrency 1–2.
- Delay ngẫu nhiên 500–1.000 ms giữa request.
- Khi gặp 429/challenge (`status=429`, title `Just a moment...`, thiếu `JobPosting`) thì dừng tăng tải, đưa URL vào retry queue cho scrape/session tiếp theo.
- Parse JSON-LD bằng code deterministic; không dùng Firecrawl JSON/LLM extraction.
- Trả đúng các field cần thiết, không trả full HTML/description nếu DB không cần.

Ước tính cold seed với 24 category và 300 unique jobs mới:

```text
discovery: ceil(24 / 4) = 6 base credits
detail:    ceil(300 / 12) = 25 base credits
tổng:      khoảng 31 credits nếu basic proxy thành công
```

Cron incremental sau đó chủ yếu tốn discovery batch + một vài batch cho job mới, thường thấp hơn rất nhiều so với một credit/detail. Đây là estimate, không phải cam kết billing; `proxy:auto` có thể nâng request lên 5 credits khi cần enhanced.

### 4. ITViec direct HTTP enrichment

Thay `prefer_bypass=True` hiện tại bằng transport waterfall:

1. `curl_cffi.Session(impersonate="chrome")`, cookie jar, browser-like headers.
2. Rate limit khởi điểm 0,5–1 request/giây/source, concurrency 1–2.
3. Retry 429/5xx với exponential backoff + jitter, tôn trọng `Retry-After`.
4. Detect challenge bằng cả status, content type, title/body marker và thiếu JSON-LD; không coi HTTP 200 là thành công nếu body là challenge.
5. Chỉ khi direct HTTP fail theo circuit breaker mới gọi Firecrawl same-origin batch.

`requests` thuần không có HTTP/2 và browser TLS fingerprint. `curl_cffi` hỗ trợ Chrome TLS/JA3, HTTP/2/3 và API gần giống requests. Tuy nhiên TLS impersonation không đảm bảo vượt mọi Cloudflare challenge; vì vậy Firecrawl vẫn là fallback.

### 5. Expiry và revalidation

Các field cần lưu rõ provenance:

```text
posted_at
expires_at
expiry_source: source_api | source_jsonld | source_relative | unknown
source_seniority_text
seniority_id
first_seen_at
last_seen_at
last_enriched_at
last_detail_status
missing_run_count
is_active
```

Quy tắc lifecycle:

- `expires_at <= now`: mark inactive ngay.
- Detail trả 404/410, mất `JobPosting`, hoặc source báo closed: mark inactive.
- Job biến mất khỏi discovery: tăng `missing_run_count`; chỉ inactive sau 2–3 successful runs để tránh xóa nhầm do pagination/rate limit.
- Job còn active và đã có exact deadline: không crawl detail lại mỗi ngày; chỉ revalidate sát deadline, khi list metadata đổi, hoặc theo TTL dài hơn.
- Có thể hard-delete sau retention window; research/session đang tham chiếu job nên không nên xóa vật lý ngay trong cùng transaction với crawl.

## Vì sao các phương án khác không tốt bằng

### Firecrawl batch scrape từng detail

Batch scrape giúp orchestration và concurrency, nhưng vẫn tính credits theo số page/URL; response còn trả `creditsUsed` cho toàn batch. Nó không giải quyết bài toán chi phí bằng same-origin JS batching.

### Firecrawl crawl toàn website

Không phù hợp vì category/search URL có query, rất nhiều nhánh trùng nhau và crawler có thể đi sang company/blog/CV. Khó giữ mapping category DB chính xác và vẫn tính theo page.

### Firecrawl self-hosted

Không nên chọn làm primary cho TopCV chỉ để tiết kiệm credits. Tài liệu chính thức nói self-hosted không có Fire-engine, tức thiếu phần nâng cao xử lý IP block/robot detection. Muốn tương đương cloud phải tự vận hành Playwright, proxy, fingerprint, queue và observability.

### Selenium/Playwright cho từng detail

Chạy được nhưng tốn browser navigation, RAM và thời gian. Với TopCV, một browser session + background fetch/JSON-LD parse hiệu quả hơn mở tab/page cho từng job. Với ITViec, HTTP trực tiếp còn nhẹ hơn browser.

### Suy deadline từ “Còn N ngày” hoặc `datePosted + 35`

Chỉ nên là fallback có provenance `source_relative`, không phải dữ liệu exact. Re-ranking/bump làm relative posted text không nhất thiết bằng ngày đăng gốc; chính sách deadline có thể thay đổi.

### Browserless/Crawlee

Đây là fallback hợp lệ nếu Firecrawl cloud không ổn định:

- Crawlee có queue bền vững, session/proxy management, HTTP/2 và browser/TLS fingerprint.
- Browserless hỗ trợ session reconnect, sticky proxy và stealth browser.

Nhưng Seev hiện đã có Firecrawl và benchmark same-origin action thành công, nên đổi stack ngay sẽ tăng vận hành mà chưa tạo lợi ích rõ. Browserless hợp lý ở phase sau nếu cần session dài, kiểm soát proxy/IP hoặc Firecrawl action timeout trở thành bottleneck.

## Các thay đổi cần làm trong code (thứ tự)

1. Thêm response model cho `actions.javascriptReturns` và hàm Firecrawl scrape-with-actions.
2. Tách source thành `discover()` và `enrich()`; bỏ việc parser list giả lập đầy đủ Job.
3. TopCV: implement category batch action + detail JSON-LD batch action, retry queue, challenge detector.
4. ITViec: chuyển primary transport sang `curl_cffi`; parse JSON-LD detail cho job mới; Firecrawl fallback theo circuit breaker.
5. Dedupe toàn run trước enrichment và upsert job-category relations.
6. Chuẩn hóa seniority từ `occupationalCategory`/`monthsOfExperience` qua mapper DB; giữ raw source text để audit.
7. Bổ sung expiry provenance, missing-run state và cron inactive/purge.
8. Thêm metrics: `discovered`, `unique`, `enriched`, `skipped_existing`, `deadline_coverage`, `429`, `challenge`, `firecrawl_credits`, `credits_per_new_job`.
9. Canary 1–2 category trước, sau đó mới rollout 24 category.

## Rủi ro và giới hạn

- Endpoint/private DOM của TopCV và ITViec có thể đổi; JSON-LD chuẩn ổn định hơn CSS selector nhưng vẫn cần contract tests.
- Background fetch hàng loạt có thể chạm rate limit dù Firecrawl chỉ tính một credit. Benchmark cho thấy ngưỡng 20 request đã xuất hiện 429, nên không được đặt concurrency cao.
- Firecrawl action có timeout và tối đa 50 actions; batch phải nhỏ, idempotent và resume được.
- TopCV `proxy:basic` thành công trong benchmark này, nhưng không đảm bảo mọi lần. Khi `auto` dùng enhanced, cost có thể tăng 5 lần cho request đó.
- Robots.txt hiện không chặn public job pages, nhưng vẫn phải kiểm tra Terms of Service và duy trì request rate có trách nhiệm.

## Nguồn

1. [Firecrawl Advanced Scraping Guide](https://docs.firecrawl.dev/advanced-scraping-guide) — actions, `executeJavascript`, cache, timeout.
2. [Firecrawl Scrape API](https://docs.firecrawl.dev/api-reference/endpoint/scrape) — request/response contract.
3. [Firecrawl Interact](https://docs.firecrawl.dev/features/interact) — code execution, session lifecycle, 2 credits/phút code-only.
4. [Firecrawl Browser Sandbox](https://docs.firecrawl.dev/features/browser) — persistent browser/CDP.
5. [Firecrawl Enhanced Mode](https://docs.firecrawl.dev/features/stealth-mode) — basic/enhanced/auto và credit.
6. [Firecrawl Batch Scrape](https://docs.firecrawl.dev/api-reference/endpoint/batch-scrape) — batch URL.
7. [Firecrawl Batch Status](https://docs.firecrawl.dev/api-reference/endpoint/batch-scrape-get) — `creditsUsed`.
8. [Choosing the Firecrawl extractor](https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor) — scrape so với extract/agent.
9. [Firecrawl self-host guide](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md) — thiếu Fire-engine ở self-hosted.
10. [Firecrawl self-host anti-bot issue #2257](https://github.com/firecrawl/firecrawl/issues/2257) — giới hạn thực tế với anti-bot.
11. [Firecrawl actions source documentation](https://github.com/firecrawl/firecrawl-docs/blob/main/advanced-scraping-guide.mdx) — action return contract.
12. [Google JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting) — `validThrough`, `datePosted`, expiry và JSON-LD trên leaf detail.
13. [Schema.org JobPosting](https://schema.org/JobPosting) — schema chuẩn.
14. [TopCV robots.txt](https://www.topcv.vn/robots.txt) — public crawl policy surface.
15. [ITViec robots.txt](https://itviec.com/robots.txt) — sitemap và allow rules.
16. [TopCV IT Jobs crawler](https://github.com/tienlonghungson/IT-Jobs-TopCV-Crawler) — requests + detail crawl.
17. [scraping-topcv](https://github.com/minkminkk/scraping-topcv) — detail parser, deadline và rate-limit note.
18. [TopCV-scraper](https://github.com/Eakan-Git/TopCV-scraper) — detail deadline extraction.
19. [TopCV Scrapy crawler](https://github.com/arrlanyhars/scraping-topcvvn-scrapy) — follow detail pages.
20. [ITViec Playwright scraper](https://github.com/haucongle/itviec-scraper) — detail concurrency, checkpoint, cookie/session.
21. [Vietnam job-board scraping tutorial](https://github.com/tcd93/python-web-scraping) — ITViec `/content`, API-first discovery lesson.
22. [curl_cffi](https://github.com/lexiforest/curl_cffi) — browser TLS/JA3/HTTP2 impersonation.
23. [Crawlee](https://github.com/apify/crawlee) — queue, retry, session/proxy and fingerprint management.
24. [Playwright BrowserContext](https://playwright.dev/docs/api/class-browsercontext) — cookie/storage state reuse.
25. [Playwright API testing](https://playwright.dev/docs/api-testing) — request context sharing browser cookies.
26. [Browserless session reconnect](https://docs.browserless.io/browserql/session-management/reconnect-to-browserless) — reuse a running browser.
27. [Browserless proxies](https://docs.browserless.io/browserql/bot-detection/proxies) — sticky/datacenter/residential proxy.
28. [Browserless persisted sessions](https://docs.browserless.io/browserql/session-management/persisting-state) — explicit lifecycle and cleanup.
29. [Community discussion: incremental job-board scraping](https://www.reddit.com/r/webscraping/comments/1nq95i3) — anecdotal support for list-first/detail-only-on-change.
30. [Community discussion: scraping many job boards](https://www.reddit.com/r/webscraping/comments/1h4s1nv/scrape_thousands_of_small_websites_for_job/) — practical trade-offs of Selenium and selector generation.

## Rerun inputs

```text
workflow: firecrawl-deep-research
topic: Cost-efficient exact-deadline crawling for TopCV and ITViec in Seev
depth: exhaustive
output: markdown
```
