import { query } from '../utils/db'

// POST /api/work-ticket-toggle-enabled
// 切换启用状态
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, is_enabled } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    await query('UPDATE work_ticket SET is_enabled = ? WHERE id = ?', [is_enabled ? 1 : 0, id])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('切换启用状态失败:', error)
    return { success: false, message: error.message }
  }
})
