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
function mapPosition(pos: string, name?: string): string {
  // 硬编码：张索石导出的职位固定为“架设”
  if (name === '张索石') return '架设'
  const map: Record<string, string> = {
    '管理': '工程管理',
    '架工': '架设',
  }
  return map[pos] || pos
}

function matchCell(xml: string, ref: string): string | null {
  const scRe = new RegExp(`<c r="${ref}"[^/>]*/>`, 's')
  const scMatch = xml.match(scRe)
  if (scMatch) return scMatch[0]
  const re = new RegExp(`<c r="${ref}"[^>]*>[\\s\\S]*?<\\/c>`, 's')
  const match = xml.match(re)
  return match ? match[0] : null
}

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
    newTag = `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escXml(String(value))}</t></is></c>`
  }
  return xml.replace(oldTag, newTag)
}

function setCellFormula(xml: string, ref: string, formula: string): string {
  const oldTag = matchCell(xml, ref)
  if (!oldTag) return xml
  const sMatch = oldTag.match(/\ss="(\d+)"/)
  const styleAttr = sMatch ? ` s="${sMatch[1]}"` : ''
  const newTag = `<c r="${ref}"${styleAttr}><f>${escXml(formula)}</f></c>`
  return xml.replace(oldTag, newTag)
}

// GET /api/attendance-export-proxy?year=2026&month=6
export default defineEventHandler(async (event) => {
  try {
    const { year, month } = getQuery(event) as { year?: string; month?: string }
    if (!year || !month) return { success: false, message: '缺少年月参数' }

    const y = Number(year)
    const m = Number(month)
    const daysInMonth = new Date(y, m, 0).getDate()
    const titleStr = `兴润建设集团有限公司-中煤榆林煤炭深加工基地工程项目部-${y}年${m}月打卡考勤表`

    // ===== 查询 =====
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    const records = await query(
      `SELECT person_id, attendance_date, CASE WHEN hours > 0 THEN hours ELSE manual_hours END AS hours FROM attendance WHERE attendance_date >= ? AND attendance_date < ? ORDER BY punch_seq IS NULL, punch_seq, id`,
      [startDate, endDate]
    ) as any[]

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
      persons = await query(
        `SELECT id, name, id_card, position FROM person WHERE id IN (${personIds.map(() => '?').join(',')})`,
        personIds
      ) as any[]
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

    // 查询 salary_compare（按考勤表人员顺序）
    let salaryRecords: any[] = []
    if (personIds.length > 0) {
      const allSalaryRecords = await query(
        `SELECT sc.person_id, sc.work_days, sc.daily_salary, sc.net_salary,
                p.name, p.id_card, p.phone, p.position, p.bank_name, p.bank_num, p.bank_code
         FROM salary_compare sc
         JOIN person p ON sc.person_id = p.id
         WHERE sc.year = ? AND sc.month = ?`,
        [y, m]
      ) as any[]
      const sm = new Map(allSalaryRecords.map(r => [r.person_id, r]))
      salaryRecords = personIds.map(id => sm.get(id)).filter(Boolean) as any[]
    }

    // ===== 使用代发模板作为基础 =====
    const templatePath = path.resolve(process.cwd(), 'template', '代发工资表模板.xlsx')
    if (!fs.existsSync(templatePath)) return { success: false, message: '代发模板文件不存在' }

    const tmplBuf = fs.readFileSync(templatePath)
    const zip = await JSZip.loadAsync(tmplBuf)

    // ===== Sheet1: 考勤表 =====
    const sheetName = 'xl/worksheets/sheet1.xml'
    const raw = await zip.file(sheetName)!.async('nodebuffer') as Buffer
    let sheetXml = raw.toString('utf-8')
    if (!sheetXml) return { success: false, message: '模板中未找到考勤表' }

    const neededPages = Math.max(1, Math.ceil(persons.length / PAGE_SIZE))

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
      const mgXml = extractMergesInRange(pageXml, 1, PAGE_ROWS)
      if (mgXml && sheetXml.includes('</mergeCells>')) {
        let shifted = ''
        for (let p = templatePages; p < neededPages; p++) {
          shifted += shiftRows(mgXml, p * PAGE_ROWS)
        }
        sheetXml = sheetXml.replace('</mergeCells>', shifted + '</mergeCells>')
      }
    }

    // 填充考勤表数据
    for (let page = 0; page < TOTAL_PAGES; page++) {
      const base = page * PAGE_ROWS + 1
      const active = page < neededPages
      const pp = active ? persons.slice(page * PAGE_SIZE, Math.min((page + 1) * PAGE_SIZE, persons.length)) : []

      // Title
      sheetXml = setCell(sheetXml, 'A' + base, active ? titleStr : null)

      // Date row
      for (let d = 1; d <= 31; d++) {
        sheetXml = setCell(sheetXml, COL(4 + d) + (base + 2), (active && d <= daysInMonth) ? String(d) : null)
      }

      // Person rows
      for (let pi = 0; pi < PAGE_SIZE; pi++) {
        const r1 = base + 3 + pi * 2
        const r2 = r1 + 1

        for (let d = 1; d <= 31; d++) {
          sheetXml = setCell(sheetXml, COL(4 + d) + r1, null)
          sheetXml = setCell(sheetXml, COL(4 + d) + r2, null)
        }

        if (pi < pp.length) {
          const p = pp[pi]
          const pr = amap[p.id] || {}

          sheetXml = setCell(sheetXml, 'A' + r1, page * PAGE_SIZE + pi + 1)
          sheetXml = setCell(sheetXml, 'B' + r1, p.name)
          sheetXml = setCell(sheetXml, 'C' + r1, mapPosition(p.position, p.name) || '')
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
            sheetXml = setCellFormula(sheetXml, 'AJ' + r1, `SUM(${eC}${r1}:${aC}${r1})`)
            sheetXml = setCellFormula(sheetXml, 'AJ' + r2, `SUM(${eC}${r2}:${aC}${r2})`)
            sheetXml = setCellFormula(sheetXml, 'AK' + r1, `ROUND((${ajC}${r1}+${ajC}${r2})/9,2)`)
          } else {
            sheetXml = setCell(sheetXml, 'AJ' + r1, null)
            sheetXml = setCell(sheetXml, 'AJ' + r2, null)
            sheetXml = setCell(sheetXml, 'AK' + r1, null)
          }
        } else {
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

    // ===== Sheet2: 工资表 =====
    const salarySheetName = 'xl/worksheets/sheet2.xml'
    const salarySheetFile = zip.file(salarySheetName)
    if (salarySheetFile && salaryRecords.length > 0) {
      const salaryRaw = await salarySheetFile.async('nodebuffer') as Buffer
      let salaryXml = salaryRaw.toString('utf-8')

      // 更新标题
      salaryXml = setCell(salaryXml, 'A1', `${y}年${m}月农民工工资委托支付确认表`)

      // 日期: 当月最后一天
      const lastDate = new Date(y, m, 0).getDate()
      const targetDate = new Date(y, m - 1, lastDate)
      const excelEpoch = new Date(1900, 0, 1)
      const daysDiff = Math.floor((targetDate.getTime() - excelEpoch.getTime()) / 86400000)
      const excelSerial = daysDiff + 2
      salaryXml = setCell(salaryXml, 'L2', excelSerial)

      // 提取模板行：Row4=数据行, Row5=合计行, Row6=签字行, Row7=空行
      const row4Match = salaryXml.match(/<row r="4"[^>]*>[\s\S]*?<\/row>/s)
      const row5Match = salaryXml.match(/<row r="5"[^>]*>[\s\S]*?<\/row>/s)
      const row6Match = salaryXml.match(/<row r="6"[^>]*>[\s\S]*?<\/row>/s)
      const row7Match = salaryXml.match(/<row r="7"[^>]*>[\s\S]*?<\/row>/s)

      const row4Template = row4Match ? row4Match[0] : ''
      const row5Template = row5Match ? row5Match[0] : ''
      const row6Template = row6Match ? row6Match[0] : ''
      const row7Template = row7Match ? row7Match[0] : ''

      // 提取前3行表头
      const headerMatch = salaryXml.match(/<row r="[123]"[^>]*>[\s\S]*?<\/row>/sg)
      let headerXml = headerMatch ? headerMatch.join('') : ''

      // 删除原有第4-7行
      for (let r = 4; r <= 7; r++) {
        const re = new RegExp(`<row r="${r}"[^>]*>[\\s\\S]*?<\\/row>`, 's')
        salaryXml = salaryXml.replace(re, '')
      }

      let dataRowsXml = ''
      let currentRowNum = 4

      // 填充数据行
      for (let i = 0; i < salaryRecords.length; i++) {
        const record = salaryRecords[i]
        if (!record) continue

        const workDays = Number(record.work_days) || 0
        const dailySalary = Number(record.daily_salary) || 0
        const netSalary = Number(record.net_salary) || 0

        if (row4Template) {
          let newRow = row4Template
            .replace(/ r="4"/, ` r="${currentRowNum}"`)
            .replace(/<c r="([A-Z]+)4"/g, (_, col) => `<c r="${col}${currentRowNum}"`)
          newRow = setCell(newRow, `A${currentRowNum}`, i + 1)
          newRow = setCell(newRow, `B${currentRowNum}`, mapPosition(record.position, record.name) || '')
          newRow = setCell(newRow, `C${currentRowNum}`, record.name || '')
          newRow = setCell(newRow, `D${currentRowNum}`, record.id_card || '')
          newRow = setCell(newRow, `E${currentRowNum}`, record.phone || '')
          newRow = setCell(newRow, `F${currentRowNum}`, record.bank_name || '')
          newRow = setCell(newRow, `G${currentRowNum}`, record.bank_num || '')
          newRow = setCell(newRow, `H${currentRowNum}`, record.bank_code || '')
          newRow = setCell(newRow, `I${currentRowNum}`, workDays)
          newRow = setCell(newRow, `J${currentRowNum}`, null)
          newRow = setCell(newRow, `K${currentRowNum}`, dailySalary)
          newRow = setCell(newRow, `L${currentRowNum}`, netSalary)
          newRow = setCell(newRow, `M${currentRowNum}`, null)
          newRow = setCell(newRow, `N${currentRowNum}`, null)
          // 保持 O 列样式
          dataRowsXml += newRow
        }
        currentRowNum++
      }

      // 合计行：使用模板的合计行（保留其所有样式），仅修改 I 和 L 的 SUM 公式
      const lastDataRow = currentRowNum - 1
      if (row5Template) {
        let totalRow = row5Template
          .replace(/ r="5"/, ` r="${currentRowNum}"`)
          .replace(/<c r="([A-Z]+)5"/g, (_, col) => `<c r="${col}${currentRowNum}"`)
        totalRow = setCellFormula(totalRow, `I${currentRowNum}`, `SUM(I4:I${lastDataRow})`)
        totalRow = setCellFormula(totalRow, `L${currentRowNum}`, `SUM(L4:L${lastDataRow})`)
        dataRowsXml += totalRow
      }
      currentRowNum++

      // 签字行 (Row 6)
      if (row6Template) {
        let signRow = row6Template
          .replace(/ r="6"/, ` r="${currentRowNum}"`)
          .replace(/<c r="([A-Z]+)6"/g, (_, col) => `<c r="${col}${currentRowNum}"`)
        dataRowsXml += signRow
      }
      currentRowNum++

      // 空行 (Row 7)
      if (row7Template) {
        let extraRow = row7Template
          .replace(/ r="7"/, ` r="${currentRowNum}"`)
          .replace(/<c r="([A-Z]+)7"/g, (_, col) => `<c r="${col}${currentRowNum}"`)
        dataRowsXml += extraRow
      }

      // 重建 sheetData，保留原有的 mergeCells
      salaryXml = salaryXml.replace(
        /<sheetData>[\s\S]*<\/sheetData>/,
        `<sheetData>${headerXml}${dataRowsXml}</sheetData>`
      )

      zip.file(salarySheetName, salaryXml)
    }

    // ===== 自动计算公式 =====
    const workbookFile = zip.file('xl/workbook.xml')
    if (workbookFile) {
      const workbookXml = await workbookFile.async('string')
      const updatedXml = workbookXml.replace(/<calcPr([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>')
      zip.file('xl/workbook.xml', updatedXml)
    }

    const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    event.node.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const fileName = `${y}年${m}月份农民工考勤表、工资表-架设队.xlsx`
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    event.node.res.end(outBuffer)
    return null
  } catch (error: any) {
    console.error('Export proxy attendance error:', error)
    return { success: false, message: error.message }
  }
})

function extractPage(xml: string, page: number): string {
  const start = (page - 1) * PAGE_ROWS + 1
  const end = page * PAGE_ROWS
  const parts: string[] = []
  for (let r = start; r <= end; r++) {
    const re = new RegExp(`<row r="${r}"[^>]*>[\\s\\S]*?<\\/row>`, 's')
    const m = xml.match(re)
    if (m) parts.push(m[0])
  }
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
