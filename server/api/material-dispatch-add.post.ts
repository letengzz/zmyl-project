import { query } from '../utils/db'

// POST /api/material-dispatch-add - 新增出场记录（校验剩余数量是否足够）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { material_id, quantity, dispatch_date, remark } = body

    const materialId = Number(material_id)
    const qty = parseInt(String(quantity))
    if (!materialId) {
      return { success: false, message: '请选择物资' }
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return { success: false, message: '出场数量必须为正整数' }
    }
    if (!dispatch_date) {
      return { success: false, message: '请选择出场日期' }
    }

    // 校验物资存在并计算剩余数量
    const rows = await query(
      `SELECT m.id, m.name, m.total_quantity, COALESCE(SUM(d.quantity), 0) AS dispatched_quantity
       FROM material m
       LEFT JOIN material_dispatch d ON d.material_id = m.id AND d.is_deleted = 0
       WHERE m.id = ? AND m.is_deleted = 0
       GROUP BY m.id, m.name, m.total_quantity`,
      [materialId]
    ) as any[]
    if (rows.length === 0) {
      return { success: false, message: '物资不存在' }
    }
    const row = rows[0]
    const remain = row.total_quantity - row.dispatched_quantity
    if (remain < qty) {
      return { success: false, message: `「${row.name}」剩余数量不足（剩余 ${remain}，本次出场 ${qty}）` }
    }

    await query(
      'INSERT INTO material_dispatch (material_id, quantity, dispatch_date, remark) VALUES (?, ?, ?, ?)',
      [materialId, qty, dispatch_date, remark || null]
    )

    return { success: true, message: '出场记录添加成功' }
  } catch (error: any) {
    console.error('新增出场记录失败:', error)
    return { success: false, message: error.message }
  }
})
