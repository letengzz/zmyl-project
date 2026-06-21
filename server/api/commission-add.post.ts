import { query } from '../utils/db'

// POST /api/commission-add
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { commission_no, has_electronic, is_approved, is_erected, applicant_unit, entry_time, photo_urls } = body
    
    if (!commission_no || !applicant_unit) {
      return { success: false, message: '委托单编号和申请单位为必填项' }
    }
    
    const photoUrlsJson = photo_urls && photo_urls.length > 0 
      ? JSON.stringify(photo_urls) 
      : null
    
    // 格式化时间为 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
    let formattedTime = ''
    if (entry_time) {
      const d = new Date(entry_time)
      const pad = (n: number) => String(n).padStart(2, '0')
      formattedTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    } else {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      formattedTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
    
    const sql = `
      INSERT INTO scaffold_commission (commission_no, has_electronic, is_approved, is_erected, applicant_unit, entry_time, photo_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    
    const result = await query(sql, [
      commission_no,
      has_electronic ? 1 : 0,
      is_approved ? 1 : 0,
      is_erected ? 1 : 0,
      applicant_unit,
      formattedTime,
      photoUrlsJson
    ]) as any
    
    return { 
      success: true, 
      message: '添加成功',
      insertId: result.insertId 
    }
  } catch (error: any) {
    console.error('添加架设委托失败:', error)
    return { success: false, message: error.message }
  }
})
