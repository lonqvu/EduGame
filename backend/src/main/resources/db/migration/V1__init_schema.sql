-- =============================================================================
-- V1: Initial schema (14 tables) + seed game_category / game_template.
-- Source of truth: docs/DATABASE.md
--
-- Conventions:
--   * BIGSERIAL keys, TIMESTAMPTZ times, JSONB for per-game data.
--   * Enums are VARCHAR + CHECK (no PostgreSQL ENUM types).
--   * Constraint/index names: pk_, fk_, uq_, ck_, idx_.
--   * Every FK column is indexed unless a unique/composite index already
--     starts with that column.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1 - SCHEMA
-- -----------------------------------------------------------------------------

CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ① TÀI KHOẢN -----------------------------------------------------------------

CREATE TABLE users (
    id            BIGSERIAL    NOT NULL,
    code          VARCHAR(30)  NOT NULL,
    username      VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    email         VARCHAR(255),
    role          VARCHAR(20)  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_code UNIQUE (code),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'TEACHER')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'DELETED'))
);

-- Email is unique case-insensitively ("A@x.com" and "a@x.com" are the same).
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ② DANH MỤC GAME -------------------------------------------------------------

CREATE TABLE game_category (
    id         BIGSERIAL    NOT NULL,
    code       VARCHAR(50)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    icon       VARCHAR(100),
    sort_order INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_game_category PRIMARY KEY (id),
    CONSTRAINT uq_game_category_code UNIQUE (code)
);

