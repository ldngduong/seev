# Hợp đồng detail phục vụ job fit

## Nguyên tắc chung

- Category crawl là nơi duy nhất ingest detail. Job fit chỉ đọc dữ liệu đã chuẩn hóa trong DB.
- `description` và `requirements` đều phải có tối thiểu 40 ký tự; bản ghi không đạt không được đánh dấu sẵn sàng để chấm.
- Không đưa phúc lợi, giới thiệu công ty, cảnh báo nền tảng, điều hướng hoặc việc làm liên quan vào AI.
- `content_hash` của detail cùng `content_hash` của CV quyết định việc tái sử dụng kết quả.

## TopCV

- Vận chuyển: một Firecrawl `/scrape` trên trang category, dùng `executeJavascript` fetch các URL detail cùng origin trong chính browser session.
- Deadline/cấp bậc: JSON-LD `JobPosting` (`validThrough`, `occupationalCategory`).
- Mô tả: khối có heading `Mô tả công việc` trong `.box-job-information-detail-item`.
- Yêu cầu: khối có heading `Yêu cầu ứng viên` trong `.box-job-information-detail-item`.
- Phúc lợi `Quyền lợi ứng viên` bị loại tại parser.

## ITviec

- Vận chuyển: giống TopCV, không tạo scrape detail riêng.
- Deadline: JSON-LD `validThrough`.
- Mô tả: `.paragraph` có heading `Job description` hoặc `Mô tả công việc`.
- Yêu cầu: `.paragraph` có heading `Your skills and experience`, `Requirements`, `Kỹ năng và kinh nghiệm` hoặc `Yêu cầu công việc`.
- Khi số năm trong JSON-LD xung đột nội dung hiển thị, nội dung yêu cầu hiển thị là bằng chứng ưu tiên cho AI; JSON-LD không được dùng để tự khẳng định ứng viên đạt yêu cầu.

## VietnamWorks

- Vận chuyển: API tìm kiếm công khai, không dùng Firecrawl.
- Deadline/cấp bậc: `expiredOn`, `jobLevelId`, `jobLevelVI/jobLevel`.
- Mô tả: ưu tiên `jobDescriptionNew`, fallback `jobDescription`.
- Yêu cầu: ưu tiên `jobRequirementNew`, fallback `jobRequirement`.
- Parser hỗ trợ cả HTML cũ và rich-text lồng nhau; chỉ lưu plain text đã chuẩn hóa.

## Chấm điểm

- Vai trò/chuyên môn: 20 điểm.
- Kỹ năng kỹ thuật: 30 điểm.
- Kinh nghiệm/phạm vi trách nhiệm: 25 điểm.
- Cấp bậc: 20 điểm.
- Địa điểm/hình thức làm việc: 5 điểm.
- AI phải gắn từng kết luận với trích dẫn thật từ CV; backend tự cộng và giới hạn tổng điểm 0–100.
