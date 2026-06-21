import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const {
      name,
      id_card,
      phone,
      position,
      location,
      address,
      entry_time,
      departure_time,
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
    if (!name || !id_card || !location) {
      return {
        success: false,
        message: '姓名、身份证号和所属期为必填项'
      }
    }
    
    // 插入数据库
    const result = await query(
      `INSERT INTO person (name, id_card, phone, position, location, address, entry_time, departure_time, emer_person, emer_phone, bank_num, bank_name, bank_code, is_resign, \`order\`, attendance_salary, actual_salary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        name,
        id_card,
        phone || null,
        position || null,
        location,
        address || null,
        entry_time || null,
        departure_time || null,
        emer_person || null,
        emer_phone || null,
        bank_num || null,
        bank_name || null,
        bank_code || null,
        order === null || order === undefined ? null : Number(order),
        attendance_salary !== undefined && attendance_salary !== '' ? Number(attendance_salary) : null,
        actual_salary !== undefined && actual_salary !== '' ? Number(actual_salary) : null
      ]
    )
    
    return {
      success: true,
      message: '添加成功',
      id: (result as any).insertId
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message
    }
  }
})
