import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { generateOvertimeWord } from '../utils/generate-overtime-word'

const execFileAsync = promisify(execFile)

// 转换串行队列：Word COM 是单实例，并发转换会互相干扰导致 RPC 失败
let convertChain: Promise<unknown> = Promise.resolve()

// 用本机 Microsoft Word（COM 自动化）把 docx 转成 PDF，要求服务器已安装 Word
function runConvert(input: string, output: string): Promise<void> {
  const esc = (p: string) => p.replace(/'/g, "''")
  const script = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8', // 错误消息以 UTF-8 输出避免乱码
    '$ErrorActionPreference = "Stop"',
    // 记录启动前的 Word 进程：结束后只清理本次新启动的实例，不影响用户自己打开的 Word
    '$before = @(Get-Process winword -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })',
    '$word = $null',
    'try {',
    '  $word = New-Object -ComObject Word.Application',
    '  $word.Visible = $false',
    '  $word.DisplayAlerts = 0',
    '  $word.AutomationSecurity = 3', // 禁用宏，避免安全提示对话框挂起
    `  $doc = $word.Documents.Open('${esc(input)}', $false, $true)`,
    `  $doc.SaveAs2('${esc(output)}', 17)`, // 17 = wdFormatPDF
    `  if (-not (Test-Path '${esc(output)}')) { throw 'PDF 文件未生成' }`,
    '} finally {',
    '  $newPids = @(Get-Process winword -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }) | Where-Object { $before -notcontains $_ }',
    '  if ($word -ne $null) {',
    '    try { $doc.Close($false) } catch {}',
    '    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null } catch {}',
    // 仅当本次启动了新 Word 实例才退出，防止误关用户已打开的 Word
    '    if ($newPids.Count -gt 0) { try { $word.Quit() } catch {} }',
    '    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}',
    '  }',
    // Quit 失败（RPC 错误）时强制结束本次启动的实例，避免僵尸 Word 影响后续转换
    '  foreach ($wp in $newPids) { try { Stop-Process -Id $wp -Force -ErrorAction SilentlyContinue } catch {} }',
    '}',
  ].join('\n')
  return execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { timeout: 90000, windowsHide: true, maxBuffer: 1024 * 1024 }
  ).then(() => {})
}

// 排队执行转换（同一时间只有一个 Word COM 转换在运行）
function convertDocxToPdf(input: string, output: string): Promise<void> {
  const task = convertChain.then(() => runConvert(input, output))
  convertChain = task.catch(() => {})
  return task
}

// POST /export-word-pdf - 生成加班申请表 docx 后用本机 Word 转成 PDF 返回（供浏览器打印）
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const buf = generateOvertimeWord(body)

    // 写临时 docx → Word 转 PDF → 读取返回
    const tmpDir = join(process.cwd(), 'uploads', 'tmp')
    mkdirSync(tmpDir, { recursive: true })
    const base = `ot-word-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const docxPath = join(tmpDir, `${base}.docx`)
    const pdfPath = join(tmpDir, `${base}.pdf`)
    writeFileSync(docxPath, buf)

    try {
      // RPC 失败(0x800706BE)有时是 Word 瞬时状态导致，失败后清理残留并重试一次
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          // 重试前清掉残留 PDF，稍等让上一次的 Word 进程完全退出
          try { unlinkSync(pdfPath) } catch {}
          await new Promise(r => setTimeout(r, 1200))
        }
        try {
          await convertDocxToPdf(docxPath, pdfPath)
        } catch (e) {
          if (attempt === 0) {
            console.warn('Word 转 PDF 失败，重试一次:', e)
            continue
          }
          throw e
        }
        if (existsSync(pdfPath)) break
      }

      if (!existsSync(pdfPath)) {
        throw new Error('PDF 生成失败，请确认本机已安装 Microsoft Word 且没有打开的 Word 对话框')
      }
      const pdfBuf = readFileSync(pdfPath)

      const res = event.node.res
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${base}.pdf"`)
      res.setHeader('Content-Length', pdfBuf.length)
      res.end(pdfBuf)
    } finally {
      // 清理临时文件
      try { unlinkSync(docxPath) } catch {}
      try { unlinkSync(pdfPath) } catch {}
    }
  } catch (error: any) {
    console.error('Export word pdf error:', error)
    setResponseStatus(event, 500)
    return { success: false, message: error.message || '转换失败（需本机已安装 Microsoft Word）' }
  }
})
