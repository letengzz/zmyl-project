import { query } from '../utils/db'

// POST /api/commission-toggle-electronic
// 切换电子版状态
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, has_electronic } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    const sql = `UPDATE scaffold_commission SET has_electronic = ? WHERE id = ?`
    await query(sql, [has_electronic ? 1 : 0, id])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('切换电子版状态失败:', error)
    return { success: false, message: error.message }
  }
})
