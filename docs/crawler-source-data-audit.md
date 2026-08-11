# Crawler source/data audit — 2026-08-11

## Mục tiêu và ràng buộc

- Crawl theo category cố định để xây kho job; quick/manual research chỉ đọc DB.
- Không dùng ID native của source làm khóa chuẩn. UUID trong DB là source of truth.
- Không crawl detail hàng loạt và không dùng Firecrawl cho mỗi job.
- Không tự bịa `expired_at`, category hoặc seniority khi source không cung cấp bằng chứng.

## Kết luận ngắn

1. **VietnamWorks là nguồn list/API tốt nhất**: API search trả deadline, ngày đăng, native level, số năm kinh nghiệm, loại hình và native category ngay trong một request.
2. **ITViec có dữ liệu list đủ tốt để giữ nguồn**, nhưng không có exact deadline. Search card có role/expertise, working model, location và skills; native seniority có thể lấy bằng filter membership. Một job có thể thuộc nhiều filter cấp bậc, nên không được ép về một FK duy nhất.
3. **TopCV có thể lấy native category và seniority mà không crawl detail**, bằng category tooltip trên card và fan-out các URL `position`. Tuy nhiên list không có exact deadline. Parser hiện tại còn có hai lỗi dữ liệu nghiêm trọng: gom mọi tooltip thành skill và ingest job gợi ý sai ngành khi filter trả 0 kết quả.
4. Với yêu cầu **list-only + đủ deadline + đủ seniority**, hiện chỉ VietnamWorks đạt. ITViec/TopCV phải hoặc có chiến lược list-filter/provenance và chấp nhận deadline null, hoặc tạm ngừng ingest cho đến khi tìm được payload list/API phù hợp.

## Ma trận field theo source

| Field | VietnamWorks search API | ITViec search HTML | ITViec `/content` partial | TopCV list hiện crawler đọc |
|---|---:|---:|---:|---:|
| Source job id / URL | Có | Có | Có | Có |
| Title / company | Có | Có | Có | Có |
| Category native | Có (`jobFunction`) | Có `Job Expertise` trên card | Có `Job Expertise` + `Job Domain` | Có category tooltip trên từng card; phải parse và validate |
| Seniority native | Có nhưng coarse (`jobLevelId`) | Có qua membership của 5 filter native | Không hiển thị trực tiếp | Có qua membership của 8 filter `position` |
| Kinh nghiệm | Có `yearsOfExperience` | Không | Có trong body nhưng không phải field ổn định | Có text trên card |
| Ngày đăng | Có exact `approvedOn` | Relative text | Relative text | Relative text |
| Ngày hết hạn | Có exact `expiredOn` | Không | Không | Parser hiện không lấy |
| Job type / working model | Có `typeWorkingId` | Có At office/Hybrid/Remote | Có | Parser hiện không lấy |
| Skills | Có khi record công khai | Có | Có | Có tags |
| Mô tả/yêu cầu | API có field nhưng một số record ẩn | Không | Có đầy đủ | Không |

## VietnamWorks

### Mapping native đã xác minh trên live page/API

Native job levels của website:

- `8`: Thực tập sinh/Sinh viên — Intern/Student
- `1`: Mới tốt nghiệp — Fresher/Entry level
- `5`: Nhân viên — Experienced (non-manager)
- `7`: Trưởng phòng — Manager
- `3`: Giám đốc và cấp cao hơn — Director and above

`jobLevelId=5` không được map thẳng thành Junior/Middle/Senior vì nó bao phủ toàn bộ IC. Cần dùng title và `yearsOfExperience` làm evidence bổ sung.

API search trả trực tiếp `approvedOn`, `expiredOn`, `yearsOfExperience`, `typeWorkingId`, `jobFunction`, `jobLevelId`, `jobLevelVI` và `jobLevel`. Đây là nguồn có thể giữ list/API-only.

### Lỗi đã phát hiện

Fallback URL hiện tại `https://www.vietnamworks.com/job/{id}` trả về 404. URL đúng có dạng:

`https://www.vietnamworks.com/{alias-or-title-slug}-{jobId}-jv`

Khi API trả `jobUrl` rỗng nhưng có title, crawler phải dựng slug theo format trên. Đã xác minh URL dựng từ title của job `2091040` trả HTTP 200.

## ITViec

### Kiểm chứng bằng Firecrawl trên search/filter live

Trang search Java trả 148 job và 20 card ở trang đầu. Số lượng theo filter native:

- Internship: 7
- Fresher: 5
- Junior: 52
- Senior: 126
- Manager: 37

