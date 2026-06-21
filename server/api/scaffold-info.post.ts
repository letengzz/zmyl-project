import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, type, unit, formula, price, remark } = body

    if (!name || !type || !unit || !formula || !price) {
      return {
        success: false,
        message: '请填写必填项'
      }
    }

    const result = await query(
      `INSERT INTO scaffold_info (name, type, unit, formula, price, remark, status) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, type, unit, formula, price, remark || null]
    )

    return {
      success: true,
      data: result
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message
    }
  }
})
