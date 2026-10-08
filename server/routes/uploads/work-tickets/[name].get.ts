import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { PDFDocument, PDFName } from 'pdf-lib'

// GET /uploads/work-tickets/:name?duplex=long|short - 访问已上传的作业票PDF
// duplex 参数：long=双面长边翻转 / short=双面短边翻转，
// 通过写入 PDF 的 ViewerPreferences.Duplex，让查看器打印时默认采用对应双面模式
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  const { duplex } = getQuery(event) as { duplex?: string }

  // 文件名安全校验（防路径穿越）
  if (!/^[\w.-]+\.pdf$/i.test(name) || name.includes('..')) {
    setResponseStatus(event, 400)
    return { success: false, message: '非法文件名' }
  }

  const filePath = join(process.cwd(), 'uploads', 'work-tickets', name)
  if (!existsSync(filePath)) {
    setResponseStatus(event, 404)
    return { success: false, message: '文件不存在' }
  }

  let buf: Uint8Array = readFileSync(filePath)

  // 按需注入双面打印偏好（JSA交底=短边 / 交底=长边）；失败时按原文件返回
  const duplexName = duplex === 'long' ? 'DuplexFlipLongEdge' : duplex === 'short' ? 'DuplexFlipShortEdge' : null
  if (duplexName) {
    try {
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
      pdfDoc.catalog.set(
        PDFName.of('ViewerPreferences'),
        pdfDoc.context.obj({ Duplex: PDFName.of(duplexName) })
      )
      buf = await pdfDoc.save()
    } catch (e) {
      console.error('注入PDF双面打印设置失败，按原文件返回:', e)
    }
  }

  const res = event.node.res
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`)
  res.setHeader('Content-Length', buf.length)
  res.end(buf)
})
