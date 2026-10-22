# Prompt tạo ảnh thẻ trò chơi bằng AI

Dùng với ChatGPT (tạo ảnh), Gemini, Midjourney hoặc Ideogram. Mỗi trò một ảnh. Ghép **phần chung** với **phần riêng** của
trò đó thành một prompt.

## Yêu cầu kỹ thuật (để ảnh vừa thẻ)

- Tỉ lệ **2:1**, càng lớn càng tốt (ví dụ 1536×768 hoặc 1920×960).
- Nhân vật và đồ vật chính nằm trong **60% giữa ảnh** (theo chiều ngang) và cách mép trên, mép dưới ít nhất 15%:
  thẻ trên điện thoại cắt bớt hai bên.
- **Không có chữ**, số, logo hay chữ ký trong ảnh (trừ khi phần riêng ghi rõ).
- Gửi lại file PNG hoặc JPG gốc, đặt tên theo mã trò, ví dụ `millionaire.png`. Tôi sẽ cắt, nén và gắn vào app.

## Phần chung (dán đầu mọi prompt)

```
Cute soft 3D cartoon illustration for a children's classroom game card, Pixar-like rendering, rounded friendly shapes,
smooth soft lighting, gentle shadows, pastel color palette, clean simple background with soft bokeh circles and a few
small sparkles, Vietnamese primary school children (age 7–10) in white shirts with blue or red accents, joyful
expressions, wide 2:1 composition, main subject centered, generous empty margin on left and right, no text, no letters,
no numbers, no logo, no watermark.
```

## Phần riêng từng trò

| Mã trò (tên file) | Trò | Phần riêng |
|---|---|---|
| `grid-board` | Lật ô thi đua | `A large board of colorful square tiles on a classroom wall, two tiles flipped open showing a gold star and a smiling face, two children pointing at the board excitedly, light blue background.` |
| `quiz` | Trắc nghiệm | `A big glossy speech bubble with a question mark floating above four rounded colorful answer buttons (blue, orange, green, purple), a girl raising her hand happily, warm yellow background.` |
| `golden-bell` | Rung chuông vàng | `A shiny golden bell with a red ribbon on a small podium, three children holding up small whiteboards, confetti, warm golden-cream background.` |
| `boat-race` | Đua thuyền | `Three small colorful sailboats (orange, blue, green) racing on a sparkling river toward a wooden dock with a checkered flag, children cheering in the boats, sky blue background.` |
| `millionaire` | Ai là triệu phú | `A TV quiz show stage at night, spotlights, a golden trophy and a glowing diamond on a pedestal, a staircase of glowing prize steps on the side, a boy standing proudly, deep navy blue and gold palette.` |
| `tug-of-war` | Kéo co | `Two teams of children playing tug of war on green grass with a thick rope and a red ribbon in the middle, leaning back and laughing, white chalk line on the ground, sky blue background.` |
| `flower-pick` | Hái hoa dân chủ | `A round friendly tree full of big colorful flowers, a child on tiptoe picking one flower that reveals a small folded paper, pink and soft green palette.` |
| `whack-mole` | Đập chuột | `Cute brown moles popping out of holes in green grass, holding small blank signs, a child with a big soft toy hammer about to tap one, fresh green background.` |
| `spin-wheel` | Vòng quay may mắn | `A big colorful prize wheel with a pointer on top, mid-spin with motion blur, children watching with excitement, peach and coral background.` |
| `secret-picture` | Ô cửa bí mật | `A wall of numbered-looking colorful wooden doors (no actual numbers), two doors open revealing part of a sunny landscape picture behind, a curious child peeking, warm orange background.` |

## Gợi ý để cả bộ đồng bộ

- Tạo ảnh đầu tiên, ưng thì dùng ảnh đó làm **ảnh tham chiếu phong cách** cho các ảnh sau. ChatGPT: "giữ đúng phong
  cách của ảnh trước". Midjourney: thêm `--sref` với link ảnh đầu.
- Midjourney: thêm `--ar 2:1 --style raw` vào cuối prompt.
- Ảnh nào có chữ lạ hoặc ngón tay méo thì tạo lại, hoặc gửi tôi để tôi xem có cắt bỏ được không.
