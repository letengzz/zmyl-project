-- 添加软删除字段
ALTER TABLE scaffold_units ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除 0-未删除 1-已删除';