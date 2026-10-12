-- =============================================================================
-- Demo data for local development (mirrors frontend/src/mocks/demoData.ts).
-- Only loaded with the "dev" profile (see application-dev.yml); never in production.
--
-- Repeatable migration: Flyway re-runs it whenever this file changes, so every
-- block only inserts what is missing and never overwrites data edited in the app.
-- Login (once auth exists): colan / 123456.
-- =============================================================================

-- ① Teacher --------------------------------------------------------------------

INSERT INTO users (code, username, password_hash, display_name, email, role)
VALUES ('u-lan', 'colan', '{noop}123456', 'Cô Lan', 'colan@edugame.local', 'TEACHER')
ON CONFLICT (username) DO NOTHING;

-- ② Class 3A with 28 students and their stars ------------------------------------

DO $$
DECLARE
    v_teacher_id   BIGINT := (SELECT id FROM users WHERE code = 'u-lan');
    v_classroom_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM classroom WHERE code = 'c-3a') THEN
        RETURN;
    END IF;

    INSERT INTO classroom (code, teacher_id, name, grade, school_year)
    VALUES ('c-3a', v_teacher_id, '3A', 3, '2026-2027')
    RETURNING id INTO v_classroom_id;

    -- [display name, stars, avatar]; roll number = position in the list.
    WITH roster AS (
        SELECT r.value ->> 0 AS display_name,
               (r.value ->> 1)::int AS stars,
               r.value ->> 2 AS avatar,
               r.ord AS roll_number
        FROM jsonb_array_elements('[
            ["Minh Anh", 12, "cat"], ["Bảo", 10, "fox"], ["Hà", 9, "rabbit"], ["Khôi", 8, "bear"],
            ["Ngọc", 8, "panda"], ["Tùng", 7, "tiger"], ["Linh", 7, "owl"], ["Phúc", 6, "dog"],
            ["An", 6, "cat"], ["Chi", 5, "fox"], ["Dũng", 5, "rabbit"], ["Giang", 5, "bear"],
            ["Huy", 4, "panda"], ["Lan Anh", 4, "tiger"], ["Long", 4, "owl"], ["Mai", 3, "dog"],
            ["Nam", 3, "cat"], ["Nhi", 3, "fox"], ["Phong", 3, "rabbit"], ["Quân", 2, "bear"],
            ["Quỳnh", 2, "panda"], ["Sơn", 2, "tiger"], ["Thảo", 2, "owl"], ["Thư", 1, "dog"],
            ["Trang", 1, "cat"], ["Uyên", 1, "fox"], ["Vy", 1, "rabbit"], ["Yến", 0, "bear"]
        ]'::jsonb) WITH ORDINALITY AS r (value, ord)
    ),
    inserted AS (
        INSERT INTO classroom_student (classroom_id, display_name, avatar, roll_number)
        SELECT v_classroom_id, display_name, avatar, roll_number FROM roster
        RETURNING id, roll_number
    )
    INSERT INTO student_point (classroom_student_id, points, reason, created_by)
    SELECT i.id, r.stars, 'Dữ liệu mẫu', v_teacher_id
    FROM inserted i
    JOIN roster r ON r.roll_number = i.roll_number
    WHERE r.stars > 0;
END;
$$;

-- ③ Games ------------------------------------------------------------------------

-- "Ôn phép cộng trong phạm vi 100" - GRID_BOARD, 24 questions, published.
DO $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = 'g-addition') THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, subject, grade, status)
    VALUES ('g-addition',
            (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = 'GRID_BOARD'),
            'Ôn phép cộng trong phạm vi 100', 'Toán', 3, 'PUBLISHED')
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings, status, published_at)
    SELECT v_game_id, 1, t.schema_version, t.default_config, 'PUBLISHED', now()
    FROM game_template t WHERE t.code = 'GRID_BOARD'
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;

    -- [question, answer]; every third question (from the first) is worth 10 points, the rest 20.
    INSERT INTO game_item (game_version_id, item_type, position, content, solution)
    SELECT v_version_id,
           'OPEN_QUESTION',
           q.ord - 1,
           jsonb_build_object('text', q.value ->> 0,
                              'points', CASE WHEN (q.ord - 1) % 3 = 0 THEN 10 ELSE 20 END),
           jsonb_build_object('answer', q.value ->> 1)
    FROM jsonb_array_elements('[
        ["25 + 13 = ?", "38"], ["40 + 27 = ?", "67"], ["Con gì kêu meo meo?", "Con mèo"],
        ["52 + 36 = ?", "88"], ["18 + 21 = ?", "39"], ["60 + 30 = ?", "90"],
        ["45 + 14 = ?", "59"], ["33 + 33 = ?", "66"], ["12 + 47 = ?", "59"],
        ["70 + 19 = ?", "89"], ["24 + 24 = ?", "48"], ["56 + 31 = ?", "87"],
        ["15 + 62 = ?", "77"], ["81 + 11 = ?", "92"], ["37 + 40 = ?", "77"],
        ["44 + 25 = ?", "69"], ["29 + 30 = ?", "59"], ["63 + 26 = ?", "89"],
        ["50 + 50 = ?", "100"], ["16 + 72 = ?", "88"], ["38 + 41 = ?", "79"],
        ["27 + 52 = ?", "79"], ["11 + 88 = ?", "99"], ["43 + 35 = ?", "78"]
    ]'::jsonb) WITH ORDINALITY AS q (value, ord);
