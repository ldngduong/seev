# Eagle event crawler pattern audit — 2026-08-11

Phạm vi đã kiểm tra:

- `/home/duong/Work/eagle/be/src/modules/event-scraper`
- `/home/duong/Work/eagle/be/src/modules/firecrawl`
- `/home/duong/Work/eagle/event_crawl`
- lịch sử Git của `eagle/be` đối với các module trên

## Kết luận

Eagle hiện tại **không gọi Firecrawl trong `be/src/modules/event-scraper`**.

- `EventScraperModule` vẫn import `FirecrawlModule`, nhưng không service nào inject `FirecrawlService`.
- `FirecrawlService` chỉ còn wrapper `scrapeUrl()` dùng `markdown` hoặc structured `json`.
- `northstar-scraper.service.spec.ts` vẫn mock `firecrawlService` theo constructor cũ; test này stale so với service hiện tại.
- Các scraper NestJS hiện chỉ trigger `crawler-worker` qua HTTP rồi nhận dữ liệu đã normalize để persist.
- Endpoint GET `/firecrawl-scraper/events/ingest` trong worker mô tả một POST endpoint Firecrawl, nhưng không có POST implementation tương ứng trong code hiện tại. Đây là tài liệu/route stale, không phải active flow.

## Logic Firecrawl cũ trong lịch sử Git

Commit `a36a067` và các commit scraper đời đầu dùng chiến lược:

1. Một Firecrawl `scrapeMarkdown()` cho mỗi **list page**.
2. Một request OpenAI `gpt-4o-mini` để extract nhiều event từ markdown.
3. Không crawl detail từng event.

Vì vậy credit thấp do một list page có thể tạo hàng chục/hàng trăm record, không phải do Firecrawl gộp list + detail trong một credit. Đổi lại, detail chỉ có nếu list page đã hiển thị.

Các implementation cũ của Eventbrite/EventsInAmerica/IndustryEvents cũng dùng một Firecrawl credit mỗi page rồi extract toàn bộ card bằng LLM. Không thấy cơ chế Firecrawl detail batching.

## Logic hiện tại giúp tối ưu tốt hơn

Worker `/home/duong/Work/eagle/event_crawl` đã thay chiến lược tổng quát bằng source-specific transport:

### API-first

- Eventbrite dùng destination search API; detail cũng dùng các API `/destination/events/{id}` hoặc `/events/{id}`.
- Meetup dùng GraphQL search; detail JSON-LD qua direct HTTP khi cần.
- Luma lấy discovery/calendar/event payload trực tiếp từ API và thường không cần HTML.
- Humanitix dùng search API/structured state trước.

### Dedupe trước detail

Eventbrite gom list results, dedupe bằng native id/URL/name và cắt `limit` trước khi chạy detail enrichment. Detail vì vậy chỉ chạy trên unique records thực sự sẽ trả về.

### Direct HTTP trước browser

Humanitix thử `httpx` detail và parse Next data/JSON-LD/meta HTML trước. Chỉ khi direct HTTP không lấy được payload mới dùng `crawl4ai` browser fallback.

### Detail concurrency có giới hạn

Các detail request chạy qua `asyncio.Semaphore` với concurrency cấu hình. Điều này tối ưu thời gian và tránh rate limit; bản thân concurrency không giảm số request/credit.

### Merge có chọn lọc

List/API record được giữ làm base. Detail chỉ overwrite field có giá trị, không làm mất field tốt đã lấy từ list.

### Cache/dedupe phụ

- Dedupe bằng native id/canonical URL trước enrich.
- Một số lookup dùng cache trong run, ví dụ Eventbrite organizer profile cache.
- Humanitix giữ `_cached_events` từ search payload để merge với detail.

## Điều Seev nên học, không copy nguyên xi

1. VietnamWorks: API-first hoàn toàn; không detail.
2. ITViec: direct HTTP list, dedupe, sau đó direct HTTP detail JSON-LD **chỉ cho job mới hoặc job còn thiếu deadline**. Firecrawl là fallback khi direct HTTP bị chặn, không phải default.
3. TopCV: Firecrawl cho list/category page. Dedupe với DB trước. Với job mới/thiếu deadline, thử native quick-view/detail HTTP theo circuit breaker; fallback Firecrawl detail khi Cloudflare chặn. Kiểm chứng từ crawler host hiện tại cho thấy cả detail và quick-view đều trả 403, nên Firecrawl detail sẽ là đường production thực tế cho TopCV cho đến khi có transport native ổn định.
4. Cache detail snapshot theo `(source, source_job_id, content/version)`; job đã có exact deadline không enrich lại mỗi crawl.
5. Tách discovery run và enrichment queue. Category crawl không phải chờ toàn bộ detail hoàn thành.
6. Ưu tiên enrich các job mới; job cũ đã có `expired_at` chỉ cần lifecycle check từ list.
7. Dừng detail enrichment nếu job bị reject category/seniority hoặc trùng record canonical.

## Công thức chi phí đề xuất cho Seev

Giả sử một lần crawl thấy `N` card và chỉ có `ΔN` job mới:

- VietnamWorks: search API pages; detail cost `0`.
- ITViec: list HTTP + `ΔN` direct HTTP detail; Firecrawl cost `0`.
- TopCV: `P` Firecrawl list pages + tối đa `ΔN` Firecrawl detail fallback, không phải `N` detail ở mọi lần crawl.

Sau lần crawl đầu, `ΔN` thường nhỏ hơn nhiều `N`, nên chi phí steady-state giảm mạnh. Có thể hạ thêm bằng cách chỉ fallback Firecrawl cho job đạt category gate và chưa có exact deadline. Firecrawl `batch/scrape` giúp điều phối concurrency nhưng vẫn tính theo số page; `maxAge` tăng tốc cache hit nhưng vẫn tính credit. DB-level enrichment cache mới là cơ chế giảm credit thực sự.

## Cảnh báo khi áp dụng

- Không dùng LLM để suy deadline từ markdown nếu source không hiển thị deadline.
- Không coi concurrency là tối ưu credit; chỉ dedupe/cache/conditional enrichment mới giảm số request tính phí.
- Không copy `CacheMode.BYPASS` của Humanitix cho Seev nếu muốn tái sử dụng content; Eagle dùng nó cho browser local, không phải Firecrawl Cloud cache.
- Import `FirecrawlModule` đang unused và test Northstar stale là technical debt của Eagle, không phải pattern nên copy.
