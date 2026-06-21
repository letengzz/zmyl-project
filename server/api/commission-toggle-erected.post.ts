import { query } from '../utils/db'

// POST /api/commission-toggle-erected
// 切换搭设状态
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, is_erected } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    const sql = `UPDATE scaffold_commission SET is_erected = ? WHERE id = ?`
    await query(sql, [is_erected ? 1 : 0, id])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('切换搭设状态失败:', error)
    return { success: false, message: error.message }
  }
})