import { query } from '../utils/db'
import { calcHours } from '../utils/attendance-calc'

// POST /api/attendance-recalc
// 按「实际打卡时间」用已保存的打卡时间（attendance.manual_times）重算指定月份的手动工时（attendance.manual_hours）
// body: { year?: number, month?: number }，缺省为当前月
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event).catch(() => ({} as any))
    const now = new Date()
    const year = Number(body?.year || now.getFullYear())
    const month = Number(body?.month || now.getMonth() + 1)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return { success: false, message: '月份参数无效' }
    }
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    // 旧库缺列兜底：没有 manual_hours/manual_times 说明从无打卡时间数据
    const cols = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME IN ('manual_hours', 'manual_times')"
    ) as any[]
    const names = new Set(cols.map(c => c.COLUMN_NAME))
    if (!names.has('manual_hours') || !names.has('manual_times')) {
      return { success: true, message: '当月没有可重算的打卡时间数据', year, month, total: 0, updated: 0, cleared: 0, unchanged: 0, skipped: 0 }
    }

    // 仅重算存有打卡时间的记录（manual_times 非空）
    const rows = await query(
      `SELECT id, manual_hours, manual_times FROM attendance
       WHERE attendance_date >= ? AND attendance_date < ?
         AND manual_times IS NOT NULL AND manual_times <> ''`,
      [startDate, endDate]
    ) as any[]

    let updated = 0
    let cleared = 0
    let unchanged = 0
    let skipped = 0

    for (const row of rows) {
      let times: any
      try {
        times = JSON.parse(row.manual_times)
      } catch {
        skipped++
        continue
      }
      if (!times || typeof times !== 'object') {
        skipped++
        continue
      }
      const hours = calcHours({
        morningStart: times.morningStart || '',
        morningEnd: times.morningEnd || '',
        afternoonStart: times.afternoonStart || '',
        afternoonEnd: times.afternoonEnd || ''
      })
      const prev = row.manual_hours != null ? Number(row.manual_hours) : null

      if (hours > 0) {
        if (prev !== null && Math.abs(prev - hours) < 0.05) {
          unchanged++
          continue
        }
        await query('UPDATE attendance SET manual_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hours, row.id])
        updated++
      } else {
        // 新规则下折算为 0：清空工时，但保留打卡时间以便下次调整规则后再次重算
        if (prev === null) {
          unchanged++
          continue
        }
        await query('UPDATE attendance SET manual_hours = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.id])
        cleared++
      }
    }

    const total = rows.length
    const message = total === 0
      ? `${year}年${month}月没有可重算的打卡时间数据`
      : `已按当前规则重算 ${year}年${month}月打卡工时：更新 ${updated} 条、清零 ${cleared} 条、无变化 ${unchanged} 条${skipped ? `、跳过 ${skipped} 条` : ''}`

    return { success: true, message, year, month, total, updated, cleared, unchanged, skipped }
  } catch (error: any) {
    console.error('Recalc attendance error:', error)
    return { success: false, message: error.message }
  }
})
