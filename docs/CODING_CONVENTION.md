# Coding Convention — EduGame Platform

Nguyên tắc chung: **clean code, dễ bảo trì, không over-engineering**. Viết code giống code xung quanh.
Không thêm dependency khi chưa thực sự cần — nếu cần, ghi rõ lý do trong PR.

## 1. Backend (Java / Spring Boot)

### 1.1 Đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Package | lowercase, theo module | `com.edugame.game.service` |
| Entity | Danh từ số ít | `Game`, `Question` |
| Repository | `{Entity}Repository` | `GameRepository` |
| Service | `{Entity}Service` | `GameService` |
| Controller | `{Entity}Controller` | `GameController` |
| Request DTO | `{Action}{Entity}Request` | `CreateGameRequest`, `UpdateGameRequest` |
| Response DTO | `{Entity}Response`, `{Entity}SummaryResponse` | `GameResponse` |
| Mapper | `{Entity}Mapper` | `GameMapper` |
| Exception | `{Lý do}Exception` | `GameAlreadyPublishedException` |
| Enum value | UPPER_SNAKE_CASE | `DRAFT`, `PUBLISHED` |

### 1.2 Dependency Injection

- **Chỉ dùng constructor injection**: field `private final` + `@RequiredArgsConstructor`.
- Không dùng `@Autowired` trên field/setter.

```java
@Service
@RequiredArgsConstructor
public class GameService {
    private final GameRepository gameRepository;
    private final GameMapper gameMapper;
}
```

### 1.3 DTO & Entity

- **Không bao giờ** trả / nhận JPA Entity ở Controller. Luôn dùng DTO.
- DTO là **Java `record`**, đặt validation trên DTO request (`@NotBlank`, `@Size`, `@Valid` cho object lồng).
- Chuyển đổi Entity ↔ DTO bằng **MapStruct** (`componentModel = spring` và `unmappedTargetPolicy = ERROR`
  đã cấu hình global trong `pom.xml`). Không viết mapper tay trừ khi MapStruct không phù hợp.
