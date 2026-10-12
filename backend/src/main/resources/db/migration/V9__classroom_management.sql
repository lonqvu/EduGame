-- =============================================================================
-- V9: Classroom management.
--   * classroom.school_name, classroom.avatar (the animal shown for the class).
--   * classroom.status PAUSED: a class taking a break (kept, not played with).
--   * One class name per teacher and school year among classes not archived.
--   * game_session: index to count a class's play sessions (activity, completion).
-- =============================================================================

ALTER TABLE classroom
    ADD COLUMN school_name VARCHAR(100),
    ADD COLUMN avatar      VARCHAR(30);

ALTER TABLE classroom DROP CONSTRAINT ck_classroom_status;
ALTER TABLE classroom
    ADD CONSTRAINT ck_classroom_status CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED'));

CREATE UNIQUE INDEX uq_classroom_teacher_name
    ON classroom (teacher_id, lower(name), coalesce(school_year, ''))
    WHERE status <> 'ARCHIVED';

CREATE INDEX idx_game_session_classroom_status ON game_session (classroom_id, status);
