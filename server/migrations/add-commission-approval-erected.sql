-- 添加是否审批和是否搭设字段
ALTER TABLE scaffold_commission ADD COLUMN is_approved TINYINT(1) DEFAULT 0 COMMENT '是否审批 0-否 1-是';
ALTER TABLE scaffold_commission ADD COLUMN is_erected TINYINT(1) DEFAULT 0 COMMENT '是否搭设 0-否 1-是';