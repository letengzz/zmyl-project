import { query } from '../utils/db'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

// POST /api/work-ticket-upload-pdf - 上传作业票PDF（multipart/form-data）
// 字段：id（作业票ID）、type（height-jsa=高处JSA交底 / height-analysis=高处交底 /
//       scaffold-jsa=脚手架JSA交底 / scaffold-analysis=脚手架交底 /
//       confined-jsa=受限空间JSA交底 / confined-analysis=受限空间交底）、file（PDF文件）
const PDF_COLUMNS: Record<string, string> = {
  'height-jsa': 'height_jsa_pdf',
  'height-analysis': 'height_analysis_pdf',
  'scaffold-jsa': 'scaffold_jsa_pdf',
  'scaffold-analysis': 'scaffold_analysis_pdf',
  'confined-jsa': 'confined_jsa_pdf',
  'confined-analysis': 'confined_analysis_pdf'
}

export default defineEventHandler(async (event) => {
  try {
    const parts = await readMultipartFormData(event)
    if (!parts) {
      return { success: false, message: '请求格式错误' }
    }
    const getField = (name: string) => parts.find(p => p.name === name)
    const id = Number(getField('id')?.data.toString())
    const type = getField('type')?.data.toString()
    const file = getField('file')

    const column = type ? PDF_COLUMNS[type] : undefined
    if (!id || !column) {
      return { success: false, message: '参数错误' }
    }
    if (!file || !file.data || !file.filename) {
      return { success: false, message: '请选择要上传的PDF文件' }
    }
    const isPdf = file.type === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return { success: false, message: '仅支持 PDF 文件' }
    }

    // 确认作业票存在并取出旧文件路径
    const rows = await query(
      'SELECT id, height_jsa_pdf, height_analysis_pdf, scaffold_jsa_pdf, scaffold_analysis_pdf, confined_jsa_pdf, confined_analysis_pdf FROM work_ticket WHERE id = ? AND is_deleted = 0',
      [id]
    ) as any[]
    if (rows.length === 0) {
      return { success: false, message: '作业票不存在' }
    }

    // 保存文件（文件名由服务端生成，避免中文名与路径安全问题）
    const dir = join(process.cwd(), 'uploads', 'work-tickets')
    await mkdir(dir, { recursive: true })
    const fileName = `ticket-${id}-${type}-${Date.now()}.pdf`
    await writeFile(join(dir, fileName), file.data)

    const publicPath = `/uploads/work-tickets/${fileName}`
    await query(`UPDATE work_ticket SET ${column} = ? WHERE id = ?`, [publicPath, id])

    // 删除旧文件（若有）
    const oldPath = rows[0][column] as string | null
    if (oldPath && oldPath !== publicPath) {
      const oldName = oldPath.split('/').pop()
      if (oldName && /^[\w.-]+$/.test(oldName)) {
        await unlink(join(dir, oldName)).catch(() => {})
      }
    }

    return { success: true, message: '上传成功', path: publicPath }
  } catch (error: any) {
    console.error('上传作业票PDF失败:', error)
    return { success: false, message: error.message }
  }
})
