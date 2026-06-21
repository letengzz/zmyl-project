import { query } from '../utils/db'

// POST /api/commission-delete
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body
    
    if (!id) {
      return { success: false, message: '缺少ID参数' }
    }
    
    await query('UPDATE scaffold_commission SET is_deleted = 1 WHERE id = ?', [id])
    
    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除架设委托失败:', error)
    return { success: false, message: error.message }
  }
})