END;
$$;

-- "Con vật quanh em" - MEMORY, one set of 8 pairs (animal ↔ its sound), draft.
DO $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = 'g-animals') THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, subject, grade)
    VALUES ('g-animals',
            (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = 'MEMORY'),
            'Con vật quanh em', 'Tự nhiên và Xã hội', 2)
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings)
    SELECT v_game_id, 1, t.schema_version, t.default_config
    FROM game_template t WHERE t.code = 'MEMORY'
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;

    -- [animal, sound] -> cards aN / bN, pair (aN, bN).
    INSERT INTO game_item (game_version_id, item_type, position, content, solution)
    SELECT v_version_id,
           'CARD_SET',
           0,
           jsonb_build_object('cards',
               jsonb_agg(jsonb_build_object('id', 'a' || p.ord, 'text', p.value ->> 0) ORDER BY p.ord)
               || jsonb_agg(jsonb_build_object('id', 'b' || p.ord, 'text', p.value ->> 1) ORDER BY p.ord)),
           jsonb_build_object('pairs',
               jsonb_agg(jsonb_build_array('a' || p.ord, 'b' || p.ord) ORDER BY p.ord))
    FROM jsonb_array_elements('[
        ["Con mèo", "Meo meo"], ["Con chó", "Gâu gâu"], ["Con vịt", "Cạp cạp"],
        ["Con gà trống", "Ò ó o"], ["Con bò", "Ụm bò"], ["Con dê", "Be be"],
        ["Con ếch", "Ộp ộp"], ["Con chim", "Líu lo"]
    ]'::jsonb) WITH ORDINALITY AS p (value, ord);
END;
$$;

-- "Gọi tên lớp 3A" - SPIN_WHEEL over the class list (source = CLASSROOM, no items), draft.
DO $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = 'g-wheel-3a') THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, grade)
    VALUES ('g-wheel-3a',
            (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = 'SPIN_WHEEL'),
            'Gọi tên lớp 3A', 3)
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings)
    SELECT v_game_id, 1, t.schema_version, t.default_config
    FROM game_template t WHERE t.code = 'SPIN_WHEEL'
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;
END;
$$;

