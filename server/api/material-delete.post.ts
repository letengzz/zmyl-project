import { query } from '../utils/db'

// POST /api/material-delete - 删除物资（软删除，历史出场记录保留）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      return { success: false, message: '缺少ID' }
    }

    await query('UPDATE material SET is_deleted = 1 WHERE id = ?', [id])

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除物资失败:', error)
    return { success: false, message: error.message }
  }
})
