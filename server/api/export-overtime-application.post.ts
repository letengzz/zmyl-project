import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import ExcelJS from 'exceljs'

// POST /api/export-overtime-application
// Body: { date, entries: [{ location, startTime, endTime, workContent, persons: string[] }] }
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as {
      date: string
      entries: Array<{
        location: number
        startTime: string
        endTime: string
        workLocation: string
        workContent: string
        persons: string[]
      }>
    }

    const { date, entries } = body

    if (!date || !entries?.length) {
      return { success: false, message: '缺少必要参数' }
    }

    const templatePath = join(process.cwd(), 'template', '加班申请表.xlsx')
    if (!existsSync(templatePath)) {
      return { success: false, message: '模板文件不存在' }
    }

    const fileBuf = readFileSync(templatePath) as unknown as ArrayBuffer
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(fileBuf)

    const ws = wb.getWorksheet('Sheet2')
    if (!ws) {
      return { success: false, message: '模板格式错误' }
    }

    // 保存模板行（第3行）的样式信息
    const templateRow = ws.getRow(3)
    const templateCells: Array<{ value: any; style: any; font: any; alignment: any; border: any }> = []
    for (let c = 1; c <= 7; c++) {
      const cell = templateRow.getCell(c)
      templateCells.push({
        value: cell.value,
        style: { ...cell.style },
        font: { ...cell.font },
        alignment: { ...cell.alignment },
        border: cell.border ? { ...cell.border } : undefined
      })
    }

    // 保存管控措施文本（E列固定内容）
    const controlText = templateCells[4]?.value || ''

    const locationMap: Record<number, string> = {
      1: '液体储运',
      2: '烯烃分离项目组'
    }

    // 收集需要写入的数据行
    const dataRows: Array<{
      no: string
      location: string
      work: string
      workerSum: string
      control: string
      time: string
    }> = []

    entries.forEach((entry, index) => {
      if (!entry.persons || entry.persons.length === 0) return

      const workerNames = entry.persons.slice(0, 11).join(',')
      const sum = entry.persons.length
      const timeStr = `${entry.startTime}-${entry.endTime}`

      dataRows.push({
        no: String(index + 1),
        location: locationMap[entry.location] || '',
        work: `${entry.workLocation || ''}${entry.workLocation && entry.workContent ? ' ' : ''}${entry.workContent || ''}`,
        workerSum: `${workerNames}等共计${sum}人`,
        control: String(controlText),
        time: `预计${timeStr}`
      })
    })

    if (dataRows.length === 0) {
      return { success: false, message: '没有可导出的人员' }
    }

    // 清除模板行原有合并
    ws.unMergeCells('F3:G3')

    // 写入第一行数据到第3行
    const firstRow = dataRows[0]!
    writeDataRow(ws, 3, firstRow)
    ws.mergeCells(`F3:G3`)

    // 如果有更多行，插入新行
    for (let i = 1; i < dataRows.length; i++) {
      const rowNum = 3 + i
      // 插入新行并复制样式
      ws.insertRow(rowNum, [])
      // 写入数据
      writeDataRow(ws, rowNum, dataRows[i]!)
      // 复制模板行样式
      for (let c = 1; c <= 7; c++) {
        const srcCell = templateCells[c - 1]!
        const destCell = ws.getRow(rowNum).getCell(c)
        destCell.style = { ...srcCell.style }
        destCell.font = { ...srcCell.font }
        destCell.alignment = { ...srcCell.alignment }
        if (srcCell.border) destCell.border = { ...srcCell.border }
      }
      ws.mergeCells(`F${rowNum}:G${rowNum}`)
    }

    // 生成文件
    const buf = await wb.xlsx.writeBuffer() as unknown as Buffer

    // 生成文件名
    const [, month, day] = date.split('-').map(Number)
    const fileName = `架设队${month}月${day}日加班申请表.xlsx`

    const res = event.node.res
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.setHeader('Content-Length', buf.length)
    res.end(buf)
  } catch (error: any) {
    console.error('Export overtime application error:', error)
    setResponseStatus(event, 500)
    return { success: false, message: error.message }
  }
})

function writeDataRow(ws: ExcelJS.Worksheet, rowNum: number, data: {
  no: string; location: string; work: string; workerSum: string; control: string; time: string
}) {
  const row = ws.getRow(rowNum)
  row.getCell(1).value = data.no
  row.getCell(2).value = data.location
  row.getCell(3).value = data.work
  row.getCell(4).value = data.workerSum
  row.getCell(5).value = data.control
  row.getCell(6).value = data.time
  row.getCell(7).value = ''
}
