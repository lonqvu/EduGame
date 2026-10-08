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
