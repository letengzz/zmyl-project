import { query } from '../utils/db'

// GET /api/unit-list
// 获取架设单位列表（带每个单位的委托数量）
export default defineEventHandler(async (event) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.created_at,
        COUNT(c.id) AS commission_count
      FROM scaffold_units u
      LEFT JOIN scaffold_commission c ON u.name = c.applicant_unit AND c.is_deleted = 0
      WHERE u.is_deleted = 0
      GROUP BY u.id, u.name, u.created_at
      ORDER BY commission_count DESC, u.created_at DESC
    `
    
    const data = await query(sql) as any[]
    
    return { success: true, data }
  } catch (error: any) {
    console.error('获取单位列表失败:', error)
    return { success: false, message: error.message, data: [] }
  }
})
