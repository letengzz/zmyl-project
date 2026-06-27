import { query } from '../utils/db'

// POST /api/commission-update
// 更新架设委托记录
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, commission_no, has_electronic, is_approved, is_erected, applicant_unit, entry_time, photo_urls, remark } = body
    
    if (!id) {
      return { success: false, message: '缺少ID' }
    }
    
    if (!commission_no || !applicant_unit) {
      return { success: false, message: '委托单编号和申请单位为必填项' }
    }
    
    // 检查委托编号是否已存在（排除当前记录）
    const existing = await query('SELECT id FROM scaffold_commission WHERE commission_no = ? AND is_deleted = 0 AND id != ?', [commission_no, id]) as any[]
    if (existing.length > 0) {
      return { success: false, message: '委托编号已存在，请勿重复' }
    }

    const photoUrlsJson = photo_urls && photo_urls.length > 0 
      ? JSON.stringify(photo_urls) 
      : null
    
    // 格式化时间为 MySQL DATETIME 格式
    let formattedTime = ''
    if (entry_time) {
      const d = new Date(entry_time)
      const pad = (n: number) => String(n).padStart(2, '0')
      formattedTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
    
    const sql = `
      UPDATE scaffold_commission 
      SET commission_no = ?, has_electronic = ?, is_approved = ?, is_erected = ?, applicant_unit = ?, entry_time = ?, photo_urls = ?, remark = ?
      WHERE id = ?
    `
    
    await query(sql, [
      commission_no,
      has_electronic ? 1 : 0,
      is_approved ? 1 : 0,
      is_erected ? 1 : 0,
      applicant_unit,
      formattedTime || null,
      photoUrlsJson,
      remark || null,
      id
    ])
    
    return { success: true, message: '更新成功' }
  } catch (error: any) {
    console.error('更新架设委托失败:', error)
    return { success: false, message: error.message }
  }
})
