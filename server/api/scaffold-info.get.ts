import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 检查 formula 列是否存在，不存在则添加
    const columns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'scaffold_info' AND COLUMN_NAME = 'formula'"
    ) as any[]
    
    if (columns.length === 0) {
      await query("ALTER TABLE scaffold_info ADD COLUMN `formula` VARCHAR(100) DEFAULT NULL COMMENT '计算公式 (如: 周长*高度, 长度*宽度)' AFTER `unit`")
    }

    const { type } = getQuery(event)
    
    let sql = 'SELECT * FROM scaffold_info WHERE status = 1'
    const params: any[] = []
    
    if (type) {
      sql += ' AND type = ?'
      params.push(String(type))
    }
    
    sql += ' ORDER BY type, name'
    
    const data = await query(sql, params)
    
    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message,
      data: []
    }
  }
})
