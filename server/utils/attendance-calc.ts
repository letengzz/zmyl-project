import type { MinuteRule } from './attendance-rule'

// 上/下午判定边界（仅用于判定打卡时间的归属，不再参与工时折算）
export type RulePair = { morning: MinuteRule; afternoon: MinuteRule }

// 四个打卡时间点
export interface PunchTimes {
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
}

// 解析 HH:MM 为分钟数
export function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// 根据四个时间点折算工时：完全按实际打卡时间计算
//   上午 = 上午下班 − 上午上班；下午 = 下午下班 − 下午上班
// 不取整、不保底、不封顶（早到晚走如实计入）；
// 缺失的打卡点或顺序颠倒（下班早于上班）的时段不计工时
export function calcHours(times: PunchTimes): number {
  const ms = parseTime(times.morningStart)
  const me = parseTime(times.morningEnd)
  const as_ = parseTime(times.afternoonStart)
  const ae = parseTime(times.afternoonEnd)

  let totalMin = 0
  if (ms !== null && me !== null && me > ms) totalMin += me - ms
  if (as_ !== null && ae !== null && ae > as_) totalMin += ae - as_
  return Math.round((totalMin / 60) * 10) / 10
}
