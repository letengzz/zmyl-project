import { getAttendanceRule, deriveMinuteRules } from '../utils/attendance-rule'

// GET /api/attendance-rule - 读取考勤打卡规则
export default defineEventHandler(async () => {
  try {
    const rule = await getAttendanceRule()
    return { success: true, data: rule, minute: deriveMinuteRules(rule) }
  } catch (error: any) {
    console.error('attendance-rule get error:', error)
    return { success: false, message: error.message }
  }
})
