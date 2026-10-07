# EduGame Platform — Tổng quan dự án

## 1. Mục tiêu

Xây dựng nền tảng web giúp giáo viên tiểu học **tạo nhanh** các trò chơi giáo dục mà **không cần lập trình**,
và giúp học sinh **chơi dễ dàng** trên trình duyệt (máy tính, máy tính bảng).

Giá trị cốt lõi:

- Giáo viên bắt đầu từ **template** có sẵn thay vì làm từ đầu.
- Tùy chỉnh được **câu hỏi, đáp án, giao diện, cài đặt** của từng game.
- **Publish** một lần, chia sẻ cho học sinh bằng mã / link.
- Xem **kết quả** của học sinh sau khi chơi.

## 2. Người dùng

| Vai trò | Mô tả | Nhu cầu chính |
|---|---|---|
| Teacher | Giáo viên tiểu học | Tạo, chỉnh sửa, publish game; xem kết quả lớp |
| Student | Học sinh 6–11 tuổi | Vào game bằng mã/link, chơi, xem điểm. Giao diện to, rõ, ít chữ |
| Admin | Quản trị hệ thống | Quản lý template, người dùng |

## 3. Luồng chính (MVP)

1. Giáo viên đăng nhập.
2. Chọn một **template** (ví dụ: trắc nghiệm, ghép cặp, kéo-thả sắp xếp).
3. Hệ thống tạo **game** ở trạng thái `DRAFT`, copy cấu hình mặc định từ template.
4. Giáo viên chỉnh sửa trong **Editor**: câu hỏi, đáp án, hình ảnh/âm thanh (asset), giao diện, cài đặt (thời gian, số lượt...).
5. Giáo viên **publish** game → trạng thái `PUBLISHED`.
6. Giáo viên mở một **session** → hệ thống sinh mã tham gia.
7. Học sinh nhập mã + tên → chơi → nộp bài.
8. Hệ thống lưu **result**; giáo viên xem kết quả theo session.

## 4. Phạm vi MVP

**Trong phạm vi**

- Quản lý tài khoản giáo viên, đăng nhập.
- Template + game (CRUD, draft/publish).
- Câu hỏi/đáp án, asset (ảnh, âm thanh).
- Session chơi + kết quả.
- Một số loại game cơ bản render bằng React (DOM + Motion + dnd-kit).

**Ngoài phạm vi MVP** (cân nhắc sau)

| Không làm | Lý do |
|---|---|
| Microservices | Modular monolith đủ cho quy mô hiện tại, dễ vận hành |
| Redis | Chưa có nhu cầu cache / pub-sub phân tán |
| WebSocket / realtime multiplayer | Học sinh chơi độc lập, nộp kết quả qua REST |
| Phaser / game engine canvas | Các loại game MVP làm được bằng DOM + animation |

## 5. Module nghiệp vụ

| Module | Trách nhiệm |
|---|---|
| auth | Đăng nhập, token, đổi/quên mật khẩu |
| user | Tài khoản, hồ sơ, vai trò |
| template | Template game + cấu hình mặc định |
| game | Game của giáo viên, cấu hình theo loại game (JSONB), vòng đời draft → published |
| question | Câu hỏi, đáp án thuộc game |
| asset | Upload / quản lý ảnh, âm thanh |
| session | Phiên chơi, mã tham gia |
| result | Bài làm, điểm, thống kê |
| security | Cấu hình bảo mật dùng chung |
| common | Hạ tầng dùng chung (config, base entity, xử lý lỗi) |

Chi tiết kiến trúc: [ARCHITECTURE.md](ARCHITECTURE.md).

## 6. Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Khởi tạo cấu trúc project, build backend/frontend, Docker Compose PostgreSQL | ✅ Xong |
| Hạ tầng dùng chung backend (config, BaseEntity, error handling, OpenAPI, Flyway baseline) | ✅ Xong |
| Hạ tầng dùng chung frontend (Axios client, router, layout, Antd + Tailwind) | ✅ Xong |
| Nghiệp vụ (auth, game, template, ...) | ⏳ Chưa bắt đầu |

## 7. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Template | Mẫu game có sẵn, định nghĩa loại game + cấu hình mặc định |
| Game type | Loại cơ chế chơi (quiz, matching, ...). Quyết định cấu trúc `config` và cách render |
| Game | Một trò chơi cụ thể giáo viên tạo từ template |
| Config | Cấu hình riêng theo game type, lưu dạng JSONB |
| Session | Một lần mở game cho học sinh vào chơi |
| Result | Kết quả của một học sinh trong một session |