-- "Đố vui Tiếng Việt" - QUIZ, 6 questions (4 single choice + 2 true / false), draft.
DO $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = 'g-quiz-vn') THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, subject, grade)
    VALUES ('g-quiz-vn',
            (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = 'QUIZ'),
            'Đố vui Tiếng Việt', 'Tiếng Việt', 3)
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings)
    SELECT v_game_id, 1, t.schema_version, t.default_config
    FROM game_template t WHERE t.code = 'QUIZ'
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;

    -- [question, correct option index (0-based), option texts...]; two options "Đúng" / "Sai" = TRUE_FALSE.
    INSERT INTO game_item (game_version_id, item_type, position, content, solution)
    SELECT v_version_id,
           CASE WHEN q.value -> 2 = '"Đúng"' AND jsonb_array_length(q.value) = 4 THEN 'TRUE_FALSE' ELSE 'SINGLE_CHOICE' END,
           q.ord - 1,
           jsonb_build_object(
               'text', q.value ->> 0,
               'options', (SELECT jsonb_agg(jsonb_build_object('id', chr(96 + o.ord::int), 'text', o.value #>> '{}') ORDER BY o.ord)
                           FROM jsonb_array_elements(q.value - 0 - 0) WITH ORDINALITY AS o (value, ord))),
           jsonb_build_object('correct', jsonb_build_array(chr(97 + (q.value ->> 1)::int)))
    FROM jsonb_array_elements('[
        ["Từ nào chỉ con vật?", 2, "Bàn ghế", "Chạy nhảy", "Con mèo", "Xinh đẹp"],
        ["Từ nào viết đúng chính tả?", 1, "Xung xướng", "Sung sướng", "Sung xướng"],
        ["Trái nghĩa với \"cao\" là gì?", 0, "Thấp", "Dài", "To", "Rộng"],
        ["Câu \"Em đi học.\" có mấy tiếng?", 1, "Hai", "Ba", "Bốn"],
        ["\"Mặt trời mọc ở đằng Đông.\"", 0, "Đúng", "Sai"],
        ["\"Con cá sống trên cây.\"", 1, "Đúng", "Sai"]
    ]'::jsonb) WITH ORDINALITY AS q (value, ord);
END;
$$;

-- "Thủ đô và danh lam" - MATCHING, one set of 5 pairs, draft.
DO $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = 'g-match-places') THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, subject, grade)
    VALUES ('g-match-places',
            (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = 'MATCHING'),
            'Thành phố và danh lam', 'Tự nhiên và Xã hội', 3)
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings)
    SELECT v_game_id, 1, t.schema_version, t.default_config
    FROM game_template t WHERE t.code = 'MATCHING'
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;

    -- [left, right] -> lN / rN, pair (lN, rN).
    INSERT INTO game_item (game_version_id, item_type, position, content, solution)
    SELECT v_version_id,
           'PAIR_SET',
           0,
           jsonb_build_object(
               'left', jsonb_agg(jsonb_build_object('id', 'l' || p.ord, 'text', p.value ->> 0) ORDER BY p.ord),
               'right', jsonb_agg(jsonb_build_object('id', 'r' || p.ord, 'text', p.value ->> 1) ORDER BY p.ord)),
           jsonb_build_object('pairs', jsonb_agg(jsonb_build_array('l' || p.ord, 'r' || p.ord) ORDER BY p.ord))
    FROM jsonb_array_elements('[
        ["Hà Nội", "Hồ Gươm"], ["Huế", "Sông Hương"], ["Đà Nẵng", "Cầu Rồng"],
        ["Quảng Ninh", "Vịnh Hạ Long"], ["TP. Hồ Chí Minh", "Chợ Bến Thành"]
    ]'::jsonb) WITH ORDINALITY AS p (value, ord);
END;
$$;

-- ④ New games (V7) -------------------------------------------------------------

-- Creates a draft game of Cô Lan with its items unless it exists. items: [{"type", "content", "solution"}].
CREATE OR REPLACE FUNCTION pg_temp.seed_game(p_code TEXT, p_template TEXT, p_title TEXT, p_subject TEXT, p_items JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_game_id    BIGINT;
    v_version_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM game WHERE code = p_code) THEN
        RETURN;
    END IF;

    INSERT INTO game (code, owner_id, template_id, title, subject, grade)
    VALUES (p_code, (SELECT id FROM users WHERE code = 'u-lan'),
            (SELECT id FROM game_template WHERE code = p_template), p_title, p_subject, 3)
    RETURNING id INTO v_game_id;

    INSERT INTO game_version (game_id, version, schema_version, settings)
    SELECT v_game_id, 1, t.schema_version, t.default_config FROM game_template t WHERE t.code = p_template
    RETURNING id INTO v_version_id;

    UPDATE game SET current_version_id = v_version_id WHERE id = v_game_id;

    INSERT INTO game_item (game_version_id, item_type, position, content, solution)
    SELECT v_version_id, i.value ->> 'type', i.ord - 1, i.value -> 'content', i.value -> 'solution'
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS i (value, ord);
END;
$$;

