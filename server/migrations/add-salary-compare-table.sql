-- 工资表对比数据（用于与考勤收入对比）
CREATE TABLE IF NOT EXISTS salary_compare (
  id INT AUTO_INCREMENT PRIMARY KEY,
  person_id INT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  work_days DECIMAL(10,2) DEFAULT NULL COMMENT '用工天数',
  daily_salary DECIMAL(10,2) DEFAULT NULL COMMENT '每日工资(含奖金)',
  net_salary DECIMAL(10,2) DEFAULT NULL COMMENT '税后工资金额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_person_ym (person_id, year, month),
  FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工资表对比数据';