CREATE TABLE game_template (
    id             BIGSERIAL    NOT NULL,
    code           VARCHAR(50)  NOT NULL,
    category_id    BIGINT,
    engine         VARCHAR(50)  NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    icon           VARCHAR(100),
    thumbnail_url  VARCHAR(500),
    schema_version INT          NOT NULL DEFAULT 1,
    config_schema  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    default_config JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_new         BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order     INT          NOT NULL DEFAULT 0,
    status         VARCHAR(20)  NOT NULL DEFAULT 'BETA',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_game_template PRIMARY KEY (id),
    CONSTRAINT uq_game_template_code UNIQUE (code),
    CONSTRAINT fk_game_template_category FOREIGN KEY (category_id)
        REFERENCES game_category (id) ON DELETE RESTRICT,
    CONSTRAINT ck_game_template_status CHECK (status IN ('DRAFT', 'BETA', 'ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_game_template_config_schema CHECK (jsonb_typeof(config_schema) = 'object'),
    CONSTRAINT ck_game_template_default_config CHECK (jsonb_typeof(default_config) = 'object')
);

CREATE INDEX idx_game_template_category_id ON game_template (category_id);

CREATE TRIGGER trg_game_template_set_updated_at
    BEFORE UPDATE ON game_template
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ③ NỘI DUNG GAME -------------------------------------------------------------

CREATE TABLE game (
    id                 BIGSERIAL    NOT NULL,
    code               VARCHAR(30)  NOT NULL,
    owner_id           BIGINT       NOT NULL,
    template_id        BIGINT       NOT NULL,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    thumbnail_url      VARCHAR(500),
    subject            VARCHAR(50),
    education_level    VARCHAR(20)  NOT NULL DEFAULT 'TIEU_HOC',
    grade              SMALLINT,
    visibility         VARCHAR(20)  NOT NULL DEFAULT 'PRIVATE',
    status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    current_version_id BIGINT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_game PRIMARY KEY (id),
    CONSTRAINT uq_game_code UNIQUE (code),
    CONSTRAINT fk_game_owner FOREIGN KEY (owner_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_game_template FOREIGN KEY (template_id)
        REFERENCES game_template (id) ON DELETE RESTRICT,
    CONSTRAINT ck_game_education_level
        CHECK (education_level IN ('MAM_NON', 'TIEU_HOC', 'THCS', 'THPT', 'DAI_HOC', 'KHAC')),
    -- grade must fit the education level. MAM_NON has no grade; KHAC is unconstrained.
    CONSTRAINT ck_game_grade CHECK (
        grade IS NULL
        OR (education_level = 'TIEU_HOC' AND grade BETWEEN 1 AND 5)
        OR (education_level = 'THCS'     AND grade BETWEEN 6 AND 9)
        OR (education_level = 'THPT'     AND grade BETWEEN 10 AND 12)
        OR (education_level = 'DAI_HOC'  AND grade BETWEEN 1 AND 6)
        OR education_level = 'KHAC'
    ),
    CONSTRAINT ck_game_visibility CHECK (visibility IN ('PRIVATE', 'UNLISTED', 'PUBLIC')),
    CONSTRAINT ck_game_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
    -- fk_game_current_version is added after game_version exists.
);

CREATE INDEX idx_game_owner_id ON game (owner_id);
CREATE INDEX idx_game_template_id ON game (template_id);
CREATE INDEX idx_game_current_version_id ON game (current_version_id);

CREATE TRIGGER trg_game_set_updated_at
    BEFORE UPDATE ON game
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE game_version (
    id             BIGSERIAL   NOT NULL,
    game_id        BIGINT      NOT NULL,
    version        INT         NOT NULL,
    schema_version INT         NOT NULL,
    settings       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_game_version PRIMARY KEY (id),
    CONSTRAINT fk_game_version_game FOREIGN KEY (game_id)
        REFERENCES game (id) ON DELETE CASCADE,
    -- Also covers the index on game_id.
    CONSTRAINT uq_game_version_game_id_version UNIQUE (game_id, version),
    -- Target of composite FKs that force "version belongs to this game".
    CONSTRAINT uq_game_version_id_game_id UNIQUE (id, game_id),
    CONSTRAINT ck_game_version_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_game_version_published_at CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL),
    CONSTRAINT ck_game_version_settings CHECK (jsonb_typeof(settings) = 'object')
);

-- At most one DRAFT version per game.
CREATE UNIQUE INDEX uq_game_version_one_draft ON game_version (game_id) WHERE status = 'DRAFT';

-- current_version_id must be a version of THIS game. Deferred so a game and its
-- first version can be inserted in either order inside one transaction.
ALTER TABLE game
    ADD CONSTRAINT fk_game_current_version FOREIGN KEY (current_version_id, id)
        REFERENCES game_version (id, game_id)
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE game_item (
    id              BIGSERIAL   NOT NULL,
    game_version_id BIGINT      NOT NULL,
    item_type       VARCHAR(50) NOT NULL,
    position        INT         NOT NULL,
    content         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    solution        JSONB,
    explanation     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_game_item PRIMARY KEY (id),
    CONSTRAINT fk_game_item_game_version FOREIGN KEY (game_version_id)
        REFERENCES game_version (id) ON DELETE CASCADE,
    -- Deferrable so items can be reordered (swap positions) in one transaction
    -- via SET CONSTRAINTS uq_game_item_version_position DEFERRED. Covers the FK index.
    CONSTRAINT uq_game_item_version_position UNIQUE (game_version_id, position)
        DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT ck_game_item_content CHECK (jsonb_typeof(content) = 'object'),
    -- No-answer games (e.g. SPIN_WHEEL) store SQL NULL, not JSON null.
    CONSTRAINT ck_game_item_solution CHECK (solution IS NULL OR jsonb_typeof(solution) = 'object')
);

CREATE TABLE game_asset (
    id         BIGSERIAL    NOT NULL,
    game_id    BIGINT       NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    mime_type  VARCHAR(100),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_game_asset PRIMARY KEY (id),
    CONSTRAINT fk_game_asset_game FOREIGN KEY (game_id)
        REFERENCES game (id) ON DELETE CASCADE,
    CONSTRAINT ck_game_asset_type CHECK (type IN ('IMAGE', 'AUDIO', 'VIDEO', 'OTHER'))
);

CREATE INDEX idx_game_asset_game_id ON game_asset (game_id);

-- ④ LỚP HỌC -------------------------------------------------------------------

CREATE TABLE classroom (
    id          BIGSERIAL   NOT NULL,
    code        VARCHAR(30) NOT NULL,
    teacher_id  BIGINT      NOT NULL,
    name        VARCHAR(50) NOT NULL,
    grade       SMALLINT    NOT NULL,
    school_year VARCHAR(9),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_classroom PRIMARY KEY (id),
    CONSTRAINT uq_classroom_code UNIQUE (code),
    CONSTRAINT fk_classroom_teacher FOREIGN KEY (teacher_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_classroom_status CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX idx_classroom_teacher_id ON classroom (teacher_id);

CREATE TRIGGER trg_classroom_set_updated_at
    BEFORE UPDATE ON classroom
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE classroom_student (
    id           BIGSERIAL   NOT NULL,
    classroom_id BIGINT      NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    avatar       VARCHAR(50),
    roll_number  SMALLINT,
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_classroom_student PRIMARY KEY (id),
    CONSTRAINT fk_classroom_student_classroom FOREIGN KEY (classroom_id)
        REFERENCES classroom (id) ON DELETE CASCADE,
    CONSTRAINT ck_classroom_student_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_classroom_student_classroom_id ON classroom_student (classroom_id);

-- roll_number is unique only among students still in the class; INACTIVE
-- students keep their old number without blocking reuse.
CREATE UNIQUE INDEX uq_classroom_student_roll_number
    ON classroom_student (classroom_id, roll_number)
    WHERE status = 'ACTIVE' AND roll_number IS NOT NULL;

-- ⑤ BUỔI CHƠI -----------------------------------------------------------------

CREATE TABLE game_session (
    id              BIGSERIAL   NOT NULL,
    game_id         BIGINT      NOT NULL,
    game_version_id BIGINT      NOT NULL,
    host_id         BIGINT      NOT NULL,
    classroom_id    BIGINT,
    session_code    VARCHAR(10),
    mode            VARCHAR(20) NOT NULL DEFAULT 'CLASSROOM',
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    settings        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    state           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    current_item_id BIGINT,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_game_session PRIMARY KEY (id),
    CONSTRAINT fk_game_session_game FOREIGN KEY (game_id)
        REFERENCES game (id) ON DELETE RESTRICT,
    -- The session's version must belong to the session's game.
    CONSTRAINT fk_game_session_game_version FOREIGN KEY (game_version_id, game_id)
        REFERENCES game_version (id, game_id) ON DELETE RESTRICT,
    CONSTRAINT fk_game_session_host FOREIGN KEY (host_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_game_session_classroom FOREIGN KEY (classroom_id)
        REFERENCES classroom (id) ON DELETE SET NULL,
    CONSTRAINT fk_game_session_current_item FOREIGN KEY (current_item_id)
        REFERENCES game_item (id) ON DELETE SET NULL,
    CONSTRAINT ck_game_session_mode CHECK (mode IN ('CLASSROOM', 'LIVE', 'SELF_PACED')),
    CONSTRAINT ck_game_session_status CHECK (status IN ('WAITING', 'IN_PROGRESS', 'ENDED', 'CANCELLED')),
    -- Students join LIVE / SELF_PACED rooms themselves, so those need a PIN.
    CONSTRAINT ck_game_session_session_code CHECK (mode = 'CLASSROOM' OR session_code IS NOT NULL),
    CONSTRAINT ck_game_session_settings CHECK (jsonb_typeof(settings) = 'object'),
    CONSTRAINT ck_game_session_state CHECK (jsonb_typeof(state) = 'object')
);

CREATE INDEX idx_game_session_game_id ON game_session (game_id);
CREATE INDEX idx_game_session_game_version_id ON game_session (game_version_id);
CREATE INDEX idx_game_session_host_id ON game_session (host_id);
CREATE INDEX idx_game_session_classroom_id ON game_session (classroom_id);
CREATE INDEX idx_game_session_current_item_id ON game_session (current_item_id);

-- A PIN only has to be unique among rooms that are still open; ended rooms free it.
CREATE UNIQUE INDEX uq_game_session_session_code_open
    ON game_session (session_code)
    WHERE session_code IS NOT NULL AND status IN ('WAITING', 'IN_PROGRESS');

CREATE TRIGGER trg_game_session_set_updated_at
    BEFORE UPDATE ON game_session
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE player (
    id                   BIGSERIAL   NOT NULL,
    session_id           BIGINT      NOT NULL,
    kind                 VARCHAR(20) NOT NULL,
    classroom_student_id BIGINT,
    team_id              BIGINT,
    display_name         VARCHAR(50) NOT NULL,
    avatar               VARCHAR(50),
    total_score          INT         NOT NULL DEFAULT 0,
    streak               INT         NOT NULL DEFAULT 0,
    best_streak          INT         NOT NULL DEFAULT 0,
    status               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_player PRIMARY KEY (id),
    -- Target of composite FKs that force "same session".
    CONSTRAINT uq_player_id_session_id UNIQUE (id, session_id),
    -- Also covers the index on session_id.
    CONSTRAINT uq_player_session_display_name UNIQUE (session_id, display_name),
    CONSTRAINT fk_player_session FOREIGN KEY (session_id)
        REFERENCES game_session (id) ON DELETE CASCADE,
    CONSTRAINT fk_player_classroom_student FOREIGN KEY (classroom_student_id)
        REFERENCES classroom_student (id) ON DELETE SET NULL,
    -- A student's team must be a player of the same session.
    CONSTRAINT fk_player_team FOREIGN KEY (team_id, session_id)
        REFERENCES player (id, session_id) ON DELETE CASCADE,
    CONSTRAINT ck_player_kind CHECK (kind IN ('STUDENT', 'TEAM')),
    CONSTRAINT ck_player_status CHECK (status IN ('ACTIVE', 'ELIMINATED', 'ABSENT')),
    -- A TEAM is never a member of another team and is not a classroom student.
    CONSTRAINT ck_player_team_refs CHECK (kind <> 'TEAM' OR (team_id IS NULL AND classroom_student_id IS NULL))
);

CREATE INDEX idx_player_classroom_student_id ON player (classroom_student_id);
CREATE INDEX idx_player_team_id ON player (team_id);

-- Each classroom student appears at most once per session.
CREATE UNIQUE INDEX uq_player_session_classroom_student
    ON player (session_id, classroom_student_id)
    WHERE classroom_student_id IS NOT NULL;

CREATE TABLE session_event (
    id          BIGSERIAL   NOT NULL,
    session_id  BIGINT      NOT NULL,
    seq         INT         NOT NULL,
    type        VARCHAR(50) NOT NULL,
    player_id   BIGINT,
    item_id     BIGINT,
    is_correct  BOOLEAN,
    score_delta INT         NOT NULL DEFAULT 0,
    payload     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    undone      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_session_event PRIMARY KEY (id),
    -- Also covers the index on session_id.
    CONSTRAINT uq_session_event_session_seq UNIQUE (session_id, seq),
    CONSTRAINT fk_session_event_session FOREIGN KEY (session_id)
        REFERENCES game_session (id) ON DELETE CASCADE,
    -- The event's player must belong to the same session.
    CONSTRAINT fk_session_event_player FOREIGN KEY (player_id, session_id)
        REFERENCES player (id, session_id) ON DELETE CASCADE,
    -- Played content cannot be deleted.
    CONSTRAINT fk_session_event_item FOREIGN KEY (item_id)
        REFERENCES game_item (id) ON DELETE RESTRICT,
    CONSTRAINT ck_session_event_payload CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX idx_session_event_player_id ON session_event (player_id);
CREATE INDEX idx_session_event_item_id ON session_event (item_id);

CREATE TABLE player_award (
    id         BIGSERIAL   NOT NULL,
    player_id  BIGINT      NOT NULL,
    award_code VARCHAR(50) NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_player_award PRIMARY KEY (id),
    -- Each award at most once per player. Also covers the index on player_id.
    CONSTRAINT uq_player_award_player_award_code UNIQUE (player_id, award_code),
    CONSTRAINT fk_player_award_player FOREIGN KEY (player_id)
        REFERENCES player (id) ON DELETE CASCADE
);

CREATE TABLE student_point (
    id                   BIGSERIAL    NOT NULL,
    classroom_student_id BIGINT       NOT NULL,
    session_id           BIGINT,
    points               INT          NOT NULL,
    reason               VARCHAR(100),
    created_by           BIGINT       NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_student_point PRIMARY KEY (id),
    CONSTRAINT fk_student_point_classroom_student FOREIGN KEY (classroom_student_id)
        REFERENCES classroom_student (id) ON DELETE CASCADE,
    -- Deleting a session keeps the stars earned in it.
    CONSTRAINT fk_student_point_session FOREIGN KEY (session_id)
        REFERENCES game_session (id) ON DELETE SET NULL,
    CONSTRAINT fk_student_point_created_by FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_student_point_points CHECK (points <> 0)
);

CREATE INDEX idx_student_point_classroom_student_id ON student_point (classroom_student_id);
CREATE INDEX idx_student_point_session_id ON student_point (session_id);
CREATE INDEX idx_student_point_created_by ON student_point (created_by);

-- -----------------------------------------------------------------------------
-- PART 2 - SEED
-- -----------------------------------------------------------------------------

INSERT INTO game_category (code, name, icon, sort_order) VALUES
    ('QUESTION',    'Câu hỏi',            'question', 1),
    ('PUZZLE',      'Giải đố',            'puzzle',   2),
    ('RANDOM_TOOL', 'Công cụ ngẫu nhiên', 'dice',     3);

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
VALUES
(
    'QUIZ',
    (SELECT id FROM game_category WHERE code = 'QUESTION'),
    'RULES',
    'Trắc nghiệm',
    'Câu hỏi hiện trên màn chiếu, các đội giành quyền trả lời, giáo viên chấm Đúng / Sai.',
    'quiz',
    1,
    '{
      "itemTypes": ["SINGLE_CHOICE", "TRUE_FALSE"],
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "readAloud":      {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["text", "options"],
        "properties": {
          "text":  {"type": "string"},
          "image": {"type": "string"},
          "audio": {"type": "string"},
          "options": {
            "type": "array",
            "minItems": 2,
            "items": {
              "type": "object",
              "required": ["id", "text"],
              "properties": {
                "id":    {"type": "string"},
                "text":  {"type": "string"},
                "image": {"type": "string"}
              }
            }
          }
        }
      },
      "solution": {
        "type": "object",
        "required": ["correct"],
        "properties": {
          "correct": {"type": "array", "minItems": 1, "items": {"type": "string"}}
        }
      }
    }'::jsonb,
    '{
      "timeLimitSec": 30,
      "shuffleItems": false,
      "shuffleOptions": true,
      "readAloud": false,
      "rules": {
        "participants": {"mode": "TEAM", "teams": 4, "assign": "RANDOM"},
        "turn":         {"type": "BUZZER"},
        "scoring":      {"type": "FIXED", "points": 10, "allowSteal": true},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb,
    FALSE,
    1,
    'ACTIVE'
),
(
    'MATCHING',
    (SELECT id FROM game_category WHERE code = 'PUZZLE'),
    'RULES',
    'Nối cặp',
    'Nối mỗi ô bên trái với ô tương ứng bên phải.',
    'matching',
    1,
    '{
      "itemTypes": ["PAIR_SET"],
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec": {"type": "integer", "minimum": 0},
          "shuffleItems": {"type": "boolean"},
          "readAloud":    {"type": "boolean"},
          "rules":        {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["left", "right"],
        "properties": {
          "left":  {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/side"}},
          "right": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/side"}}
        },
        "$defs": {
          "side": {
            "type": "object",
            "required": ["id"],
            "properties": {
              "id":    {"type": "string"},
              "text":  {"type": "string"},
              "image": {"type": "string"}
            }
          }
        }
      },
      "solution": {
        "type": "object",
        "required": ["pairs"],
        "properties": {
          "pairs": {
            "type": "array",
            "minItems": 1,
            "items": {"type": "array", "minItems": 2, "maxItems": 2, "items": {"type": "string"}}
          }
        }
      }
    }'::jsonb,
    '{
      "timeLimitSec": 60,
      "shuffleItems": false,
      "readAloud": false,
      "rules": {
        "participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "FIXED", "points": 10, "allowSteal": false},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb,
    FALSE,
    1,
    'ACTIVE'
),
(
    'MEMORY',
    (SELECT id FROM game_category WHERE code = 'PUZZLE'),
    'MEMORY',
    'Lật thẻ trí nhớ',
    'Lật hai thẻ mỗi lượt, tìm các cặp thẻ giống nhau.',
    'memory',
    1,
    '{
      "itemTypes": ["CARD_SET"],
      "settings": {
        "type": "object",
        "properties": {
          "flipBackDelayMs": {"type": "integer", "minimum": 0},
          "rules":           {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["cards"],
        "properties": {
          "cards": {
            "type": "array",
            "minItems": 2,
            "items": {
              "type": "object",
              "required": ["id"],
              "properties": {
                "id":    {"type": "string"},
                "text":  {"type": "string"},
                "image": {"type": "string"}
              }
            }
          }
        }
      },
      "solution": {
        "type": "object",
        "required": ["pairs"],
        "properties": {
          "pairs": {
            "type": "array",
            "minItems": 1,
            "items": {"type": "array", "minItems": 2, "maxItems": 2, "items": {"type": "string"}}
          }
        }
      }
    }'::jsonb,
    '{
      "flipBackDelayMs": 1000,
      "rules": {
        "participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "FIXED", "points": 10},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb,
    FALSE,
    2,
    'ACTIVE'
),
(
    'SPIN_WHEEL',
    (SELECT id FROM game_category WHERE code = 'RANDOM_TOOL'),
    'SPIN_WHEEL',
    'Vòng quay may mắn',
    'Quay ngẫu nhiên để gọi tên học sinh hoặc chọn thử thách.',
    'wheel',
    1,
    '{
      "itemTypes": ["WHEEL_SEGMENT"],
      "settings": {
        "type": "object",
        "required": ["source"],
        "properties": {
          "source":          {"type": "string", "enum": ["CLASSROOM", "ITEMS"]},
          "removeAfterSpin": {"type": "boolean"},
          "spinDurationMs":  {"type": "integer", "minimum": 0}
        }
      },
      "content": {
        "type": "object",
        "required": ["label"],
        "properties": {
          "label":  {"type": "string"},
          "color":  {"type": "string"},
          "weight": {"type": "number", "exclusiveMinimum": 0}
        }
      },
      "solution": {"type": "null"}
    }'::jsonb,
    '{
      "source": "CLASSROOM",
      "removeAfterSpin": true,
      "spinDurationMs": 4000
    }'::jsonb,
    FALSE,
    1,
    'ACTIVE'
);
