-- =============================================================================
-- V17: Nine more question games, all played with quiz questions (SINGLE_CHOICE / TRUE_FALSE, the items of QUIZ),
-- so every quiz and question set plays them too:
--   * MILLIONAIRE    - "Ai là triệu phú": one player climbs a prize ladder, with three lifelines.
--   * TUG_OF_WAR     - "Kéo co": two teams, every right answer pulls the rope one step.
--   * FLOWER_PICK    - "Hái hoa dân chủ": teams take turns picking a flower, each hides a question.
--   * WHACK_MOLE     - "Đập chuột": moles hold the options; whack the one with the right answer.
--   * TRUE_FALSE     - "Đúng hay sai": a question with one answer, every team says true or false at once.
--   * LUCKY_STAR     - "Ngôi sao may mắn": numbered stars, some give points without a question.
--   * SECRET_PICTURE - "Ô cửa bí mật": right answers open the doors in front of a picture to guess.
--   * MOUNTAIN_CLIMB - "Leo núi": every right answer takes the team's climber one stage up.
--   * POINT_WHEEL    - "Vòng quay điểm thưởng": spin for the points of the question (x2, lose the turn...).
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
    'MILLIONAIRE', 'Ai là triệu phú',
    'Trả lời đúng từng câu để leo lên bậc thưởng cao nhất. Có 3 quyền trợ giúp: 50:50, hỏi ý kiến cả lớp và hỏi bạn.',
    'trophy', 5,
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
    '{"timeLimitSec": 30, "shuffleItems": false, "shuffleOptions": true, "rules": {"participants": {"mode": "INDIVIDUAL"}, "lifelines": ["FIFTY_FIFTY", "ASK_CLASS", "ASK_FRIEND"], "win": {"type": "LADDER", "milestones": [5, 10]}}}'::jsonb
),
(
    'TUG_OF_WAR', 'Kéo co',
    'Hai đội thi trả lời, mỗi câu đúng kéo sợi dây về phía mình một bước. Đội kéo được dây qua vạch sẽ thắng.',
    'rope', 6,
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
    '{"timeLimitSec": 20, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 2, "assign": "RANDOM"}, "turn": {"type": "BUZZER"}, "scoring": {"type": "STEPS", "points": 1, "allowSteal": true}, "win": {"type": "PULL_OVER_LINE", "steps": 4}}}'::jsonb
),
(
    'FLOWER_PICK', 'Hái hoa dân chủ',
    'Các đội lần lượt hái một bông hoa trên cây. Sau mỗi bông hoa là một câu hỏi, trả lời đúng để ghi điểm.',
    'flower', 7,
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
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "POINTS", "points": 10, "allowSteal": true}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'WHACK_MOLE', 'Đập chuột',
    'Những chú chuột chũi mang đáp án thò lên khỏi hang. Đội giành quyền chỉ đúng chú chuột mang đáp án đúng để đập!',
    'hammer', 8,
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
    'TRUE_FALSE', 'Đúng hay sai',
    'Mỗi câu hỏi hiện kèm một đáp án. Tất cả các đội cùng chọn Đúng hoặc Sai, đội chọn đúng được cộng điểm.',
    'check', 9,
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
    '{"timeLimitSec": 10, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 4, "assign": "RANDOM"}, "turn": {"type": "ALL_AT_ONCE"}, "scoring": {"type": "POINTS", "points": 10}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'LUCKY_STAR', 'Ngôi sao may mắn',
    'Các đội lần lượt chọn một ngôi sao. Có ngôi sao là câu hỏi, có ngôi sao may mắn được điểm thưởng ngay mà không cần trả lời.',
    'star', 10,
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
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "POINTS", "points": 10, "allowSteal": false, "luckyStars": 3}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'SECRET_PICTURE', 'Ô cửa bí mật',
    'Bức tranh bí mật nằm sau các ô cửa. Trả lời đúng để mở một ô cửa và đoán xem bức tranh là gì!',
    'picture', 11,
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
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "POINTS", "points": 10, "allowSteal": true, "keywordPoints": 40}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
),
(
    'MOUNTAIN_CLIMB', 'Leo núi',
    'Mỗi câu trả lời đúng giúp người leo núi của đội lên thêm một chặng. Đội cắm cờ trên đỉnh núi đầu tiên sẽ thắng.',
    'mountain', 12,
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
    '{"timeLimitSec": 20, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "BUZZER"}, "scoring": {"type": "STEPS", "points": 1, "allowSteal": true}, "win": {"type": "FIRST_TO_FINISH", "steps": 5}}}'::jsonb
),
(
    'POINT_WHEEL', 'Vòng quay điểm thưởng',
    'Đội đến lượt quay vòng quay để biết câu hỏi đáng bao nhiêu điểm: có ô nhân đôi, có ô mất lượt. Trả lời đúng để nhận điểm.',
    'wheel', 13,
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
    '{"timeLimitSec": 30, "shuffleItems": true, "shuffleOptions": true, "rules": {"participants": {"mode": "TEAM", "teams": 3, "assign": "RANDOM"}, "turn": {"type": "ROUND_ROBIN"}, "scoring": {"type": "WHEEL", "allowSteal": false}, "win": {"type": "HIGHEST_SCORE"}}}'::jsonb
)
) AS g (code, name, description, icon, sort_order, schema, config);
