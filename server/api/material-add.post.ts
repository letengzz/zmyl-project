import { query } from '../utils/db'

// POST /api/material-add - 新增物资
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, spec, total_quantity, remark } = body

    if (!name || !name.trim()) {
      return { success: false, message: '物资名称不能为空' }
    }
    const qty = Math.max(0, parseInt(String(total_quantity ?? 0)) || 0)

    // 检查同名称+同规格是否已存在（规格可能为空，用 NULL 安全比较 <=>）
    const existing = await query(
      'SELECT id FROM material WHERE name = ? AND spec <=> ? AND is_deleted = 0',
      [name.trim(), spec || null]
    ) as any[]
    if (existing.length > 0) {
      const specText = spec ? `（规格：${spec}）` : '（无规格）'
      return { success: false, message: `物资「${name.trim()}」${specText}已存在，请勿重复添加` }
    }

    const result = await query(
      'INSERT INTO material (name, spec, total_quantity, remark) VALUES (?, ?, ?, ?)',
      [name.trim(), spec || null, qty, remark || null]
    ) as any

    return { success: true, message: '添加成功', insertId: result.insertId }
  } catch (error: any) {
    console.error('添加物资失败:', error)
    return { success: false, message: error.message }
  }
})
