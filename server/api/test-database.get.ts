import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 测试数据库连接
    const persons = await query('SELECT * FROM person LIMIT 10')
    
    // 测试计数
    const countResult = await query('SELECT COUNT(*) as total FROM person')
    
    return {
      success: true,
      message: '数据库连接成功',
      data: persons,
      total: (countResult as any)[0]?.total || 0,
      count: Array.isArray(persons) ? persons.length : 0
    }
  } catch (error: any) {
    return {
      success: false,
      message: '数据库连接失败',
      error: error.message,
      stack: error.stack
    }
  }
})
