import { query } from '../utils/db'

// GET /api/work-ticket-list?search=xxx&page=1&pageSize=20
export default defineEventHandler(async (event) => {
  try {
    // 检查表是否存在，不存在则创建
    const tables = await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'work_ticket'"
    ) as any[]
    
    if (tables.length === 0) {
      await query(`
        CREATE TABLE IF NOT EXISTS work_ticket (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_no VARCHAR(50) DEFAULT NULL COMMENT '编号',
          work_location VARCHAR(200) NOT NULL COMMENT '作业位置',
          weekly_invoice_day TINYINT NOT NULL COMMENT '每周开票时间(星期几 1-7)',
          next_start_date DATE DEFAULT NULL COMMENT '下次开始时间',
          is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用 0-否 1-是',
          approver VARCHAR(50) DEFAULT NULL COMMENT '审批人',
          remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
          is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除 0-否 1-是',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业票管理表'
      `)
    }

    const { search, weekly_invoice_day, is_enabled, page, pageSize } = getQuery(event) as { search?: string; weekly_invoice_day?: string; is_enabled?: string; page?: string; pageSize?: string }
    
    const currentPage = Math.max(1, parseInt(page || '1'))
    const size = Math.max(1, Math.min(100, parseInt(pageSize || '10')))
    const offset = (currentPage - 1) * size

    let whereSql = 'WHERE is_deleted = 0'
    const params: any[] = []
    
    if (search) {
      whereSql += ' AND (ticket_no LIKE ? OR work_location LIKE ? OR approver LIKE ?)'
      params.push('%' + search + '%', '%' + search + '%', '%' + search + '%')
    }

    if (weekly_invoice_day) {
      whereSql += ' AND weekly_invoice_day = ?'
      params.push(Number(weekly_invoice_day))
    }

    if (is_enabled !== undefined && is_enabled !== '') {
      whereSql += ' AND is_enabled = ?'
      params.push(Number(is_enabled))
    }

    // 统计总数
    const countResult = await query('SELECT COUNT(*) as total FROM work_ticket ' + whereSql, params) as any[]
    const total = countResult[0]?.total || 0

    // 分页查询
    const data = await query(
      'SELECT * FROM work_ticket ' + whereSql + ' ORDER BY ticket_no DESC LIMIT ' + size + ' OFFSET ' + offset,
      params
    ) as any[]
    
    return {
      success: true,
      data,
      pagination: { page: currentPage, pageSize: size, total }
    }
  } catch (error: any) {
    console.error('获取作业票列表失败:', error)
    return { success: false, message: error.message, data: [] }
  }
})
