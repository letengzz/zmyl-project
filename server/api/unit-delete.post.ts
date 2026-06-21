import { query } from '../utils/db'

// POST /api/unit-delete
// 删除架设单位
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    const sql = `UPDATE scaffold_units SET is_deleted = 1 WHERE id = ?`
    await query(sql, [id])
    
    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除单位失败:', error)
    return { success: false, message: error.message }
  }
})
