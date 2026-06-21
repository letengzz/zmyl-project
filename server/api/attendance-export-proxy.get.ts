import { query } from '../utils/db'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

// GET /api/attendance-export-proxy?year=2026&month=6
export default defineEventHandler(async (event) => {
  try {
    const { year, month } = getQuery(event) as { year?: string; month?: string }
    
    if (!year || !month) {
      return { success: false, message: '缺少年月参数' }
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1
    const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year)
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    // 获取所有在职人员（按 order 排序）
    const persons = await query(
      'SELECT id, name, attendance_salary, actual_salary FROM person WHERE is_resign = 0 ORDER BY `order` IS NULL, `order`, id'
    ) as any[]

    // 获取该月所有考勤记录
    const records = await query(
      'SELECT person_id, attendance_date, hours FROM attendance WHERE attendance_date >= ? AND attendance_date < ? ORDER BY attendance_date',
      [startDate, endDate]
    ) as any[]

    // 构建人员->日期->工时映射
    const attendanceMap: Record<number, Record<string, number>> = {}
    for (const r of records) {
      if (!attendanceMap[r.person_id]) attendanceMap[r.person_id] = {}
      const personMap = attendanceMap[r.person_id]
      if (personMap) personMap[r.attendance_date] = r.hours
    }

    const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
    const dates: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }

    // 代发考勤表：包含姓名、正常工时(≤9h)、加班工时(>9h部分)、合计
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ text: '姓名', alignment: AlignmentType.CENTER })], width: { size: 1200, type: WidthType.DXA } }),
        ...dates.map(d => new TableCell({
          children: [
            new Paragraph({ text: d.split('-')[2], alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '正常/加班', alignment: AlignmentType.CENTER })
          ],
          width: { size: 800, type: WidthType.DXA }
        })),
        new TableCell({ children: [new Paragraph({ text: '正常合计', alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ text: '加班合计', alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ text: '总合计', alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
      ]
    })

    const dataRows = persons.map((p: any) => {
      const personRecords = attendanceMap[p.id] || {}
      let totalNormal = 0
      let totalOvertime = 0
      let totalAll = 0

      const dateCells = dates.map(d => {
        const h = Number(personRecords[d] || 0)
        const normal = Math.min(h, 9)
        const overtime = Math.max(0, h - 9)
        totalNormal += normal
        totalOvertime += overtime
        totalAll += h
        return new TableCell({
          children: [new Paragraph({
            text: h > 0 ? `正${normal}/加${overtime}` : '',
            alignment: AlignmentType.CENTER
          })],
          width: { size: 800, type: WidthType.DXA }
        })
      })

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: p.name })], width: { size: 1200, type: WidthType.DXA } }),
          ...dateCells,
          new TableCell({ children: [new Paragraph({ text: String(totalNormal), alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ text: String(totalOvertime), alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ text: String(totalAll), alignment: AlignmentType.CENTER })], width: { size: 800, type: WidthType.DXA } }),
        ]
      })
    })

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    })

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `${year}年${month}月考勤表（代发）`,
            heading: 'Heading1',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          table
        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    event.node.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="代发考勤_${year}${String(month).padStart(2, '0')}.docx"`)
    
    return buffer
  } catch (error: any) {
    console.error('Export proxy attendance error:', error)
    return { success: false, message: error.message }
  }
})