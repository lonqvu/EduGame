package com.edugame.admin.domain;

/** What an admin did (ck_admin_audit_log_action). */
public enum AdminAction {
    TEACHER_LOCKED,
    TEACHER_UNLOCKED,
    /** Every sign-in session of the teacher ended. */
    TEACHER_SIGNED_OUT,
    ADMIN_GRANTED,
    ADMIN_REVOKED,
    /** The lock after too many wrong passwords was lifted. */
    LOGIN_UNBLOCKED,
    FEEDBACK_STATUS_CHANGED,
    /** Feedback, with teachers' names and emails, was downloaded as CSV. */
    FEEDBACK_EXPORTED
}
