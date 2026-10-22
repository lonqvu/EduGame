-- =============================================================================
-- V19: Six more question games played with quiz questions (the items of QUIZ):
--   * TIC_TAC_TOE    - "Cờ ca-rô hỏi đáp": two teams, a 3x3 board, a right answer marks the cell.
--   * CONNECT_FOUR   - "Bốn ô liên tiếp": a right answer drops the team's disc in a column; four in a row wins.
--   * TREASURE_CHEST - "Rương vàng": a right answer opens one of three chests (points, double, steal, swap...).
--   * BUILD_TOWER    - "Xây tháp": every right answer adds a block to the team's tower.
--   * BEE_FLOWER     - "Ong tìm hoa": the options are flowers; the bee flies to the one the team picks.
--   * BINGO          - "Bingo": each team has a card of answers; a full line is a bingo.
-- =============================================================================

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
SELECT g.code, (SELECT id FROM game_category WHERE code = 'QUESTION'), g.code, g.name, g.description, g.icon, 1,
       -- The item schema of QUIZ: same item types, same content and solution.
       (SELECT config_schema FROM game_template WHERE code = 'QUIZ') || g.schema,
       g.config, TRUE, g.sort_order, 'BETA'
FROM (VALUES
(
    'TIC_TAC_TOE', 'Cờ ca-rô hỏi đáp',
    'Hai đội thi trên bàn cờ 3×3. Trả lời đúng câu hỏi của ô nào thì được đánh dấu ô đó. Ba ô thẳng hàng là thắng!',
    'tic-tac-toe', 14,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "MARKS", "points": 1, "allowSteal": false}, "win": {"type": "THREE_IN_A_ROW"}}}'::jsonb
),
(
    'CONNECT_FOUR', 'Bốn ô liên tiếp',
    'Trả lời đúng để thả một quân vào cột tùy chọn. Đội có bốn quân liền nhau theo hàng ngang, dọc hay chéo trước sẽ thắng.',
    'connect-four', 15,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "MARKS", "points": 1, "allowSteal": false}, "win": {"type": "FOUR_IN_A_ROW"}}}'::jsonb
),
(
    'TREASURE_CHEST', 'Rương vàng',
    'Trả lời đúng để được mở một trong ba rương báu. Trong rương có thể là điểm thưởng, nhân đôi, lấy điểm của đội khác… hay rương trống!',
    'treasure', 16,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "CHESTS", "allowSteal": false}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'BUILD_TOWER', 'Xây tháp',
    'Mỗi câu trả lời đúng đặt thêm một khối lên tháp của đội. Hết câu hỏi, đội có tháp cao nhất là đội chiến thắng.',
    'tower', 17,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 20, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "BUZZER"}, "scoring": {"type": "STEPS", "points": 1, "allowSteal": true}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'BEE_FLOWER', 'Ong tìm hoa',
    'Mỗi bông hoa mang một đáp án. Đội giành quyền chỉ đường cho chú ong bay đến bông hoa có đáp án đúng để lấy mật.',
    'bee', 18,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 20, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"}, "turn": {"type": "BUZZER"}, "scoring": {"type": "POINTS", "points": 10, "allowSteal": true}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'BINGO', 'Bingo',
    'Mỗi đội có một thẻ bingo ghi các đáp án. Câu hỏi hiện ra, đội nào có đáp án đúng trên thẻ thì được đánh dấu. Đủ một hàng là "Bingo!"',
    'bingo', 19,
    '{
      "settings": {
        "type": "object",
        "properties": {
          "timeLimitSec":   {"type": "integer", "minimum": 0},
          "shuffleItems":   {"type": "boolean"},
          "shuffleOptions": {"type": "boolean"},
          "rules":          {"type": "object"}
        }
      }
    }'::jsonb,
    '{"timeLimitSec": 20, "shuffleItems": true, "shuffleOptions": false, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ALL_AT_ONCE"}, "scoring": {"type": "MARKS", "points": 10}, "win": {"type": "LINE"}}}'::jsonb
)
) AS g (code, name, description, icon, sort_order, schema, config);
