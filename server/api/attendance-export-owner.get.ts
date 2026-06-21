import { query } from '../utils/db'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

const PAGE_ROWS = 38
const PAGE_SIZE = 13
const TOTAL_PAGES = 10

function COL(idx: number): string {
  let i = idx
  let s = ''
  while (i > 0) { i--; s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) }
  return s
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 职位显示映射：数据库存 "管理"/"架工"，导出时显示为 "工程管理"/"架设"
function mapPosition(pos: string): string {
  const map: Record<string, string> = {
    '管理': '工程管理',
    '架工': '架设',
  }
  return map[pos] || pos
}

// Match a cell tag: self-closing <c r="REF" s="N"/> or regular <c r="REF" ...>...</c>
function matchCell(xml: string, ref: string): string | null {
  // Try self-closing first: <c r="REF" attrs/>
  const scRe = new RegExp(`<c r="${ref}"[^/>]*/>`, 's')
  const scMatch = xml.match(scRe)
  if (scMatch) return scMatch[0]

  // Then regular: <c r="REF" attrs>content</c>
  const re = new RegExp(`<c r="${ref}"[^>]*>[\\s\\S]*?<\\/c>`, 's')
  const match = xml.match(re)
  return match ? match[0] : null
}

// Replace a cell, preserving style
function setCell(xml: string, ref: string, value: string | number | null): string {
  const oldTag = matchCell(xml, ref)
  if (!oldTag) return xml

  const sMatch = oldTag.match(/\ss="(\d+)"/)
  const styleAttr = sMatch ? ` s="${sMatch[1]}"` : ''

  let newTag: string
  if (value === null || value === '') {
    newTag = `<c r="${ref}"${styleAttr}/>`
  } else if (typeof value === 'number') {
    newTag = `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
  } else {
    // String — use inlineStr to avoid modifying shared strings table
    newTag = `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escXml(String(value))}</t></is></c>`
  }

  return xml.replace(oldTag, newTag)
}

// Replace a formula cell
function setFormula(xml: string, ref: string, formula: string): string {
  const oldTag = matchCell(xml, ref)
  if (!oldTag) return xml

  const sMatch = oldTag.match(/\ss="(\d+)"/)
  const styleAttr = sMatch ? ` s="${sMatch[1]}"` : ''

  const newTag = `<c r="${ref}"${styleAttr}><f>${escXml(formula)}</f><v>0</v></c>`
  return xml.replace(oldTag, newTag)
}

export default defineEventHandler(async (event) => {
  try {
    const { year, month } = getQuery(event) as { year?: string; month?: string }
    if (!year || !month) return { success: false, message: '缺少年月参数' }

    const y = Number(year)
    const m = Number(month)
    const daysInMonth = new Date(y, m, 0).getDate()
    const titleStr = `中石化第四建设有限公司-中煤榆林煤炭深加工基地工程项目部-${y}年${m}月打卡考勤表`

    // ===== 查询 =====
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    // 先查当月考勤记录
    const records = await query(
      'SELECT person_id, attendance_date, hours FROM attendance WHERE attendance_date >= ? AND attendance_date < ? ORDER BY id',
      [startDate, endDate]
    ) as any[]

    // 从考勤记录中按首次出现顺序提取去重人员ID
    const seen = new Set<number>()
    const personIds: number[] = []
    for (const r of records) {
      if (!seen.has(r.person_id)) {
        seen.add(r.person_id)
        personIds.push(r.person_id)
      }
    }
    let persons: any[] = []
    if (personIds.length > 0) {
      // 按 personIds 顺序查询，再用 JS 排序还原
      persons = await query(
        `SELECT id, name, id_card, position FROM person WHERE id IN (${personIds.map(() => '?').join(',')})`,
        personIds
      ) as any[]
      // 还原 personIds 的顺序
      const personMap = new Map(persons.map(p => [p.id, p]))
      persons = personIds.map(id => personMap.get(id)).filter(Boolean) as any[]
    }

    const amap: Record<number, Record<string, number>> = {}
    for (const r of records) {
      if (!amap[r.person_id]) amap[r.person_id] = {}
      const raw = r.attendance_date
      let d: string
      if (typeof raw === 'string') {
        if (raw.includes('T')) {
          const dt = new Date(raw)
          d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        } else { d = raw.slice(0, 10) }
      } else if (raw instanceof Date) {
        d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
      } else { d = String(raw).slice(0, 10) }
      amap[r.person_id]![d] = Number(r.hours)
    }

    // ===== Load template ZIP =====
    const templatePath = path.resolve(process.cwd(), 'template', '业主考勤表模版.xlsx')
    if (!fs.existsSync(templatePath)) return { success: false, message: '模板文件不存在' }

    const tmplBuf = fs.readFileSync(templatePath)
    const zip = await JSZip.loadAsync(tmplBuf)

    // The main sheet is sheet1
    const sheetName = 'xl/worksheets/sheet1.xml'
    const raw = await zip.file(sheetName)!.async('nodebuffer') as Buffer
    let sheetXml = raw.toString('utf-8')
    if (!sheetXml) return { success: false, message: '模板中未找到考勤表' }

    const neededPages = Math.max(1, Math.ceil(persons.length / PAGE_SIZE))

    // ===== 克隆页面（如果需要） =====
    // 获取模板已有总行数
    const allRows = sheetXml.match(/<row r="(\d+)"/g)
    const maxTemplateRow = allRows ? Math.max(...allRows.map(r => parseInt(r.match(/\d+/)![0]))) : 0
    const templatePages = Math.floor(maxTemplateRow / PAGE_ROWS)

    if (neededPages > templatePages) {
      const pageXml = extractPage(sheetXml, 1)
      let append = ''
      for (let p = templatePages; p < neededPages; p++) {
        append += shiftRows(pageXml, p * PAGE_ROWS)
      }
      sheetXml = sheetXml.replace('</sheetData>', append + '</sheetData>')

      // Clone merged cells for these pages too
      const mgXml = extractMergesInRange(pageXml, 1, PAGE_ROWS)
      if (mgXml && sheetXml.includes('</mergeCells>')) {
        let shifted = ''
        for (let p = templatePages; p < neededPages; p++) {
          shifted += shiftRows(mgXml, p * PAGE_ROWS)
        }
        sheetXml = sheetXml.replace('</mergeCells>', shifted + '</mergeCells>')
      }
    }

    // ===== 填充数据 =====
    for (let page = 0; page < TOTAL_PAGES; page++) {
      const base = page * PAGE_ROWS + 1
      const active = page < neededPages
      const pp = active ? persons.slice(page * PAGE_SIZE, Math.min((page + 1) * PAGE_SIZE, persons.length)) : []

      // Title
      sheetXml = setCell(sheetXml, 'A' + base, active ? titleStr : null)

      // Date row (row base+2) — text (inlineStr), row height ht="24" from template
      for (let d = 1; d <= 31; d++) {
        sheetXml = setCell(sheetXml, COL(4 + d) + (base + 2), (active && d <= daysInMonth) ? String(d) : null)
      }

      // Person rows
      for (let pi = 0; pi < PAGE_SIZE; pi++) {
        const r1 = base + 3 + pi * 2
        const r2 = r1 + 1

        // Clear all date cells first
        for (let d = 1; d <= 31; d++) {
          sheetXml = setCell(sheetXml, COL(4 + d) + r1, null)
          sheetXml = setCell(sheetXml, COL(4 + d) + r2, null)
        }

        if (pi < pp.length) {
          const p = pp[pi]
          const pr = amap[p.id] || {}

          sheetXml = setCell(sheetXml, 'A' + r1, page * PAGE_SIZE + pi + 1)
          sheetXml = setCell(sheetXml, 'B' + r1, p.name)
          sheetXml = setCell(sheetXml, 'C' + r1, mapPosition(p.position) || '')
          sheetXml = setCell(sheetXml, 'D' + r1, '出勤')

          sheetXml = setCell(sheetXml, 'A' + r2, null)
          sheetXml = setCell(sheetXml, 'B' + r2, p.id_card || '')
          sheetXml = setCell(sheetXml, 'C' + r2, null)
          sheetXml = setCell(sheetXml, 'D' + r2, '备注')

          if (active) {
            for (let d = 1; d <= daysInMonth; d++) {
              const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const h = Number(pr[ds]) || 0
              if (h > 0) {
                if (h <= 9) {
                  sheetXml = setCell(sheetXml, COL(4 + d) + r1, h)
                } else {
                  sheetXml = setCell(sheetXml, COL(4 + d) + r1, 9)
                  sheetXml = setCell(sheetXml, COL(4 + d) + r2, Number((Math.round((h - 9) * 10) / 10).toFixed(1)))
                }
              }
            }

            const eC = COL(5)
            const aC = COL(4 + daysInMonth)
            const ajC = COL(36)
            sheetXml = setFormula(sheetXml, 'AJ' + r1, `SUM(${eC}${r1}:${aC}${r1})`)
            sheetXml = setFormula(sheetXml, 'AJ' + r2, `SUM(${eC}${r2}:${aC}${r2})`)
            sheetXml = setFormula(sheetXml, 'AK' + r1, `ROUND((${ajC}${r1}+${ajC}${r2})/9,2)`)
          } else {
            sheetXml = setCell(sheetXml, 'AJ' + r1, null)
            sheetXml = setCell(sheetXml, 'AJ' + r2, null)
            sheetXml = setCell(sheetXml, 'AK' + r1, null)
          }
        } else {
          // Empty
          sheetXml = setCell(sheetXml, 'A' + r1, null)
          sheetXml = setCell(sheetXml, 'B' + r1, null)
          sheetXml = setCell(sheetXml, 'C' + r1, null)
          sheetXml = setCell(sheetXml, 'D' + r1, null)
          sheetXml = setCell(sheetXml, 'A' + r2, null)
          sheetXml = setCell(sheetXml, 'B' + r2, null)
          sheetXml = setCell(sheetXml, 'C' + r2, null)
          sheetXml = setCell(sheetXml, 'D' + r2, null)
          sheetXml = setCell(sheetXml, 'AJ' + r1, null)
          sheetXml = setCell(sheetXml, 'AJ' + r2, null)
          sheetXml = setCell(sheetXml, 'AK' + r1, null)
        }
      }
    }

    zip.file(sheetName, sheetXml)

    const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    event.node.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const fileName = `${y}年${m}月份农民工考勤表、工资表-业主一式2份.xlsx`
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    event.node.res.end(outBuffer)
    return null
  } catch (error: any) {
    console.error('Export owner attendance error:', error)
    return { success: false, message: error.message }
  }
})

// Extract rows + merges for one page
function extractPage(xml: string, page: number): string {
  const start = (page - 1) * PAGE_ROWS + 1
  const end = page * PAGE_ROWS
  const parts: string[] = []
  for (let r = start; r <= end; r++) {
    const re = new RegExp(`<row r="${r}"[^>]*>[\\s\\S]*?<\\/row>`, 's')
    const m = xml.match(re)
    if (m) parts.push(m[0])
  }
  // Also collect mergeCells in range
  const mgRe = /<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g
  let mm
  while ((mm = mgRe.exec(xml)) !== null) {
    const r1 = parseInt(mm![2]!)
    const r2 = parseInt(mm![4]!)
    if (r1 >= start && r2 <= end) parts.push(mm[0])
  }
  return parts.join('')
}

function extractMergesInRange(xml: string, start: number, count: number): string {
  const end = start + count - 1
  const parts: string[] = []
  const re = /<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const r1 = parseInt(m![2]!)
    const r2 = parseInt(m![4]!)
    if (r1 >= start && r2 <= end) parts.push(m[0])
  }
  return parts.join('')
}

function shiftRows(xml: string, offset: number): string {
  return xml
    .replace(/ r="(\d+)"/g, (_, n) => ` r="${parseInt(n) + offset}"`)
    .replace(/<c r="([A-Z]+)(\d+)"/g, (_, col, n) => `<c r="${col}${parseInt(n) + offset}"`)
    .replace(/ ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g,
      (_, c1, n1, c2, n2) => ` ref="${c1}${parseInt(n1) + offset}:${c2}${parseInt(n2) + offset}"`)
    .replace(/<f[^>]*>([\s\S]*?)<\/f>/g, (fBody) => {
      return fBody.replace(/([A-Z]+)(\d+)/g, (_2, c, n) => c + (parseInt(n) + offset))
    })
}
