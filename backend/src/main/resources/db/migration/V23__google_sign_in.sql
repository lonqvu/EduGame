-- "Đăng nhập với Google": the Google account linked to a user, and accounts without a password.

-- Stable id of the Google account (the "sub" of its ID token); NULL when none is linked. An email can change at
-- Google, this id never does.
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
CREATE UNIQUE INDEX uq_users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;

-- A teacher who signed up with Google has no password until they set one (profile, or "Quên mật khẩu").
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