-- Choice questions as [question, correct option index, options...] (two options "Đúng" / "Sai" = TRUE_FALSE).
CREATE OR REPLACE FUNCTION pg_temp.choice_items(p_questions JSONB)
RETURNS JSONB LANGUAGE sql AS $$
    SELECT jsonb_agg(jsonb_build_object(
               'type', CASE WHEN q.value -> 2 = '"Đúng"' AND jsonb_array_length(q.value) = 4
                            THEN 'TRUE_FALSE' ELSE 'SINGLE_CHOICE' END,
               'content', jsonb_build_object(
                   'text', q.value ->> 0,
                   'options', (SELECT jsonb_agg(jsonb_build_object(
                                          'id', CASE WHEN q.value -> 2 = '"Đúng"' AND jsonb_array_length(q.value) = 4
                                                     THEN (ARRAY['true', 'false'])[o.ord] ELSE chr(96 + o.ord::int) END,
                                          'text', o.value #>> '{}') ORDER BY o.ord)
                               FROM jsonb_array_elements(q.value - 0 - 0) WITH ORDINALITY AS o (value, ord))),
               'solution', jsonb_build_object('correct', jsonb_build_array(
                   CASE WHEN q.value -> 2 = '"Đúng"' AND jsonb_array_length(q.value) = 4
                        THEN (ARRAY['true', 'false'])[(q.value ->> 1)::int + 1] ELSE chr(97 + (q.value ->> 1)::int) END)))
           ORDER BY q.ord)
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS q (value, ord);
$$;

SELECT pg_temp.seed_game('g-golden-bell', 'GOLDEN_BELL', 'Rung chuông vàng lớp 3', 'Tổng hợp', pg_temp.choice_items('[
    ["7 x 8 = ?", 1, "54", "56", "64", "48"],
    ["Từ nào là từ chỉ hoạt động?", 2, "Quyển vở", "Xanh biếc", "Chạy nhảy", "Cái bàn"],
    ["Thủ đô của Việt Nam là thành phố nào?", 1, "Huế", "Hà Nội", "Đà Nẵng", "Hải Phòng"],
    ["Con vật nào đẻ trứng?", 3, "Con mèo", "Con chó", "Con bò", "Con gà"],
    ["1 giờ có 60 phút.", 0, "Đúng", "Sai"],
    ["Số liền sau của 999 là số nào?", 1, "998", "1000", "990", "1001"],
    ["Bộ phận nào của cây hút nước?", 0, "Rễ", "Lá", "Hoa", "Quả"],
    ["Hình vuông có 3 cạnh.", 1, "Đúng", "Sai"]
]'));

SELECT pg_temp.seed_game('g-boat-math', 'BOAT_RACE', 'Đua thuyền tính nhẩm', 'Toán', pg_temp.choice_items('[
    ["36 + 27 = ?", 2, "53", "61", "63", "73"],
    ["90 - 45 = ?", 0, "45", "55", "35", "50"],
    ["6 x 7 = ?", 1, "36", "42", "48", "49"],
    ["72 : 8 = ?", 3, "7", "8", "10", "9"],
    ["Số nào lớn nhất?", 2, "589", "598", "958", "895"],
    ["1 km = ? m", 1, "100 m", "1000 m", "10 m", "10 000 m"],
    ["Nửa giờ là bao nhiêu phút?", 0, "30 phút", "15 phút", "50 phút", "60 phút"],
    ["8 x 9 = 72", 0, "Đúng", "Sai"],
    ["Một tuần có 8 ngày.", 1, "Đúng", "Sai"],
    ["125 + 375 = ?", 3, "400", "450", "490", "500"]
]'));

-- Keyword TRƯỜNG: [clue, answer, index of the key letter in the answer without spaces].
SELECT pg_temp.seed_game('g-crossword', 'CROSSWORD', 'Ô chữ: Ngôi trường của em', 'Tiếng Việt', (
    SELECT jsonb_agg(jsonb_build_object(
               'type', 'CROSSWORD_ROW',
               'content', jsonb_build_object('clue', r.value ->> 0),
               'solution', jsonb_build_object('answer', r.value ->> 1, 'keyIndex', (r.value ->> 2)::int))
           ORDER BY r.ord)
    FROM jsonb_array_elements('[
        ["Cây gì thân thẳng, có nhiều đốt, là hình ảnh quen thuộc của làng quê Việt Nam?", "CÂY TRE", 3],
        ["Thứ gì mọc ở đằng Đông, lặn ở đằng Tây, cho ta ánh nắng?", "MẶT TRỜI", 4],
        ["Đồ dùng học tập giúp em kẻ đường thẳng thật đẹp?", "CÁI THƯỚC", 5],
        ["Ngước mắt nhìn lên, em thấy gì xanh thẳm với những đám mây trắng?", "BẦU TRỜI", 5],
        ["Con vật nào phi nước đại, ngày xưa thường kéo xe?", "CON NGỰA", 2],
        ["Ở trường, ai là người dạy em đọc, viết, làm toán?", "CÔ GIÁO", 2]
    ]'::jsonb) WITH ORDINALITY AS r (value, ord)));

-- [prompt, entries in the right order...] -> ids s1..sN, order s1..sN.
SELECT pg_temp.seed_game('g-ordering', 'ORDERING', 'Sắp xếp cho đúng', 'Tổng hợp', (
    SELECT jsonb_agg(jsonb_build_object(
               'type', 'ORDER_SET',
               'content', jsonb_build_object(
                   'text', s.value ->> 0,
                   'items', (SELECT jsonb_agg(jsonb_build_object('id', 's' || e.ord, 'text', e.value #>> '{}') ORDER BY e.ord)
                             FROM jsonb_array_elements(s.value - 0) WITH ORDINALITY AS e (value, ord))),
               'solution', jsonb_build_object(
                   'order', (SELECT jsonb_agg('s' || e.ord ORDER BY e.ord)
                             FROM jsonb_array_elements(s.value - 0) WITH ORDINALITY AS e (value, ord))))
           ORDER BY s.ord)
    FROM jsonb_array_elements('[
        ["Sắp xếp các từ thành câu đúng", "Em", "rất", "yêu", "ngôi trường", "của em."],
        ["Xếp các số theo thứ tự từ bé đến lớn", "125", "251", "512", "521", "1250"],
        ["Thứ tự các mùa trong năm, bắt đầu từ mùa xuân", "Mùa xuân", "Mùa hạ", "Mùa thu", "Mùa đông"],
        ["Các bước rửa tay đúng cách", "Làm ướt tay", "Xoa xà phòng", "Chà kỹ các ngón tay", "Rửa lại bằng nước sạch", "Lau khô tay"]
    ]'::jsonb) WITH ORDINALITY AS s (value, ord)));

-- [prompt, [group names], [[card, group number (1-based)]...]] -> groups g1.., cards c1..
SELECT pg_temp.seed_game('g-sorting', 'SORTING', 'Phân loại vui', 'Tự nhiên và Xã hội', (
    SELECT jsonb_agg(jsonb_build_object(
               'type', 'SORT_SET',
               'content', jsonb_build_object(
                   'text', s.value ->> 0,
                   'groups', (SELECT jsonb_agg(jsonb_build_object('id', 'g' || g.ord, 'text', g.value #>> '{}') ORDER BY g.ord)
                              FROM jsonb_array_elements(s.value -> 1) WITH ORDINALITY AS g (value, ord)),
                   'cards', (SELECT jsonb_agg(jsonb_build_object('id', 'c' || c.ord, 'text', c.value ->> 0) ORDER BY c.ord)
                             FROM jsonb_array_elements(s.value -> 2) WITH ORDINALITY AS c (value, ord))),
               'solution', jsonb_build_object(
                   'assign', (SELECT jsonb_agg(jsonb_build_array('c' || c.ord, 'g' || (c.value ->> 1)) ORDER BY c.ord)
                              FROM jsonb_array_elements(s.value -> 2) WITH ORDINALITY AS c (value, ord))))
           ORDER BY s.ord)
    FROM jsonb_array_elements('[
        ["Con vật này ăn gì?", ["Ăn cỏ", "Ăn thịt"],
         [["Con bò", 1], ["Con hổ", 2], ["Con dê", 1], ["Sư tử", 2], ["Con ngựa", 1], ["Cá sấu", 2], ["Con thỏ", 1], ["Chó sói", 2]]],
        ["Từ nào chỉ sự vật, từ nào chỉ hoạt động?", ["Chỉ sự vật", "Chỉ hoạt động"],
         [["Cái bàn", 1], ["Chạy", 2], ["Quyển sách", 1], ["Viết", 2], ["Cây bàng", 1], ["Hát", 2]]]
    ]'::jsonb) WITH ORDINALITY AS s (value, ord)));

-- ⑤ Classroom management (V9) --------------------------------------------------

UPDATE classroom SET school_name = 'Tiểu học Kim Đồng', avatar = 'bear'
WHERE code = 'c-3a' AND school_name IS NULL;

-- Two more classes of Cô Lan: 1A (active) and 2B (paused), with their students.
CREATE OR REPLACE FUNCTION pg_temp.seed_classroom(p_code TEXT, p_name TEXT, p_grade INT, p_school TEXT, p_avatar TEXT,
                                                  p_status TEXT, p_names JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_classroom_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM classroom WHERE code = p_code) THEN
        RETURN;
    END IF;
    INSERT INTO classroom (code, teacher_id, name, grade, school_year, school_name, avatar, status)
    VALUES (p_code, (SELECT id FROM users WHERE code = 'u-lan'), p_name, p_grade, '2026-2027', p_school, p_avatar, p_status)
    RETURNING id INTO v_classroom_id;

    INSERT INTO classroom_student (classroom_id, display_name, roll_number)
    SELECT v_classroom_id, n.value #>> '{}', n.ord FROM jsonb_array_elements(p_names) WITH ORDINALITY AS n (value, ord);
END;
$$;

SELECT pg_temp.seed_classroom('c-1a', '1A', 1, 'Tiểu học Kim Đồng', 'rabbit', 'ACTIVE', '[
    "Bảo An", "Gia Bảo", "Minh Châu", "Thành Đạt", "Hải Đăng", "Ngọc Diệp", "Anh Duy", "Thu Hà", "Gia Hân", "Minh Hiếu",
    "Khánh Linh", "Bảo Long", "Tuệ Minh", "Hoài Nam", "Bảo Ngọc", "Thảo Nguyên", "Minh Nhật", "Yến Nhi", "Hoàng Phúc",
    "Minh Quân", "Như Quỳnh", "Đức Tài", "Phương Thảo", "Anh Thư", "Khánh Vy"
]');

SELECT pg_temp.seed_classroom('c-2b', '2B', 2, 'Tiểu học Nguyễn Huệ', 'lion', 'PAUSED', '[
    "Quốc Anh", "Ngọc Ánh", "Gia Huy", "Đăng Khoa", "Mai Lan", "Tuấn Kiệt", "Bảo Châu", "Thùy Dương", "Trung Hiếu",
    "Hà My", "Phương Nhi", "Đức Minh", "Thanh Tâm", "Hồng Nhung", "Văn Toàn", "Kim Ngân", "Hữu Phước", "Lan Chi",
    "Minh Khang", "Tường Vi"
]');

-- Games played with the classes, so the class list has activity and completion to show.
DO $$
DECLARE
    v_teacher_id BIGINT := (SELECT id FROM users WHERE code = 'u-lan');
BEGIN
    IF EXISTS (SELECT 1 FROM game_session WHERE host_id = v_teacher_id) THEN
        RETURN;
    END IF;
    -- [class code, game code, ended?] repeated: 3A played 12 games (9 to the end), 1A 8 (5), 2B 3 (1).
    INSERT INTO game_session (game_id, game_version_id, host_id, classroom_id, mode, status, started_at, ended_at)
    SELECT g.id, g.current_version_id, v_teacher_id, c.id, 'CLASSROOM',
           CASE WHEN s.ended THEN 'ENDED' ELSE 'IN_PROGRESS' END,
           now() - s.ago,
           CASE WHEN s.ended THEN now() - s.ago + interval '12 minutes' END
    FROM (
        -- 3A is the class taught most recently (the app opens on it).
        SELECT 'c-3a' AS class_code, n, n <= 9 AS ended, n * interval '6 hours' AS ago FROM generate_series(1, 12) AS n
        UNION ALL SELECT 'c-1a', n, n <= 5, n * interval '2 days' FROM generate_series(1, 8) AS n
        UNION ALL SELECT 'c-2b', n, n <= 1, (n + 20) * interval '1 day' FROM generate_series(1, 3) AS n
    ) AS s
    JOIN classroom c ON c.code = s.class_code
    JOIN game g ON g.code = (ARRAY['g-quiz-vn', 'g-addition', 'g-match-places', 'g-animals'])[1 + s.n % 4];
END;
$$;

-- ⑥ Question sets (V10) ---------------------------------------------------------

-- A set of Cô Lan with its questions: {"q", "o": options, "c": correct index} for multiple choice,
-- {"q", "a": answer} for short answer; "e" is an optional explanation.
CREATE OR REPLACE FUNCTION pg_temp.seed_question_set(p_code TEXT, p_title TEXT, p_description TEXT, p_subject TEXT,
                                                     p_grade INT, p_age INTERVAL, p_questions JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_set_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM question_set WHERE code = p_code) THEN
        RETURN;
    END IF;
    INSERT INTO question_set (code, owner_id, title, description, subject, grade, created_at, updated_at)
    VALUES (p_code, (SELECT id FROM users WHERE code = 'u-lan'), p_title, p_description, p_subject, p_grade,
            now() - p_age - interval '3 days', now() - p_age)
    RETURNING id INTO v_set_id;

    INSERT INTO question (question_set_id, position, question_type, text, options, correct_option, answer, explanation)
    SELECT v_set_id, q.ord - 1,
           CASE WHEN q.value ? 'o' THEN 'MULTIPLE_CHOICE' ELSE 'SHORT_ANSWER' END,
           q.value ->> 'q', q.value -> 'o', (q.value ->> 'c')::SMALLINT, q.value ->> 'a', q.value ->> 'e'
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS q (value, ord);
END;
$$;

SELECT pg_temp.seed_question_set('qs-toan2-cong100', 'Toán lớp 2 - Phép cộng trong phạm vi 100',
    'Phép cộng có nhớ và không nhớ trong phạm vi 100, phù hợp cho hoạt động ôn tập và củng cố kiến thức.', 'TOAN', 2,
    interval '2 hours', '[
    {"q": "25 + 13 = ?", "o": ["38", "37", "48", "28"], "c": 0},
    {"q": "47 + 8 = ?", "o": ["54", "55", "56"], "c": 1, "e": "7 cộng 8 bằng 15, viết 5 nhớ 1; 4 thêm 1 là 5."},
    {"q": "36 + 24 = ?", "o": ["50", "60", "70", "62"], "c": 1},
    {"q": "Số liền sau của 59 + 1 là số nào?", "o": ["60", "61", "59"], "c": 1},
    {"q": "68 + 17 = ?", "o": ["75", "85", "84", "95"], "c": 1},
    {"q": "Mẹ có 35 quả cam, mẹ mua thêm 27 quả. Mẹ có tất cả bao nhiêu quả cam?", "o": ["52", "62", "63", "61"], "c": 1},
    {"q": "40 + 50 = ?", "o": ["80", "90", "100"], "c": 1},
    {"q": "Tổng của 19 và 19 là bao nhiêu?", "a": "38"}
]');

SELECT pg_temp.seed_question_set('qs-tv1-doc-hieu', 'Tiếng Việt - Luyện đọc hiểu',
    'Câu hỏi giúp học sinh rèn kỹ năng đọc hiểu qua các đoạn văn ngắn, câu hỏi đa dạng.', 'TIENG_VIET', 1,
    interval '2 days', '[
    {"q": "\"Mèo con đi học, quên cả mang cặp.\" Mèo con quên mang gì?", "a": "Cái cặp"},
    {"q": "\"Bé Na dậy sớm tưới cây cho mẹ.\" Ai dậy sớm tưới cây?", "a": "Bé Na"},
    {"q": "Tìm từ chỉ màu sắc trong câu: \"Lá cờ đỏ tung bay trước gió.\"", "a": "Đỏ"},
    {"q": "\"Trời mưa, đàn kiến vội vã tha mồi về tổ.\" Đàn kiến làm gì khi trời mưa?", "a": "Tha mồi về tổ"},
    {"q": "Từ nào trái nghĩa với \"chăm chỉ\"?", "a": "Lười biếng"},
    {"q": "Đặt một câu có từ \"ngoan ngoãn\".", "a": "Em bé rất ngoan ngoãn."}
]');

SELECT pg_temp.seed_question_set('qs-ta3-tu-vung', 'Tiếng Anh - Từ vựng theo chủ đề',
    'Tổng hợp các câu hỏi từ vựng theo chủ đề: động vật, đồ vật, gia đình.', 'TIENG_ANH', 3,
    interval '4 days', '[
    {"q": "\"Con mèo\" trong tiếng Anh là gì?", "o": ["Dog", "Cat", "Bird", "Fish"], "c": 1},
    {"q": "\"Book\" nghĩa là gì?", "o": ["Cái bút", "Quyển sách", "Cái bàn"], "c": 1},
    {"q": "\"Mother\" là ai trong gia đình?", "o": ["Bố", "Mẹ", "Anh trai", "Bà"], "c": 1},
    {"q": "Con vật nào là \"elephant\"?", "o": ["Con voi", "Con hổ", "Con khỉ"], "c": 0},
    {"q": "\"Cái thước kẻ\" trong tiếng Anh là gì?", "o": ["Ruler", "Rubber", "Pencil", "Bag"], "c": 0},
    {"q": "\"Brother\" nghĩa là gì?", "o": ["Chị gái", "Anh/em trai", "Ông"], "c": 1},
    {"q": "Từ nào chỉ một con vật biết bay?", "o": ["Fish", "Bird", "Cow"], "c": 1}
]');

SELECT pg_temp.seed_question_set('qs-tnxh2-tu-nhien', 'Tự nhiên và Xã hội - Khám phá thế giới tự nhiên',
    'Câu hỏi tìm hiểu về cây cối, động vật và môi trường xung quanh.', 'TU_NHIEN_XA_HOI', 2,
    interval '7 days', '[
    {"q": "Cây xanh cần gì để sống?", "o": ["Nước, ánh sáng và không khí", "Chỉ cần đất", "Chỉ cần nước"], "c": 0},
    {"q": "Con vật nào sống dưới nước?", "o": ["Con cá", "Con gà", "Con mèo"], "c": 0},
    {"q": "Bộ phận nào của cây hút nước từ đất?", "o": ["Lá", "Hoa", "Rễ", "Quả"], "c": 2},
    {"q": "Việc làm nào giúp bảo vệ môi trường?", "o": ["Vứt rác bừa bãi", "Trồng thêm cây xanh", "Bẻ cành cây"], "c": 1},
    {"q": "Con vật nào đẻ trứng?", "o": ["Con gà", "Con chó", "Con bò"], "c": 0}
]');

SELECT pg_temp.seed_question_set('qs-ksn1-ky-nang', 'Kỹ năng sống - Ứng xử hằng ngày',
    'Các câu hỏi giúp học sinh rèn luyện kỹ năng sống hằng ngày.', 'KHAC', 1,
    interval '11 days', '[
    {"q": "Khi gặp thầy cô giáo, em cần làm gì?", "o": ["Lễ phép chào hỏi", "Đi lướt qua", "Quay mặt đi"], "c": 0},
    {"q": "Trước khi ăn, em cần làm gì?", "o": ["Rửa tay sạch", "Chơi điện thoại", "Chạy nhảy"], "c": 0},
    {"q": "Khi qua đường, em đi ở đâu?", "o": ["Vạch kẻ cho người đi bộ", "Bất kỳ chỗ nào", "Giữa lòng đường"], "c": 0},
    {"q": "Khi bạn bị ngã, em nên làm gì?", "a": "Đỡ bạn dậy và hỏi thăm bạn"}
]');

SELECT pg_temp.seed_question_set('qs-toan3-bang-nhan', 'Toán lớp 3 - Bảng nhân 6, 7, 8',
    'Ôn tập bảng nhân, có cả câu trắc nghiệm và câu trả lời nhanh.', 'TOAN', 3,
    interval '15 days', '[
    {"q": "6 x 7 = ?", "o": ["42", "36", "48"], "c": 0},
    {"q": "8 x 8 = ?", "o": ["56", "64", "72"], "c": 1},
    {"q": "7 x 9 = ?", "o": ["63", "56", "72", "81"], "c": 0},
    {"q": "Mỗi hộp có 6 cái bánh. 5 hộp có bao nhiêu cái bánh?", "a": "30 cái bánh"},
    {"q": "8 x 4 = ?", "a": "32"}
]');

SELECT pg_temp.seed_question_set('qs-kh4-co-the', 'Khoa học - Cơ thể người và sức khỏe',
    'Tìm hiểu các bộ phận cơ thể và thói quen tốt cho sức khỏe.', 'KHOA_HOC', 4,
    interval '20 days', '[
    {"q": "Cơ quan nào giúp chúng ta thở?", "o": ["Phổi", "Dạ dày", "Tim"], "c": 0},
    {"q": "Nên đánh răng mấy lần một ngày?", "o": ["Ít nhất 2 lần", "1 lần mỗi tuần", "Không cần"], "c": 0},
    {"q": "Nhóm thức ăn nào giàu vitamin?", "o": ["Rau và hoa quả", "Kẹo", "Nước ngọt"], "c": 0},
    {"q": "Tim có nhiệm vụ gì?", "o": ["Bơm máu đi khắp cơ thể", "Tiêu hóa thức ăn", "Giúp ta nhìn"], "c": 0}
]');
