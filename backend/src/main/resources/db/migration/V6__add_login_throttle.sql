-- =============================================================================
-- V6: Failed sign-in counters, against password guessing.
--
-- One row per key: 'user:<what was typed as username / email, lower case>' or
-- 'ip:<client address>'. Failures are counted in a window; reaching the limit
-- locks the key until locked_until. Unknown usernames are counted like real
-- ones, so a lock does not reveal which accounts exist. A successful sign-in or
-- password reset deletes the user's row.
-- =============================================================================

CREATE TABLE login_throttle (
    throttle_key      VARCHAR(300) NOT NULL,
    failures          INT          NOT NULL,
    window_started_at TIMESTAMPTZ  NOT NULL,
    locked_until      TIMESTAMPTZ,
    CONSTRAINT pk_login_throttle PRIMARY KEY (throttle_key),
    CONSTRAINT ck_login_throttle_failures CHECK (failures >= 0)
);

-- Clean-up of old rows.
CREATE INDEX idx_login_throttle_window_started_at ON login_throttle (window_started_at);
