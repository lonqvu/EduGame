# EduGame – Bộ icon & background

Tất cả là file **SVG**: phóng to không vỡ, dung lượng nhỏ, sửa màu trực tiếp bằng code.
Mở `preview.html` để xem toàn bộ.

## Cấu trúc

```
icons/
  games/          Hình đại diện trò chơi, 320×200 (thẻ chọn game, danh sách game)
  games-square/   Icon vuông 128×128 (menu, nút nhỏ, favicon lớn)
  categories/     Icon nhóm game 64×64
backgrounds/
  home-hero.svg           Banner trang chủ, 1440×320
  card-blue.svg           Nền thẻ "Bắt đầu chơi" (nút chính)
  card-yellow.svg         Nền thẻ "Tạo trò chơi"
  card-green.svg          Nền thẻ "Lớp của tôi"
  projector-board.svg     Nền màn chiếu khi chơi, 1920×1080
  projector-results.svg   Nền màn chiếu kết quả (hoa giấy), 1920×1080
  pattern-dots.svg        Hoa văn chấm lặp lại, 80×80
```

## Tên file khớp với `game_template.code`

| code | icons/games | Màu nền |
|---|---|---|
| GRID_BOARD | grid-board.svg | #DCE7FF |
| QUIZ | quiz.svg | #FFF1C7 |
| MATCHING | matching.svg | #DDF4E7 |
| MEMORY | memory.svg | #F0E8FF |
| SPIN_WHEEL | spin-wheel.svg | #FFE3D8 |
| NAME_RACE | name-race.svg | #D9F2F7 |

Quy ước: `code` viết thường, `_` đổi thành `-` → tên file. Frontend tự suy ra đường dẫn:

```js
const gameIcon = (code) => `/assets/icons/games/${code.toLowerCase().replace(/_/g, '-')}.svg`;
// gameIcon('SPIN_WHEEL') → /assets/icons/games/spin-wheel.svg
```

Thêm game mới: vẽ thêm 2 file (`games/` và `games-square/`) theo cùng tên.

## Cách dùng

```html
<!-- Hình đại diện -->
<img src="/assets/icons/games/grid-board.svg" alt="" width="320" height="200">

<!-- Nền thẻ: đặt ảnh ở góc phải dưới -->
<style>
  .card-start { background: #3563E9 url(/assets/backgrounds/card-blue.svg) right bottom / cover no-repeat; }
  .projector  { background: url(/assets/backgrounds/projector-board.svg) center / cover; }
  .page       { background: url(/assets/backgrounds/pattern-dots.svg); }
</style>
```

## Bảng màu chung

| Vai trò | Hex |
|---|---|
| Chữ chính | #1F2A44 |
| Chữ phụ | #4A5470 |
| Nền trang | #F3F7FC |
| Màu chính (nút) | #3563E9 |
| Vàng nhấn | #FFD15C |
| Xanh "Đúng" | #1B7A50 |
| Đội: Cam / Biển / Lá / Tím | #F28C28 / #3563E9 / #2E9E6A / #8B5CF6 |

## Font

Thiết kế dùng **Baloo 2** (tiêu đề, số) và **Nunito** (chữ thường), đều hỗ trợ tiếng Việt (Google Fonts).
Một vài icon có chữ/số bên trong. Khi dùng qua `<img>`, trình duyệt không tải web font cho SVG
nên sẽ hiện font dự phòng (Segoe UI/Arial) – vẫn đọc tốt. Muốn đúng font tuyệt đối thì nhúng SVG
inline vào HTML, hoặc chuyển chữ thành path bằng Inkscape/Figma (Object to Path).
