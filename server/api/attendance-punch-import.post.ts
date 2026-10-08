import { query } from '../utils/db'
import { getAttendanceRule, deriveMinuteRules, fmtMin, type MinuteRule } from '../utils/attendance-rule'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

// 上/下午判定边界
type RulePair = { morning: MinuteRule; afternoon: MinuteRule }

// POST /api/attendance-punch-import - 导入考勤报表中的上下班时间（multipart 上传 xlsx）
// 数据写入 attendance.manual_hours / manual_times（与手动录入同源，不影响导入工时 hours）
// 报表格式：第一个 sheet "打卡时间"
//   row0 标题含统计日期（如"打卡时间 统计日期：2026-08-01 至 2026-08-20"）
//   row2 表头、row3 日期行（无实际用途）
//   row4 起数据行：col0=姓名 col3=工号(身份证) col6起=每天打卡时间（\n 分隔的 HH:MM）
export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      return { success: false, message: '请上传文件' }
    }
    const file = formData[0]!
    if (!file || !file.data) {
      return { success: false, message: '文件内容为空' }
    }
    const fileName = file.filename || ''

    // 解析 Excel（codepage 936 = GBK 简体中文）
    const workbook = XLSX.read(file.data, { type: 'buffer', codepage: 936 })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return { success: false, message: '打卡时间 sheet 不存在' }
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
    if (data.length < 5) {
      return { success: false, message: '考勤报表格式不正确，至少需要5行数据' }
    }

    // 从标题解析统计日期范围，失败时从文件名解析
    const title = String(data[0]?.[0] || '')
    let m = title.match(/(\d{4})-(\d{2})-(\d{2})[^0-9]*至[^0-9]*(\d{4})-(\d{2})-(\d{2})/)
    if (!m) {
      m = fileName.match(/(\d{4})(\d{2})(\d{2})\s*[-_~至]\s*(\d{4})(\d{2})(\d{2})/)
    }
    if (!m) {
      return {
        success: false,
        message: `无法从标题"${title.slice(0, 20)}"或文件名"${fileName}"中识别日期范围，请确认包含如"2026-08-01 至 2026-08-20"`
      }
    }
    const startDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const endDate = new Date(Number(m[4]), Number(m[5]) - 1, Number(m[6]))
    const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
    if (days < 1 || days > 62) {
      return { success: false, message: '日期范围无效（最多支持62天）' }
    }
    const startDateStr = `${Number(m[1])}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`
    const endDateStr = `${Number(m[4])}-${String(Number(m[5])).padStart(2, '0')}-${String(Number(m[6])).padStart(2, '0')}`

    // 读取打卡规则（在考勤管理右上角「设置」中配置），并推导各时段判定边界
    const rule = await getAttendanceRule()
    const minuteRules = deriveMinuteRules(rule)

    // 检查 punch_seq 列是否存在，不存在则添加（记录打卡时间报表中的人员顺序）
    const punchSeqColumns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME = 'punch_seq'"
    ) as any[]
    if (punchSeqColumns.length === 0) {
      await query(`ALTER TABLE attendance ADD COLUMN punch_seq INT DEFAULT NULL COMMENT '打卡时间报表导入顺序'`)
    }

    // 数据行从第5行（索引4）开始：col0=姓名 col3=工号(身份证) col6起=每天打卡时间
    let imported = 0
    let skipped = 0
    let importedDays = 0
    let skippedDays = 0
    const results: { name: string; idCard: string; days: number; hours: number; success: boolean; error?: string }[] = []

    for (let i = 4; i < data.length; i++) {
      const row = data[i]
      if (!row) continue
      const name = String(row[0] || '').trim()
      const idCard = String(row[3] || '').trim()
      if (!name || !idCard) continue

      // 按工号（身份证号）匹配人员，大小写兼容（尾号 x/X）
      const personRows = await query('SELECT id FROM person WHERE UPPER(id_card) = ?', [idCard.toUpperCase()]) as any[]
      if (personRows.length === 0) {
        results.push({ name, idCard, days: 0, hours: 0, success: false, error: '系统中未找到该人员' })
        skipped++
        continue
      }
      const personId = personRows[0].id

      // 仅当该人当月无初始考勤顺序（punch_seq 为 NULL）时，写入打卡时间报表的序号（大数值），
      // 使其出现在人员列表中且排在初始考勤人员之后，不覆盖初始考勤表已写入的顺序
      await query(
        `UPDATE attendance SET punch_seq = ? WHERE person_id = ? AND attendance_date >= ? AND attendance_date <= ? AND punch_seq IS NULL`,
        [100000 + (i - 4), personId, startDateStr, endDateStr]
      )

      let personDays = 0
      let personHours = 0

      for (let d = 0; d < days; d++) {
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + d)
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const cell = String(row[6 + d] || '').trim()
        if (!cell) {
          // 报表中该天无打卡：清空旧的打卡时间导入数据（防止旧报表残留）
          await query(
            `UPDATE attendance SET manual_hours = NULL, manual_times = NULL WHERE person_id = ? AND attendance_date = ?`,
            [personId, dateStr]
          )
          continue
        }
        const times = extractTimes(cell)
        const picked = pickFour(times, minuteRules)
        if (!picked) {
          skippedDays++
          // 无有效打卡时间同样清空旧数据
          await query(
            `UPDATE attendance SET manual_hours = NULL, manual_times = NULL WHERE person_id = ? AND attendance_date = ?`,
            [personId, dateStr]
          )
          continue
        }
        const hours = calcHours(minuteRules, picked)
        if (hours <= 0) {
          skippedDays++
          // 工时为 0 同样清空旧数据
          await query(
            `UPDATE attendance SET manual_hours = NULL, manual_times = NULL WHERE person_id = ? AND attendance_date = ?`,
            [personId, dateStr]
          )
          continue
        }

        // 同时写入 punch_seq（大数值，排在初始考勤人员之后）：
        // 使「只有打卡时间、没有初始考勤记录」的人员也能出现在人员列表中
        await query(
          `INSERT INTO attendance (person_id, attendance_date, hours, manual_hours, manual_times, punch_seq)
           VALUES (?, ?, 0, ?, ?, ?)
           ON DUPLICATE KEY UPDATE manual_hours = VALUES(manual_hours), manual_times = VALUES(manual_times), updated_at = CURRENT_TIMESTAMP`,
          [personId, dateStr, hours, JSON.stringify(picked), 100000 + (i - 4)]
        )
        personDays++
        personHours += hours
        importedDays++
      }

      if (personDays > 0) {
        results.push({ name, idCard, days: personDays, hours: Math.round(personHours * 100) / 100, success: true })
        imported++
      } else {
        results.push({ name, idCard, days: 0, hours: 0, success: false, error: '无有效打卡时间' })
        skipped++
      }
    }

    return {
      success: true,
      message: `打卡时间导入完成：成功 ${imported} 人（${importedDays} 天次），失败 ${skipped} 人，无效时间 ${skippedDays} 天次已跳过`,
      dateRange: `${startDateStr} 至 ${endDateStr}`,
      imported,
      skipped,
      importedDays,
      skippedDays,
      results
    }
  } catch (error: any) {
    console.error('Import punch attendance error:', error)
    return { success: false, message: error.message }
  }
})

