import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 获取排序信息
    const sortData = await query('SELECT * FROM person_sort_order ORDER BY location, sort_order')
    
    return {
      success: true,
      data: sortData
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})
