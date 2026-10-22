-- =============================================================================
-- V18: Five more classroom tools (no items), in the CLASS_TOOL category:
--   * COIN_FLIP     - "Tung đồng xu": heads or tails, with a tally.
--   * RANDOM_NUMBER - "Chọn số ngẫu nhiên": a number in a range, optionally never twice.
--   * SCOREBOARD    - "Bảng điểm": points of 2-6 teams for any activity.
--   * NOISE_METER   - "Đo tiếng ồn": the class's noise from the microphone, with a limit.
--   * TRAFFIC_LIGHT - "Đèn tín hiệu": red, yellow, green for how the class should work now.
-- =============================================================================

INSERT INTO game_template
    (code, category_id, engine, name, description, icon, schema_version,
     config_schema, default_config, is_new, sort_order, status)
SELECT g.code, (SELECT id FROM game_category WHERE code = 'CLASS_TOOL'), 'TOOL', g.name, g.description, g.icon, 1,
       '{"itemTypes": [], "settings": {"type": "object"}, "content": {"type": "object"}, "solution": {"type": "null"}}'::jsonb,
       g.config, TRUE, g.sort_order, 'BETA'
FROM (VALUES
    ('COIN_FLIP', 'Tung đồng xu',
     'Tung đồng xu thật to trên màn chiếu để chọn đội đi trước hay chia phe, có bảng đếm sấp ngửa.',
     'coin', 4, '{}'::jsonb),
    ('RANDOM_NUMBER', 'Chọn số ngẫu nhiên',
     'Chọn một số ngẫu nhiên trong khoảng cô đặt, gọi bạn theo số thứ tự mà không bạn nào bị gọi hai lần.',
     'number', 5, '{"min": 1, "max": 30, "noRepeat": true}'::jsonb),
    ('SCOREBOARD', 'Bảng điểm',
     'Bảng điểm các đội cho mọi hoạt động trong lớp: cộng, trừ điểm chỉ với một chạm.',
     'scoreboard', 6, '{"teams": 4}'::jsonb),
    ('NOISE_METER', 'Đo tiếng ồn',
     'Đo độ ồn của lớp bằng micro. Vượt mức cô đặt, màn hình báo để cả lớp cùng giữ trật tự.',
     'volume', 7, '{"limit": 60}'::jsonb),
    ('TRAFFIC_LIGHT', 'Đèn tín hiệu',
     'Đèn đỏ, vàng, xanh cho biết lúc nào cần im lặng, nói nhỏ hay được thảo luận.',
     'traffic', 8, '{}'::jsonb)
) AS g (code, name, description, icon, sort_order, config);
