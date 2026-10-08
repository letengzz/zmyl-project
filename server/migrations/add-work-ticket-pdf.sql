-- 作业票表新增高处/脚手架/受限空间作业票PDF文件路径列（每种作业票分为 JSA交底 + 交底）
-- 注意：work-ticket-list.get.ts 接口会自动检测并添加该列，此文件仅作为记录
ALTER TABLE work_ticket ADD COLUMN height_jsa_pdf VARCHAR(255) DEFAULT NULL COMMENT '高处作业票-JSA交底PDF文件路径';
ALTER TABLE work_ticket ADD COLUMN height_analysis_pdf VARCHAR(255) DEFAULT NULL COMMENT '高处作业票-交底PDF文件路径';
ALTER TABLE work_ticket ADD COLUMN scaffold_jsa_pdf VARCHAR(255) DEFAULT NULL COMMENT '脚手架作业票-JSA交底PDF文件路径';
ALTER TABLE work_ticket ADD COLUMN scaffold_analysis_pdf VARCHAR(255) DEFAULT NULL COMMENT '脚手架作业票-交底PDF文件路径';
ALTER TABLE work_ticket ADD COLUMN confined_jsa_pdf VARCHAR(255) DEFAULT NULL COMMENT '受限空间作业票-JSA交底PDF文件路径';
ALTER TABLE work_ticket ADD COLUMN confined_analysis_pdf VARCHAR(255) DEFAULT NULL COMMENT '受限空间作业票-交底PDF文件路径';
