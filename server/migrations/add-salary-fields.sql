-- 添加考勤工资和实际工资字段
ALTER TABLE person 
  ADD COLUMN attendance_salary DECIMAL(10,2) DEFAULT NULL COMMENT '考勤工资',
  ADD COLUMN actual_salary DECIMAL(10,2) DEFAULT NULL COMMENT '实际工资';