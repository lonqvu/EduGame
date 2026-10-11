package com.edugame.auth.domain;

/** Values of {@code user_session.revoke_reason} (ck_user_session_revoke_reason). */
public enum SessionRevokeReason {
    /** The user signed out. */
    LOGOUT,
    /** A refresh token that had already been replaced was used again: it was probably stolen. */
    TOKEN_REUSE,
    /** The account was locked or deleted. */
    USER_INACTIVE,
    /** The password was reset: every session that existed before ends. */
    PASSWORD_RESET
}
