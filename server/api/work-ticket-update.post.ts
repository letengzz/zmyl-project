import { query } from '../utils/db'

// POST /api/work-ticket-update
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, ticket_no, work_location, weekly_invoice_day, is_enabled, approver, remark } = body
    
    if (!id || !work_location || !weekly_invoice_day) {
      return { success: false, message: '作业位置和每周开票时间为必填项' }
    }

    const sql = `
      UPDATE work_ticket SET
        ticket_no = ?,
        work_location = ?,
        weekly_invoice_day = ?,
        is_enabled = ?,
        approver = ?,
        remark = ?
      WHERE id = ?
    `
    
    await query(sql, [
      ticket_no || null,
      work_location,
      Number(weekly_invoice_day),
      is_enabled ? 1 : 0,
      approver || null,
      remark || null,
      id
    ])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('更新作业票失败:', error)
    return { success: false, message: error.message }
  }
})
