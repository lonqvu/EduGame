-- "Cài đặt": the teacher's preferences (display, defaults for new games, notification mails), one JSON object.
-- Keys left out take their default (see UserSettings), so new settings need no migration.

ALTER TABLE users ADD COLUMN settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD CONSTRAINT ck_users_settings_object CHECK (jsonb_typeof(settings) = 'object');

-- Browsers a user has signed in with ("Chrome trên Windows"), so a sign-in elsewhere can be mailed. Kept apart from
-- user_session, whose ended rows are deleted after a week: a classroom computer used weekly must stay known.
CREATE TABLE user_known_device (
    user_id      BIGINT       NOT NULL,
    device       VARCHAR(100) NOT NULL,
    first_seen_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_known_device PRIMARY KEY (user_id, device),
    CONSTRAINT fk_user_known_device_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