Các tập filter **có giao nhau thật**, không phải lỗi parser. Trong các trang đã chụp có job xuất hiện đồng thời ở `Junior + Senior`, `Junior + Manager`, `Senior + Manager`, và `Internship + Fresher`. Ví dụ title `Java Backend Developer (Middle/Senior)` và `Technical Lead Java` xuất hiện ở nhiều membership phù hợp.

Điều này chứng minh một job không thể được mô hình hóa đúng bằng một `seniority_level_id`. Filter membership là evidence native mạnh hơn việc chỉ dò từ khóa trong title, nhưng phải được lưu dưới dạng nhiều quan hệ.

Các URL expertise của ITViec cũng không hoàn toàn sạch. `backend-developer`, `data-engineer`, `frontend-developer`, `fullstack-developer`, `game-developer`, `mobile-application-developer` có mẫu đầu khá chuẩn; nhưng `database-administrator` chứa cả Network Engineer, Manual Tester, AppSec và Solution Architect, còn `security-engineer` có cả Fullstack/DevSecOps. Vì vậy crawler phải parse `Job Expertise` của **từng card** và fail-closed nếu expertise không map được sang category DB đang crawl; không được tin URL category một cách tuyệt đối.

### Chất lượng nguồn

Không nên bỏ ITViec vì chất lượng dữ liệu gốc tốt. Mẫu 8 job live đều có JSON-LD `JobPosting` với:

- `datePosted`
- `validThrough`
- `employmentType`
- `experienceRequirements`
- `skills`
- `jobLocation`
- `baseSalary`
- `description`
- `jobBenefits`

Tuy nhiên đây là dữ liệu detail, không nằm trong list response.

### Endpoint/payload đã tìm thấy

- Search là server-rendered HTML: `/it-jobs?...`.
- Website dùng HTML partial để preview: `/it-jobs/{slug}/content`.
- Partial có title, company, location, working model, skills, `Job Expertise`, `Job Domain`, description và requirements.
- Partial **không có** `validThrough` và không có exact `datePosted`.
- Thử `Accept: application/json`, `.json` và `/content.json` đều trả 404 `{}`. Chưa có bằng chứng về JSON jobs API công khai.
- API public lộ trên search chỉ có `/api/v1/tags/populars`, phục vụ autocomplete tags, không phải job data.

### Seniority không được phép map như hiện tại

Filter native của ITViec chỉ có:

- Internship
- Fresher
- Junior
- Senior
- Manager

ITViec không có native `Middle`. Mapping `middle -> Senior` chỉ phù hợp để mở rộng truy vấn, không phải bằng chứng để lưu job là Middle hay Senior.

`experienceRequirements.monthsOfExperience` trong JSON-LD cũng là bucket, không phải lúc nào là yêu cầu thật. Trong mẫu live có job yêu cầu 4+ năm trong body nhưng JSON-LD là 10 tháng; job yêu cầu 5+ năm nhưng JSON-LD là 37 tháng. Không được dùng field này một mình để suy ra exact experience.

### Phương án list-only tối ưu

Nếu giữ ITViec mà không crawl detail:

1. Parse thêm `Job Expertise`, `Job Domain`, working model và skills ngay từ card.
2. Fan-out search theo 5 native level filters và ghi lại `matched_source_level_filters` cho mỗi job. Đây là provenance từ bộ lọc của source, không phải canonical level duy nhất.
3. Canonical seniority lấy từ giao của: filter membership + title + experience text nếu có. Job như `Junior/Middle` phải giữ nhiều mức, không ép thành một UUID.
4. `expired_at` phải để null. Dùng `last_seen_at` + trạng thái active/inactive để vận hành, không giả deadline.

Nếu `expired_at` bắt buộc cho mọi job, ITViec không đáp ứng ràng buộc list-only và phải tạm disable.

## TopCV

### Kiểm chứng bằng Firecrawl trên search/filter live

URL Software Engineer cố định trả 409 job, 50 card ở trang đầu. Các filter native `position` đã xác minh từ chính HTML live:

- `0`: Tất cả
- `1`: Nhân viên
- `2`: Trưởng nhóm
- `3`: Trưởng/Phó phòng
- `10`: Quản lý/Giám sát
- `20`: Trưởng chi nhánh
- `25`: Phó giám đốc
- `30`: Giám đốc
- `50`: Thực tập sinh

Config hiện tại đang thiếu `position=20`. Với Software Engineer, số lượng live lần lượt là: Nhân viên 309, Trưởng nhóm 84, Trưởng/Phó phòng 5, Quản lý/Giám sát 1, Thực tập sinh 10; các mức còn lại bằng 0 tại thời điểm kiểm tra.

