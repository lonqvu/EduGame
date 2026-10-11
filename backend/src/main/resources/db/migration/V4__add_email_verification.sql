-- =============================================================================
-- V4: Email verification codes (sign-up now, password reset later).
--
-- A 6-digit code is mailed; only its SHA-256 is stored. It works once, for a
-- limited time and a limited number of guesses. Sign-up keeps the account to be
-- created (display name, password hash) in payload: the user row only exists once
-- the address is proven, so nobody can hold an address they do not own.
-- =============================================================================

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE email_verification (
    id          BIGSERIAL    NOT NULL,
    email       VARCHAR(255) NOT NULL,
    purpose     VARCHAR(20)  NOT NULL,
    code_hash   CHAR(64)     NOT NULL,
    payload     JSONB,
    attempts    INT          NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ  NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_email_verification PRIMARY KEY (id),
    CONSTRAINT ck_email_verification_purpose CHECK (purpose IN ('REGISTER', 'RESET_PASSWORD')),
    CONSTRAINT ck_email_verification_attempts CHECK (attempts >= 0),
    CONSTRAINT ck_email_verification_payload CHECK (payload IS NULL OR jsonb_typeof(payload) = 'object')
);

-- Latest code of an address, and mails sent to it in the last hour. Emails are stored lower-case.
CREATE INDEX idx_email_verification_email ON email_verification (email, purpose, created_at DESC);
-- Clean-up of old rows.
CREATE INDEX idx_email_verification_expires_at ON email_verification (expires_at);
