-- 考勤表新增手动录入工时列（与导入考勤的 hours 分开存储，用于对比）
-- 注意：attendance.get.ts 接口会自动检测并添加该列，此文件仅作为记录
ALTER TABLE attendance ADD COLUMN manual_hours DECIMAL(5,1) DEFAULT NULL COMMENT '手动录入工时（小时）';