`data-job-position` trên card là **thứ tự card 1..50**, không phải job level native. Tuyệt đối không map attribute này sang seniority. Seniority list-only phải đến từ URL filter `position` mà job xuất hiện trong đó.

### Hai lỗi parser nghiêm trọng

1. Parser đang lấy tất cả `[data-original-title]` làm `skills`. Trên card, attribute này còn chứa title, company, location HTML, category, education, benefits, experience và update time. Vì vậy `skills` hiện bị nhiễm dữ liệu không phải skill; selector phải được giới hạn đúng vùng tag kỹ năng.
2. Khi một filter có `totalJob=0`, TopCV vẫn có thể render 50 card gợi ý không liên quan trong cùng selector `job-item-search-result`. Mẫu `position=30` cho Software Engineer có total bằng 0 nhưng raw HTML chứa job sales, bếp, tài chính... Parser hiện tại sẽ ingest nhầm. Crawler phải đọc `const totalJob`/heading trước và trả rỗng khi bằng 0, sau đó vẫn validate native category tooltip trên từng card.

Firecrawl cũng xác minh category tooltip hiện diện trên card và có thể dùng làm native category evidence. Nhưng URL category không bảo đảm sạch tuyệt đối: mẫu Network Engineer có nhiều card lân cận/không rõ liên quan, nên validation từng card vẫn bắt buộc.

### Những gì list parser hiện lấy

- title, company, source URL/id
- salary text/range
- location
- experience text
- relative posted/update text
- visible/hidden tags và logo

### Những gì list parser hiện không lấy

- exact application deadline
- native level label/id của từng job
- job type
- native category evidence trên từng card

TopCV detail page có các field `Hạn nộp hồ sơ`, `Cấp bậc`, `Kinh nghiệm`, `Loại hình làm việc` và category chain, nhưng dùng detail trái với ràng buộc chi phí hiện tại.

Host `api.topcv.vn` tồn tại nhưng chưa tìm được route search public ổn định; các route thông dụng bị Cloudflare trả 403. Do đó chưa được phép tuyên bố TopCV có API dùng được.

### Phương án list-only đã đủ cơ sở để triển khai

1. Crawl fixed category URL và fan-out theo các `position` có ý nghĩa; merge theo source job id và lưu nhiều filter membership.
2. Đọc `totalJob` trước card extraction để chặn recommendation fallback khi 0 kết quả.
3. Parse category tooltip trên từng card và chỉ nhận khi map tương thích với category DB đang chạy.
4. Scope selector skill đúng vùng; không dùng toàn bộ tooltip.
5. List live không có exact deadline hoặc countdown deadline. `expired_at` phải null; không được suy từ ngày đăng.

Frontend có endpoint quick-view `GET /job-view-detail?id={jobId}&u_sr_id=...` trả HTML detail cho từng card, nhưng đây vẫn là **một request detail cho mỗi job**, không phải batch/list API. Không sử dụng endpoint này trong production crawl vì trái ràng buộc chi phí. Chưa tìm thấy public/batch search API đáng tin cậy thay thế SSR list.

### Detail chỉ dùng để kiểm chứng capability

Một detail mẫu có JSON-LD `datePosted`, `validThrough`, `employmentType`, `experienceRequirements` và `occupationalCategory`. Điều này chứng minh deadline tồn tại ở detail, đồng thời xác nhận nó **không bị ẩn trong list HTML** đã kiểm tra. Kết luận vận hành vẫn là không gọi detail hàng loạt.

## Audit DB `job_posts`

### Cột thừa hoặc có nguy cơ drift

- `level`: canonical code trùng ý nghĩa với `seniority_level_id`; nên bỏ khỏi DB.
- `seniority_level_name`: snapshot tên trùng bảng `seniority_levels`; nên join theo FK.
- `job_category_name`: snapshot tên trùng bảng `job_categories`; nên join theo FK.
- `category_confidence`: hiện bị hard-code `0.9`, không phản ánh chất lượng; phải tính từ strategy thật hoặc bỏ.
- `source_category_raw`: chỉ có ích nếu chuẩn hóa cho cả ba source; hiện chủ yếu chứa VietnamWorks `jobFunction` và trùng một phần với `raw`.

### Cột nên giữ nhưng đổi nghĩa/tên rõ ràng

- `seniority_text` -> `source_seniority_text`: raw label của source, có thể null.
- `experience` -> `experience_text`: raw/display text của source.
- `salary_text`: giữ cùng min/max vì “thỏa thuận”, range và visibility không luôn parse được.
- `search_text`: giữ vì là derived index phục vụ research DB-only.
- `content_hash`: giữ cho change detection.
- `dedup_key`: giữ cho chống repost/duplicate; không cùng chức năng với content hash.
- `posted_at`, `expired_at`, `last_seen_at`: giữ nhưng định nghĩa tách bạch.

