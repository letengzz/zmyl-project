import { query } from '../utils/db'

// GET /api/attendance-persons - 按年月查询有考勤记录的人员（含离职），保持考勤记录插入顺序
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

    // 按 attendance.id 顺序取出当月所有考勤记录，保留首次出现的人员顺序
    const records = await query(
      'SELECT person_id FROM attendance WHERE attendance_date >= ? AND attendance_date < ? ORDER BY id',
      [startDate, endDate]
    ) as any[]

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
