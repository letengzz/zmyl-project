import { saveAttendanceRule, normalizeRule } from '../utils/attendance-rule'

// POST /api/attendance-rule - 保存考勤打卡规则
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const rule = normalizeRule(body)
    await saveAttendanceRule(rule)
    return { success: true, message: '设置已保存', data: rule }
  } catch (error: any) {
    console.error('attendance-rule save error:', error)
    return { success: false, message: error.message }
  }
})
