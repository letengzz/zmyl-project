import { query } from '../utils/db'

// GET /api/salary-compare?year=2026&month=5
// 返回指定年月所有人员的工资表对比数据
export default defineEventHandler(async (event) => {
  try {
    const { year, month } = getQuery(event) as { year?: string; month?: string }

    if (!year || !month) {
      return { success: false, message: '缺少年月参数' }
    }

    const sql = `
      SELECT sc.*, p.id_card, p.name
      FROM salary_compare sc
      JOIN person p ON sc.person_id = p.id
      WHERE sc.year = ? AND sc.month = ?
    `

    const records = await query(sql, [Number(year), Number(month)])

    return { success: true, data: records }
  } catch (error: any) {
    console.error('Get salary compare error:', error)
    return { success: false, message: error.message }
  }
})