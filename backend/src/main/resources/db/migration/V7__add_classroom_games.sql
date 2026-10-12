-- =============================================================================
-- V7: New games and classroom tools.
--   Question games (same items as QUIZ, so a quiz can be played either way):
--     * GOLDEN_BELL - "Rung chuông vàng": the whole class answers, wrong answers are out.
--     * BOAT_RACE   - "Đua thuyền": teams answer, every right answer moves their boat.
--   Puzzles with their own item types:
--     * CROSSWORD   - "Ô chữ bí mật": CROSSWORD_ROW, one row each; the key letters spell the keyword.
--     * ORDERING    - "Sắp xếp thứ tự": ORDER_SET, entries to put back in order.
--     * SORTING     - "Phân loại": SORT_SET, cards to drop into the right group.
--   Classroom tools (no items), in the new CLASS_TOOL category:
--     * TEAM_MAKER  - "Chia nhóm ngẫu nhiên", TIMER - "Đồng hồ đếm ngược", DICE - "Xúc xắc".
-- =============================================================================

INSERT INTO game_category (code, name, icon, sort_order) VALUES
    ('CLASS_TOOL', 'Công cụ lớp học', 'toolbox', 4);

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
SELECT g.code, (SELECT id FROM game_category WHERE code = g.category), g.engine, g.name, g.description, g.icon, 1,
       -- Question games take their item schema from QUIZ: same item types, same content and solution.
       CASE WHEN g.quiz_items
            THEN (SELECT config_schema FROM game_template WHERE code = 'QUIZ') || g.schema
            ELSE g.schema END,
       g.config, TRUE, g.sort_order, 'BETA'
