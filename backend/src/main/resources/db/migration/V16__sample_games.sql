-- "Chơi ngay": a teacher plays a game type at once with sample content. The first time, a copy of the sample is made
-- for the teacher (sample = TRUE); later clicks play that copy again, so one teacher has at most one live sample game
-- per game type. The teacher may edit it like any game, or archive it (the next click then makes a fresh one).

ALTER TABLE game ADD COLUMN sample BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX uq_game_owner_template_sample ON game (owner_id, template_id) WHERE sample AND status <> 'ARCHIVED';
