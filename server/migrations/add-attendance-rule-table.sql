-- 考勤打卡规则表（单行，id 固定为 1），存储「标准打卡时间 + 允许时间」配置
-- 注意：server/utils/attendance-rule.ts 会在首次访问 /api/attendance-rule 时自动建表，此文件仅作为记录
CREATE TABLE IF NOT EXISTS attendance_rule (
  id INT NOT NULL PRIMARY KEY,
  rule_json TEXT NULL COMMENT '考勤打卡规则（JSON）',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 默认规则（不写入即使用代码内 DEFAULT_RULE，与历史硬编码一致）：
-- {"morningStart":"08:00","morningEarly":30,"morningEnd":"11:30","morningEndEarly":10,
--  "afternoonStart":"13:30","afternoonEarly":30,"afternoonGrace":10,"afternoonEnd":"18:00","afternoonEndEarly":10}
