# Crawler fix backlog — 2026-08-11

Tài liệu này là checklist triển khai sau source audit. Không đánh dấu hoàn thành nếu chưa có test hoặc sample report chứng minh.

## P0 — ngăn dữ liệu sai

- [ ] TopCV: đọc `totalJob`/heading trước khi parse card; nếu `totalJob=0` phải trả danh sách rỗng, không ingest recommendation fallback.
- [ ] TopCV: không dùng `data-job-position` làm seniority; đây là thứ tự card.
- [ ] TopCV: bỏ selector toàn cục `[data-original-title]` khỏi skill extraction; chỉ lấy tag thuộc đúng vùng skill.
- [ ] TopCV: parse native category tooltip trên từng card và reject card không tương thích category DB đang crawl.
- [ ] ITViec: parse `Job Expertise` trên từng card và reject card không tương thích category DB; không tin fixed URL một cách tuyệt đối.
- [ ] VietnamWorks: sửa fallback URL từ `/job/{id}` sang `/{alias-or-title-slug}-{jobId}-jv`.
- [ ] Không suy `expired_at` từ `posted_at`, refresh time hoặc thời điểm crawler nhìn thấy.

## P1 — đủ category và seniority mà không crawl detail

- [ ] TopCV: bổ sung native `position=20` (Trưởng chi nhánh).
- [ ] TopCV: fan-out các `position` cần thiết; merge theo `(source, source_job_id)` và giữ toàn bộ membership.
- [ ] ITViec: fan-out `Internship`, `Fresher`, `Junior`, `Senior`, `Manager`; merge và giữ toàn bộ membership.
- [ ] VietnamWorks: giữ native `jobLevelId`; không map `5 = Nhân viên` trực tiếp thành Junior/Middle/Senior.
- [ ] Tạo `job_post_categories` để lưu nhiều category cùng evidence/provenance.
- [ ] Tạo `job_post_seniority_levels` để lưu nhiều seniority cùng evidence/provenance.
- [ ] Research chỉ match canonical DB relations; raw source id/name không được trở thành source of truth.

## P1 — field contract và lifecycle

- [ ] Định nghĩa field tối thiểu để nhận một job: source id, canonical URL, title, company, category evidence, location, `first_seen_at`, `last_seen_at`.
- [ ] Deadline là field bắt buộc trước khi một job được publish vào active research pool; candidate chưa enrich xong ở trạng thái `deadline_pending`, không giả deadline.
- [ ] `expired_at` chỉ nhận exact native deadline; record enrichment lỗi tạm thời phải retry, không publish như job hoàn chỉnh.
- [ ] Thêm `deadline_source`: `vietnamworks_api | itviec_json_ld | topcv_json_ld | topcv_detail_html`.
- [ ] Thêm `inactive_at` và policy xác nhận biến mất sau nhiều lần quét thành công; không deactivate khi source crawl lỗi.
- [ ] Đổi `seniority_text` thành `source_seniority_text`.
- [ ] Đổi `experience` thành `experience_text`; giữ numeric min/max chỉ khi parse có evidence.
- [ ] Bỏ dần `level`, `seniority_level_name`, `job_category_name` sau khi research query đã chuyển sang join tables.
- [ ] Bỏ `category_confidence=0.9` hard-code; confidence phải phụ thuộc evidence strategy hoặc không lưu.

## Transport/cost policy

- [ ] VietnamWorks: chỉ dùng search JSON API; 0 detail request/job.
- [ ] ITViec: ưu tiên direct HTTP SSR list; 0 Firecrawl và 0 detail request/job trong luồng bình thường.
- [ ] TopCV: Firecrawl theo page category/filter; 0 detail request/job.
- [ ] Không gọi TopCV `/job-view-detail` trong category crawl.
- [ ] Không gọi ITViec `/content` hoặc detail trong category crawl.
- [ ] Cache raw page theo URL + crawl run để retry parser không tốn thêm credit.
- [ ] Dedupe URL crawl giống nhau trước khi fetch; merge category/seniority membership sau parse.
- [ ] Chỉ crawl page tiếp theo khi `totalJob` và quota còn yêu cầu; dừng sớm khi đủ unique jobs.
- [ ] Tách discovery queue và detail-enrichment queue; dedupe/reject category trước khi enrich.
- [ ] ITViec: direct HTTP detail JSON-LD chỉ cho job mới hoặc job chưa có exact deadline; Firecrawl fallback khi direct HTTP bị chặn.
- [ ] TopCV: direct HTTP detail và quick-view hiện trả Cloudflare 403 từ crawler host; dùng circuit breaker và Firecrawl detail fallback cho job mới/thiếu deadline.
- [ ] Không enrich lại job đã có exact `expired_at`, trừ khi source evidence/version cho biết posting đã thay đổi.
- [ ] Firecrawl detail chỉ request `rawHtml`/`html` cần thiết rồi parse JSON-LD/HTML local; không dùng LLM JSON extraction cho field deterministic.
- [ ] Batch scrape chỉ dùng để điều phối URL/concurrency; không coi batch hoặc `maxAge` là cách giảm credit vì billing vẫn theo page.
- [ ] Ghi metrics `list_requests`, `direct_detail_requests`, `firecrawl_list_credits`, `firecrawl_detail_credits`, `detail_cache_hits` theo source/run.

## Quality gate trước khi bật production

- [ ] Test fixture TopCV `totalJob=0` nhưng có recommendation cards: kết quả phải bằng 0.
- [ ] Test fixture TopCV tooltip: skill không chứa title/company/location/category/benefit.
- [ ] Test một ITViec job thuộc nhiều native level filters: giữ đủ memberships.
- [ ] Test VietnamWorks URL fallback trả đúng format canonical.
- [ ] Sample tối thiểu 100 job/source/category mix; xuất null-rate và reject-rate theo field/source.
- [ ] Kiểm tra 100% job có URL hợp lệ và category evidence.
- [ ] Job active có `expired_at=null` là quality failure; job `deadline_pending` phải nằm ngoài research pool.
- [ ] Không activate source/category mapping chưa qua sample gate.

## Definition of done

Crawler được coi là hoàn tất khi quick/manual research chỉ đọc job canonical từ DB, category và seniority có evidence truy vết được, không có record sai ngành do fallback, và không phát sinh detail request theo số lượng job.
