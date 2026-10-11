-- =============================================================================
-- V5: Resetting the password ends every sign-in session of the account
-- (someone who knew the old password may still be signed in somewhere).
-- =============================================================================

ALTER TABLE user_session DROP CONSTRAINT ck_user_session_revoke_reason;
ALTER TABLE user_session ADD CONSTRAINT ck_user_session_revoke_reason
    CHECK (revoke_reason IN ('LOGOUT', 'TOKEN_REUSE', 'USER_INACTIVE', 'PASSWORD_RESET'));
