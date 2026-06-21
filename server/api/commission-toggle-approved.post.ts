import { query } from '../utils/db'

// POST /api/commission-toggle-approved
// 切换审批状态
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, is_approved } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    const sql = `UPDATE scaffold_commission SET is_approved = ? WHERE id = ?`
    await query(sql, [is_approved ? 1 : 0, id])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('切换审批状态失败:', error)
    return { success: false, message: error.message }
  }
})