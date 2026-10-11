-- =============================================================================
-- V3: Sign-in sessions and their refresh tokens.
--
-- One row per sign-in (per device / browser). The browser holds the refresh token
-- "<sid>.<secret>" in an HttpOnly cookie; only its SHA-256 is stored here. Every
-- refresh rotates it: the new hash replaces the current one, which is kept as
-- previous_token_hash for a few seconds (two tabs refreshing at once). Presenting
-- any other old token means it was stolen: the session is revoked.
--
-- Access tokens carry the sid; a revoked or expired session rejects them at once.
-- =============================================================================

CREATE TABLE user_session (
    id                  BIGSERIAL    NOT NULL,
    sid                 UUID         NOT NULL,
    user_id             BIGINT       NOT NULL,
    token_hash          CHAR(64)     NOT NULL,
    previous_token_hash CHAR(64),
    rotated_at          TIMESTAMPTZ,
    remember            BOOLEAN      NOT NULL DEFAULT FALSE,
    user_agent          VARCHAR(255),
    expires_at          TIMESTAMPTZ  NOT NULL,
    last_used_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked_at          TIMESTAMPTZ,
    revoke_reason       VARCHAR(20),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_session PRIMARY KEY (id),
    CONSTRAINT uq_user_session_sid UNIQUE (sid),
    CONSTRAINT fk_user_session_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_session_revoke_reason
        CHECK (revoke_reason IN ('LOGOUT', 'TOKEN_REUSE', 'USER_INACTIVE')),
    CONSTRAINT ck_user_session_revoked
        CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
);

CREATE INDEX idx_user_session_user_id ON user_session (user_id);
-- Clean-up of old rows.
CREATE INDEX idx_user_session_expires_at ON user_session (expires_at);
