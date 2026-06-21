import { query } from '../utils/db'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

// POST /api/attendance-import - 导入初始考勤（Excel 文件上传）
export default defineEventHandler(async (event) => {
  try {

    // 读取上传的文件
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      return { success: false, message: '请上传文件' }
    }

    const file = formData[0]!
    if (!file || !file.data) {
      return { success: false, message: '文件内容为空' }
    }

    const fileName = file.filename || ''

    // 解析 Excel 文件（codepage 936 = GBK 简体中文）
    const workbook = XLSX.read(file.data, { type: 'buffer', codepage: 936 })
    const sheetName = workbook.SheetNames[0] // 使用第一个 sheet（考勤表）
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return { success: false, message: '考勤表 sheet 不存在' }
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    if (data.length < 4) {
      return { success: false, message: '考勤表格式不正确，至少需要4行数据' }
    }

    // 从标题行解析年月
    const title = String(data[0]?.[0] || '')
    let yearMonthMatch = title.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
    
    // 如果标题解析失败，尝试从文件名解析
    if (!yearMonthMatch && fileName) {
      yearMonthMatch = fileName.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
    }
    
    if (!yearMonthMatch) {
      return { 
        success: false, 
        message: `无法从标题"${title.slice(0, 20)}"或文件名"${fileName}"中识别考勤年月，请确认格式为"2026年5月考勤"`,
        title: title.slice(0, 30)
      }
    }
    const match = yearMonthMatch!
    const year = parseInt(match[1]!)
    const month = parseInt(match[2]!)

    // 表头在第4行（索引3），确认列结构
    const headers = data[3] as string[]
    // 列: 0=工种, 1=姓名, 2=身份证, 3-33=1日到31日, 34=合计, 35=签字确认

    const results: { name: string; idCard: string; days: number; hours: number; success: boolean; error?: string }[] = []
    let imported = 0
    let errors = 0

    // 从第5行开始解析数据（索引4）
    for (let i = 4; i < data.length; i++) {
      const row = data[i]!
      if (!row) continue
      // 跳过空行、合计行、制表人行
      const firstCell = String(row[0] || '').trim()
      if (firstCell === '合计' || firstCell === '制表人：' || firstCell === '制表人') break

      const name = String(row[1] || '').trim()
      const idCard = String(row[2] || '').trim()

      if (!name || !idCard) continue

      // 查找人员（按身份证号）
      const personRows = await query('SELECT id, name FROM person WHERE id_card = ?', [idCard]) as any[]
      if (personRows.length === 0) {
        results.push({ name, idCard, days: 0, hours: 0, success: false, error: '系统中未找到该人员' })
        errors++
        continue
      }

      const person = personRows[0]
      let personDays = 0
      let personHours = 0
      let recordCount = 0

      // 解析每天的工时（列索引3到33，对应1日到31日）
      const daysInMonth = new Date(year, month, 0).getDate()
      for (let d = 0; d < daysInMonth; d++) {
        const colIndex = 3 + d
        const cellValue = row[colIndex]
        const hours = parseFloat(cellValue)

        if (isNaN(hours) || hours <= 0) continue

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`

        try {
          await query(
            `INSERT INTO attendance (person_id, attendance_date, hours) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE hours = VALUES(hours), updated_at = CURRENT_TIMESTAMP`,
            [person.id, dateStr, hours]
          )
          recordCount++
          personDays++
          personHours += hours
        } catch (e: any) {
          console.error(`导入失败: ${name} ${dateStr}`, e.message)
        }
      }

      if (recordCount > 0) {
        results.push({ name, idCard, days: personDays, hours: Math.round(personHours * 100) / 100, success: true })
        imported++
      } else {
        results.push({ name, idCard, days: 0, hours: 0, success: false, error: '该人员本月无考勤数据' })
        errors++
      }
    }

    // 解析工资表 sheet（如果存在）并存入数据库
    let salaryData: { idCard: string; name: string; workDays: number; dailySalary: number; netSalary: number }[] = []
    const salarySheetName = workbook.SheetNames[1] // 第二个 sheet 是工资表
    if (salarySheetName && workbook.Sheets[salarySheetName]) {
      const salarySheet = workbook.Sheets[salarySheetName]
      const salaryRows = XLSX.utils.sheet_to_json(salarySheet, { header: 1, defval: '' }) as any[][]
      // 工资表结构: row0=标题, row1=副标题, row2=表头, row3+=数据
      // col 2=姓名, col 3=身份证号, col 8=用工天数, col 10=每日工资(含奖金), col 11=税后工资金额
      for (let i = 3; i < salaryRows.length; i++) {
        const row = salaryRows[i]!
        if (!row) continue
        const name = String(row[2] || '').trim()
        const idCard = String(row[3] || '').trim()
        if (!name || !idCard) continue
        const workDays = parseFloat(String(row[8]).trim())
        const dailySalary = parseFloat(String(row[10]).trim())
        const netSalary = parseFloat(String(row[11]).trim())
        if (isNaN(workDays) || isNaN(dailySalary) || isNaN(netSalary)) continue
        salaryData.push({ idCard, name, workDays, dailySalary, netSalary })

        // 存入数据库
        try {
          const personRows = await query('SELECT id FROM person WHERE id_card = ?', [idCard]) as any[]
          if (personRows.length > 0) {
            await query(
              `INSERT INTO salary_compare (person_id, year, month, work_days, daily_salary, net_salary)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE work_days = VALUES(work_days), daily_salary = VALUES(daily_salary), net_salary = VALUES(net_salary), updated_at = CURRENT_TIMESTAMP`,
              [personRows[0].id, year, month, workDays, dailySalary, netSalary]
            )
          }
        } catch (e: any) {
          console.error(`工资表数据入库失败: ${name}`, e.message)
        }
      }
    }

    return {
      success: true,
      message: `${year}年${month}月考勤导入完成：成功 ${imported} 人，失败 ${errors} 人`,
      year,
      month,
      imported,
      errors,
      results,
      salaryData
    }
  } catch (error: any) {
    console.error('Import attendance error:', error)
    return { success: false, message: error.message }
  }
})