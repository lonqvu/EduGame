# EduGame Platform

Nền tảng web cho phép **giáo viên** tạo và tùy chỉnh trò chơi giáo dục cho **học sinh tiểu học**: tạo game từ template,
chỉnh sửa câu hỏi / đáp án / giao diện / cài đặt, sau đó publish để học sinh tham gia chơi.

- Tổng quan sản phẩm: [docs/PROJECT.md](docs/PROJECT.md)
- Kiến trúc: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Quy ước code: [docs/CODING_CONVENTION.md](docs/CODING_CONVENTION.md)

## Tech stack

| Layer | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Maven (wrapper), Spring Web, Spring Data JPA, Validation, Flyway, Lombok, MapStruct, Springdoc OpenAPI |
| Frontend | React 19, TypeScript, Vite, Ant Design 6, Tailwind CSS 4, Zustand, Axios, React Hook Form, dnd-kit, Motion, React Router |
| Database | PostgreSQL 17 (JSONB cho config riêng của từng loại game) |
| Infra | Docker Compose |

## Cấu trúc thư mục

```
.
├── backend/              # Spring Boot (modular monolith)
├── frontend/             # React + Vite
├── database/             # Ghi chú DB, seed dev (migration nằm trong backend - Flyway)
├── docs/                 # Tài liệu dự án
├── docker-compose.yml    # PostgreSQL
├── .env.example
└── README.md
```

## Yêu cầu

- JDK 21
- Node.js 20.19+ hoặc 22.12+ (khuyến nghị 22 LTS) và npm
- Docker + Docker Compose v2
- **Không cần cài Maven** — dùng `mvnw` / `mvnw.cmd` có sẵn trong `backend/`.

## Chạy dự án (local)

### 1. Cấu hình môi trường

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

File `.env` ở root được dùng chung bởi Docker Compose và frontend (Vite `envDir: '..'`).
Backend đọc cùng tên biến từ environment; nếu không set sẽ dùng giá trị mặc định trong
`backend/src/main/resources/application.yml` (khớp với `.env.example`).

### 2. Khởi động PostgreSQL

```bash
docker compose up -d --wait
docker compose ps           # STATUS phải là (healthy)
```

### 3. Chạy backend

```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
```

Flyway tự chạy migration khi khởi động. Sau khi chạy:

- API base: <http://localhost:8080/api>
- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

### 4. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở <http://localhost:5173>.

## Lệnh thường dùng

| Mục đích | Lệnh |
|---|---|
| Build backend (kèm test) | `cd backend && ./mvnw clean package` |
| Chạy test backend | `cd backend && ./mvnw test` |
| Chạy jar | `java -jar backend/target/edu-game-backend-0.0.1-SNAPSHOT.jar` |
| Build frontend | `cd frontend && npm run build` |
| Type-check frontend | `cd frontend && npm run typecheck` |
| Lint frontend | `cd frontend && npm run lint` |
| Dừng DB | `docker compose down` |
| Xoá sạch dữ liệu DB | `docker compose down -v` |

## Biến môi trường

| Biến | Mặc định | Dùng bởi |
|---|---|---|
| `DB_HOST` | `localhost` | backend |
| `DB_PORT` | `5432` | backend, compose |
| `DB_NAME` | `edugame` | backend, compose |
| `DB_USERNAME` | `edugame` | backend, compose |
| `DB_PASSWORD` | `edugame` | backend, compose |
| `SERVER_PORT` | `8080` | backend |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | backend (phân tách bằng dấu phẩy) |
| `LOG_LEVEL_APP` / `LOG_LEVEL_SQL` | `DEBUG` / `INFO` | backend |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | frontend |

## Xử lý sự cố

- **Port 5432 đã bị dùng** (đã cài PostgreSQL local): đổi `DB_PORT` trong `.env` (ví dụ `5433`) rồi `docker compose up -d`.
- **Backend báo `Schema-validation: missing table`**: entity mới chưa có migration Flyway tương ứng — thêm file `V{n}__*.sql`.
- **Flyway báo checksum mismatch**: đã sửa một migration đã chạy. Không sửa migration cũ; tạo migration mới.
  Ở local có thể reset bằng `docker compose down -v`.
