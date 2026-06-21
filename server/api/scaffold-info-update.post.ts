import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, name, type, unit, formula, price, remark } = body

    if (!id || !name || !type || !unit || !formula || !price) {
      return {
        success: false,
        message: '请填写必填项'
      }
    }

    await query(
      `UPDATE scaffold_info SET 
        name = ?, 
        type = ?, 
        unit = ?, 
        formula = ?, 
        price = ?, 
        remark = ?
       WHERE id = ?`,
      [name, type, unit, formula, price, remark || null, id]
    )

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message
    }
  }
})
