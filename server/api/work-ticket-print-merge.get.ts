import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { PDFDocument, PDFName } from 'pdf-lib'
import { query } from '../utils/db'

// GET /api/work-ticket-print-merge?ids=1,2,3&types=height-jsa,scaffold-jsa&duplex=long|short
// 将多张作业票的指定类型PDF按顺序合并为一个文件返回，供批量打印（一次打印对话框）
// ids   ：作业票ID列表（逗号分隔，合并顺序按传入顺序）
// types ：要包含的PDF类型（逗号分隔，白名单校验）
// duplex：可选，勾选类型双面模式一致时由前端传入，注入 ViewerPreferences.Duplex

const PDF_COLUMNS: Record<string, string> = {
  'height-jsa': 'height_jsa_pdf',
  'height-analysis': 'height_analysis_pdf',
  'scaffold-jsa': 'scaffold_jsa_pdf',
  'scaffold-analysis': 'scaffold_analysis_pdf',
  'confined-jsa': 'confined_jsa_pdf',
  'confined-analysis': 'confined_analysis_pdf'
}

// 每张票内部的PDF合并顺序（与前端 pdfSlots 一致）
const SLOT_ORDER = ['height-jsa', 'height-analysis', 'scaffold-jsa', 'scaffold-analysis', 'confined-jsa', 'confined-analysis']

export default defineEventHandler(async (event) => {
  const { ids: idsRaw, types: typesRaw, duplex } = getQuery(event) as Record<string, string | undefined>

  const ids = (idsRaw || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0)
    .slice(0, 100)
  const types = (typesRaw || '')
    .split(',')
    .map(s => s.trim())
    .filter(t => PDF_COLUMNS[t])

  if (!ids.length || !types.length) {
    setResponseStatus(event, 400)
    return { success: false, message: '参数错误：需要 ids 和 types' }
  }

  // 查询所选作业票的PDF路径
  const placeholders = ids.map(() => '?').join(',')
  const rows = await query(
    `SELECT id, height_jsa_pdf, height_analysis_pdf, scaffold_jsa_pdf, scaffold_analysis_pdf, confined_jsa_pdf, confined_analysis_pdf FROM work_ticket WHERE id IN (${placeholders})`,
    ids
  ) as any[]

  // 按传入 ids 的顺序排列
  const orderMap = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

  // 收集存在的PDF文件（每张票内部按 SLOT_ORDER 顺序）
  const dir = join(process.cwd(), 'uploads', 'work-tickets')
  const files: string[] = []
  for (const row of rows) {
    for (const t of SLOT_ORDER) {
      if (!types.includes(t)) continue
      const col = PDF_COLUMNS[t]
      if (!col) continue
      const p = row[col] as string | null
      if (!p) continue
      const filePath = join(dir, basename(p)) // basename 防路径穿越
      if (existsSync(filePath)) files.push(filePath)
    }
  }

  if (!files.length) {
    setResponseStatus(event, 404)
    return { success: false, message: '所选作业票没有已上传的对应PDF' }
  }

  // 合并PDF（单个文件损坏时跳过，不影响其余文件）
  const merged = await PDFDocument.create()
  for (const f of files) {
    try {
      const src = await PDFDocument.load(readFileSync(f), { ignoreEncryption: true })
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach(p => merged.addPage(p))
    } catch (e) {
      console.error('合并PDF时跳过损坏文件:', f, e)
    }
  }

  if (merged.getPageCount() === 0) {
    setResponseStatus(event, 500)
    return { success: false, message: 'PDF合并失败' }
  }

  // 双面模式一致时注入打印偏好（长边/短边由前端判断后传入）
  const duplexName = duplex === 'long' ? 'DuplexFlipLongEdge' : duplex === 'short' ? 'DuplexFlipShortEdge' : null
  if (duplexName) {
    merged.catalog.set(
      PDFName.of('ViewerPreferences'),
      merged.context.obj({ Duplex: PDFName.of(duplexName) })
    )
  }

  const buf = await merged.save()

  const res = event.node.res
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="batch-print-${Date.now()}.pdf"`)
  res.setHeader('Content-Length', buf.length)
  res.end(buf)
})
