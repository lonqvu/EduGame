-- =============================================================================
-- V2: Templates the frontend already ships but V1 did not seed:
--   * GRID_BOARD - "Lật ô thi đua": teams pick a numbered tile and answer its question.
--   * NAME_RACE  - "Đua tên": animated name picker over the class list (no items).
-- =============================================================================

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
VALUES
(
    'GRID_BOARD',
    (SELECT id FROM game_category WHERE code = 'QUESTION'),
    'GRID_BOARD',
    'Lật ô thi đua',
    'Các đội chọn ô số, trả lời để ghi điểm. Có ô may mắn.',
    'grid',
    1,
    '{
      "itemTypes": ["OPEN_QUESTION"],
      "settings": {
        "type": "object",
        "properties": {
          "rules": {"type": "object"}
        }
      },
      "content": {
        "type": "object",
        "required": ["text", "points"],
        "properties": {
          "text":   {"type": "string"},
          "image":  {"type": "string"},
          "points": {"type": "integer", "minimum": 0}
        }
      },
      "solution": {
        "type": "object",
        "required": ["answer"],
        "properties": {
          "answer": {"type": "string"}
        }
      }
    }'::jsonb,
    '{
      "rules": {
        "participants": {"mode": "TEAM", "teams": 4, "assign": "MANUAL"},
        "turn":         {"type": "ROUND_ROBIN"},
        "scoring":      {"type": "PER_ITEM", "defaultPoints": 20},
        "win":          {"type": "HIGHEST_SCORE"}
      }
    }'::jsonb,
    TRUE,
    0,
    'BETA'
),
(
    'NAME_RACE',
    (SELECT id FROM game_category WHERE code = 'RANDOM_TOOL'),
    'NAME_PICKER',
    'Đua tên',
    'Tên các bạn chạy đua, ai về đích trước được chọn.',
    'race',
    1,
    '{
      "itemTypes": [],
      "settings": {
        "type": "object",
        "required": ["source"],
        "properties": {
          "source":   {"type": "string", "enum": ["CLASSROOM"]},
          "scene":    {"type": "string", "enum": ["HORSE_RACE", "BALLOON", "CLAW", "FISHING", "ROCKET"]},
          "noRepeat": {"type": "boolean"}
        }
      },
      "content":  {"type": "object"},
      "solution": {"type": "null"}
    }'::jsonb,
    '{
      "source": "CLASSROOM",
      "scene": "HORSE_RACE",
      "noRepeat": true
    }'::jsonb,
    FALSE,
    2,
    'BETA'
);