// 从单元格文本中提取所有 HH:MM 时间（\n 或空白分隔）
function extractTimes(cell: string): string[] {
  const times: string[] = []
  const re = /(\d{1,2}):(\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cell)) !== null) {
    const h = Number(m[1])
    const min = Number(m[2])
    if (h <= 23 && min <= 59) {
      times.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }
  }
  return times
}

// 从打卡时间序列中确定四个时间点（兼容多打/漏打卡）
// 各判定边界由「设置」中的打卡规则推导（默认：上午下班 11:30、下午上班宽限 13:20、下午上班早到 13:00）
// ≥4 次：第一个=上午上班，最后一个=下午下班；
//   中午时段 [上午下班-30, 下午上班标准+30] 有 ≥2 次打卡时：第一个=上午下班、第二个=下午上班；
//   只有 1 次中午打卡：视为上午下班，下午上班默认取「下午上班早到时间」；无中午打卡按时段兑底
// 3 次：中间卡靠近上午下班点则中间=上午下班、第一张=上午上班、最后一张>下午上班宽限=下午下班否则=下午上班；
//   中间卡靠近下午上班宽限点则中间=下午上班、第一张<上午下班点=上午上班否则=上午下班、最后一张=下午下班
// 2 次：第一张<上午下班点=上午上班否则=上午下班；最后一张>下午上班宽限=下午下班否则=下午上班
// 缺失的时间点：上午下班/下午上班按规则时间补全，
//   上午上班/下午下班不猜（存空，该时段不计工时）；1 次及以下跳过
function pickFour(times: string[], rule: RulePair): { morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string } | null {
  const sorted = [...times].sort()
  const DEFAULT = { morningStart: '', morningEnd: fmtMin(rule.morning.stdEnd), afternoonStart: fmtMin(rule.afternoon.earlyBase), afternoonEnd: '' }
  // 中午时段窗口：上午下班标准时间前 30 分钟 ~ 下午上班标准时间后 30 分钟
  const middayFrom = rule.morning.stdEnd - 30
  const middayTo = rule.afternoon.stdStart + 30
  if (sorted.length >= 4) {
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    const midday = sorted.filter(t => { const v = parseTime(t); return v !== null && v >= middayFrom && v <= middayTo })
    let morningEnd: string
    let afternoonStart: string
    if (midday.length >= 2) {
      morningEnd = midday[0]!
      afternoonStart = midday[1]!
    } else if (midday.length === 1) {
      morningEnd = midday[0]!
      afternoonStart = DEFAULT.afternoonStart
    } else {
      const preNoon = sorted.filter(t => { const v = parseTime(t); return v !== null && v <= 12 * 60 })
      const afternoon = sorted.filter(t => { const v = parseTime(t); return v !== null && v > 12 * 60 })
      morningEnd = preNoon.length > 0 ? preNoon[preNoon.length - 1]! : first
      afternoonStart = afternoon.length > 0 ? afternoon[0]! : DEFAULT.afternoonStart
    }
    return { ...DEFAULT, morningStart: first, morningEnd, afternoonStart, afternoonEnd: last }
  }
  if (sorted.length === 3) {
    const s0 = sorted[0]!
    const s1 = sorted[1]!
    const s2 = sorted[2]!
    const first = parseTime(s0)!
    const second = parseTime(s1)!
    const third = parseTime(s2)!
    const result = { ...DEFAULT }
    const morningCut = rule.morning.endEarlyFrom
    const afternoonCut = rule.afternoon.lateLimit
    const dMorning = Math.abs(second - morningCut)
    const dAfternoon = Math.abs(second - afternoonCut)
    if (dMorning <= dAfternoon) {
      // 中间卡靠近上午下班点 → 上午下班
      result.morningEnd = s1
      result.morningStart = s0
      if (third > afternoonCut) result.afternoonEnd = s2
      else result.afternoonStart = s2
    } else {
      // 中间卡靠近下午上班宽限点 → 下午上班
      result.afternoonStart = s1
      if (first < morningCut) result.morningStart = s0
      else result.morningEnd = s0
      result.afternoonEnd = s2
    }
    return result
  }
  if (sorted.length === 2) {
    const s0 = sorted[0]!
    const s1 = sorted[1]!
    const first = parseTime(s0)!
    const last = parseTime(s1)!
    const result = { ...DEFAULT }
    if (first < rule.morning.endEarlyFrom) result.morningStart = s0
    else result.morningEnd = s0
    if (last > rule.afternoon.lateLimit) result.afternoonEnd = s1
    else result.afternoonStart = s1
    return result
  }
  return null
}

