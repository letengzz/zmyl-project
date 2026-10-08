import { query } from '../utils/db'

// GET /api/material-dispatch-list?material_id=&page=1&pageSize=20
// 出场记录列表（关联物资名称，按出场日期倒序）
export default defineEventHandler(async (event) => {
  try {
    const { material_id, page, pageSize } = getQuery(event) as { material_id?: string; page?: string; pageSize?: string }

    const currentPage = Math.max(1, parseInt(page || '1'))
    const size = Math.max(1, Math.min(100, parseInt(pageSize || '10')))
    const offset = (currentPage - 1) * size

    let whereSql = 'WHERE d.is_deleted = 0'
    const params: any[] = []
    if (material_id) {
      whereSql += ' AND d.material_id = ?'
      params.push(Number(material_id))
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM material_dispatch d ${whereSql}`,
      params
    ) as any[]
    const total = countResult[0]?.total || 0

    const data = await query(
      `SELECT d.id, d.material_id, d.quantity, DATE_FORMAT(d.dispatch_date, '%Y-%m-%d') AS dispatch_date,
              d.remark, d.created_at, m.name AS material_name, m.spec AS material_spec
       FROM material_dispatch d
       LEFT JOIN material m ON m.id = d.material_id
       ${whereSql}
       ORDER BY d.dispatch_date DESC, d.id DESC
       LIMIT ${size} OFFSET ${offset}`,
      params
    ) as any[]

    return {
      success: true,
      data,
      pagination: { page: currentPage, pageSize: size, total }
    }
  } catch (error: any) {
    console.error('获取出场记录失败:', error)
    return { success: false, message: error.message, data: [] }
  }
})
