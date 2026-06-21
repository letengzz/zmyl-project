import { query } from '../utils/db'

// GET /api/overtime?date=2026-06-12&location=1
export default defineEventHandler(async (event) => {
  try {
    const { date, location } = getQuery(event) as { date?: string; location?: string }
    
    if (!date) {
      return { success: false, message: '缺少日期参数' }
    }

    // 查询指定日期的加班任务，包含人员信息（使用 LEFT JOIN 以支持无人员的情况）
    let sql = `SELECT t.id as task_id, t.work_location, t.work_content,
               r.person_id, r.sort,
               DATE_FORMAT(t.start_time, '%H:%i') as start_time,
               DATE_FORMAT(t.end_time, '%H:%i') as end_time,
               t.duration_hours,
               p.name, p.position, p.location, p.id_card, p.phone, p.address, p.entry_time, p.is_resign, p.emer_person, p.emer_phone, p.bank_num, p.order
               FROM overtime_task t
               LEFT JOIN overtime_record r ON t.id = r.task_id
               LEFT JOIN person p ON r.person_id = p.id
               WHERE t.task_date = ?`
    const params: any[] = [date]
    
    if (location) {
      sql += ` AND t.location = ?`
      params.push(Number(location))
    }
    
    sql += ` ORDER BY r.sort IS NULL, r.sort, p.order IS NULL, p.order`

    const records = await query(sql, params)

    return { success: true, data: records }
  } catch (error: any) {
    console.error('Get overtime error:', error)
    return { success: false, message: error.message }
  }
})
