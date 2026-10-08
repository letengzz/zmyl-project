import { query } from '../utils/db'

// GET /api/material-list?search=xxx&page=1&pageSize=20
// 物资列表（含每个物资的已出场数量合计），首次访问自动建表
export default defineEventHandler(async (event) => {
  try {
    // 检查表是否存在，不存在则创建（懒迁移）
    const tables = await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('material', 'material_dispatch')"
    ) as any[]
    const tableNames = new Set(tables.map(t => t.TABLE_NAME))

    if (!tableNames.has('material')) {
      await query(`
        CREATE TABLE IF NOT EXISTS material (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL COMMENT '物资名称',
          spec VARCHAR(200) DEFAULT NULL COMMENT '规格',
          total_quantity INT NOT NULL DEFAULT 0 COMMENT '总数量',
          remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
          is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除 0-否 1-是',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物资管理表'
      `)
    }
    if (!tableNames.has('material_dispatch')) {
      await query(`
        CREATE TABLE IF NOT EXISTS material_dispatch (
          id INT AUTO_INCREMENT PRIMARY KEY,
          material_id INT NOT NULL COMMENT '物资ID',
          quantity INT NOT NULL COMMENT '出场数量',
          dispatch_date DATE NOT NULL COMMENT '出场日期',
          remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
          is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除 0-否 1-是',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出场物资记录表'
      `)
    }

    // 检查规格列是否存在，不存在则添加（兼容已建表的情况）
    const specColumns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'material' AND COLUMN_NAME = 'spec'"
    ) as any[]
    if (specColumns.length === 0) {
      await query(`ALTER TABLE material ADD COLUMN spec VARCHAR(200) DEFAULT NULL COMMENT '规格'`)
    }

    // 检查出场记录表的备注列是否存在，不存在则添加（兼容已建表的情况）
    const dispatchRemarkColumns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'material_dispatch' AND COLUMN_NAME = 'remark'"
    ) as any[]
    if (dispatchRemarkColumns.length === 0) {
      await query(`ALTER TABLE material_dispatch ADD COLUMN remark VARCHAR(500) DEFAULT NULL COMMENT '备注'`)
    }

    const { search, page, pageSize } = getQuery(event) as { search?: string; page?: string; pageSize?: string }

    const currentPage = Math.max(1, parseInt(page || '1'))
    const size = Math.max(1, Math.min(100, parseInt(pageSize || '10')))
    const offset = (currentPage - 1) * size

    let whereSql = 'WHERE m.is_deleted = 0'
    const params: any[] = []
    if (search) {
      whereSql += ' AND (m.name LIKE ? OR m.spec LIKE ?)'
      params.push('%' + search + '%', '%' + search + '%')
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM material m ${whereSql}`,
      params
    ) as any[]
    const total = countResult[0]?.total || 0

    const data = await query(
      `SELECT m.id, m.name, m.spec, m.total_quantity, m.remark, m.created_at,
              COALESCE(SUM(d.quantity), 0) AS dispatched_quantity
       FROM material m
       LEFT JOIN material_dispatch d ON d.material_id = m.id AND d.is_deleted = 0
       ${whereSql}
       GROUP BY m.id, m.name, m.spec, m.total_quantity, m.remark, m.created_at
       ORDER BY m.id DESC
       LIMIT ${size} OFFSET ${offset}`,
      params
    ) as any[]

    return {
      success: true,
      data,
      pagination: { page: currentPage, pageSize: size, total }
    }
  } catch (error: any) {
    console.error('获取物资列表失败:', error)
    return { success: false, message: error.message, data: [] }
  }
})
