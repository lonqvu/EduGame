# Âm thanh trò chơi

Âm thanh chỉ phát trên **màn chiếu** (bên trong `ProjectorStage`). Khung xem trước ở trang "Bắt đầu trò chơi" và
trình soạn dùng cùng màn chơi nhưng luôn im lặng (`useSound()` trả về bản không phát).

## File

`frontend/public/assets/sounds/<tên>.webm` (Opus) và `<tên>.mp3` (Safari, trình duyệt cũ). Tất cả được **tổng hợp**
bằng `frontend/scripts/make_sounds.py` (numpy + ffmpeg), nên Lớp Vui sở hữu hoàn toàn, không phải theo dõi giấy phép:

```bash
cd frontend && python3 scripts/make_sounds.py
```

Mỗi âm dựng theo vật lý của âm thật (thanh gỗ marimba, chuông có các bội âm không điều hoà, tiếng vỗ tay là hàng trăm
tiếng vỗ ngắn, nước, giấy), đặt trong một căn phòng nhỏ (vang chập), rồi cân độ to: hiệu ứng khoảng −15…−22 LUFS,
nhạc nền khoảng −26 LUFS, đỉnh không quá −1,5 dBFS.

| Tên trong code (`SoundName`) | File | Dùng khi |
|---|---|---|
| `correct` | `correct-1`, `correct-2` | Trả lời đúng (cao dần theo chuỗi đúng liên tiếp) |
| `wrong` | `wrong-1`, `wrong-2` | Trả lời sai (tròn, nhẹ: trẻ nghe nhiều lần) |
| `tick`, `tickHigh` | `tick`, `tick-high` | 10 giây cuối / 5 giây cuối của đồng hồ; đếm "3, 2, 1" |
| `timeUp` | `time-up` | Hết giờ (câu hỏi, công cụ Đồng hồ) |
| `fanfare`, `applause` | `fanfare`, `applause` | Màn kết quả, người được gọi tên |
| `star` | `star` | Thưởng sao, cứu trợ, đoán đúng từ khoá |
| `pop` | `pop` | Chọn đội / học sinh, mở hàng ô chữ |
| `flip`, `match` | `flip`, `match` | Lật thẻ, mở ô Lật ô; tìm được cặp |
| `bell`, `out` | `golden-bell`, `out` | Rung chuông vàng: người thắng; học sinh bị loại |
| `splash`, `gallop` | `splash`, `gallop` | Thuyền tiến lên; vó ngựa khi đua (phát lặp) |
| `wheelTick` | `wheel-tick` | Kim vòng quay lướt qua từng ô (chậm dần theo vòng quay) |
| `dice`, `shuffle` | `dice`, `shuffle` | Lắc xúc xắc; chia nhóm |
| `whoosh`, `reveal`, `drop`, `start` | cùng tên | Sang câu mới; hiện đáp án; đặt thẻ; bắt đầu / chơi lại |
| nhạc nền | `music-calm`, `music-tense` | Trong trò chơi; bản gấp ở 10 giây cuối mỗi câu |

## Thay bằng file thu âm thật

Đặt file mới **cùng tên**, đủ hai định dạng (`.webm` Opus và `.mp3`), cân độ to như bảng trên rồi chạy lại các test
(`npm test`, e2e `sound.e2e.ts`). Ghi nguồn và giấy phép của file vào bảng dưới đây.

| File | Nguồn | Giấy phép |
|---|---|---|
| Tất cả | `scripts/make_sounds.py` | Của Lớp Vui |

## Bộ phát

- `src/sound/soundEngine.ts` (howler.js): chọn ngẫu nhiên biến thể, lệch cao độ ±4% để không nghe máy móc, hạ nhạc
  nền khi có âm quan trọng, chuyển nhạc êm/gấp mượt, không bao giờ làm lỗi trò chơi nếu trình duyệt chặn âm thanh.
- Cài đặt (`Cài đặt` → Âm thanh, lưu theo tài khoản): bật/tắt, âm lượng, nhạc nền. Trên màn chiếu, nút loa ở góc
  dưới trái hoặc phím **M** tắt/bật nhanh.
- Trình duyệt chỉ cho phát âm thanh sau một cú bấm: bấm "Bắt đầu trò chơi" là đủ.
