-- A picture the teacher uploads for the profile, instead of one of the drawings.
-- Small (re-encoded by the backend to a 256 x 256 JPEG, a few dozen KB), so it is kept in the database: no file
-- storage to run. public_id is random and changes with every upload; it is the address of the picture
-- (GET /api/v1/avatars/{public_id}), so it can be cached for good and shown without signing in.

CREATE TABLE user_avatar (
    id           BIGSERIAL   NOT NULL,
    user_id      BIGINT      NOT NULL,
    public_id    VARCHAR(32) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    data         BYTEA       NOT NULL,
    size_bytes   INT         NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_avatar PRIMARY KEY (id),
    CONSTRAINT uq_user_avatar_user UNIQUE (user_id),
    CONSTRAINT uq_user_avatar_public_id UNIQUE (public_id),
    CONSTRAINT fk_user_avatar_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_avatar_size CHECK (size_bytes > 0 AND size_bytes <= 524288)
);

-- users.avatar = 'upload': the picture is the one in user_avatar.
ALTER TABLE users DROP CONSTRAINT ck_users_avatar;
ALTER TABLE users ADD CONSTRAINT ck_users_avatar
    CHECK (avatar IS NULL OR avatar IN ('upload', 'teacher', 'bear', 'rabbit', 'lion', 'cat', 'fox', 'panda', 'owl', 'frog'));
