# EduGame Platform – REST API

Danh sách toàn bộ API backend: mục đích, vị trí code backend và nơi frontend gọi.
Swagger UI (chạy thử trực tiếp): <http://localhost:8080/swagger-ui.html> · OpenAPI JSON: `/v3/api-docs`.

## Quy ước chung

| | |
|---|---|
| Base URL | `http://localhost:8080/api/v1` (frontend: `VITE_API_BASE_URL` = `.../api`, path bắt đầu bằng `/v1/...`) |
| Định dạng | JSON, field camelCase. Field `null` không được trả về (`default-property-inclusion: non_null`) |
| Người dùng hiện tại | Chưa có đăng nhập. Profile `dev` cho mọi request đóng vai giáo viên `u-lan` (Cô Lan) — xem [CurrentUserService.java](../backend/src/main/java/com/edugame/user/service/CurrentUserService.java). Không có profile `dev` → mọi API dưới đây trả `401` (trừ `GET /game-templates`) |
| Định danh | Game, lớp dùng `code` (`g-addition`, `c-3a`). Câu hỏi (item), học sinh dùng `id` số |
| Quyền | Chỉ thấy / sửa game và lớp **của mình**. Game / lớp của người khác hoặc đã lưu trữ → `404` |
| Lỗi | Luôn theo format `ApiError` (xem [Mã lỗi](#mã-lỗi)) |

## Tổng quan

Cột **Backend**: controller · service. Cột **Frontend**: hàm trong `api/` · action trong `store/` gọi nó · màn hình dùng.

| # | Method | Path | Mục đích | Backend | Frontend |
|---|---|---|---|---|---|
| 1 | GET | `/me` | Thông tin giáo viên đang dùng | [MeController.java:21](../backend/src/main/java/com/edugame/user/api/MeController.java#L21) · [CurrentUserService.java:42](../backend/src/main/java/com/edugame/user/service/CurrentUserService.java#L42) | [userApi.ts:4](../frontend/src/api/userApi.ts#L4) · [teacherStore.load](../frontend/src/store/teacherStore.ts#L34) · HomePage (lời chào, avatar) |
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
| 13 | GET | `/classrooms` | Các lớp đang dạy | [ClassroomController.java:31](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L31) · [ClassroomService.java:46](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L46) | [classroomApi.ts:6](../frontend/src/api/classroomApi.ts#L6) · [classStore.load](../frontend/src/store/classStore.ts#L32) (lấy lớp đầu tiên) · HomePage, ChooseGamePage, vòng quay, đua tên |
| 14 | GET | `/classrooms/{code}/students` | Danh sách học sinh + số sao | [ClassroomController.java:37](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L37) · [ClassroomService.java:62](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L62) | [classroomApi.ts:12](../frontend/src/api/classroomApi.ts#L12) · [classStore.load](../frontend/src/store/classStore.ts#L32) · HomePage (ngôi sao tuần này), SpinWheelScreen, PickerScreen |
| 15 | POST | `/classrooms/{code}/students/{studentId}/points` | Thưởng / trừ sao cho học sinh | [ClassroomController.java:43](../backend/src/main/java/com/edugame/classroom/api/ClassroomController.java#L43) · [ClassroomService.java:74](../backend/src/main/java/com/edugame/classroom/service/ClassroomService.java#L74) | [classroomApi.ts:18](../frontend/src/api/classroomApi.ts#L18) · [classStore.awardStars](../frontend/src/store/classStore.ts#L54) · SpinWheelScreen, PickerScreen (Thưởng 1 sao) |

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
| SPIN_WHEEL | `WHEEL_SEGMENT` (khi `settings.source = ITEMS`) | `{ label, color?, weight? }` | không có |
| NAME_RACE | — (không có item, dùng danh sách lớp) | | |

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

Backend kiểm tra thêm (→ `400 INVALID_GAME_ITEM`): `id` không rỗng và không trùng (với PAIR_SET là không trùng giữa
cả hai cột), `correct` có đúng 1 id và id đó là một phương án, mỗi cặp nối một id cột trái với một id cột phải
(PAIR_SET) hoặc hai thẻ có thật (CARD_SET), mỗi id chỉ nằm trong một cặp. `text` để trống được (đang soạn dở);
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

### 13. `GET /classrooms` — Các lớp đang dạy

Lớp `ACTIVE` của giáo viên, sắp theo khối rồi tên lớp.

```json
[{ "code": "c-3a", "name": "3A", "grade": 3, "schoolYear": "2026-2027", "studentCount": 28 }]
```

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
| 400 | `INVALID_GRADE` | Khối lớp không hợp với cấp học | 4, 6 |
| 400 | `INVALID_SETTINGS` | `settings` không phải object | 6 |
| 400 | `INVALID_GAME_ITEM` | Sai `itemType` / thiếu field trong `content`, `solution` / đáp án hoặc cặp không khớp nội dung | 9, 10 |
| 400 | `TOO_MANY_ITEMS` | Vượt 200 câu / game | 9 |
| 400 | `INVALID_ITEM_ORDER` | Danh sách id không khớp đúng các câu hiện có | 12 |
| 400 | `INVALID_POINTS` | `points = 0` | 15 |
| 401 | `UNAUTHENTICATED` | Không có người dùng hiện tại (chạy thiếu profile `dev`) | Tất cả trừ 2 |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại, không phải của mình, hoặc đã lưu trữ | Các API có `{code}` / `{id}`, 4 (template) |
| 409 | `NOTHING_TO_PUBLISH` | Không có bản nháp để publish | 8 |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước (xem log backend) | |

## Chưa có (dự kiến)

| API | Mục đích |
|---|---|
| `POST /auth/login`, ... | Đăng nhập thật, thay cho người dùng mặc định |
| `POST /game-sessions`, `POST /game-sessions/{id}/events`, `POST /game-sessions/{id}/undo`, `GET /game-sessions/{id}`, `POST /game-sessions/{id}/end` | Một ván chơi: điểm đội Lật ô, Undo, khôi phục khi F5 (bảng `game_session`, `player`, `session_event`) |
| CRUD `/classrooms`, `/classrooms/{code}/students` | Tạo lớp, thêm / sửa / xóa học sinh |
| `/games/{code}/assets` | Upload ảnh, âm thanh cho câu hỏi |
