import { query } from '../utils/db'

// POST /api/unit-add
// 添加架设单位
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name } = body
    
    if (!name || !name.trim()) {
      return { success: false, message: '单位名称不能为空' }
    }
    
    // 检查是否已存在
    const existing = await query('SELECT id FROM scaffold_units WHERE name = ? AND is_deleted = 0', [name.trim()]) as any[]
    if (existing.length > 0) {
      return { success: false, message: '该单位已存在' }
    }
    
    const sql = `INSERT INTO scaffold_units (name) VALUES (?)`
    const result = await query(sql, [name.trim()]) as any
    
    return { success: true, message: '添加成功', insertId: result.insertId }
  } catch (error: any) {
    console.error('添加单位失败:', error)
    return { success: false, message: error.message }
  }
})