// 解析 HH:MM 为分钟数
function parseTime(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// 上午上班：就近取整到整点/半点后限制在 [早到计入, 标准上班]（早到保底、迟到封顶）
function effectiveMorningStart(rule: RulePair, t: number): number {
  const r = rule.morning
  const rounded = roundToHalfHour(t)
  if (rounded <= r.earlyBase) return r.earlyBase
  if (rounded > r.stdStart) return r.stdStart
  return rounded
}

// 下午上班：不晚于迟到宽限点（含）按早到计入时间算，之后按标准上班时间算
function effectiveAfternoonStart(rule: RulePair, t: number): number {
  const r = rule.afternoon
  if (t <= r.lateLimit) return r.earlyBase
  return r.stdStart
}

// 生效下班时间：不低于（标准下班 - 允许提前）时按标准下班算；
// allowOvertime 为 true 时晚于标准下班取最接近的整点/半点（加班），距离相等时向下；否则封顶按标准下班算
function effectiveEnd(t: number, rule: { stdEnd: number; endEarlyFrom: number }, allowOvertime: boolean): number {
  if (t >= rule.endEarlyFrom) {
    if (!allowOvertime) return rule.stdEnd
    if (t <= rule.stdEnd) return rule.stdEnd
    return roundToHalfHour(t)
  }
  return t
}

// 取最接近的整点/半点（30分钟刻度），距离相等时向下取整（如 18:15→18:00、18:22→18:30）
function roundToHalfHour(t: number): number {
  const lower = Math.floor(t / 30) * 30
  const upper = lower + 30
  return (t - lower) <= (upper - t) ? lower : upper
}

// 根据四个时间点折算工时（与前端 manualHours 一致）
// 上午上班为空 → 上午时段不计；下午下班为空 → 下午时段不计（漏打卡按空处理）
function calcHours(rule: RulePair, times: { morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string }): number {
  const ms = parseTime(times.morningStart)
  const me = parseTime(times.morningEnd)
  const as_ = parseTime(times.afternoonStart)
  const ae = parseTime(times.afternoonEnd)

  let totalMin = 0
  // 半天模式：上午上班打卡不早于上午下班点说明上午未出勤，按「半天（下午早到~标准下班）」+ 加班计算
  const isHalfDay = ms !== null && ms >= rule.morning.endEarlyFrom
  if (isHalfDay) {
    if (ae !== null) {
      const halfDay = rule.afternoon.stdEnd - rule.afternoon.earlyBase
      totalMin += halfDay + Math.max(0, effectiveEnd(ae, rule.afternoon, true) - rule.afternoon.stdEnd)
    }
  } else {
    if (ms !== null && me !== null) {
      const m = effectiveEnd(me, rule.morning, false) - effectiveMorningStart(rule, ms)
      if (m > 0) totalMin += m
    }
    if (as_ !== null && ae !== null) {
      const a = effectiveEnd(ae, rule.afternoon, true) - effectiveAfternoonStart(rule, as_)
      if (a > 0) totalMin += a
    }
  }
  return Math.round((totalMin / 60) * 10) / 10
}
