-- 考勤表新增手动录入打卡时间列（JSON 格式，如 {"morningStart":"07:13","morningEnd":"11:26","afternoonStart":"11:53","afternoonEnd":"19:30"}）
-- 注意：attendance.get.ts 接口会自动检测并添加该列，此文件仅作为记录
ALTER TABLE attendance ADD COLUMN manual_times VARCHAR(120) DEFAULT NULL COMMENT '手动录入的打卡时间（JSON）';
