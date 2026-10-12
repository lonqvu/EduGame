-- =============================================================================
-- V10: Question sets ("Bộ câu hỏi") — a teacher's question bank, kept apart from the games.
--   * question_set: a titled set for a subject and grade. ARCHIVED = deleted for the teacher.
--   * question: multiple choice (2-6 options, one correct) or short answer (one expected answer).
--   * question_set_use: each game made from a set ("Sử dụng"); its questions were copied into the game,
--     so the game keeps working when the set changes later.
-- =============================================================================

CREATE TABLE question_set (
    id          BIGSERIAL    NOT NULL,
    code        VARCHAR(30)  NOT NULL,
    owner_id    BIGINT       NOT NULL,
    title       VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    subject     VARCHAR(30)  NOT NULL DEFAULT 'KHAC',
    grade       SMALLINT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_question_set PRIMARY KEY (id),
    CONSTRAINT uq_question_set_code UNIQUE (code),
    CONSTRAINT fk_question_set_owner FOREIGN KEY (owner_id)
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_question_set_title CHECK (btrim(title) <> ''),
    CONSTRAINT ck_question_set_subject
        CHECK (subject IN ('TOAN', 'TIENG_VIET', 'TIENG_ANH', 'TU_NHIEN_XA_HOI', 'KHOA_HOC', 'KHAC')),
    CONSTRAINT ck_question_set_grade CHECK (grade IS NULL OR grade BETWEEN 1 AND 12),
    CONSTRAINT ck_question_set_status CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX idx_question_set_owner_status ON question_set (owner_id, status);

CREATE TRIGGER trg_question_set_set_updated_at
    BEFORE UPDATE ON question_set
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE question (
    id              BIGSERIAL    NOT NULL,
    question_set_id BIGINT       NOT NULL,
    position        INT          NOT NULL,
    question_type   VARCHAR(20)  NOT NULL,
    text            VARCHAR(500) NOT NULL,
    -- MULTIPLE_CHOICE: the options' texts, in order, and the index of the correct one.
    options         JSONB,
    correct_option  SMALLINT,
    -- SHORT_ANSWER: the expected answer.
    answer          VARCHAR(200),
    explanation     VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_question PRIMARY KEY (id),
    CONSTRAINT fk_question_question_set FOREIGN KEY (question_set_id)
        REFERENCES question_set (id) ON DELETE CASCADE,
    -- Deferrable so questions can be renumbered in one transaction. Covers the FK index.
    CONSTRAINT uq_question_set_position UNIQUE (question_set_id, position)
        DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT ck_question_type CHECK (question_type IN ('MULTIPLE_CHOICE', 'SHORT_ANSWER')),
    CONSTRAINT ck_question_text CHECK (btrim(text) <> ''),
    CONSTRAINT ck_question_shape CHECK (
        (question_type = 'MULTIPLE_CHOICE'
            AND jsonb_typeof(options) = 'array'
            AND jsonb_array_length(options) BETWEEN 2 AND 6
            AND correct_option >= 0 AND correct_option < jsonb_array_length(options)
            AND answer IS NULL)
        OR (question_type = 'SHORT_ANSWER'
            AND options IS NULL AND correct_option IS NULL
            AND answer IS NOT NULL AND btrim(answer) <> '')
    )
);

CREATE TRIGGER trg_question_set_updated_at
    BEFORE UPDATE ON question
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE question_set_use (
    id              BIGSERIAL   NOT NULL,
    question_set_id BIGINT      NOT NULL,
    game_id         BIGINT      NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_question_set_use PRIMARY KEY (id),
    CONSTRAINT fk_question_set_use_question_set FOREIGN KEY (question_set_id)
        REFERENCES question_set (id) ON DELETE CASCADE,
    CONSTRAINT fk_question_set_use_game FOREIGN KEY (game_id)
        REFERENCES game (id) ON DELETE CASCADE,
    -- A game is made from one set.
    CONSTRAINT uq_question_set_use_game UNIQUE (game_id)
);

CREATE INDEX idx_question_set_use_question_set ON question_set_use (question_set_id);
