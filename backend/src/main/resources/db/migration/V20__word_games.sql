-- =============================================================================
-- V20: Two word games played with open questions (OPEN_QUESTION, the items of GRID_BOARD): a clue and its answer,
-- so every Lật ô game and every question set plays them too.
--   * WORD_SCRAMBLE - "Vua Tiếng Việt": the letters of the answer are shuffled; the team puts them back in order.
--   * HANGMAN       - "Đoán chữ": the answer is hidden; teams guess its letters in turns, then solve it.
-- =============================================================================

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
SELECT g.code, (SELECT id FROM game_category WHERE code = 'PUZZLE'), g.code, g.name, g.description, g.icon, 1,
       -- The items of GRID_BOARD (a clue, its points and its answer), with settings of their own.
       (SELECT config_schema FROM game_template WHERE code = 'GRID_BOARD') || '{
         "settings": {
           "type": "object",
           "properties": {
             "timeLimitSec": {"type": "integer", "minimum": 0},
             "shuffleItems": {"type": "boolean"},
             "rules":        {"type": "object"}
           }
         }
       }'::jsonb,
       g.config, TRUE, g.sort_order, 'BETA'
FROM (VALUES
    ('WORD_SCRAMBLE', 'Vua Tiếng Việt',
     'Các chữ cái của đáp án bị xáo trộn. Đội nhanh tay sắp xếp lại thành từ đúng để ghi điểm.',
     'letters', 10,
     '{"timeLimitSec": 45, "shuffleItems": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"},
       "turn": {"type": "BUZZER"}, "scoring": {"type": "PER_ITEM", "allowSteal": true}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb),
    ('HANGMAN', 'Đoán chữ',
     'Ô chữ bí ẩn với gợi ý. Các đội lần lượt đoán chữ cái, mở dần ô chữ và giải ô chữ để giành điểm thưởng.',
     'hangman', 11,
     '{"timeLimitSec": 0, "shuffleItems": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"},
       "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "PER_LETTER", "points": 10, "keywordPoints": 30}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb)
) AS g (code, name, description, icon, sort_order, config);
