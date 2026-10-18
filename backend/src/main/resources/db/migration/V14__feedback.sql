-- "Góp ý": what teachers write from the feedback button on every teacher screen, with where they were and, if they
-- want, a screenshot. Read by the EduGame team (mailed to app.feedback.notify-to, and the admin API).
-- Kept when the account goes: user_id becomes NULL.

CREATE TABLE feedback (
    id          BIGSERIAL    NOT NULL,
    code        VARCHAR(32)  NOT NULL,
    user_id     BIGINT,
    kind        VARCHAR(20)  NOT NULL,
    rating      SMALLINT,
    message     TEXT         NOT NULL,
    -- Where the teacher was: path and query of the page, browser window, app build.
    page        VARCHAR(500),
    viewport    VARCHAR(20),
    app_version VARCHAR(40),
    user_agent  VARCHAR(500),
    contact_ok  BOOLEAN      NOT NULL DEFAULT FALSE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_feedback PRIMARY KEY (id),
    CONSTRAINT uq_feedback_code UNIQUE (code),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_feedback_kind CHECK (kind IN ('BUG', 'IDEA', 'PRAISE', 'OTHER')),
    CONSTRAINT ck_feedback_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    CONSTRAINT ck_feedback_message CHECK (char_length(message) BETWEEN 1 AND 2000),
    CONSTRAINT ck_feedback_status CHECK (status IN ('NEW', 'SEEN', 'DONE'))
);

-- The admin list (newest first, by status) and the per-teacher hourly limit.
CREATE INDEX ix_feedback_status_created ON feedback (status, created_at DESC);
CREATE INDEX ix_feedback_user_created ON feedback (user_id, created_at);

-- At most one screenshot per feedback, kept apart so listing feedback does not read the pictures.
CREATE TABLE feedback_screenshot (
    feedback_id  BIGINT      NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    data         BYTEA       NOT NULL,
    size_bytes   INT         NOT NULL,
    CONSTRAINT pk_feedback_screenshot PRIMARY KEY (feedback_id),
    CONSTRAINT fk_feedback_screenshot_feedback FOREIGN KEY (feedback_id) REFERENCES feedback (id) ON DELETE CASCADE,
    CONSTRAINT ck_feedback_screenshot_size CHECK (size_bytes > 0 AND size_bytes <= 3145728)
);
