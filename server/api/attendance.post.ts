import { query, execute } from '../utils/db'

// POST /api/attendance - 保存手动录入的考勤数据（写入 manual_hours 列，不覆盖导入的 hours）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { person_id, records } = body as {
      person_id: number
      records: { attendance_date: string; hours: number; times?: Record<string, string> | null }[]
    }

    if (!person_id || !records || !Array.isArray(records)) {
      return { success: false, message: '参数不完整' }
    }

    // 批量插入/更新手动录入工时与打卡时间（导入的 hours 不受影响；无记录时补一条 hours=0 的行）
    for (const record of records) {
      const timesJson = record.times ? JSON.stringify(record.times) : null
      await query(
        `INSERT INTO attendance (person_id, attendance_date, hours, manual_hours, manual_times)
         VALUES (?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE manual_hours = VALUES(manual_hours), manual_times = VALUES(manual_times), updated_at = CURRENT_TIMESTAMP`,
        [person_id, record.attendance_date, record.hours, timesJson]
      )
    }

    return { success: true, message: '保存成功' }
  } catch (error: any) {
    console.error('Save attendance error:', error)
    return { success: false, message: error.message }
  }
})