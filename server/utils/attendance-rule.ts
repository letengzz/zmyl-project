import { query } from './db'

// 考勤打卡规则：可在考勤管理右上角「设置」中配置
// 所有「允许时间」均为分钟数，用于从「标准时间」推导各时段的判定边界
export interface AttendanceRule {
  morningStart: string      // 上午上班标准时间
  morningEarly: number      // 上午上班允许提前（分钟）
  morningEnd: string        // 上午下班标准时间
  morningEndEarly: number   // 上午下班允许提前（分钟）
  afternoonStart: string    // 下午上班标准时间
  afternoonEarly: number    // 下午上班允许提前（分钟）
  afternoonGrace: number    // 下午上班迟到宽限（分钟）
  afternoonEnd: string      // 下午下班标准时间
  afternoonEndEarly: number // 下午下班允许提前（分钟）
}

// 默认规则（与历史硬编码保持一致：上午 08:00/11:30，下午 13:30/18:00，提前 30/10 分钟，宽限 10 分钟）
export const DEFAULT_RULE: AttendanceRule = {
  morningStart: '08:00',
  morningEarly: 30,
  morningEnd: '11:30',
  morningEndEarly: 10,
  afternoonStart: '13:30',
  afternoonEarly: 30,
  afternoonGrace: 10,
  afternoonEnd: '18:00',
  afternoonEndEarly: 10
}

// HH:MM → 分钟数
export function parseHM(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// 分钟数 → HH:MM
export function fmtMin(min: number): string {
  const v = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// 归一化并校验规则（容错：非法值回退默认）
export function normalizeRule(raw: any): AttendanceRule {
  const src = raw && typeof raw === 'object' ? raw : {}
  const time = (v: any, def: string) => (parseHM(String(v)) !== null ? String(v) : def)
  const num = (v: any, def: number, max: number) => {
    const n = Math.round(Number(v))
    if (!Number.isFinite(n) || n < 0) return def
    return Math.min(n, max)
  }
  return {
    morningStart: time(src.morningStart, DEFAULT_RULE.morningStart),
    morningEarly: num(src.morningEarly, DEFAULT_RULE.morningEarly, 240),
    morningEnd: time(src.morningEnd, DEFAULT_RULE.morningEnd),
    morningEndEarly: num(src.morningEndEarly, DEFAULT_RULE.morningEndEarly, 240),
    afternoonStart: time(src.afternoonStart, DEFAULT_RULE.afternoonStart),
    afternoonEarly: num(src.afternoonEarly, DEFAULT_RULE.afternoonEarly, 240),
    afternoonGrace: num(src.afternoonGrace, DEFAULT_RULE.afternoonGrace, 240),
    afternoonEnd: time(src.afternoonEnd, DEFAULT_RULE.afternoonEnd),
    afternoonEndEarly: num(src.afternoonEndEarly, DEFAULT_RULE.afternoonEndEarly, 240)
  }
}

// 判定边界（分钟数）
export interface MinuteRule {
  earlyBase: number     // 早到计入时间（上班）／标准下班时间（下班场景不使用）
  lateLimit: number     // 迟到宽限点（下午上班使用）
  stdStart: number      // 标准上班时间
  stdEnd: number        // 标准下班时间
  endEarlyFrom: number  // 下班允许提前的起点（此时间后按下班标准算）
}

// 由规则推导出上/下午的判定边界（默认规则推导结果与历史常量完全一致）
export function deriveMinuteRules(rule: AttendanceRule): { morning: MinuteRule; afternoon: MinuteRule } {
  const ms = parseHM(rule.morningStart) ?? 8 * 60
  const me = parseHM(rule.morningEnd) ?? 11 * 60 + 30
  const as_ = parseHM(rule.afternoonStart) ?? 13 * 60 + 30
  const ae = parseHM(rule.afternoonEnd) ?? 18 * 60
  return {
    morning: {
      earlyBase: ms - rule.morningEarly,
      lateLimit: ms - rule.morningEarly,
      stdStart: ms,
      stdEnd: me,
      endEarlyFrom: me - rule.morningEndEarly
    },
    afternoon: {
      earlyBase: as_ - rule.afternoonEarly,
      lateLimit: as_ - rule.afternoonGrace,
      stdStart: as_,
      stdEnd: ae,
      endEarlyFrom: ae - rule.afternoonEndEarly
    }
  }
}

// 建表（首次访问时自动创建，兼容旧库）
let tableReady = false
async function ensureRuleTable(): Promise<void> {
  if (tableReady) return
  await query(
    `CREATE TABLE IF NOT EXISTS attendance_rule (
       id INT NOT NULL PRIMARY KEY,
       rule_json TEXT NULL COMMENT '考勤打卡规则（JSON）',
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     )`
  )
  tableReady = true
}

// 读取规则（不存在时返回默认规则，不落库）
export async function getAttendanceRule(): Promise<AttendanceRule> {
  await ensureRuleTable()
  const rows = await query('SELECT rule_json FROM attendance_rule WHERE id = 1') as any[]
  if (rows.length === 0) return { ...DEFAULT_RULE }
  try {
    return normalizeRule(JSON.parse(rows[0].rule_json || '{}'))
  } catch {
    return { ...DEFAULT_RULE }
  }
}

// 保存规则（单行，id 固定为 1）
export async function saveAttendanceRule(rule: AttendanceRule): Promise<void> {
  await ensureRuleTable()
  const normalized = normalizeRule(rule)
  await query(
    `INSERT INTO attendance_rule (id, rule_json) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE rule_json = VALUES(rule_json), updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(normalized)]
  )
}
