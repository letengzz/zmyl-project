import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const {
      id,
      name,
      id_card,
      phone,
      position,
      location,
      address,
      entry_time,
      departure_time,
      is_resign,
      emer_person,
      emer_phone,
      bank_num,
      bank_name,
      bank_code,
      order,
      attendance_salary,
      actual_salary
    } = body
    
    // 验证必填字段
    if (!id) {
      return {
        success: false,
        message: '人员ID不能为空'
      }
    }
    
    // 如果提供了姓名、身份证号或所属期，则验证必填
    if ((name !== undefined || id_card !== undefined || location !== undefined) && 
        (!name || !id_card || !location)) {
      return {
        success: false,
        message: '姓名、身份证号和所属期为必填项'
      }
    }
    
    // 构建动态更新语句
    const updateFields: string[] = []
    const updateParams: any[] = []
    
    if (name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(name)
    }
    if (id_card !== undefined) {
      updateFields.push('id_card = ?')
      updateParams.push(id_card)
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?')
      updateParams.push(phone || null)
    }
    if (position !== undefined) {
      updateFields.push('position = ?')
      updateParams.push(position || null)
    }
    if (location !== undefined) {
      updateFields.push('location = ?')
      updateParams.push(location)
    }
    if (address !== undefined) {
      updateFields.push('address = ?')
      updateParams.push(address || null)
    }
    if (entry_time !== undefined) {
      updateFields.push('entry_time = ?')
      updateParams.push(entry_time || null)
    }
    if (departure_time !== undefined) {
      updateFields.push('departure_time = ?')
      updateParams.push(departure_time || null)
    }
    if (is_resign !== undefined) {
      updateFields.push('is_resign = ?')
      updateParams.push(is_resign || 0)
    }
    if (emer_person !== undefined) {
      updateFields.push('emer_person = ?')
      updateParams.push(emer_person || null)
    }
    if (emer_phone !== undefined) {
      updateFields.push('emer_phone = ?')
      updateParams.push(emer_phone || null)
    }
    if (bank_num !== undefined) {
      updateFields.push('bank_num = ?')
      updateParams.push(bank_num || null)
    }
    if (bank_name !== undefined) {
      updateFields.push('bank_name = ?')
      updateParams.push(bank_name || null)
    }
    if (bank_code !== undefined) {
      updateFields.push('bank_code = ?')
      updateParams.push(bank_code || null)
    }
    if (order !== undefined) {
      updateFields.push('`order` = ?')
      updateParams.push(order === null ? null : Number(order))
    }
    if (attendance_salary !== undefined) {
      updateFields.push('attendance_salary = ?')
      updateParams.push(attendance_salary === '' || attendance_salary === null ? null : Number(attendance_salary))
    }
    if (actual_salary !== undefined) {
      updateFields.push('actual_salary = ?')
      updateParams.push(actual_salary === '' || actual_salary === null ? null : Number(actual_salary))
    }
    
    if (updateFields.length === 0) {
      return {
        success: false,
        message: '没有需要更新的字段'
      }
    }
    
    updateParams.push(id)
    
    // 更新数据库
    await query(
      `UPDATE person SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
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
