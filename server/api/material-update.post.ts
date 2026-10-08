import { query } from '../utils/db'

// POST /api/material-update - 编辑物资（名称/总数量/备注）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, name, spec, total_quantity, remark } = body

    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    if (!name || !name.trim()) {
      return { success: false, message: '物资名称不能为空' }
    }
    const qty = Math.max(0, parseInt(String(total_quantity ?? 0)) || 0)

    // 检查同名称+同规格是否与其他物资重复（规格可能为空，用 NULL 安全比较 <=>）
    const existing = await query(
      'SELECT id FROM material WHERE name = ? AND spec <=> ? AND is_deleted = 0 AND id != ?',
      [name.trim(), spec || null, id]
    ) as any[]
    if (existing.length > 0) {
      const specText = spec ? `（规格：${spec}）` : '（无规格）'
      return { success: false, message: `物资「${name.trim()}」${specText}已存在` }
    }

    await query(
      'UPDATE material SET name = ?, spec = ?, total_quantity = ?, remark = ? WHERE id = ? AND is_deleted = 0',
      [name.trim(), spec || null, qty, remark || null, id]
    )

    return { success: true, message: '保存成功' }
  } catch (error: any) {
    console.error('编辑物资失败:', error)
    return { success: false, message: error.message }
  }
})
