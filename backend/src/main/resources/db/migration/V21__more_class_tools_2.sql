-- =============================================================================
-- V21: Three more classroom tools (no items), in the CLASS_TOOL category:
--   * STOPWATCH - "Bấm giờ": counts up, with laps (which group finished first, in how long).
--   * CARD_DRAW - "Bốc thăm": cards written by the teacher, drawn one by one without repeats.
--   * SEATING   - "Sơ đồ chỗ ngồi": the class list placed at random on the desks; two seats swap in two taps.
-- =============================================================================

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
SELECT g.code, (SELECT id FROM game_category WHERE code = 'CLASS_TOOL'), 'TOOL', g.name, g.description, g.icon, 1,
       '{"itemTypes": [], "settings": {"type": "object"}, "content": {"type": "object"}, "solution": {"type": "null"}}'::jsonb,
       g.config, TRUE, g.sort_order, 'BETA'
FROM (VALUES
    ('STOPWATCH', 'Bấm giờ',
     'Đồng hồ bấm giờ thật to: thi xem nhóm nào hoàn thành nhanh nhất, ghi lại thời gian từng nhóm.',
     'stopwatch', 9, '{}'::jsonb),
    ('CARD_DRAW', 'Bốc thăm',
     'Cô viết các lá thăm (chủ đề, câu hỏi, nhiệm vụ…), học sinh bốc ngẫu nhiên, không lá nào bị bốc hai lần.',
     'cards', 10, '{}'::jsonb),
    ('SEATING', 'Sơ đồ chỗ ngồi',
     'Xếp chỗ ngồi ngẫu nhiên cho cả lớp từ danh sách học sinh, đổi chỗ hai bạn chỉ với hai lần bấm.',
     'seating', 11, '{"columns": 6}'::jsonb)
) AS g (code, name, description, icon, sort_order, config);
