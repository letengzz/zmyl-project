import { query } from '../utils/db'

// POST /api/material-dispatch-delete - 删除出场记录（软删除后剩余数量自动回补）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      return { success: false, message: '缺少ID' }
    }

    await query('UPDATE material_dispatch SET is_deleted = 1 WHERE id = ?', [id])

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除出场记录失败:', error)
    return { success: false, message: error.message }
  }
})
