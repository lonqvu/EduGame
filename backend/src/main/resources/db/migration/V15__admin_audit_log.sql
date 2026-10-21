-- "Quản trị": every change an admin makes (locking a teacher, changing a role, marking feedback...), who made it and
-- when. Written by the backend only, never changed or deleted by the app. The admin's name and the target's label are
-- copied in, so the log still reads right after an account is renamed or deleted (actor_id then becomes NULL).

CREATE TABLE admin_audit_log (
    id           BIGSERIAL    NOT NULL,
    actor_id     BIGINT,
    actor_name   VARCHAR(100) NOT NULL,
    action       VARCHAR(40)  NOT NULL,
    target_type  VARCHAR(20)  NOT NULL,
    target_code  VARCHAR(32),
    target_label VARCHAR(255),
    -- What changed, e.g. {"from": "NEW", "to": "DONE"} or {"reason": "…"}.
    details      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_admin_audit_log PRIMARY KEY (id),
    CONSTRAINT fk_admin_audit_log_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_admin_audit_log_action CHECK (action IN ('TEACHER_LOCKED', 'TEACHER_UNLOCKED', 'TEACHER_SIGNED_OUT',
        'ADMIN_GRANTED', 'ADMIN_REVOKED', 'LOGIN_UNBLOCKED', 'FEEDBACK_STATUS_CHANGED', 'FEEDBACK_EXPORTED')),
    CONSTRAINT ck_admin_audit_log_target_type CHECK (target_type IN ('TEACHER', 'FEEDBACK')),
    CONSTRAINT ck_admin_audit_log_details CHECK (jsonb_typeof(details) = 'object')
);

-- The log page (newest first), one teacher's history, one admin's actions.
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log (created_at DESC, id DESC);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log (target_type, target_code, created_at DESC);
CREATE INDEX idx_admin_audit_log_actor_id ON admin_audit_log (actor_id);

-- BY_ADMIN: an admin signed the user out of every device, or took their admin role away.
ALTER TABLE user_session DROP CONSTRAINT ck_user_session_revoke_reason;
ALTER TABLE user_session ADD CONSTRAINT ck_user_session_revoke_reason
    CHECK (revoke_reason IN ('LOGOUT', 'TOKEN_REUSE', 'USER_INACTIVE', 'PASSWORD_RESET', 'PASSWORD_CHANGE',
                             'SIGNED_OUT_ELSEWHERE', 'BY_ADMIN'));
