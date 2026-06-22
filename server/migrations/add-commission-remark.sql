-- 为架设委托表添加备注字段
ALTER TABLE scaffold_commission ADD COLUMN remark TEXT COMMENT '备注' AFTER photo_urls;
