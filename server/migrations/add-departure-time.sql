-- 添加离场时间字段
ALTER TABLE person ADD COLUMN departure_time DATETIME DEFAULT NULL COMMENT '离场时间';