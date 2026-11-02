# Translating Lớp Vui

Vietnamese (`locales/vi.ts`) is the source. English (`locales/en.ts`) has the same keys; TypeScript refuses a missing
or extra key, and `locales.test.ts` checks the `{{placeholders}}`, the plural forms and that no Vietnamese is left.

What the teacher writes — questions, answers, class and student names, game titles — is never translated.

## Style of the English

- **Write it again, do not translate word for word.** The Vietnamese speaks to the teacher as "cô" and ends with
  "nhé"; English says "you" and drops the softener.
  "Cô đặt tên cho bộ câu hỏi nhé" → "Give your question set a name", not "Teacher please name the question set".
- **Sentence case** for buttons, titles and menus: "Create question set", not "Create Question Set".
- **Buttons are verbs**: "Add 5 questions", "Start", "Save changes".
- **Short and plain** (the teacher reads it on a projector, often in a hurry): "Couldn't save. Check your connection
  and try again."
- US spelling: *color*, *favorite*, *canceled*.
- Contractions are fine in messages ("Couldn't", "You're"), not in buttons or titles.
- Typographic quotes “ ” in sentences, as in the Vietnamese.

## Counts and sentences with values

- A key with a number takes `{{count}}` and has `_one` and `_other`: `"Added {{count}} question"` /
  `"Added {{count}} questions"`. Vietnamese writes both forms the same.
- Never build a sentence from pieces in code (`'Đã thêm ' + n + ' câu'`): word order differs. One key, with its
  values as `{{name}}`.

## Terms

Use these, and only these, everywhere.

| Tiếng Việt | English | Note |
|---|---|---|
| Lớp Vui | Lớp Vui | The product name, not translated |
| Giáo viên, cô | Teacher, you | "you" when speaking to the teacher |
| Học sinh, các em | Student(s) | |
| Lớp học, lớp | Class | "Lớp 3A" → "Class 3A" |
| Khối lớp, Lớp 3 (khối) | Grade, Grade 3 | "Mọi khối" → "All grades" |
| Năm học | School year | |
| Trường | School | |
| Đang dạy | Teaching now | the class games are played with |
| Bộ câu hỏi | Question set | |
| Câu hỏi | Question | |
| Câu hỏi mẫu | Sample questions | |
| Trắc nghiệm (loại câu) | Multiple choice | |
| Tự luận | Short answer | the teacher checks the answer |
| Đúng / sai | True / false | answers: True, False |
| Đáp án, đáp án đúng, đáp án sai | Answer, correct answer, wrong answer | |
| Giải thích | Explanation | |
| Môn học | Subject | |
| Trò chơi | Game | |
| Trò chơi lớp học / công cụ lớp học | Classroom tool | timers, random picker… |
| Trình chiếu, máy chiếu | Present, projector | "Trình chiếu luật chơi" → "Present the rules" |
| Luật chơi, cách chơi | Rules, how to play | |
| Bắt đầu | Start | |
| Đội | Team | "4 đội" → "4 teams" |
| Lượt | Turn | |
| Điểm | Point(s) | |
| Sao, khen thưởng | Star(s), praise | "⭐ 3 sao tuần này" → "⭐ 3 stars this week" |
| Giành quyền trả lời | Steal (the question) | another team answers after a wrong answer |
| Xáo trộn | Shuffle | |
| Thời gian mỗi câu, không giới hạn | Time per question, no limit | |
| Báo cáo | Reports | |
| Góp ý | Feedback | |
| Cài đặt | Settings | |
| Hồ sơ | Profile | |
| Quản trị | Admin | |
| Đăng nhập, đăng ký, đăng xuất | Sign in, sign up, sign out | not "log in" |
| Tạo tài khoản | Create an account | |
| Khách (chưa đăng nhập) | Guest | |
| Nhập từ file, dán nhiều câu | Import from file, paste questions | |
| File mẫu | Template | |
| Tạm ngưng, kích hoạt lại | Pause, reactivate | a class |
| Xóa | Delete | |

## Game names

Names of our games, translated by what they are. Do not use the names of TV shows or other products.

| Tiếng Việt | English |
|---|---|
| Trắc nghiệm | Quiz |
| Rung chuông vàng | Golden Bell |
| Đua thuyền | Boat Race |
| Lật ô | Tile Flip |
| Ai là triệu phú | Money Ladder |
| Kéo co | Tug of War |
| Hái hoa dân chủ | Flower Picking |
| Đập chuột | Whack-a-Mole |
| Đúng hay sai | True or False |
| Ngôi sao may mắn | Lucky Star |
| Ô cửa bí mật | Secret Picture |
| Leo núi | Mountain Climb |
| Vòng quay điểm thưởng | Points Wheel |
| Cờ ca-rô hỏi đáp | Quiz Tic-Tac-Toe |
| Bốn ô liên tiếp | Four in a Row |
| Rương vàng | Treasure Chest |
| Xây tháp | Tower Builder |
| Ong tìm hoa | Bee and Flowers |
| Bingo | Bingo |
| Sắp xếp chữ | Word Scramble |
| Đoán chữ | Guess the Word |
| Nối cặp | Matching Pairs |
| Lật thẻ | Memory Cards |
| Ô chữ bí mật | Secret Crossword |
| Sắp xếp thứ tự | Put in Order |
| Phân loại | Sort into Groups |
| Vòng quay may mắn | Spin the Wheel |
| Gọi tên ngẫu nhiên | Random Name Picker |
| Chia nhóm | Group Maker |
| Đua tên | Name Race |
| Chọn số ngẫu nhiên | Random Number |
| Bảng điểm | Scoreboard |
| Đo tiếng ồn | Noise Meter |
| Đèn tín hiệu | Traffic Light |
| Đồng hồ đếm ngược | Countdown Timer |
| Bấm giờ | Stopwatch |
| Bốc thăm | Card Draw |
| Sơ đồ chỗ ngồi | Seating Chart |
| Xúc xắc | Dice |
| Tung đồng xu | Coin Flip |

## Before English is switched on for everyone

English is offered only in development or a build with `VITE_ENGLISH=true` until every screen is translated.
The full `en.ts` should be read by a fluent English speaker — ideally an English teacher — before that switch.
