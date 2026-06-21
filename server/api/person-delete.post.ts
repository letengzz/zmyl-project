import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const { id } = body
    
    if (!id) {
      return {
        success: false,
        message: '人员ID不能为空'
      }
    }
    
    // 软删除：将 is_resign 设置为 1
    await query('UPDATE person SET is_resign = 1 WHERE id = ?', [id])
    
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
