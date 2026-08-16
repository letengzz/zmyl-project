import { query } from '../utils/db'

// POST /api/work-ticket-add
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ticket_no, work_location, weekly_invoice_day, is_enabled, approver, remark } = body
    
    if (!work_location || !weekly_invoice_day) {
      return { success: false, message: '作业位置和每周开票时间为必填项' }
    }

    // 如果填写了编号，检查是否已存在
    if (ticket_no) {
      const existing = await query(
        'SELECT id FROM work_ticket WHERE ticket_no = ? AND is_deleted = 0',
        [ticket_no]
      ) as any[]
      if (existing.length > 0) {
        return { success: false, message: `编号「${ticket_no}」已存在，请勿重复添加` }
      }
    }

    const sql = `
      INSERT INTO work_ticket (ticket_no, work_location, weekly_invoice_day, is_enabled, approver, remark)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    
    const result = await query(sql, [
      ticket_no || null,
      work_location,
      Number(weekly_invoice_day),
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
      approver || null,
      remark || null
    ]) as any
    
    return { 
      success: true, 
      message: '添加成功',
      insertId: result.insertId 
    }
  } catch (error: any) {
    console.error('添加作业票失败:', error)
    return { success: false, message: error.message }
  }
})
