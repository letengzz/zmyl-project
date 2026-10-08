import { query } from '../utils/db'

// GET /api/attendance-persons - 按年月查询有考勤数据的人员（含离职），保持考勤记录插入顺序；
// 人员范围：导入考勤工时 hours>0、或导入打卡时间/手动录入 manual_hours>0、或有 punch_seq 标记
export default defineEventHandler(async (event) => {
  try {
    const { year, month } = getQuery(event) as { year?: string; month?: string }
    if (!year || !month) return { success: false, message: '缺少年月参数' }

    const y = Number(year)
    const m = Number(month)
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    // 兼容旧库：确保 manual_hours / punch_seq 列存在（不存在时补建），避免下面的查询报错
    const cols = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME IN ('manual_hours', 'punch_seq')"
    ) as any[]
    const colSet = new Set(cols.map(c => c.COLUMN_NAME))
    if (!colSet.has('manual_hours')) {
      await query("ALTER TABLE attendance ADD COLUMN manual_hours DECIMAL(5,1) DEFAULT NULL COMMENT '手动录入工时（小时）'")
    }
    if (!colSet.has('punch_seq')) {
      await query("ALTER TABLE attendance ADD COLUMN punch_seq INT DEFAULT NULL COMMENT '考勤报表人员顺序'")
    }

    // 按 attendance.id 顺序取出当月所有考勤记录（hours>0 或有打卡时间 manual_hours>0 或有人工标记 punch_seq），
    // 保留首次出现的人员顺序；本月未导入考勤时，回退使用上个月的考勤人员
    // 人员顺序：按 punch_seq（初始考勤报表顺序），未导入初始考勤的人员按 attendance.id 顺序排在后面
    let records = await query(
      `SELECT person_id, MIN(punch_seq) AS seq, MIN(id) AS min_id
       FROM attendance
       WHERE attendance_date >= ? AND attendance_date < ? AND (hours > 0 OR manual_hours > 0 OR punch_seq IS NOT NULL)
       GROUP BY person_id
       ORDER BY seq IS NULL, seq, min_id`,
      [startDate, endDate]
    ) as any[]

    if (records.length === 0) {
      const prevM = m === 1 ? 12 : m - 1
      const prevY = m === 1 ? y - 1 : y
      const prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`
      const prevNextM = prevM === 12 ? 1 : prevM + 1
      const prevNextY = prevM === 12 ? prevY + 1 : prevY
      const prevEndDate = `${prevNextY}-${String(prevNextM).padStart(2, '0')}-01`
      records = await query(
        `SELECT person_id, MIN(punch_seq) AS seq, MIN(id) AS min_id
         FROM attendance
         WHERE attendance_date >= ? AND attendance_date < ? AND (hours > 0 OR manual_hours > 0 OR punch_seq IS NOT NULL)
         GROUP BY person_id
         ORDER BY seq IS NULL, seq, min_id`,
        [prevStartDate, prevEndDate]
      ) as any[]
    }

    const seen = new Set<number>()
    const personIds: number[] = []
    for (const r of records) {
      if (!seen.has(r.person_id)) {
        seen.add(r.person_id)
        personIds.push(r.person_id)
      }
    }

    if (personIds.length === 0) return { success: true, data: [] }

    const persons = await query(
      `SELECT id, name, id_card, position, location, \`order\`, attendance_salary, actual_salary, is_resign FROM person WHERE id IN (${personIds.map(() => '?').join(',')})`,
      personIds
    ) as any[]

    // 还原 personIds 的顺序
    const personMap = new Map(persons.map(p => [p.id, p]))
    const result = personIds.map(id => personMap.get(id)).filter(Boolean)

    return { success: true, data: result }
  } catch (error: any) {
    console.error('attendance-persons error:', error)
    return { success: false, message: error.message }
  }
})
