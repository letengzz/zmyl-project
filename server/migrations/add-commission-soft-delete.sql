-- 添加软删除字段 and 扩展photo_urls为LONGTEXT以存储base64
ALTER TABLE scaffold_commission ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除 0-未删除 1-已删除';
ALTER TABLE scaffold_commission MODIFY COLUMN photo_urls LONGTEXT COMMENT '照片数据（JSON数组，base64格式）';
