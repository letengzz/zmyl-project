import { query } from '../utils/db'

// POST /api/work-ticket-delete
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      return { success: false, message: '缺少ID' }
    }

    await query('UPDATE work_ticket SET is_deleted = 1 WHERE id = ?', [id])

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除作业票失败:', error)
    return { success: false, message: error.message }
  }
})
