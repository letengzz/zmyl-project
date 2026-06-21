import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      return {
        success: false,
        message: '缺少ID'
      }
    }

    await query('DELETE FROM scaffold_info WHERE id = ?', [id])

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message
    }
  }
})
