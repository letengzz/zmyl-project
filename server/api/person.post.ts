import { execute } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, id_card, phone, position, location, address, entry_time, emer_person, emer_phone, bank_num, bank_name, bank_code, attendance_salary, actual_salary } = body

    const result = await execute(
      `INSERT INTO person (name, id_card, phone, position, location, address, entry_time, emer_person, emer_phone, bank_num, bank_name, bank_code, attendance_salary, actual_salary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, id_card, phone, position, location, address, entry_time, emer_person, emer_phone, bank_num, bank_name, bank_code, attendance_salary || null, actual_salary || null]
    )

    return {
      success: true,
      message: '添加成功',
      data: { insertId: (result as any).insertId }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})
