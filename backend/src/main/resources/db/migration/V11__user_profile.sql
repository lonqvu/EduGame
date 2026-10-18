-- "Hồ sơ của tôi": a phone number and a picture for the account, and two more reasons a session ends.

ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN avatar VARCHAR(30);

ALTER TABLE users ADD CONSTRAINT ck_users_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{9,15}$');
ALTER TABLE users ADD CONSTRAINT ck_users_avatar
    CHECK (avatar IS NULL OR avatar IN ('teacher', 'bear', 'rabbit', 'lion', 'cat', 'fox', 'panda', 'owl', 'frog'));

-- PASSWORD_CHANGE: the user changed the password (every other session ends);
-- SIGNED_OUT_ELSEWHERE: the user signed out of their other devices.
ALTER TABLE user_session DROP CONSTRAINT ck_user_session_revoke_reason;
ALTER TABLE user_session ADD CONSTRAINT ck_user_session_revoke_reason
    CHECK (revoke_reason IN ('LOGOUT', 'TOKEN_REUSE', 'USER_INACTIVE', 'PASSWORD_RESET', 'PASSWORD_CHANGE',
                             'SIGNED_OUT_ELSEWHERE'));
