import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 测试查询 person 表
    const persons = await query('SELECT * FROM person')
    
    return {
      success: true,
      message: '数据库连接成功',
      data: persons
    }
  } catch (error: any) {
    return {
      success: false,
      message: '数据库连接失败',
      error: error.message
    }
  }
})