FROM (VALUES
(
    'GOLDEN_BELL', 'QUESTION', 'GOLDEN_BELL', 'Rung chuông vàng',
    'Cả lớp cùng trả lời trên bảng con, ai sai thì ra ngoài. Bạn trụ lại cuối cùng rung chuông vàng!',
    'bell', TRUE, 3,
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
    '{
      "timeLimitSec": 15,
      "shuffleItems": false,
      "shuffleOptions": true,
      "rules": {
        "participants": {"mode": "INDIVIDUAL", "source": "CLASSROOM"},
        "rescue":       {"count": 1},
        "win":          {"type": "LAST_STANDING"}
      }
    }'::jsonb
),
(
    'BOAT_RACE', 'QUESTION', 'BOAT_RACE', 'Đua thuyền',
    'Các đội giành quyền trả lời, mỗi câu đúng thuyền tiến lên một chặng. Thuyền nào cập bến trước sẽ thắng.',
    'boat', TRUE, 4,
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
    '{
      "timeLimitSec": 20,
      "shuffleItems": true,
      "shuffleOptions": true,
      "rules": {
        "participants": {"mode": "TEAM", "teams": 4, "assign": "RANDOM"},
        "turn":         {"type": "BUZZER"},
        "scoring":      {"type": "STEPS", "points": 1, "allowSteal": true},
        "win":          {"type": "FIRST_TO_FINISH", "steps": 5}
      }
    }'::jsonb
),
(
    'CROSSWORD', 'PUZZLE', 'CROSSWORD', 'Ô chữ bí mật',
    'Giải từng hàng ngang để mở dần các chữ cái của từ khóa. Đội đoán được từ khóa sớm được nhiều điểm.',
    'crossword', FALSE, 3,
    '{
      "itemTypes": ["CROSSWORD_ROW"],
      "settings": {
        "type": "object",
        "properties": {
          "rules": {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["clue"],
        "properties": {
          "clue":  {"type": "string"},
          "image": {"type": "string"}
        }
      },
      "solution": {
        "type": "object",
        "required": ["answer", "keyIndex"],
        "properties": {
          "answer":   {"type": "string"},
          "keyIndex": {"type": "integer", "minimum": 0}
        }
      }
    }'::jsonb,
    '{
      "rules": {
        "participants": {"mode": "TEAM", "teams": 4, "assign": "RANDOM"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "FIXED", "points": 10, "keywordPoints": 40, "allowSteal": true},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb
),
(
    'ORDERING', 'PUZZLE', 'RULES', 'Sắp xếp thứ tự',
    'Các thẻ bị xáo trộn, đội chơi xếp lại cho đúng: ghép từ thành câu, số từ bé đến lớn, các bước làm việc.',
    'ordering', FALSE, 4,
    '{
      "itemTypes": ["ORDER_SET"],
      "settings": {
        "type": "object",
        "properties": {
          "shuffleItems": {"type": "boolean"},
          "rules":        {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["items"],
        "properties": {
          "text":  {"type": "string"},
          "items": {
            "type": "array",
            "minItems": 2,
            "items": {
              "type": "object",
              "required": ["id"],
              "properties": {"id": {"type": "string"}, "text": {"type": "string"}}
            }
          }
        }
      },
      "solution": {
        "type": "object",
        "required": ["order"],
        "properties": {
          "order": {"type": "array", "minItems": 2, "items": {"type": "string"}}
        }
      }
    }'::jsonb,
    '{
      "shuffleItems": false,
      "rules": {
        "participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "FIXED", "points": 10, "allowSteal": true},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb
),
(
    'SORTING', 'PUZZLE', 'RULES', 'Phân loại',
    'Mỗi lượt một thẻ hiện ra, đội chơi đặt thẻ vào đúng giỏ. Ví dụ: con vật ăn cỏ hay ăn thịt.',
    'sorting', FALSE, 5,
    '{
      "itemTypes": ["SORT_SET"],
      "settings": {
        "type": "object",
        "properties": {
          "rules": {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["groups", "cards"],
        "properties": {
          "text":   {"type": "string"},
          "groups": {"type": "array", "minItems": 2, "items": {"$ref": "#/$defs/entry"}},
          "cards":  {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/entry"}}
        },
        "$defs": {
          "entry": {
            "type": "object",
            "required": ["id"],
            "properties": {"id": {"type": "string"}, "text": {"type": "string"}}
          }
        }
      },
      "solution": {
        "type": "object",
        "required": ["assign"],
        "properties": {
          "assign": {
            "type": "array",
            "items": {"type": "array", "minItems": 2, "maxItems": 2, "items": {"type": "string"}}
          }
        }
      }
    }'::jsonb,
    '{
      "rules": {
        "participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "FIXED", "points": 10},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb
),
(
    'TEAM_MAKER', 'CLASS_TOOL', 'TOOL', 'Chia nhóm ngẫu nhiên',
    'Chia cả lớp thành các nhóm ngẫu nhiên chỉ với một lần bấm, có thể chia lại hoặc đổi số nhóm.',
    'groups', FALSE, 1,
    '{"itemTypes": [], "settings": {"type": "object"}, "content": {"type": "object"}, "solution": {"type": "null"}}'::jsonb,
    '{"source": "CLASSROOM", "groups": 4}'::jsonb
),
(
    'TIMER', 'CLASS_TOOL', 'TOOL', 'Đồng hồ đếm ngược',
    'Đồng hồ thật to trên màn chiếu cho giờ làm bài, thảo luận nhóm. Hết giờ có chuông báo.',
    'timer', FALSE, 2,
    '{"itemTypes": [], "settings": {"type": "object"}, "content": {"type": "object"}, "solution": {"type": "null"}}'::jsonb,
    '{"seconds": 300}'::jsonb
),
(
    'DICE', 'CLASS_TOOL', 'TOOL', 'Xúc xắc',
    'Gieo một đến ba xúc xắc trên màn chiếu để chọn số câu, số bước đi hay đội đi trước.',
    'dice', FALSE, 3,
    '{"itemTypes": [], "settings": {"type": "object"}, "content": {"type": "object"}, "solution": {"type": "null"}}'::jsonb,
    '{"dice": 1}'::jsonb
)
) AS g (code, category, engine, name, description, icon, quiz_items, sort_order, schema, config);
