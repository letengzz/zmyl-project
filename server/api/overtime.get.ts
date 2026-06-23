import { query } from '../utils/db'

// GET /api/overtime?date=2026-06-12&location=1
export default defineEventHandler(async (event) => {
  try {
    const { date, location } = getQuery(event) as { date?: string; location?: string }
    
    if (!date) {
      return { success: false, message: '缺少日期参数' }
    }

    // 查询指定日期的加班任务，包含人员信息
    let sql = `SELECT t.id as task_id, t.work_location, t.work_content,
               DATE_FORMAT(t.start_time, '%H:%i') as start_time,
               DATE_FORMAT(t.end_time, '%H:%i') as end_time,
               t.duration_hours,
               r.person_id, r.sort,
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
    
    sql += ` ORDER BY t.id, r.sort IS NULL, r.sort, p.order IS NULL, p.order`

    const records = await query(sql, params)

    // 按task_id分组
    const tasksMap = new Map<number, {
      task_id: number
      work_location: string | null
      work_content: string | null
      start_time: string
      end_time: string
      duration_hours: number
      persons: Array<{
        person_id: number
        sort: number | null
        name: string
        position: string
        location: number
        id_card: string
        phone: string
        address: string
        entry_time: string
        is_resign: number
        emer_person: string
        emer_phone: string
        bank_num: string
        order: number | null
      }>
    }>()

    for (const r of records as any[]) {
      if (!tasksMap.has(r.task_id)) {
        tasksMap.set(r.task_id, {
          task_id: r.task_id,
          work_location: r.work_location,
          work_content: r.work_content,
          start_time: r.start_time,
          end_time: r.end_time,
          duration_hours: r.duration_hours,
          persons: []
        })
      }
      if (r.person_id) {
        tasksMap.get(r.task_id)!.persons.push({
          person_id: r.person_id,
          sort: r.sort,
          name: r.name,
          position: r.position,
          location: r.location,
          id_card: r.id_card,
          phone: r.phone,
          address: r.address,
          entry_time: r.entry_time,
          is_resign: r.is_resign,
          emer_person: r.emer_person,
          emer_phone: r.emer_phone,
          bank_num: r.bank_num,
          order: r.order
        })
      }
    }

    return { success: true, data: Array.from(tasksMap.values()) }
  } catch (error: any) {
    console.error('Get overtime error:', error)
    return { success: false, message: error.message }
  }
})
