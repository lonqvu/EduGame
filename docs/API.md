# Lớp vui – REST API

Danh sách toàn bộ API backend: mục đích, vị trí code backend và nơi frontend gọi.
Swagger UI (chạy thử trực tiếp): <http://localhost:8080/swagger-ui.html> · OpenAPI JSON: `/v3/api-docs`.

## Quy ước chung

| | |
|---|---|
| Base URL | `http://localhost:8080/api/v1` (frontend: `VITE_API_BASE_URL` = `.../api`, path bắt đầu bằng `/v1/...`) |
| Định dạng | JSON, field camelCase. Field `null` không được trả về (`default-property-inclusion: non_null`) |
| Người dùng hiện tại | Header `Authorization: Bearer <accessToken>`, token lấy từ `POST /auth/login` (mục 0), hạn 15 phút, gia hạn bằng `POST /auth/refresh` (mục 0b) với refresh token trong cookie HttpOnly. Thiếu token → `401` (trừ mục 0–0h và 2). Riêng profile `dev`: request **không có** header `Authorization` được coi là giáo viên `u-lan` (Cô Lan), để frontend chạy được khi chưa có màn đăng nhập (tắt bằng `APP_DEFAULT_USER_CODE=`). Xem [SecurityConfig.java](../backend/src/main/java/com/edugame/security/SecurityConfig.java), [CurrentUserService.java](../backend/src/main/java/com/edugame/user/service/CurrentUserService.java) |
| Định danh | Game, lớp dùng `code` (`g-addition`, `c-3a`). Câu hỏi (item), học sinh dùng `id` số |
| Quyền | Chỉ thấy / sửa game và lớp **của mình**. Game / lớp của người khác hoặc đã lưu trữ → `404` |
| Lỗi | Luôn theo format `ApiError` (xem [Mã lỗi](#mã-lỗi)) |

## Tổng quan

Cột **Backend**: controller · service. Cột **Frontend**: hàm trong `api/` · action trong `store/` gọi nó · màn hình dùng.

| # | Method | Path | Mục đích | Backend | Frontend |
|---|---|---|---|---|---|
| 0 | POST | `/auth/login` | Đăng nhập bằng email (hoặc username) + mật khẩu: access token + cookie refresh token | [AuthController.java:39](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L39) · [AuthService.java:41](../backend/src/main/java/com/edugame/auth/service/AuthService.java#L41) | [authApi.ts:5](../frontend/src/api/authApi.ts#L5) · [authStore.login](../frontend/src/store/authStore.ts#L28) · LoginPage |
| 0b | POST | `/auth/refresh` | Access token mới từ cookie, đổi refresh token mới | [AuthController.java:50](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L50) · [UserSessionService.java](../backend/src/main/java/com/edugame/auth/service/UserSessionService.java) | [session.ts:56](../frontend/src/api/session.ts#L56) · [authStore.restore](../frontend/src/store/authStore.ts#L22) (mỗi lần tải trang), gặp `401`, hẹn giờ 1 phút trước khi token hết hạn |
| 0c | POST | `/auth/logout` | Kết thúc phiên đăng nhập, xoá cookie | [AuthController.java:64](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L64) · [AuthService.java:68](../backend/src/main/java/com/edugame/auth/service/AuthService.java#L68) | [authApi.ts:11](../frontend/src/api/authApi.ts#L11) · [authStore.logout](../frontend/src/store/authStore.ts#L32) · TopBar (Đăng xuất) |
| 0d | POST | `/auth/register` | Đăng ký: gửi mã 6 số về email (chưa tạo tài khoản) | [AuthController.java:80](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L80) · [RegistrationService.java](../backend/src/main/java/com/edugame/auth/service/RegistrationService.java) | [authApi.ts:16](../frontend/src/api/authApi.ts#L16) · RegisterPage (bước 1) |
| 0e | POST | `/auth/register/resend` | Gửi lại mã | [AuthController.java:87](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L87) | [authApi.ts:21](../frontend/src/api/authApi.ts#L21) · RegisterPage (Gửi lại mã) |
| 0f | POST | `/auth/register/verify` | Nhập đúng mã: tạo giáo viên + đăng nhập | [AuthController.java:95](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L95) | [authApi.ts:27](../frontend/src/api/authApi.ts#L27) · [authStore.completeSignUp](../frontend/src/store/authStore.ts#L34) · RegisterPage (bước 2) |
| 0g | POST | `/auth/password/forgot` | Quên mật khẩu: gửi mã 6 số về email (cũng dùng để gửi lại mã) | [AuthController.java:109](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L109) · [PasswordResetService.java](../backend/src/main/java/com/edugame/auth/service/PasswordResetService.java) | [authApi.ts:40](../frontend/src/api/authApi.ts#L40) · ForgotPasswordPage |
| 0h | POST | `/auth/password/reset` | Nhập mã + mật khẩu mới: đổi mật khẩu, đăng xuất mọi phiên cũ, đăng nhập | [AuthController.java:118](../backend/src/main/java/com/edugame/auth/api/AuthController.java#L118) | [authApi.ts:46](../frontend/src/api/authApi.ts#L46) · [authStore.completePasswordReset](../frontend/src/store/authStore.ts#L40) · ForgotPasswordPage (bước 2) |
| 1 | GET | `/me` | Thông tin giáo viên đang dùng | [MeController.java:21](../backend/src/main/java/com/edugame/user/api/MeController.java#L21) · [CurrentUserService.java:45](../backend/src/main/java/com/edugame/user/service/CurrentUserService.java#L45) | [userApi.ts:4](../frontend/src/api/userApi.ts#L4) · [teacherStore.load](../frontend/src/store/teacherStore.ts#L34) · HomePage (lời chào, avatar) |
| 2 | GET | `/game-templates` | Danh sách loại game để chọn khi tạo game | [GameTemplateController.java:23](../backend/src/main/java/com/edugame/catalog/api/GameTemplateController.java#L23) · [GameTemplateService.java:29](../backend/src/main/java/com/edugame/catalog/service/GameTemplateService.java#L29) | [templateApi.ts:5](../frontend/src/api/templateApi.ts#L5) · [catalogStore.load](../frontend/src/store/catalogStore.ts#L17) · ChooseGamePage, HomePage, GameEditorPage (tên template) |
| 3 | GET | `/games` | Thư viện game của giáo viên | [GameController.java:34](../backend/src/main/java/com/edugame/game/api/GameController.java#L34) · [GameService.java:57](../backend/src/main/java/com/edugame/game/service/GameService.java#L57) | [gameApi.ts:13](../frontend/src/api/gameApi.ts#L13) · [loadGames](../frontend/src/store/gameLibraryStore.ts#L154) · HomePage (trò chơi gần đây) |
| 4 | POST | `/games` | Tạo game mới từ template | [GameController.java:40](../backend/src/main/java/com/edugame/game/api/GameController.java#L40) · [GameService.java:72](../backend/src/main/java/com/edugame/game/service/GameService.java#L72) | [gameApi.ts:18](../frontend/src/api/gameApi.ts#L18) · [createGame](../frontend/src/store/gameLibraryStore.ts#L179) (tạo game + 1 câu trống) · ChooseGamePage |
| 5 | GET | `/games/{code}` | Chi tiết game + cài đặt + câu hỏi (chỉ đọc) | [GameController.java:47](../backend/src/main/java/com/edugame/game/api/GameController.java#L47) · [GameService.java:88](../backend/src/main/java/com/edugame/game/service/GameService.java#L88) | [gameApi.ts:24](../frontend/src/api/gameApi.ts#L24) · [loadGame(id, "play")](../frontend/src/store/gameLibraryStore.ts#L164) · GridBoardPage (màn chiếu) |
| 5b | POST | `/games/{code}/draft` | Mở game để sửa: như GET nhưng tạo sẵn bản nháp | [GameController.java:53](../backend/src/main/java/com/edugame/game/api/GameController.java#L53) · [GameService.java:98](../backend/src/main/java/com/edugame/game/service/GameService.java#L98) | [gameApi.ts:30](../frontend/src/api/gameApi.ts#L30) · [loadGame(id, "edit")](../frontend/src/store/gameLibraryStore.ts#L164) · GameEditorPage |
| 6 | PATCH | `/games/{code}` | Đổi tên / thông tin / cài đặt game | [GameController.java:59](../backend/src/main/java/com/edugame/game/api/GameController.java#L59) · [GameService.java:104](../backend/src/main/java/com/edugame/game/service/GameService.java#L104) | [gameApi.ts:35](../frontend/src/api/gameApi.ts#L35) · [renameGame](../frontend/src/store/gameLibraryStore.ts#L186) (debounce 600ms) · GameEditorPage (ô tên game) |
| 7 | DELETE | `/games/{code}` | Lưu trữ game (xóa mềm) | [GameController.java:65](../backend/src/main/java/com/edugame/game/api/GameController.java#L65) · [GameService.java:134](../backend/src/main/java/com/edugame/game/service/GameService.java#L134) | — chưa có nút xóa |
| 8 | POST | `/games/{code}/publish` | Khóa bản nháp thành bản chính thức | [GameController.java:72](../backend/src/main/java/com/edugame/game/api/GameController.java#L72) · [GameService.java:139](../backend/src/main/java/com/edugame/game/service/GameService.java#L139) | — chưa có nút publish |
| 9 | POST | `/games/{code}/items` | Thêm 1 hoặc nhiều câu hỏi | [GameItemController.java:36](../backend/src/main/java/com/edugame/game/api/GameItemController.java#L36) · [GameItemService.java:40](../backend/src/main/java/com/edugame/game/service/GameItemService.java#L40) | [gameApi.ts:40](../frontend/src/api/gameApi.ts#L40) · [addQuestions](../frontend/src/store/gameLibraryStore.ts#L195) · GameEditorPage (Thêm câu hỏi, Dán nhiều câu) |
| 10 | PATCH | `/games/{code}/items/{itemId}` | Sửa một câu hỏi | [GameItemController.java:43](../backend/src/main/java/com/edugame/game/api/GameItemController.java#L43) · [GameItemService.java:61](../backend/src/main/java/com/edugame/game/service/GameItemService.java#L61) | [gameApi.ts:45](../frontend/src/api/gameApi.ts#L45) · [updateQuestion](../frontend/src/store/gameLibraryStore.ts#L204) (debounce 600ms) · QuestionForm |
| 11 | DELETE | `/games/{code}/items/{itemId}` | Xóa một câu hỏi | [GameItemController.java:50](../backend/src/main/java/com/edugame/game/api/GameItemController.java#L50) · [GameItemService.java:80](../backend/src/main/java/com/edugame/game/service/GameItemService.java#L80) | [gameApi.ts:50](../frontend/src/api/gameApi.ts#L50) · [removeQuestion](../frontend/src/store/gameLibraryStore.ts#L215) · GameEditorPage (Xóa câu này) |
| 12 | PUT | `/games/{code}/items/order` | Sắp xếp lại thứ tự câu hỏi | [GameItemController.java:56](../backend/src/main/java/com/edugame/game/api/GameItemController.java#L56) · [GameItemService.java:95](../backend/src/main/java/com/edugame/game/service/GameItemService.java#L95) | [gameApi.ts:55](../frontend/src/api/gameApi.ts#L55) · [reorderQuestions](../frontend/src/store/gameLibraryStore.ts#L224) · QuestionList (kéo-thả) |
| 13 | GET | `/classrooms` | Các lớp của giáo viên (xem mục 13: tạo, sửa, tạm ngưng, xóa lớp; thêm / sửa / xóa học sinh; ghi lần chơi) | [ClassroomController.java:31](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L31) · [ClassroomService.java:46](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L46) | [classroomApi.ts:6](../frontend/src/api/classroomApi.ts#L6) · [classStore.load](../frontend/src/store/classStore.ts#L32) (lấy lớp đầu tiên) · HomePage, ChooseGamePage, vòng quay, đua tên |
| 14 | GET | `/classrooms/{code}/students` | Danh sách học sinh + số sao | [ClassroomController.java:37](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L37) · [ClassroomService.java:62](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L62) | [classroomApi.ts:12](../frontend/src/api/classroomApi.ts#L12) · [classStore.load](../frontend/src/store/classStore.ts#L32) · HomePage (ngôi sao tuần này), SpinWheelScreen, PickerScreen |
| 15 | POST | `/classrooms/{code}/students/{studentId}/points` | Thưởng / trừ sao cho học sinh | [ClassroomController.java:43](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L43) · [ClassroomService.java:74](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L74) | [classroomApi.ts:18](../frontend/src/api/classroomApi.ts#L18) · [classStore.awardStars](../frontend/src/store/classStore.ts#L54) · SpinWheelScreen, PickerScreen (Thưởng 1 sao) |
| 16 | GET | `/question-sets` | Bộ câu hỏi của giáo viên (mới sửa trước), kèm số câu theo loại, lượt sử dụng, lượt chơi | [QuestionSetController.list](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 17 | POST | `/question-sets` | Tạo bộ câu hỏi (chưa có câu) | [QuestionSetController.create](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 18 | GET | `/question-sets/{code}` | Bộ câu hỏi + các câu + trò chơi đã tạo từ bộ | [QuestionSetController.get](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 19 | PATCH | `/question-sets/{code}` | Đổi tên, mô tả, môn, khối | [QuestionSetController.update](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 20 | DELETE | `/question-sets/{code}` | Xóa bộ (lưu trữ; trò chơi đã tạo vẫn giữ câu hỏi) → `204` | [QuestionSetController.archive](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 21 | POST | `/question-sets/{code}/copy` | Nhân bản bộ cùng các câu: "… (bản sao)" | [QuestionSetController.copy](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 22 | POST | `/question-sets/{code}/questions` | Thêm 1 hoặc nhiều câu (dán danh sách); một câu sai thì không lưu câu nào | [QuestionSetController.addQuestions](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 23 | PUT | `/question-sets/{code}/questions/{id}` | Lưu một câu (đổi được loại câu) | [QuestionSetController.updateQuestion](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 24 | DELETE | `/question-sets/{code}/questions/{id}` | Xóa một câu, các câu sau dồn lên | [QuestionSetController.deleteQuestion](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 25 | PUT | `/question-sets/{code}/questions/order` | Sắp xếp lại thứ tự câu | [QuestionSetController.reorderQuestions](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 26 | POST | `/question-sets/{code}/games` | "Sử dụng": tạo trò chơi từ bộ (chép câu hỏi sang game) | [QuestionSetController.use](../backend/src/main/java/com/edugame/question/api/QuestionSetController.java) | [questionSetApi.ts](../frontend/src/api/questionSetApi.ts) · questionSetStore · QuestionSetsPage, QuestionSetPage |
| 27 | POST | `/games/{code}/assets` | Tải ảnh cho câu hỏi (multipart, field `file`) → URL để lưu vào `content.image` | [GameAssetController.upload](../backend/src/main/java/com/edugame/asset/api/GameAssetController.java) · [GameAssetService](../backend/src/main/java/com/edugame/asset/service/GameAssetService.java) | [assetApi.ts](../frontend/src/api/assetApi.ts) · [ImagePicker](../frontend/src/editor/ImagePicker.tsx) · QuestionForm (Lật ô), QuizForm (Trắc nghiệm, Rung chuông vàng, Đua thuyền) |
| 28 | GET | `/assets/{key}` | File ảnh đã tải (công khai, không cần đăng nhập) | [GameAssetController.file](../backend/src/main/java/com/edugame/asset/api/GameAssetController.java) | `assetSrc()` trong [images.ts](../frontend/src/utils/images.ts) · `<img>` ở trình soạn và màn chiếu |
| 29 | GET | `/me/settings` | Cài đặt của giáo viên (hiển thị, mặc định trò chơi mới, email thông báo) | [MeController.getSettings](../backend/src/main/java/com/edugame/user/api/MeController.java) · [UserSettingsService](../backend/src/main/java/com/edugame/user/service/UserSettingsService.java) | [settingsApi.ts](../frontend/src/api/settingsApi.ts) · [settingsStore](../frontend/src/store/settingsStore.ts) · SettingsPage, DisplayPreferences |
| 30 | PUT | `/me/settings` | Lưu cả bộ cài đặt | [MeController.updateSettings](../backend/src/main/java/com/edugame/user/api/MeController.java) | [settingsApi.ts](../frontend/src/api/settingsApi.ts) · settingsStore.update (lưu ngay mỗi thay đổi) · SettingsPage |
| 31 | GET | `/reports/classrooms/{code}?from=&to=` | Báo cáo của lớp theo khoảng ngày (mặc định 30 ngày gần nhất) | [ReportController](../backend/src/main/java/com/edugame/result/api/ReportController.java) · [ReportService](../backend/src/main/java/com/edugame/result/service/ReportService.java) | [reportApi.ts](../frontend/src/api/reportApi.ts) · ReportsPage |

Logic dùng chung (không phải endpoint):

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Kiểm tra quyền sở hữu game | [GameService.java:152](../backend/src/main/java/com/edugame/game/service/GameService.java#L152) | Game không phải của mình / đã lưu trữ → `404` |
| Tạo bản nháp khi sửa game đã publish | [GameService.java:165](../backend/src/main/java/com/edugame/game/service/GameService.java#L165) | Copy version đã publish sang DRAFT mới, map id câu hỏi cũ → mới |
| Kiểm tra nội dung câu hỏi | [GameItemValidator.java:21](../backend/src/main/java/com/edugame/game/service/GameItemValidator.java#L21) | `itemType` hợp lệ, `content` / `solution` đủ field bắt buộc theo `config_schema` của template |
| Cộng sao / tính tổng sao | [StudentPointService.java:26](../backend/src/main/java/com/edugame/reward/service/StudentPointService.java#L26) | Sao trong tuần (từ thứ Hai 00:00, giờ `Asia/Ho_Chi_Minh`) và tổng sao |
| Xử lý lỗi → `ApiError` | [GlobalExceptionHandler.java](../backend/src/main/java/com/edugame/common/exception/GlobalExceptionHandler.java) | |
| DTO ↔ kiểu frontend | [gameMapping.ts](../frontend/src/utils/gameMapping.ts) | `GameItemResponse` ↔ `Question` (`content.text/image/points`, `solution.answer`); `StudentResponse` → `Student` (`stars` = sao tuần) |
| Thông báo lỗi tiếng Việt | [apiError.ts](../frontend/src/utils/apiError.ts) | `ApiError` → câu thông báo cho giáo viên |

### Frontend lưu dữ liệu thế nào

Editor tự lưu theo từng phím gõ, nên [gameLibraryStore.ts](../frontend/src/store/gameLibraryStore.ts) không chờ server:

1. **Mở editor** gọi `POST /draft` (5b) một lần. Từ đó id câu hỏi không đổi nữa. (Nếu dùng GET rồi sửa game đã publish,
   lần sửa đầu sẽ đổi toàn bộ id và ô đang gõ bị mất focus.)
2. **Mỗi thay đổi áp ngay vào store** (giao diện không đợi mạng), rồi mới gửi lên server:
   - Gõ chữ (tên game, nội dung câu hỏi): gom lại, gửi 1 request sau 600ms ngừng gõ, với giá trị mới nhất.
   - Thêm / xóa / sắp xếp: gửi ngay.
   - Mọi request đi qua **một hàng đợi**, tới server đúng thứ tự đã thao tác. Trước khi thêm câu hoặc tải lại game,
     các chỉnh sửa đang chờ được gửi trước.
3. **Thêm câu** là thao tác duy nhất phải chờ server (cần id mới). Câu mới là các item cuối của response.
4. **Trạng thái lưu** (`saveState`) hiện ở đầu editor: "Đang lưu…" / "Đã tự động lưu" / "Chưa lưu được".
   Nếu một request lỗi: báo lỗi, rồi **tải lại game từ server** (bỏ các thay đổi chưa lưu) để giao diện khớp DB.
5. **Màn chiếu** (`/play/...`) dùng dữ liệu đã có trong store nếu vừa từ editor sang (đã gồm thay đổi mới nhất);
   chỉ gọi GET khi mở trực tiếp.
6. **Thưởng sao**: cộng ngay trên giao diện; lỗi thì trừ lại và báo.

Chưa gửi lên server: ảnh chọn từ máy (chỉ xem trước bằng `blob:` URL, chờ API upload); `tags` của template
(nằm trong [registry.ts](../frontend/src/game-engine/registry.ts)); điểm đội trong một ván Lật ô (chờ API game-session).

---

## Chi tiết

### 0. `POST /auth/login` — Đăng nhập

```json
{ "username": "colan@edugame.local", "password": "123456", "remember": true }
```

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9...", "tokenType": "Bearer", "expiresIn": 900 }
```

Kèm header `Set-Cookie: edugame_refresh=<sid>.<bí mật>; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict`
(thêm `Max-Age` 30 ngày khi `remember`, không thì cookie mất khi đóng trình duyệt và phiên tối đa 12 giờ không dùng).

Access token là JWT ký HS256 (`app.auth.jwt.secret`): `sub` = mã người dùng (`u-lan`), `roles` = `["TEACHER"]`,
`sid` = phiên đăng nhập (bảng `user_session`). Server từ chối access token ngay khi phiên của nó bị thu hồi / hết hạn.
`username` nhận username (`colan`) hoặc email (không phân biệt hoa thường). Sai tên, sai mật khẩu, tài khoản bị khóa
hoặc đã xóa đều trả cùng `401 INVALID_CREDENTIALS`. Mật khẩu lưu dạng BCrypt; hash cũ (như `{noop}` của seed dev)
được tự băm lại bằng BCrypt ở lần đăng nhập đúng đầu tiên. Swagger UI: bấm **Authorize**, dán `accessToken`.

**Chống dò mật khẩu** ([LoginThrottle.java](../backend/src/main/java/com/edugame/auth/service/LoginThrottle.java),
bảng `login_throttle`): sai **5 lần** với cùng một tên đăng nhập / email, hoặc **30 lần** từ cùng một địa chỉ IP,
trong 15 phút → khoá 15 phút, mọi lần thử (kể cả đúng mật khẩu) trả `429 TOO_MANY_LOGIN_ATTEMPTS`. Tên không tồn
tại cũng bị đếm và khoá như thật, nên không lộ tài khoản nào có. Đăng nhập đúng hoặc đặt lại mật khẩu thì xoá bộ
đếm của tên đó. Sau reverse proxy (Caddy / Nginx trong mạng nội bộ) IP lấy từ `X-Forwarded-For`
(`server.forward-headers-strategy: native`).

Frontend giữ access token **chỉ trong bộ nhớ** ([authToken.ts](../frontend/src/utils/authToken.ts)), không lưu
`localStorage`. Gọi `/auth/*` với `withCredentials` để trình duyệt gửi / nhận cookie ([session.ts](../frontend/src/api/session.ts)).

### 0b. `POST /auth/refresh` — Gia hạn

Không body, refresh token đi trong cookie. Trả cùng format mục 0 và cookie mới (refresh token đổi mỗi lần, phiên được
gia hạn). Token vừa bị thay vẫn được chấp nhận trong 10 giây (2 tab refresh cùng lúc), khi đó trả access token mới
nhưng **không** đổi cookie. Dùng lại token cũ hơn → coi là bị đánh cắp: thu hồi cả phiên (`TOKEN_REUSE`), mọi access
token của phiên đó hết hiệu lực. Thất bại → `401 INVALID_REFRESH_TOKEN` và xoá cookie.

Frontend ([httpClient.ts](../frontend/src/api/httpClient.ts)): mọi request gặp `401` thì refresh một lần rồi gửi lại;
refresh thất bại mới về `/login`. Các lời gọi refresh đồng thời dùng chung 1 request.

### 0c. `POST /auth/logout` — Đăng xuất → `204`

Thu hồi phiên của cookie (`LOGOUT`) và xoá cookie. Access token của phiên bị từ chối ngay (`401 INVALID_TOKEN`), không
phải đợi hết hạn. Không có cookie vẫn trả `204`.

Bảo vệ CSRF cho 0b, 0c: cookie `SameSite=Strict` (trang web khác không gửi được cookie), CORS chỉ cho origin của
frontend đọc response. Frontend và API phải cùng site (ví dụ `edugame.vn` và `api.edugame.vn`).

### 0d–0f. Đăng ký giáo viên (xác nhận email bằng mã 6 số)

Ai có email cũng đăng ký được. Tài khoản **chỉ được tạo khi nhập đúng mã** gửi về email
([RegistrationService.java](../backend/src/main/java/com/edugame/auth/service/RegistrationService.java)).

**0d. `POST /auth/register` → `202`**

```json
{ "email": "co.hoa@truong.edu.vn", "displayName": "Cô Hoa", "password": "matkhau123" }
```

```json
{ "email": "co.hoa@truong.edu.vn", "expiresIn": 600, "resendAfter": 60 }
```

Lưu tạm tên + mật khẩu (đã băm BCrypt) cùng mã, gửi mail "Mã xác nhận Lớp vui: 123456". Email đã có tài khoản →
**vẫn trả đúng câu trả lời trên** (không lộ email nào đã đăng ký), nhưng mail gửi tới là "Bạn đã có tài khoản Lớp vui".
Mật khẩu ≥ 8 ký tự và **≤ 72 byte UTF-8** (giới hạn của BCrypt; chữ có dấu chiếm 2–3 byte, nên mật khẩu tiếng Việt
có dấu khoảng 24–36 ký tự là tối đa). Email được chuẩn hoá chữ thường, bỏ khoảng trắng.

**0e. `POST /auth/register/resend` → `202`** — `{ "email": "..." }`: mã mới cho lần đăng ký đang chờ (mã cũ hết
dùng được). Không có đăng ký đang chờ thì không gửi gì, câu trả lời vẫn như 0d.

**0f. `POST /auth/register/verify`** — `{ "email": "...", "code": "123456" }`: mã đúng → tạo giáo viên (`TEACHER`,
username lấy từ phần trước `@`, thêm số nếu trùng), mở phiên và trả **như đăng nhập** (access token + cookie).

| Giới hạn | |
|---|---|
| Hiệu lực mã | 10 phút, dùng 1 lần, chỉ mã mới nhất của email có giá trị |
| Nhập sai | 5 lần thì mã bị huỷ (`CODE_EXPIRED`), phải gửi lại |
| Gửi mã | Cách nhau ≥ 60 giây (`RESEND_TOO_SOON`), tối đa 5 mail / giờ / email (`TOO_MANY_CODES`) |

Cấu hình: `app.auth.verification.*`. Mail gửi qua SMTP **sau khi transaction commit**, chạy nền
([AuthMailer.java](../backend/src/main/java/com/edugame/auth/mail/AuthMailer.java)); dev dùng Mailpit
(<http://localhost:8025>), profile `dev` còn in mã ra log.

### 0g–0h. Quên mật khẩu

Cùng cơ chế mã 6 số và cùng giới hạn như đăng ký (purpose `RESET_PASSWORD`), giao diện ở `/forgot-password`.

**0g. `POST /auth/password/forgot` → `202`** — `{ "email": "..." }`, trả như 0d. Chỉ gửi mail khi email thuộc tài khoản
**đang hoạt động**; email lạ / tài khoản bị khóa: không gửi gì nhưng câu trả lời (và giới hạn gửi) y hệt, nên không dò
được email nào có tài khoản. Gọi lại để nhận mã mới.

**0h. `POST /auth/password/reset`** — `{ "email": "...", "code": "123456", "newPassword": "matkhaumoi1" }`: mã đúng →
đặt mật khẩu mới (≥ 8 ký tự, ≤ 72 byte), **thu hồi mọi phiên đăng nhập cũ** của tài khoản (`PASSWORD_RESET`: ai còn biết mật khẩu cũ
đều bị đăng xuất, access token cũ bị từ chối ngay), đánh dấu email đã xác minh, rồi đăng nhập (trả như đăng nhập, phiên
không "ghi nhớ"). Lỗi: `INVALID_CODE`, `CODE_EXPIRED`.

### 1. `GET /me` — Giáo viên hiện tại

Dùng cho lời chào và avatar trên HomePage.

```json
{ "code": "u-lan", "username": "colan", "displayName": "Cô Lan", "email": "colan@edugame.local", "role": "TEACHER" }
```

### 2. `GET /game-templates` — Danh sách loại game

Chỉ trả template trạng thái `BETA` / `ACTIVE`, theo thứ tự menu (nhóm → template). Frontend tự nhóm theo `categoryCode`.

```json
[{
  "code": "GRID_BOARD", "categoryCode": "QUESTION", "categoryName": "Câu hỏi", "engine": "GRID_BOARD",
  "name": "Lật ô thi đua", "description": "Các đội chọn ô số...", "icon": "grid", "isNew": true, "status": "BETA",
  "configSchema": { "itemTypes": ["OPEN_QUESTION"], "content": { ... }, "solution": { ... } },
  "defaultConfig": { "rules": { ... } }
}]
```

Template hiện có: `GRID_BOARD`, `QUIZ` (nhóm QUESTION) · `MATCHING`, `MEMORY` (PUZZLE) · `SPIN_WHEEL`, `NAME_RACE` (RANDOM_TOOL).

### 3. `GET /games` — Thư viện game

Game của giáo viên (trừ đã lưu trữ), sửa gần nhất lên đầu. `itemCount` đếm câu hỏi của bản đang sửa.

```json
[{ "code": "g-addition", "templateCode": "GRID_BOARD", "title": "Ôn phép cộng trong phạm vi 100", "subject": "Toán",
   "educationLevel": "TIEU_HOC", "grade": 3, "status": "PUBLISHED", "itemCount": 24, "updatedAt": "2026-10-08T14:02:59Z" }]
```

> Game không gắn với lớp nào, nên frontend hiển thị theo `grade` ("Lớp 3"). Game tạo mới lấy `grade` của lớp giáo viên.

### 4. `POST /games` — Tạo game → `201`

Tạo game `DRAFT` + version 1, `settings` copy từ `defaultConfig` của template. Chưa có câu hỏi nào.

```json
{ "templateCode": "GRID_BOARD", "title": "Ôn bảng nhân 2", "grade": 2 }
```

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `templateCode` | ✓ | Template phải `BETA` / `ACTIVE`, sai → `404` |
| `title` | | Mặc định `"{tên template} mới"`. Tối đa 255, không được toàn khoảng trắng |
| `grade` | | Tiểu học: 1–5, sai → `400 INVALID_GRADE` |

Trả về: `GameResponse` (xem mục 5).

### 5. `GET /games/{code}` — Chi tiết game

Trả **bản đang sửa**: bản DRAFT nếu có, nếu không thì bản đã publish gần nhất.

```json
{
  "code": "g-addition", "templateCode": "GRID_BOARD", "title": "...", "description": "...", "subject": "Toán",
  "educationLevel": "TIEU_HOC", "grade": 3, "visibility": "PRIVATE", "status": "PUBLISHED",
  "version": 1, "versionStatus": "PUBLISHED",
  "settings": { "rules": { ... } },
  "items": [
    { "id": 1, "itemType": "OPEN_QUESTION", "position": 0,
      "content": { "text": "25 + 13 = ?", "points": 10 }, "solution": { "answer": "38" } }
  ],
  "updatedAt": "..."
}
```

Cấu trúc `content` / `solution` theo template:

| Template | `itemType` | `content` | `solution` |
|---|---|---|---|
| GRID_BOARD | `OPEN_QUESTION` | `{ text, image?, points }` | `{ answer }` |
| QUIZ | `SINGLE_CHOICE`, `TRUE_FALSE` | `{ text, image?, audio?, options: [{id, text}] }` | `{ correct: [optionId] }` |
| MATCHING | `PAIR_SET` | `{ left: [{id, text}], right: [{id, text}] }` | `{ pairs: [[leftId, rightId]] }` |
| MEMORY | `CARD_SET` | `{ cards: [{id, text?, image?}] }` | `{ pairs: [[cardId, cardId]] }` |
| GOLDEN_BELL, BOAT_RACE | như QUIZ | như QUIZ | như QUIZ |
| CROSSWORD | `CROSSWORD_ROW` | `{ clue, image? }` | `{ answer, keyIndex }` |
| ORDERING | `ORDER_SET` | `{ text?, items: [{id, text}] }` | `{ order: [id] }` |
| SORTING | `SORT_SET` | `{ text?, groups: [{id, text}], cards: [{id, text}] }` | `{ assign: [[cardId, groupId]] }` |
| SPIN_WHEEL | `WHEEL_SEGMENT` (khi `settings.source = ITEMS`) | `{ label, color?, weight? }` | không có |
| NAME_RACE, TEAM_MAKER, TIMER, DICE | — (không có item; công cụ dùng danh sách lớp hoặc chỉ cài đặt) | | |

> `solution` (đáp án) được trả về vì người gọi là chủ game, để hiện trên màn chiếu của giáo viên.
> **Không** dùng API này cho thiết bị của học sinh.

### 5b. `POST /games/{code}/draft` — Mở game để sửa

Giống `GET /games/{code}`, nhưng nếu game đang ở bản đã publish thì **tạo bản DRAFT ngay** (copy câu hỏi sang, id mới)
và trả về bản nháp. Gọi lại nhiều lần vẫn trả cùng bản nháp, id không đổi. Editor gọi API này lúc mở trang, nên id
câu hỏi giữ nguyên trong suốt lúc sửa. Màn chiếu dùng `GET` (không tạo bản nháp).

Trả về: `GameResponse` (`versionStatus` luôn là `DRAFT`).

### 6. `PATCH /games/{code}` — Sửa thông tin game

Field nào `null` / không gửi thì giữ nguyên.

```json
{ "title": "Ôn phép cộng", "description": "...", "subject": "Toán", "grade": 3, "settings": { "rules": { ... } } }
```

- `title`, `description`, `subject`, `grade` thuộc game (không theo version).
- `settings` phải là object, sai → `400 INVALID_SETTINGS`. Ghi vào bản DRAFT (tự tạo DRAFT nếu game đã publish).
- `description` / `subject` gửi `""` → xóa.

Trả về: `GameResponse`.

### 7. `DELETE /games/{code}` — Lưu trữ game → `204`

Xóa mềm (`status = ARCHIVED`): game biến mất khỏi thư viện, lịch sử buổi chơi vẫn giữ.

### 8. `POST /games/{code}/publish` — Publish

Khóa bản DRAFT thành `PUBLISHED`, đặt làm bản được chơi (`current_version_id`), game chuyển `PUBLISHED`.
Không có DRAFT (chưa sửa gì sau lần publish trước) → `409 NOTHING_TO_PUBLISH`.

### 9–12. Câu hỏi (items)

**Quan trọng — id câu hỏi có thể thay đổi.** Bản đã publish không bao giờ bị sửa. Lần sửa đầu tiên sau khi publish
sẽ copy toàn bộ câu hỏi sang bản DRAFT mới với **id mới**. Request đó vẫn được gửi bằng id cũ (backend tự map),
nhưng sau đó phải dùng id mới. Vì vậy **mọi API câu hỏi đều trả về toàn bộ `GameResponse`** — frontend thay danh sách
câu hỏi bằng `items` trong response sau mỗi lần gọi.

#### 9. `POST /games/{code}/items` — Thêm câu hỏi → `201`

Thêm vào cuối danh sách, theo thứ tự gửi. Dùng cho cả thêm 1 câu và dán hàng loạt. Tối đa 200 câu / game.

```json
{ "items": [
  { "itemType": "OPEN_QUESTION", "content": { "text": "1 + 1 = ?", "points": 20 }, "solution": { "answer": "2" } },
  { "itemType": "OPEN_QUESTION", "content": { "text": "", "points": 20 } }
] }
```

- `solution` được bỏ trống khi đang soạn (câu chưa có đáp án).
- `itemType` không thuộc template, hoặc thiếu field bắt buộc → `400 INVALID_GAME_ITEM`.
- Vượt 200 câu → `400 TOO_MANY_ITEMS`.

#### Nội dung item theo loại game

| Game | `itemType` | `content` | `solution` |
|---|---|---|---|
| GRID_BOARD (Lật ô) | `OPEN_QUESTION` | `{text, image?, points}` | `{answer}` |
| QUIZ (Trắc nghiệm) | `SINGLE_CHOICE` | `{text, image?, options: [{id, text}]}`, 2–6 phương án | `{correct: [optionId]}` |
| QUIZ | `TRUE_FALSE` | như trên, đúng 2 phương án (Đúng / Sai) | `{correct: [optionId]}` |
| MATCHING (Nối cặp) | `PAIR_SET` | `{left: [{id, text}], right: [{id, text}]}`, mỗi cột 1–12 ô | `{pairs: [[leftId, rightId]]}` |
| MEMORY (Lật thẻ) | `CARD_SET` | `{cards: [{id, text}]}`, 2–24 thẻ | `{pairs: [[cardId, cardId]]}` |
| GOLDEN_BELL (Rung chuông vàng), BOAT_RACE (Đua thuyền) | `SINGLE_CHOICE`, `TRUE_FALSE` | giống QUIZ | giống QUIZ |
| CROSSWORD (Ô chữ bí mật) | `CROSSWORD_ROW` | `{clue, image?}`: một hàng ngang | `{answer, keyIndex}`: đáp án 1–15 chữ cái (không tính dấu cách); `keyIndex` là vị trí (từ 0) của chữ nằm ở cột từ khóa |
| ORDERING (Sắp xếp) | `ORDER_SET` | `{text?, items: [{id, text}]}`, 2–8 thẻ | `{order: [id]}`: mọi id đúng một lần, theo thứ tự đúng |
| SORTING (Phân loại) | `SORT_SET` | `{text?, groups: [{id, text}], cards: [{id, text}]}`, 2–4 giỏ, 1–16 thẻ | `{assign: [[cardId, groupId]]}`: mỗi thẻ vào nhiều nhất một giỏ |

Backend kiểm tra thêm (→ `400 INVALID_GAME_ITEM`): `id` không rỗng và không trùng (với PAIR_SET là không trùng giữa
cả hai cột), `correct` có đúng 1 id và id đó là một phương án, mỗi cặp nối một id cột trái với một id cột phải
(PAIR_SET) hoặc hai thẻ có thật (CARD_SET), mỗi id chỉ nằm trong một cặp; `keyIndex` trỏ vào một chữ của đáp án
(CROSSWORD_ROW, chữ tính theo Unicode NFC); `order` liệt kê đủ mọi thẻ (ORDER_SET); thẻ và giỏ có thật, id không trùng
giữa giỏ và thẻ (SORT_SET). `text` để trống được (đang soạn dở);
màn chiếu tự bỏ qua câu / cặp chưa điền đủ. Thêm nhiều item một lúc: một item sai thì cả lô bị từ chối.

#### 10. `PATCH /games/{code}/items/{itemId}` — Sửa câu hỏi

Field không gửi thì giữ nguyên.

```json
{ "content": { "text": "25 + 14 = ?", "points": 10 }, "solution": { "answer": "39" }, "explanation": "..." }
```

- `"solution": null` → xóa đáp án. `"explanation": ""` → xóa giải thích.
- `content` gửi lên thay **toàn bộ** object `content` cũ (không merge từng field).

#### 11. `DELETE /games/{code}/items/{itemId}` — Xóa câu hỏi

Các câu phía sau tự dồn lên (position luôn là 0..n-1). Trả `200` + `GameResponse` (không phải `204`) vì id có thể đã đổi.

#### 12. `PUT /games/{code}/items/order` — Sắp xếp lại

Gửi **toàn bộ** id câu hỏi theo thứ tự mới. Thiếu / thừa / trùng id → `400 INVALID_ITEM_ORDER`.

```json
{ "itemIds": [3, 1, 2] }
```

### 13. Lớp học (`/classrooms`)

Lớp của giáo viên có 3 trạng thái: `ACTIVE` (đang dạy), `PAUSED` (tạm ngưng: giữ nguyên học sinh, sao, nhưng không mở
trò chơi cho lớp được) và `ARCHIVED` (đã xóa). Lớp đã xóa và lớp của giáo viên khác đều trả `404 RESOURCE_NOT_FOUND`.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/classrooms?status=ACTIVE\|PAUSED` | Lớp `ACTIVE` + `PAUSED` (hoặc một trạng thái), theo khối rồi tên |
| POST | `/classrooms` → `201` | Tạo lớp |
| GET | `/classrooms/{code}` | Một lớp |
| PATCH | `/classrooms/{code}` | Sửa thông tin, tạm ngưng / mở lại (`status`) |
| DELETE | `/classrooms/{code}` → `204` | Xóa lớp (lưu trữ; sao và lịch sử vẫn còn) |

```json
{ "code": "c-3a", "name": "3A", "grade": 3, "schoolYear": "2026-2027", "schoolName": "Tiểu học Kim Đồng",
  "avatar": "bear", "status": "ACTIVE", "studentCount": 28, "activityCount": 12, "completedCount": 9,
  "completionRate": 75, "lastPlayedAt": "...", "createdAt": "..." }
```

- `activityCount`: số lần chơi trò chơi với lớp; `completedCount`: số lần chơi tới màn kết quả;
  `completionRate` = phần trăm hoàn thành (0 khi chưa chơi). `lastPlayedAt`: lần chơi gần nhất (để mở đúng lớp đang dạy).

Tạo / sửa lớp:

| Field | Tạo | Ghi chú |
|---|---|---|
| `name` | ✓ | Tối đa 50 ký tự. Không trùng tên (không phân biệt hoa thường) với lớp khác của giáo viên trong cùng năm học → `409 CLASSROOM_NAME_TAKEN` |
| `grade` | ✓ | 1–12 |
| `schoolYear` | | `2026-2027`, năm sau = năm trước + 1 (`400 INVALID_SCHOOL_YEAR`). Gửi `""` khi sửa để xóa |
| `schoolName` | | Tối đa 100 ký tự |
| `avatar` | | `bear`, `rabbit`, `lion`, `cat`, `fox`, `panda`, `owl`, `frog` |
| `status` | (chỉ sửa) | `ACTIVE` hoặc `PAUSED` |

Một giáo viên có tối đa 30 lớp chưa xóa (`409 TOO_MANY_CLASSROOMS`).

#### 13b. Học sinh trong lớp

| Method | Path | Mô tả |
|---|---|---|
| POST | `/classrooms/{code}/students` → `201` | Thêm một hoặc nhiều bạn vào cuối danh sách: `{ "students": [{ "displayName": "Minh Anh", "avatar": "cat" }] }`; số thứ tự tiếp theo số lớn nhất. Một lớp tối đa 60 bạn (`409 TOO_MANY_STUDENTS`) |
| PATCH | `/classrooms/{code}/students/{id}` | Đổi tên / ảnh đại diện |
| DELETE | `/classrooms/{code}/students/{id}` → `204` | Cho bạn rời lớp (sao vẫn còn trong lịch sử, số thứ tự được dùng lại) |
| PUT | `/classrooms/{code}/students/order` | `{ "studentIds": [...] }` đủ mọi bạn, mỗi bạn một lần → số thứ tự thành 1..n (`400 INVALID_STUDENT_ORDER`) |

#### 13c. Trò chơi đã chơi với lớp

| Method | Path | Mô tả |
|---|---|---|
| POST | `/classrooms/{code}/sessions` → `201` | `{ "gameCode": "g-quiz-vn" }`: màn chiếu mở trò cho lớp (tính là một hoạt động). Lớp tạm ngưng → `409 CLASSROOM_PAUSED` |
| POST | `/classrooms/{code}/sessions/{id}/end` | Lớp chơi tới màn kết quả (tính là hoàn thành); gọi lại nhiều lần không sao. Body (không bắt buộc) `{"results": {...}}`: kết quả màn hình hiện, giữ cho báo cáo (xem mục 31) |

### 14. `GET /classrooms/{code}/students` — Danh sách học sinh

Học sinh đang học (`ACTIVE`), theo số thứ tự. Dùng cho vòng quay, đua tên, bảng "top sao trong tuần".

```json
[{ "id": 1, "displayName": "Minh Anh", "avatar": "cat", "rollNumber": 1, "weeklyStars": 12, "totalStars": 12 }]
```

- `weeklyStars`: sao từ thứ Hai 00:00 tuần này (giờ Việt Nam, cấu hình `app.time-zone`).
- `totalStars`: tổng sao từ trước tới nay.

### 15. `POST /classrooms/{code}/students/{studentId}/points` — Thưởng sao → `201`

```json
{ "points": 1, "reason": "Vòng quay" }
```

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `points` | ✓ | -100..100, khác 0 (`0` → `400 INVALID_POINTS`). Số âm = trừ sao |
| `reason` | | Tối đa 100 ký tự, ví dụ "Thắng game", "Phát biểu hay" |

Trả về học sinh với số sao đã cập nhật (cùng format mục 14).

---

### 16–26. Bộ câu hỏi (`/question-sets`)

Ngân hàng câu hỏi của giáo viên, tách khỏi trò chơi. Mỗi bộ có môn (`TOAN`, `TIENG_VIET`, `TIENG_ANH`,
`TU_NHIEN_XA_HOI`, `KHOA_HOC`, `KHAC`), khối (1–12 hoặc không ghi) và tối đa 200 câu. Mỗi giáo viên giữ tối đa 200 bộ.
Bộ đã xóa, hoặc của giáo viên khác → `404`.

**Danh sách / chi tiết.** `GET /question-sets` trả về mảng tóm tắt; các API còn lại trả về cả bộ:

```json
{
  "summary": { "code": "qs-toan2-cong100", "title": "Toán lớp 2 - Phép cộng trong phạm vi 100", "description": "…",
               "subject": "TOAN", "grade": 2, "questionCount": 8, "multipleChoiceCount": 7, "shortAnswerCount": 1,
               "useCount": 2, "playCount": 5, "ownerName": "Cô Lan", "createdAt": "…", "updatedAt": "…" },
  "questions": [
    { "id": 41, "type": "MULTIPLE_CHOICE", "text": "47 + 8 = ?", "options": ["54", "55", "56"], "correctOption": 1,
      "explanation": "7 cộng 8 bằng 15, viết 5 nhớ 1." },
    { "id": 48, "type": "SHORT_ANSWER", "text": "Tổng của 19 và 19 là bao nhiêu?", "answer": "38" }
  ],
  "games": [ { "code": "g-…", "title": "…", "templateCode": "QUIZ", "createdAt": "…" } ]
}
```

- `useCount`: số trò chơi đã tạo từ bộ (kể cả trò đã xóa). `playCount`: số lần các trò đó được mở cho lớp chơi.
- `games`: các trò tạo từ bộ còn trong thư viện, mới nhất trước.

**Tạo / sửa bộ.** `POST {"title", "description"?, "subject", "grade"?}`. `PATCH` chỉ đổi field được gửi;
`description: ""` xóa mô tả, `grade: 0` bỏ khối.

**Câu hỏi.** Body của một câu (thêm: `{"questions": [ … ]}`, tối đa 200 câu mỗi lần):

| Field | Ghi chú |
|---|---|
| `type` | `MULTIPLE_CHOICE` (trắc nghiệm) hoặc `SHORT_ANSWER` (tự luận: trả lời ngắn, cô chấm) |
| `text` | Bắt buộc, tối đa 500 ký tự |
| `options`, `correctOption` | Trắc nghiệm: 2–6 đáp án khác nhau (không phân biệt hoa thường), không trống, mỗi đáp án ≤ 200 ký tự; `correctOption` là chỉ số đáp án đúng |
| `answer` | Tự luận: câu trả lời, bắt buộc, ≤ 200 ký tự |
| `explanation` | Giải thích, tùy chọn, ≤ 500 ký tự |

Field của loại câu kia bị bỏ qua. Câu không chơi được → `400 INVALID_QUESTION`, `message` nêu câu số mấy.

**Sử dụng trong trò chơi.** `POST /question-sets/{code}/games {"templateCode": "QUIZ", "title"?: "Trắc nghiệm – Lớp 3A"}` → `201`
`{"gameCode", "templateCode", "questionCount", "skippedCount"}`.

| Trò chơi | Câu được dùng |
|---|---|
| `QUIZ`, `GOLDEN_BELL`, `BOAT_RACE` | Các câu trắc nghiệm (thành `SINGLE_CHOICE`); câu tự luận bị bỏ qua (`skippedCount`) |
| `GRID_BOARD` (Lật ô) | Mọi câu (thành `OPEN_QUESTION`, 10 điểm); đáp án là đáp án đúng hoặc câu trả lời tự luận |

Trò chơi mang tên `title` (không gửi thì lấy tên bộ), mô tả, môn và khối của bộ (khối 6–12 thì để trống, game là tiểu học). Câu hỏi được chép sang game:
sửa bộ sau đó không đổi game, và ngược lại. Không có câu nào dùng được → `409 NO_USABLE_QUESTIONS`.

### 27–28. Ảnh của câu hỏi (`/games/{code}/assets`, `/assets/{key}`)

```
POST /api/v1/games/g-quiz-vn/assets          (multipart/form-data, field "file")
→ 201 {"id": 12, "url": "/api/v1/assets/CkkWpIxNtljkHXgLyk4LVA.png", "name": "con-meo.png",
       "type": "IMAGE", "mimeType": "image/png", "sizeBytes": 48211}
```

- Chỉ nhận PNG, JPEG, GIF, WebP, nhận biết theo **byte đầu file** (không tin tên file hay `Content-Type` trình duyệt gửi).
  SVG, HEIC, PDF... → `415 UNSUPPORTED_IMAGE`; file rỗng → `400 EMPTY_FILE`; quá 5 MB → `413 FILE_TOO_LARGE`.
- Mỗi game tối đa 500 file (ảnh đã thay vẫn được giữ) → `409 TOO_MANY_ASSETS`. Game của người khác / đã lưu trữ → `404`.
- Lưu `url` vào `content.image` của câu hỏi (`PATCH /games/{code}/items/{id}`). `url` là đường dẫn trên máy chủ API,
  frontend ghép với host API khi hiển thị (`assetSrc()`).
- Trình soạn thu nhỏ ảnh trước khi tải (cạnh dài nhất 1600 px, sang WebP), nên ảnh chụp điện thoại vài MB chỉ còn vài trăm KB.
  GIF được gửi nguyên (giữ ảnh động).
- `GET /api/v1/assets/{key}` **không cần đăng nhập** để thẻ `<img>` và màn chiếu tải được; khoá là 128 bit ngẫu nhiên, không
  liệt kê ở đâu. Trả kèm `Cache-Control: max-age=31536000, public, immutable` (file không bao giờ đổi dưới một khoá),
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`. Khoá không đúng dạng hoặc không có → `404`.
- File nằm trên đĩa máy chủ, thư mục `app.assets.dir` (biến môi trường `ASSET_DIR`, mặc định `./data/assets`); khi chạy nhiều
  máy chủ cần thư mục dùng chung hoặc chuyển sang object storage (thay `LocalAssetStorage`). Ảnh không còn câu nào dùng
  chưa được dọn tự động.

---

### 29–30. Cài đặt (`/me/settings`)

```json
{
  "display": {"reduceMotion": false, "fullscreenOnStart": true},
  "games": {"teams": 3, "timeLimitSec": 20},
  "notifications": {"newSignInEmail": true, "passwordChangedEmail": true},
  "sound": {"enabled": true, "volume": 80, "music": true}
}
```

- `PUT` gửi **cả bộ**; thiếu `display` / `notifications` hoặc một công tắc trong đó → `400 VALIDATION_FAILED`.
  `games.teams` 2–4, `games.timeLimitSec` 0–600 (0 = không giới hạn); key lạ bị bỏ qua.
- Trong `games`, bỏ trống (hoặc `null`) = **theo từng trò** (mặc định của template). Mặc định chỉ áp khi **tạo trò
  chơi mới** (`POST /games`, "Sử dụng" bộ câu hỏi), và chỉ vào luật trò đó có: số đội cho trò chia đội ngẫu nhiên
  (không Lật ô, không Rung chuông vàng), thời gian cho trò có `timeLimitSec`, giành quyền cho trò có
  `rules.scoring.allowSteal`, xáo trộn cho trò có `shuffleItems`. Trò chơi đã có giữ nguyên.
- `display` dùng ở trình duyệt: `reduceMotion` tắt hiệu ứng (Motion, antd, CSS); `fullscreenOnStart` mở toàn màn hình
  khi bấm "Bắt đầu trò chơi" và thoát khi quay lại màn hình giáo viên. Frontend giữ bản sao trong `localStorage`
  (`edugame.display`) để áp dụng ngay khi tải trang, xoá khi đăng xuất.
- `notifications`: email cảnh báo khi **đăng nhập bằng mật khẩu** trên trình duyệt chưa từng dùng (so theo tên
  "Chrome trên Windows", nên cập nhật trình duyệt không bị coi là thiết bị mới; lần đăng nhập đầu tiên không cảnh
  báo; bảng `user_known_device`), và khi **đổi mật khẩu** trong hồ sơ. Gửi sau khi request commit, lỗi gửi chỉ ghi log.
- `sound`: âm thanh trên màn chiếu (bật/tắt, âm lượng 0–100, nhạc nền), xem [SOUNDS.md](SOUNDS.md). PUT không có
  `sound` (ứng dụng mở từ trước khi có âm thanh) giữ nguyên giá trị đã lưu.
- Cài đặt lưu trong `users.settings` (JSONB). Key chưa từng lưu nhận giá trị mặc định khi đọc; giá trị lưu sai kiểu
  (dữ liệu cũ) → đọc ra mặc định thay vì lỗi.

---

### 31. Báo cáo của lớp (`GET /reports/classrooms/{code}`)

`from`, `to`: ngày dạng `2026-10-18`, tính trọn ngày theo múi giờ của trường (`app.time-zone`). Không gửi `to` →
hôm nay; không gửi `from` → 30 ngày tính đến `to`. `from` sau `to`, hoặc quá 366 ngày → `400 INVALID_RANGE`; ngày sai
dạng → `400 INVALID_PARAMETER`. Lớp của giáo viên khác → `404`.

```json
{
  "classroom": {"code": "c-3a", "name": "3A", "grade": 3, "studentCount": 28},
  "from": "2026-09-19", "to": "2026-10-18",
  "summary":  {"activities": 12, "completed": 9, "playMinutes": 145, "stars": 31, "correctAnswers": 40, "games": 5},
  "previous": {"activities": 8,  "completed": 6, "playMinutes": 90,  "stars": 20, "correctAnswers": 0,  "games": 4},
  "daily": [{"date": "2026-09-19", "activities": 0, "completed": 0}, "..."],
  "byTemplate": [{"templateCode": "QUIZ", "templateName": "Trắc nghiệm", "activities": 6}],
  "topGames": [{"gameCode": "g-quiz-vn", "title": "Đố vui Tiếng Việt", "templateCode": "QUIZ", "activities": 4}],
  "students": [{"id": 12, "displayName": "Minh Anh", "rollNumber": 3, "stars": 5}],
  "sessions": [{"id": 90, "gameCode": "g-quiz-vn", "gameTitle": "Đố vui Tiếng Việt", "templateCode": "QUIZ",
                "templateName": "Trắc nghiệm", "status": "ENDED", "startedAt": "...", "endedAt": "...", "minutes": 25,
                "results": {"teams": [{"name": "Đội Đỏ", "score": 40, "correct": 4}]}}]
}
```

- `activities`: trò chơi đã mở cho lớp (bắt đầu trong kỳ, không tính bị huỷ); `completed`: số đã tới màn kết quả.
- `playMinutes`: tổng thời gian các trò đã hoàn thành, mỗi trò tính tối đa 2 giờ (máy chiếu để quên qua đêm).
- `stars`: sao thưởng trong kỳ trừ sao thu lại; `students` liệt kê **mọi** học sinh còn trong lớp (kể cả 0 sao),
  nhiều sao trước.
- `correctAnswers`: tổng câu đúng của các đội, chỉ từ các trò đã giữ kết quả.
- `previous`: cùng số liệu cho kỳ dài bằng ngay trước đó (để so sánh).
- `daily`: mỗi ngày một dòng, kể cả ngày không chơi. `sessions`: mới nhất trước, tối đa 200.
- `results` của một trò chơi: lúc kết thúc, màn kết quả gửi `teams` (tên, điểm, số câu đúng, tối đa 8 đội) hoặc
  `winners` + `players` (Rung chuông vàng). Chỉ giữ lần gửi đầu tiên; thiếu (trò cũ, công cụ) thì không có `results`.

### 32. Góp ý (`POST /feedback`) → `201`

Nút **Góp ý** luôn hiện ở góc dưới bên phải các màn của giáo viên (không có trên màn chiếu). Request `multipart/form-data`:

| Phần | Kiểu | |
|---|---|---|
| `feedback` | `application/json` | `{"kind": "BUG" \| "IDEA" \| "PRAISE" \| "OTHER", "rating": 1-5 (không bắt buộc), "message": "…" (1-2000 ký tự), "page": "/games/g-abc/edit" (≤ 500), "viewport": "1366x768" (≤ 20), "appVersion": "2026-10-18 224ad08" (≤ 40), "contactOk": true}` |
| `screenshot` | ảnh, không bắt buộc | PNG, JPEG hoặc WebP (đọc từ nội dung file), tối đa 3 MB. App tự thu nhỏ còn 1600 px |

Trả `{"code": "fb-…", "createdAt": "…"}`. Backend lấy thêm `User-Agent` để biết trình duyệt.

- Mỗi giáo viên gửi tối đa **10 góp ý / giờ** → quá thì `429 TOO_MANY_FEEDBACK`.
- Sai dữ liệu → `400 VALIDATION_FAILED`; ảnh không phải PNG/JPEG/WebP → `400 INVALID_IMAGE`; quá 3 MB →
  `400 IMAGE_TOO_LARGE`.
- Sau khi lưu, mỗi góp ý được **gửi email** (chạy nền, có ảnh đính kèm) tới các địa chỉ trong `FEEDBACK_NOTIFY_TO`
  (`app.feedback.notify-to`, cách nhau bởi dấu phẩy; để trống thì chỉ lưu). Khi giáo viên đồng ý (`contactOk`), email
  có `Reply-To` là email của giáo viên: bấm Trả lời là viết thẳng cho giáo viên. Gửi email lỗi chỉ ghi log, góp ý
  vẫn được lưu.

### 33–36. Đọc góp ý (`/admin/feedback`, chỉ vai trò `ADMIN`)

| API | |
|---|---|
| `GET /admin/feedback?status=NEW&status=SEEN&page=0&size=50` | Mới nhất trước, `size` tối đa 200: `{"items": [...], "total": 12}`. Mỗi mục: `code, kind, rating, message, page, viewport, appVersion, device ("Chrome trên Windows"), contactOk, status, createdAt, teacher {code, displayName, email}, screenshotUrl` |
| `GET /admin/feedback/export?status=…` | File CSV (UTF-8 có BOM, mở thẳng bằng Excel), tối đa 10 000 góp ý mới nhất |
| `GET /admin/feedback/{code}/screenshot` | Ảnh đính kèm (cần token admin) |
| `PATCH /admin/feedback/{code}` | `{"status": "NEW" \| "SEEN" \| "DONE"}`: đánh dấu đã xem / đã xử lý |

Giáo viên gọi các API này → `403 FORBIDDEN`. Đổi trạng thái (khi thực sự đổi) và mỗi lần tải CSV được ghi vào nhật ký
quản trị (`FEEDBACK_STATUS_CHANGED`, `FEEDBACK_EXPORTED`).

**Quản trị viên đầu tiên** trên một máy chủ mới cấp bằng SQL (những người sau cấp ngay trong trang Quản trị):
`UPDATE users SET role = 'ADMIN' WHERE email = 'ten@edugame.vn';` rồi đăng nhập lại. Dữ liệu demo (profile `dev`) có
sẵn `quantri` / `123456`.

### 37–45. Quản trị (`/admin/...`, chỉ vai trò `ADMIN`)

Trang `/admin` của web. Mọi API dưới đây: giáo viên → `403 FORBIDDEN`. Admin chỉ thấy **số** học sinh, không bao giờ
thấy tên học sinh hay mật khẩu giáo viên.

| API | |
|---|---|
| 37. `GET /admin/dashboard?days=30` | Tổng quan `days` ngày gần nhất (1–366, gồm hôm nay; sai → `400 INVALID_RANGE`): `{from, to, teachers {total, active, joined, locked, admins}, content {classrooms, students, games, questionSets}, plays, daily [{date, signUps, plays}], topTemplates [{templateCode, templateName, plays}], newFeedback}`. `active`: tài khoản đã đăng nhập hoặc mở trang trong kỳ |
| 38. `GET /admin/teachers?q=&status=&role=&sort=NEWEST&page=0&size=20` | Danh sách tài khoản. `q`: một phần tên, tên đăng nhập hoặc email. `status` (lặp được): mặc định `ACTIVE` + `LOCKED`, tài khoản `DELETED` chỉ hiện khi hỏi. `role` (lặp được). `sort`: `NEWEST`, `LAST_ACTIVE`, `NAME`. `size` ≤ 100. Trả `{items: [{code, displayName, username, email, role, status, emailVerified, createdAt, lastActiveAt, classrooms, games}], total}` |
| 39. `GET /admin/teachers/{code}` | Một tài khoản: thông tin trên + `phone`, `figures {classrooms, students, games, questionSets, plays, recentPlays}` (`recentPlays`: 30 ngày), `openSessions`, `loginBlockedUntil` (bị chặn do sai mật khẩu nhiều lần), `devices [{name, firstSeenAt, lastSeenAt}]`, `self`, `history` (20 thao tác quản trị gần nhất) |
| 40. `POST /admin/teachers/{code}/lock` | `{"reason": "…"}` (không bắt buộc, ≤ 300). Không đăng nhập được nữa, mọi phiên kết thúc ngay. Khoá lại tài khoản đã khoá: không làm gì |
| 41. `POST /admin/teachers/{code}/unlock` | Mở khoá |
| 42. `POST /admin/teachers/{code}/sign-out` | Đăng xuất mọi thiết bị, mật khẩu giữ nguyên |
| 43. `PUT /admin/teachers/{code}/role` | `{"role": "ADMIN" \| "TEACHER"}`. Bỏ quyền admin thì tài khoản bị đăng xuất mọi nơi; cấp quyền thì có hiệu lực từ lần tải trang sau |
| 44. `POST /admin/teachers/{code}/login-unblock` | Mở chặn đăng nhập sau nhiều lần sai mật khẩu |
| 45. `GET /admin/audit-log?action=&page=0&size=50` | Nhật ký quản trị, mới nhất trước (`size` ≤ 200, `action` lặp được): `{items: [{id, createdAt, actorName, action, targetType, targetCode, targetLabel, details}], total}` |

- Mọi thao tác thay đổi trả lại tài khoản như ở `GET /admin/teachers/{code}` và được ghi vào nhật ký (bảng
  `admin_audit_log`, chỉ thêm, không sửa / xoá) cùng transaction với thay đổi: `TEACHER_LOCKED`, `TEACHER_UNLOCKED`,
  `TEACHER_SIGNED_OUT`, `ADMIN_GRANTED`, `ADMIN_REVOKED`, `LOGIN_UNBLOCKED`.
- Không tự thao tác trên tài khoản của mình → `409 CANNOT_CHANGE_OWN_ACCOUNT`. Khoá một admin → `409
  ADMIN_CANNOT_BE_LOCKED` (bỏ quyền trước). Cấp quyền cho tài khoản đang khoá → `409 TEACHER_LOCKED`. Bỏ quyền của
  admin cuối cùng → `409 LAST_ADMIN`. Tài khoản không có hoặc đã xoá → `404`.

---

## Mã lỗi

Mọi lỗi trả về dạng:

```json
{ "timestamp": "...", "status": 400, "code": "INVALID_GAME_ITEM", "message": "content.points is required",
  "path": "/api/v1/games/g-addition/items", "violations": [{ "field": "title", "message": "must not be blank" }] }
```

| HTTP | `code` | Khi nào | API |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | Body sai ràng buộc (`violations` chỉ rõ field) | Mọi API có body |
| 400 | `MALFORMED_REQUEST` | Body không phải JSON hợp lệ | Mọi API có body |
| 400 | `INVALID_SCHOOL_YEAR` | Năm học không phải hai năm liên tiếp | `/classrooms` |
| 400 | `INVALID_STUDENT_ORDER` | Danh sách sắp xếp thiếu / thừa / trùng học sinh | `PUT /classrooms/{code}/students/order` |
| 409 | `CLASSROOM_NAME_TAKEN` | Trùng tên lớp trong cùng năm học | `/classrooms` |
| 409 | `TOO_MANY_CLASSROOMS`, `TOO_MANY_STUDENTS` | Quá 30 lớp / quá 60 học sinh một lớp | `/classrooms` |
| 400 | `INVALID_QUESTION` | Câu hỏi không chơi được (thiếu / trùng đáp án, đáp án đúng không có, thiếu câu trả lời) | 17–26 |
| 400 | `INVALID_QUESTION_ORDER` | Danh sách sắp xếp thiếu / thừa / trùng câu | 25 |
| 409 | `TOO_MANY_QUESTION_SETS`, `TOO_MANY_QUESTIONS` | Quá 200 bộ / quá 200 câu một bộ | 17, 21, 22 |
| 409 | `NO_USABLE_QUESTIONS` | Bộ không có câu nào trò chơi này chơi được | 26 |
| 409 | `CLASSROOM_PAUSED` | Mở trò chơi cho lớp đang tạm ngưng | `POST /classrooms/{code}/sessions` |
| 400 | `INVALID_RANGE` | Khoảng ngày của báo cáo: bắt đầu sau kết thúc, hoặc quá 366 ngày | 31, 37 |
| 400 | `INVALID_PARAMETER` | Tham số trên URL sai kiểu hoặc thiếu (vd. id không phải số), hoặc thiếu file tải lên | Mọi API |
| 400 | `EMPTY_FILE` | File tải lên rỗng | 27 |
| 413 | `FILE_TOO_LARGE` | Ảnh quá 5 MB | 27 |
| 415 | `UNSUPPORTED_IMAGE` | File không phải ảnh PNG / JPEG / GIF / WebP | 27 |
| 409 | `TOO_MANY_ASSETS` | Game đã có 500 file tải lên | 27 |
| 404 | `NOT_FOUND` | Không có API ở đường dẫn này | Mọi đường dẫn |
| 405 | `METHOD_NOT_ALLOWED` | Đường dẫn có, nhưng không nhận phương thức HTTP này | Mọi API |
| 400 | `INVALID_GRADE` | Khối lớp không hợp với cấp học | 4, 6 |
| 400 | `INVALID_SETTINGS` | `settings` không phải object | 6 |
| 400 | `INVALID_GAME_ITEM` | Sai `itemType` / thiếu field trong `content`, `solution` / đáp án hoặc cặp không khớp nội dung | 9, 10 |
| 400 | `TOO_MANY_ITEMS` | Vượt 200 câu / game | 9 |
| 400 | `INVALID_ITEM_ORDER` | Danh sách id không khớp đúng các câu hiện có | 12 |
| 400 | `INVALID_POINTS` | `points = 0` | 15 |
| 401 | `INVALID_CREDENTIALS` | Sai tên đăng nhập / mật khẩu, hoặc tài khoản bị khóa / đã xóa | 0 |
| 401 | `INVALID_REFRESH_TOKEN` | Không có cookie, phiên hết hạn / bị thu hồi, token cũ bị dùng lại, tài khoản bị khóa | 0b |
| 400 | `INVALID_CODE` | Mã xác nhận sai (còn lượt thử) | 0f, 0h |
| 400 | `CODE_EXPIRED` | Mã hết hạn, đã dùng, sai quá 5 lần, hoặc không có mã | 0f, 0h |
| 409 | `EMAIL_TAKEN` | Email vừa được đăng ký bởi người khác trong lúc chờ mã | 0f |
| 429 | `TOO_MANY_LOGIN_ATTEMPTS` | Sai mật khẩu quá nhiều lần (5 / tên đăng nhập hoặc 30 / IP trong 15 phút), khoá 15 phút | 0 |
| 429 | `RESEND_TOO_SOON` | Chưa đủ 60 giây từ mã trước | 0d, 0e, 0g |
| 429 | `TOO_MANY_CODES` | Đã gửi 5 mã trong 1 giờ tới email này | 0d, 0e, 0g |
| 401 | `UNAUTHENTICATED` | Không gửi access token, hoặc tài khoản đã bị khóa / xóa sau khi đăng nhập | Tất cả trừ 0, 2 |
| 401 | `INVALID_TOKEN` | Access token sai định dạng, sai chữ ký, hết hạn, hoặc phiên đăng nhập của nó đã kết thúc (kèm header `WWW-Authenticate`) | Tất cả trừ 0, 2 |
| 403 | `FORBIDDEN` | Đã đăng nhập nhưng vai trò không được phép | 33–45 |
| 409 | `CANNOT_CHANGE_OWN_ACCOUNT` | Admin khoá / đăng xuất / đổi vai trò tài khoản của chính mình | 40–44 |
| 409 | `ADMIN_CANNOT_BE_LOCKED` | Khoá một tài khoản admin (bỏ quyền trước) | 40 |
| 409 | `TEACHER_LOCKED` | Cấp quyền admin cho tài khoản đang khoá | 43 |
| 409 | `LAST_ADMIN` | Bỏ quyền của admin cuối cùng | 43 |
| 429 | `TOO_MANY_FEEDBACK` | Đã gửi 10 góp ý trong 1 giờ | 32 |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại, không phải của mình, hoặc đã lưu trữ | Các API có `{code}` / `{id}`, 4 (template) |
| 409 | `NOTHING_TO_PUBLISH` | Không có bản nháp để publish | 8 |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước (xem log backend) | |

## Chưa có (dự kiến)

| API | Mục đích |
|---|---|
| Đổi mật khẩu khi đang đăng nhập, đăng nhập Google, danh sách thiết bị + đăng xuất mọi thiết bị, giới hạn số lần thử đăng nhập / đăng ký theo IP, CAPTCHA | Phần còn lại của đăng nhập |
| `POST /game-sessions`, `POST /game-sessions/{id}/events`, `POST /game-sessions/{id}/undo`, `GET /game-sessions/{id}`, `POST /game-sessions/{id}/end` | Một ván chơi: điểm đội Lật ô, Undo, khôi phục khi F5 (bảng `game_session`, `player`, `session_event`) |
| `/games/{code}/assets` cho âm thanh, dọn file không còn dùng | Âm thanh cho câu hỏi; job xoá ảnh đã thay |
