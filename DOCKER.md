# Chạy Seev bằng Docker

Stack gồm frontend Nginx, backend NestJS, crawler FastAPI, PostgreSQL và Redis.

## Cấu hình

Mỗi ứng dụng dùng env của chính nó:

- `be/.env`: database credentials, JWT, R2, Google, DeepSeek, Firecrawl và tài khoản admin seed.
- `fe/.env`: biến public dành cho trình duyệt.
- `crawl/.env`: Firecrawl và bearer token của crawler.
- `.env.docker` trong từng thư mục chỉ chứa hostname/URL nội bộ của Docker, không chứa secret.

Tạo các file còn thiếu từ `.env.example`. Khi bật bảo vệ crawler,
`CRAWLER_BEARER_TOKEN` trong `be/.env` và `crawl/.env` phải giống nhau.

Backend Docker yêu cầu ba biến seed admin sau trong `be/.env`:

```dotenv
SEEV_ADMIN_EMAIL=admin@example.com
SEEV_ADMIN_PASSWORD=change-this-password
SEEV_ADMIN_FULL_NAME=Seev Admin
```

## Khởi động

```bash
docker compose up --build -d
```

## Đẩy image lên Docker Hub

Đăng nhập bằng access token của Docker Hub:

```bash
docker login --username ldngduong
```

Ở ô password, nhập Personal Access Token, không nhập mật khẩu tài khoản. Tạo
token tại Docker Hub: Account settings → Personal access tokens.

Build và push `latest`:

```bash
chmod +x scripts/publish-images.sh
./scripts/publish-images.sh
```

Ba image được push:

- `ldngduong/seev-frontend:latest`
- `ldngduong/seev-backend:latest`
- `ldngduong/seev-crawler:latest`

Khi cần một bản có thể rollback chính xác, truyền thêm version:

```bash
./scripts/publish-images.sh 1.0.0
```

## Chạy trên VPS chỉ bằng image

Vẫn dùng chính `docker-compose.yml`. Chép lên VPS file Compose, thư mục
`docker/`, `be/.env`, `fe/.env` và `crawl/.env`. Không cần chép source code;
chỉ cần giữ các thư mục `be`, `fe`, `crawl` để chứa ba file env tương ứng.

```bash
docker login --username ldngduong
docker compose pull
docker compose up -d --no-build
```

Compose mặc định dùng `latest`. Có thể gộp pull và up thành một lệnh:

```bash
docker compose up -d --no-build --pull always
```

`SEEV_IMAGE_TAG` chỉ là tùy chọn khi cần deploy hoặc rollback một version cụ
thể, ví dụ `SEEV_IMAGE_TAG=1.0.0 docker compose up -d --no-build`.

Container `backend-init` sẽ tự động:

1. Chạy toàn bộ migration còn thiếu.
2. Seed taxonomy CNTT.
3. Seed bảng giá, system settings và tài khoản admin.

Backend chỉ khởi động khi bước này thành công. Xem trạng thái và log bằng:

```bash
docker compose ps
docker compose logs -f backend-init backend crawler
```

Các cổng local:

- Frontend: `http://localhost:5555`
- Backend: `http://localhost:3000`
Dữ liệu PostgreSQL và Redis nằm trong named volumes, nên được giữ lại khi
container được tạo lại. PostgreSQL và Redis không publish cổng ra host; backend
kết nối trực tiếp trong Docker network qua `postgres:5432` và `redis:6379`.

Crawler không publish cổng ra host và không cần domain. Backend gọi crawler
trực tiếp trong Docker network qua `http://crawler:8000`.