- Entity:
  - Kế thừa `BaseEntity`.
  - Lombok: `@Getter`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`. **Không** dùng `@Data`,
    `@EqualsAndHashCode`, `@ToString` mặc định trên entity (lazy-loading, vòng lặp).
  - Thay đổi trạng thái qua method có nghĩa nghiệp vụ (`game.publish()`), hạn chế setter tràn lan.
  - Enum lưu bằng `@Enumerated(EnumType.STRING)`.

### 1.4 Service & Transaction

- Business logic nằm ở Service, không ở Controller hay Entity mapper.
- `@Transactional` đặt ở Service; method chỉ đọc dùng `@Transactional(readOnly = true)`.
- Controller mỏng: validate input (`@Valid`), gọi service, trả `ResponseEntity`/DTO.

### 1.5 Xử lý lỗi

- Lỗi nghiệp vụ dự kiến → ném `BusinessException` (hoặc lớp con), có `HttpStatus` + `code` ổn định (UPPER_SNAKE_CASE).
- Không bắt exception rồi nuốt; không trả `null` để báo lỗi.
- `GlobalExceptionHandler` chuyển mọi lỗi thành `ApiError`. Không tự build body lỗi trong controller.

### 1.6 REST API

| Quy ước | Ví dụ |
|---|---|
| Prefix + version | `/api/v1/...` |
| Danh từ số nhiều, kebab-case | `/api/v1/games`, `/api/v1/game-sessions` |
| Resource con | `/api/v1/games/{gameId}/questions` |
| Hành động không phải CRUD | `POST /api/v1/games/{id}/publish` |
| JSON field | camelCase |

Status code: `200` đọc/cập nhật, `201` tạo mới, `204` xóa, `400` validation, `401/403` auth, `404` không tìm thấy,
`409` xung đột trạng thái.

Phân trang: tham số `page` (bắt đầu từ 0), `size`, `sort`; trả về danh sách + thông tin trang.

Mỗi controller có `@Tag`, endpoint quan trọng có `@Operation` cho Swagger.

### 1.7 Khác

- Dùng `Instant` cho thời điểm, `UUID` cho ID.
- Không hard-code cấu hình; dùng `application.yml` + biến môi trường, bind qua `@ConfigurationProperties` (record).
- Log bằng `@Slf4j`; không log mật khẩu, token, dữ liệu cá nhân học sinh.
- Test: unit test cho service/logic; `@WebMvcTest` hoặc standalone MockMvc cho controller.

## 2. Database & Flyway

- **Mọi thay đổi schema đi qua Flyway.** `ddl-auto` luôn là `validate`, không bao giờ `create`/`update`.
- File: `backend/src/main/resources/db/migration/V{n}__{mo_ta_snake_case}.sql`, ví dụ `V2__create_users.sql`.
- **Không sửa migration đã merge/đã chạy.** Cần thay đổi → tạo migration mới.
- Mỗi migration làm một việc rõ ràng; có thể chạy trên DB trống từ V1.

| Quy ước | Ví dụ |
|---|---|
| Tên bảng: snake_case, số nhiều | `games`, `game_sessions` |
| Tên cột: snake_case | `owner_id`, `created_at` |
| Khóa chính | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Khóa ngoại | `{bang_so_it}_id`, constraint `fk_{bang}_{cot}` |
| Index | `idx_{bang}_{cot}`; **luôn index cột khóa ngoại** |
| Unique | `uk_{bang}_{cot}` |
| Thời gian | `TIMESTAMPTZ NOT NULL` (`created_at`, `updated_at`) |
| Enum | `VARCHAR(n)` + `CHECK` (không dùng PostgreSQL ENUM type — khó migrate) |
| Config riêng theo loại game | `JSONB NOT NULL DEFAULT '{}'::jsonb` |

JSONB: chỉ dùng cho dữ liệu **thay đổi theo game type**. Dữ liệu cần query/lọc/join thường xuyên → cột riêng.

## 3. Frontend (React / TypeScript)

### 3.1 Chung

- TypeScript strict; **không dùng `any`** (dùng `unknown` + thu hẹp kiểu nếu cần).
- Function component + hooks. Named export (`export function HomePage`), trừ khi thư viện yêu cầu default export.
- Import qua alias `@/` thay vì `../../..`.
- Chạy `npm run lint` và `npm run build` trước khi tạo PR.

### 3.2 Đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Component / Page file | PascalCase `.tsx` | `GameCard.tsx`, `GameEditorPage.tsx` |
| Hook | `useXxx.ts` | `useDebounce.ts` |
| Store | `xxxStore.ts`, hook `useXxxStore` | `authStore.ts` → `useAuthStore` |
| API module | `xxxApi.ts` | `gameApi.ts` |
| Type | PascalCase, file theo domain | `types/game.ts` → `Game`, `GameType` |
| Hằng số | UPPER_SNAKE_CASE | `MAX_QUESTIONS` |

### 3.3 Thư mục — đặt code ở đâu

| Thư mục | Chứa | Không chứa |
|---|---|---|
| `pages/` | Component cấp route, ghép các phần lại | Logic tái sử dụng |
| `components/` | UI dùng chung, không biết về nghiệp vụ cụ thể | Gọi API |
| `editor/` | UI & logic chỉnh sửa game của giáo viên | Runtime chơi game |
| `game-engine/` | Player theo game type, logic chơi/chấm điểm, registry | Gọi API trực tiếp |
| `api/` | Hàm gọi REST, dùng `httpClient` | State UI |
| `store/` | Zustand store | Gọi API phức tạp lặp lại ở nhiều nơi (đưa vào hook) |
| `hooks/` | Custom hook dùng chung | |
| `types/` | Kiểu dữ liệu, DTO khớp backend | Logic |
| `utils/` | Hàm thuần, không side-effect | Component |

### 3.4 API & state

- Mọi request qua `httpClient` (`api/httpClient.ts`); lỗi đã chuẩn hóa thành `ApiError`.
- Hàm API trả về data đã có kiểu: `getGame(id): Promise<GameResponse>`.
- Zustand: mỗi store một domain, nhỏ gọn; dùng selector (`useAuthStore((s) => s.user)`) để tránh re-render thừa.

### 3.5 UI

- Component có sẵn → dùng **Ant Design**. Layout, spacing, màu phụ → **Tailwind**.
- Hạn chế CSS file riêng và inline style; không dùng `!important`.
- Form: **React Hook Form**; component Antd bọc bằng `Controller`.
- Kéo-thả: **dnd-kit**. Animation: **Motion** (`import { motion } from 'motion/react'`).
- UI cho học sinh: chữ to, nút lớn, ít chữ, phản hồi trực quan (âm thanh/animation).
- Text hiển thị bằng tiếng Việt.

## 4. Git

- Branch: `feature/<mo-ta>`, `fix/<mo-ta>`, `chore/<mo-ta>`.
- Commit theo Conventional Commits: `feat(game): add publish endpoint`, `fix(editor): ...`, `docs: ...`.
- Một PR = một mục đích; PR có thay đổi DB phải kèm migration Flyway.
- Không commit `.env`, `target/`, `node_modules/`, `dist/`.
