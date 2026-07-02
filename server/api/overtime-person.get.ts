import { query } from '../utils/db'

// GET /api/overtime-person?person_id=1&year=2026&month=6
// 查询指定人员在某月的所有加班日期
export default defineEventHandler(async (event) => {
  try {
    const { person_id, year, month } = getQuery(event) as {
      person_id?: string
      year?: string
      month?: string
    }

    if (!person_id || !year || !month) {
      return { success: false, message: '缺少必要参数' }
    }

    const y = Number(year)
    const m = Number(month)

    // 查询该人员在该月所有加班日期（按天去重）
    const rows = await query(
      `SELECT DISTINCT t.task_date
       FROM overtime_record r
       JOIN overtime_task t ON r.task_id = t.id
       WHERE r.person_id = ?
         AND YEAR(t.task_date) = ?
         AND MONTH(t.task_date) = ?
       ORDER BY t.task_date`,
      [Number(person_id), y, m]
    )

    return { success: true, data: rows }
  } catch (error: any) {
    console.error('Get overtime person dates error:', error)
    return { success: false, message: error.message }
  }
})
