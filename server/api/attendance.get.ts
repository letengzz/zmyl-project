import { query } from '../utils/db'

// GET /api/attendance?person_id=1&year=2026&month=6
export default defineEventHandler(async (event) => {
  try {
    const { person_id, year, month } = getQuery(event) as { person_id?: string; year?: string; month?: string }
    
    if (!person_id) {
      return { success: false, message: '缺少人员ID' }
    }

    let sql = 'SELECT * FROM attendance WHERE person_id = ?'
    const params: any[] = [Number(person_id)]

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      // 计算下个月第一天
      const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1
      const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year)
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
      
      sql += ' AND attendance_date >= ? AND attendance_date < ?'
      params.push(startDate, endDate)
    }

    sql += ' ORDER BY attendance_date ASC'

    const records = await query(sql, params)

    return { success: true, data: records }
  } catch (error: any) {
    console.error('Get attendance error:', error)
    return { success: false, message: error.message }
  }
})