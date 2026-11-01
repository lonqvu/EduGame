-- =============================================================================
-- V22: "Góp ý" without an account. A visitor who has not signed in can send feedback too: it has no user_id, like a
-- feedback whose account was deleted, and from_guest tells the two apart.
-- =============================================================================

ALTER TABLE feedback ADD COLUMN from_guest BOOLEAN NOT NULL DEFAULT FALSE;
