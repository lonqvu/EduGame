# Kiến trúc — EduGame Platform

## 1. Tổng quan

```
┌──────────────────────┐   REST/JSON    ┌──────────────────────────────┐   JDBC   ┌──────────────┐
│ Frontend (SPA)       │ ─────────────▶ │ Backend (Spring Boot)        │ ───────▶ │ PostgreSQL   │
│ React + Vite         │   /api/v1/**   │ Modular Monolith             │          │ + Flyway     │
│ :5173                │ ◀───────────── │ :8080                        │ ◀─────── │ :5432        │
└──────────────────────┘                └──────────────────────────────┘          └──────────────┘
```

- **Modular Monolith**: một ứng dụng Spring Boot, một database, chia module theo nghiệp vụ. Không microservice.
- **Frontend và backend tách riêng**, giao tiếp qua REST. Không WebSocket ở MVP.
- **Schema do Flyway quản lý**. Hibernate chỉ `validate`, không bao giờ `create`/`update`.

## 2. Backend

### 2.1 Cấu trúc package

Tổ chức **theo business module**, không tổ chức toàn project theo `controller/service/repository` chung.

```
com.edugame
├── EduGameApplication.java
├── common/          # Shared kernel — KHÔNG phụ thuộc module nghiệp vụ nào
│   ├── config/      # WebConfig (CORS), JpaConfig (auditing), OpenApiConfig, AppProperties
│   ├── entity/      # BaseEntity (id UUID, created_at, updated_at)
│   └── exception/   # ApiError, BusinessException, ResourceNotFoundException, GlobalExceptionHandler
├── security/        # Cấu hình bảo mật dùng chung
├── auth/
├── user/
├── template/
├── game/
├── question/
├── asset/
├── session/
└── result/
```

### 2.2 Cấu trúc bên trong một module

Ví dụ module `game` (áp dụng tương tự cho các module khác; chỉ tạo sub-package khi cần):

```
com.edugame.game
├── api/             # GameController — REST endpoint, chỉ nhận/trả DTO
├── dto/             # CreateGameRequest, UpdateGameRequest, GameResponse (Java record)
├── service/         # GameService — business logic, @Transactional
├── domain/          # Game (@Entity), GameStatus (enum), ...
├── repository/      # GameRepository extends JpaRepository
└── mapper/          # GameMapper (MapStruct) — Entity <-> DTO
```

Luồng xử lý: `Controller → Service → Repository → DB`, `Entity ↔ DTO` qua MapStruct tại tầng service.

### 2.3 Quy tắc phụ thuộc giữa module

| Quy tắc | |
|---|---|
| `common` không import bất kỳ module nghiệp vụ nào | bắt buộc |
| Module A gọi module B **qua service public của B** (và DTO của B) | bắt buộc |
| Module A **không** dùng trực tiếp `Repository` hoặc `Entity` của module B | bắt buộc |
| Không phụ thuộc vòng (A → B → A) | bắt buộc |
| Quan hệ JPA giữa entity khác module: ưu tiên lưu **ID** (`UUID gameId`) thay vì `@ManyToOne` | khuyến nghị |

Hướng phụ thuộc dự kiến:

```
auth ──▶ user
template
game ──▶ template, user
question ──▶ game
asset
session ──▶ game
result ──▶ session, question
(tất cả) ──▶ common
```

### 2.4 REST API

- Prefix: `/api/v1/...` (CORS đã cấu hình cho `/api/**`).
- Chỉ trả **DTO**, không bao giờ trả JPA Entity.
- Lỗi luôn trả theo format `ApiError`:

```json
{
  "timestamp": "2026-10-01T12:00:00Z",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "path": "/api/v1/games",
  "violations": [{ "field": "title", "message": "must not be blank" }]
}
```

- Tài liệu API tự sinh: Swagger UI `/swagger-ui.html`, OpenAPI `/v3/api-docs`.

### 2.5 Persistence

- PostgreSQL 17, khóa chính `UUID` (`@GeneratedValue(strategy = UUID)`), thời gian `TIMESTAMPTZ` (`Instant`), timezone UTC.
- `created_at` / `updated_at` qua Spring Data JPA Auditing (`BaseEntity`).
- `spring.jpa.open-in-view=false`: không lazy-load ngoài transaction; service phải load đủ dữ liệu.
- Migration: `backend/src/main/resources/db/migration/V{n}__{mô_tả}.sql`.

## 3. Thiết kế mở rộng loại game (Game type + JSONB)

Mục tiêu: **thêm loại game mới không cần đổi schema database**.

### 3.1 Dữ liệu