### Thiếu mô hình nhiều category/nhiều seniority

Một job có thể là `Junior/Middle`, `Middle/Senior`, hoặc thuộc nhiều role. Một `job_category_id` và một `seniority_level_id` làm mất dữ liệu.

Thiết kế chuẩn hơn:

- `job_post_categories(job_post_id, category_id, is_primary, evidence_type, confidence, evidence)`
- `job_post_seniority_levels(job_post_id, seniority_level_id, evidence_type, confidence, evidence)`

`job_posts` chỉ giữ facts của posting. Category/seniority canonical nằm ở join table; raw source evidence nằm trong `source_metadata` hoặc các cột raw có tên rõ.

### UUID `00000000-0000-4000-8000-000000000008`

Đây là deterministic seed UUID của code `tech_lead`, không phải ID ITViec/TopCV/VietnamWorks. Nó hợp lệ và giúp seed portable, nhưng hình thức dễ gây hiểu nhầm. Vấn đề thật không nằm ở UUID mà ở việc DB đang đồng thời lưu `level`, `seniority_level_id`, `seniority_level_name` và chỉ cho một mức seniority.

## Phương án triển khai đề xuất

### Phase 1 — không detail từng job

1. VietnamWorks: giữ API search; sửa URL fallback; lưu đầy đủ native evidence.
2. ITViec: chuyển list fetch sang direct HTTP; bỏ `prefer_bypass=True`; parse role/domain/working model; fan-out native level filters; không gọi `/content` trong category crawl.
3. TopCV: dùng Firecrawl theo trang category/filter, không theo job; thêm zero-result guard, card-level category validation, native level memberships và selector skill chính xác.
4. Thêm source capability policy: `deadline=exact|countdown|none`, `seniority=native|filter-membership|inferred`, `category=native|fixed-url|inferred`.

### Phase 2 — schema sạch

1. Tạo hai join tables category/seniority.
2. Backfill từ dữ liệu hiện có và evidence; không tạo mức giả khi thiếu evidence.
3. Chuyển research query sang join tables.
4. Sau khi test parity mới drop `level`, `job_category_name`, `seniority_level_name` và confidence hard-code.
5. Seed phải tạo đầy đủ taxonomy và quan hệ mới cho fresh install.

### Gate chất lượng trước khi bật source

Mỗi source phải chạy sample report tối thiểu 100 jobs/category mix:

- URL hợp lệ
- category canonical có evidence
- seniority canonical có evidence hoặc chủ động null
- `posted_at` semantics đúng
- `expired_at` exact/countdown-derived/null được phân biệt
- không dùng refresh time thay cho publish time
- tỷ lệ null theo field và source được xuất thành report

## Capability policy chốt theo ràng buộc chi phí

| Source | Transport production | Category evidence | Seniority evidence | Exact deadline list-only | Quyết định |
|---|---|---|---|---:|---|
| VietnamWorks | Search JSON API | `jobFunction` từng record | `jobLevelId` + experience/title | Có | Giữ, nguồn đầy đủ nhất |
| ITViec | Direct HTTP SSR list | `Job Expertise` từng card | Nhiều native filter memberships | Không | Giữ, `expired_at=null` |
| TopCV | Firecrawl theo category/filter page | Category tooltip từng card | Nhiều `position` memberships | Không | Giữ có guard, `expired_at=null` |

Không nên drop TopCV/ITViec chỉ vì thiếu deadline. `expired_at` là fact tùy chọn của source, không phải điều kiện tồn tại của job. Để quản lý lifecycle mà không bịa dữ liệu, dùng:

- `first_seen_at`: lần đầu crawler nhìn thấy
- `last_seen_at`: lần gần nhất còn xuất hiện
- `inactive_at`: thời điểm hệ thống xác nhận job biến mất sau policy N lần quét
- `expired_at`: chỉ lưu deadline exact do source cung cấp
- `deadline_source`: `native_exact | none` (mở rộng sau nếu có nguồn countdown đã kiểm chứng)

## Giới hạn của đợt Firecrawl này

Đã kiểm chứng sâu các luồng base, pagination, seniority filter, zero-result và detail mẫu. Đợt quét toàn bộ 53 URL mapping bị dừng giữa chừng do CLI Firecrawl keyless chạm rate limit. Trong task hiện tại không có Firecrawl MCP tool được expose và CLI báo chưa authenticated, nên báo cáo không tuyên bố sai rằng đã xác minh đủ 100% mọi mapping. Các mapping chưa có capture phải đi qua cùng quality gate trước khi bật production.
