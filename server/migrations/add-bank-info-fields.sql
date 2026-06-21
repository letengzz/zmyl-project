-- 添加开户行名称和银行行号字段
ALTER TABLE person 
  ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL COMMENT '开户行名称',
  ADD COLUMN bank_code VARCHAR(50) DEFAULT NULL COMMENT '银行行号';