Phần chung → cột thường; phần riêng theo loại game → `JSONB`.

| Bảng (dự kiến) | Cột chung | Cột JSONB |
|---|---|---|
| `templates` | `id`, `code`, `name`, `game_type`, `thumbnail_url`, ... | `default_config` |
| `games` | `id`, `owner_id`, `template_id`, `game_type`, `title`, `status`, ... | `config` (giao diện + cài đặt riêng) |
| `questions` | `id`, `game_id`, `order_index`, `question_type`, `prompt`, ... | `content` (đáp án, cặp ghép, vị trí kéo-thả, ...) |
| `results` | `id`, `session_id`, `player_name`, `score`, ... | `answers` |

Mapping JSONB trong Hibernate 6 (không cần thư viện thêm):

```java
@JdbcTypeCode(SqlTypes.JSON)
@Column(name = "config", columnDefinition = "jsonb", nullable = false)
private Map<String, Object> config;   // hoặc một record cấu hình có kiểu rõ ràng
```

### 3.2 Backend: strategy theo game type

```java
public enum GameType { QUIZ, MATCHING, DRAG_DROP_SORT /* thêm ở đây */ }

public interface GameConfigValidator {
    GameType supports();
    void validate(Map<String, Object> config);   // ném BusinessException nếu sai
}
```

Mỗi loại game có một `@Component` implement `GameConfigValidator`; `GameService` nhận
`List<GameConfigValidator>` qua constructor và chọn theo `GameType`. Thêm loại game = thêm enum + một class, không sửa code cũ.

### 3.3 Frontend: registry theo game type

```ts
// game-engine/registry.ts (dự kiến)
export const gameRegistry: Record<GameType, GameDefinition> = {
  QUIZ: { Player: QuizPlayer, Editor: QuizEditor, defaultConfig: quizDefaults },
  // thêm loại game mới ở đây
}
```

`editor/` và `game-engine/` chỉ tra registry theo `gameType`, không `switch/case` rải rác.

### 3.4 Checklist thêm một loại game

1. Thêm giá trị vào `GameType` (backend + `types/` frontend).
2. Backend: thêm `GameConfigValidator` cho loại mới.
3. Flyway: migration **insert template** mới (không đổi cấu trúc bảng).
4. Frontend: thêm `Player` (game-engine) + `Editor` (editor) + `defaultConfig`, đăng ký vào registry.

## 4. Frontend

### 4.1 Cấu trúc

```
frontend/src
├── main.tsx            # Providers: StyleProvider(layer) → ConfigProvider(vi_VN) → Antd App → Router
├── router.tsx          # Định nghĩa route
├── index.css           # Tailwind + thứ tự CSS layer
├── pages/              # Component cấp route (HomePage, NotFoundPage, ...)
├── components/         # UI dùng chung, không chứa logic nghiệp vụ (layout/, ...)
├── editor/             # Trình chỉnh sửa game cho giáo viên (form, dnd-kit sắp xếp câu hỏi, preview)
├── game-engine/        # Runtime chơi game cho học sinh (Player theo game type, chấm điểm phía client, Motion)
├── api/                # httpClient.ts (Axios) + mỗi module một file: gameApi.ts, templateApi.ts, ...
├── store/              # Zustand store (auth, editor state, ...)
├── hooks/              # Custom hook dùng chung
├── types/              # Kiểu dữ liệu/DTO khớp với backend
└── utils/              # Hàm thuần, env
```

### 4.2 Nguyên tắc

- **Server state** (dữ liệu từ API) gọi qua `api/*`, không gọi `axios` trực tiếp trong component.
- **Client state** dùng chung nhiều màn hình → Zustand; state cục bộ → `useState`.
- **Form** dùng React Hook Form + component Antd (qua `Controller`).
- **Kéo-thả** dùng dnd-kit; **animation** dùng Motion (`motion/react`).
- **Antd + Tailwind**: Antd dùng cho component, Tailwind cho layout/spacing. Antd style được đặt trong CSS layer `antd`
  (`<StyleProvider layer>`), thứ tự `theme, base, antd, components, utilities` → Tailwind utility override được Antd
  mà không cần `!important`, preflight không phá style Antd.
- Alias import `@/` → `src/`.

## 5. Môi trường & triển khai

- Local: `docker compose` chạy PostgreSQL; backend và frontend chạy trực tiếp trên máy dev.
- Cấu hình qua biến môi trường (xem `.env.example`); không commit `.env`.
- Production (sau MVP): build backend thành jar / image, frontend thành static files (`npm run build` → `dist/`).
