import { query } from '../utils/db'

// GET /api/commission-list?search=xxx
export default defineEventHandler(async (event) => {
  try {
    const { search } = getQuery(event) as { search?: string }
    
    let sql = 'SELECT * FROM scaffold_commission WHERE is_deleted = 0'
    const params: any[] = []
    
    if (search) {
      sql += ' AND (commission_no LIKE ? OR applicant_unit LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    sql += ' ORDER BY created_at DESC'
    
    const data = await query(sql, params) as any[]
    
    // 解析 photo_urls JSON 字符串
    const list = data.map(item => ({
      ...item,
      photo_urls: item.photo_urls ? JSON.parse(item.photo_urls) : []
    }))
    
    return { success: true, data: list }
  } catch (error: any) {
    console.error('获取架设委托列表失败:', error)
    return { success: false, message: error.message }
  }
})
