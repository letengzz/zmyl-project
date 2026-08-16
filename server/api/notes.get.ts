import { query } from '../utils/db'

// GET /api/notes - 获取所有笔记（按更新时间倒序）
export default defineEventHandler(async (event) => {
  try {
    const notes = await query('SELECT * FROM notes ORDER BY updated_at DESC')
    return { success: true, data: notes }
  } catch (error: any) {
    console.error('获取笔记列表失败:', error)
    return { success: false, message: error.message }
  }
})
