import { query, execute } from '../utils/db'

// POST /api/attendance - 保存考勤数据
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { person_id, records } = body as {
      person_id: number
      records: { attendance_date: string; hours: number }[]
    }

    if (!person_id || !records || !Array.isArray(records)) {
      return { success: false, message: '参数不完整' }
    }

    // 批量插入/更新（使用 ON DUPLICATE KEY UPDATE）
    for (const record of records) {
      await query(
        `INSERT INTO attendance (person_id, attendance_date, hours) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE hours = VALUES(hours), updated_at = CURRENT_TIMESTAMP`,
        [person_id, record.attendance_date, record.hours]
      )
    }

    return { success: true, message: '保存成功' }
  } catch (error: any) {
    console.error('Save attendance error:', error)
    return { success: false, message: error.message }
  }
})