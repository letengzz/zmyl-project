import { query } from '../utils/db'

// GET /api/attendance?person_id=1&year=2026&month=6
export default defineEventHandler(async (event) => {
  try {
    // 检查 manual_hours / manual_times 列是否存在，不存在则添加（手动录入数据与导入考勤分开存储）
    const columns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME IN ('manual_hours', 'manual_times')"
    ) as any[]
    const columnNames = new Set(columns.map(c => c.COLUMN_NAME))
    if (!columnNames.has('manual_hours')) {
      await query("ALTER TABLE attendance ADD COLUMN manual_hours DECIMAL(5,1) DEFAULT NULL COMMENT '手动录入工时（小时）'")
    }
    if (!columnNames.has('manual_times')) {
      await query("ALTER TABLE attendance ADD COLUMN manual_times VARCHAR(120) DEFAULT NULL COMMENT '手动录入的打卡时间（JSON）'")
    }

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