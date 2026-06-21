import { execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { name, id_card, phone, position, location, address, entry_time, emer_person, emer_phone, bank_num, attendance_salary, actual_salary } = body

    const result = await execute(
      `UPDATE person SET name = ?, id_card = ?, phone = ?, position = ?, location = ?, 
       address = ?, entry_time = ?, emer_person = ?, emer_phone = ?, bank_num = ?, attendance_salary = ?, actual_salary = ? WHERE id = ?`,
      [name, id_card, phone, position, location, address, entry_time, emer_person, emer_phone, bank_num, attendance_salary || null, actual_salary || null, id]
    )

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})
