import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as {
      date: string
      startTime: string
      endTime: string
      workLocation: string
      workContent: string
      persons: { name: string; position: string }[]
      location: number
    }

    const { date, startTime, endTime, workLocation, workContent, persons, location } = body

    if (!date || !persons?.length) {
      setResponseStatus(event, 400)
      return { success: false, message: '缺少必要参数' }
    }

    const templatePath = join(process.cwd(), 'template', '加班加点申请表(1).docx')
    if (!existsSync(templatePath)) {
      setResponseStatus(event, 404)
      return { success: false, message: '模板文件不存在' }
    }

    const templateContent = readFileSync(templatePath, 'binary')
    const zip = new PizZip(templateContent)

    const [year, month, day] = date.split('-').map(Number)
    const [sh = 0, sm = 0] = startTime.split(':').map(Number)
    const [eh = 0, em = 0] = endTime.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    const hours = endMin > startMin ? (endMin - startMin) / 60 : 0

    const positionOrder = ['管理', '架工', '普工', '监护人', '资料员']
    const groups: Record<string, string[]> = {}
    persons.forEach(p => {
      const pos = p.position || '其他'
      if (!groups[pos]) groups[pos] = []
      groups[pos].push(p.name)
    })

    const workerLines: string[] = []
    positionOrder.forEach(pos => {
      if (groups[pos]) {
        workerLines.push(`${pos}(${groups[pos].length}人):${groups[pos].join('，')}`)
      }
    })
    Object.keys(groups).forEach(pos => {
      if (!positionOrder.includes(pos)) {
        workerLines.push(`${pos}(${groups[pos]!.length}人):${groups[pos]!.join('，')}`)
      }
    })

    // Simple XML text replacement for hardcoded year
    const docXml = zip.file('word/document.xml')
    if (!docXml) {
      setResponseStatus(event, 500)
      return { success: false, message: '模板文件格式错误' }
    }
    let xml = docXml!.asText()
    xml = replaceInXmlSafe(xml, '2026', String(year))
    zip.file('word/document.xml', xml)

    // Use docxtemplater for placeholder filling
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    })

    doc.setData({
      month: String(month),
      day: String(day),
      start_time: startTime,
      end_time: endTime,
      hours: String(hours),
      work_content: workContent,
      work_location: workLocation,
      total: String(persons.length),
      worker: workerLines.join('\n'),
    })

    doc.render()

    // Insert blank paragraph between work time and work content paragraphs
    let renderedXml = zip.file('word/document.xml')!.asText()
    const goBackIdx = renderedXml.indexOf('_GoBack')
    if (goBackIdx !== -1) {
      // Find the closing </w:p> after _GoBack (end of work time paragraph)
      const closeP = renderedXml.indexOf('</w:p>', goBackIdx)
      if (closeP !== -1) {
        const insertPos = closeP + '</w:p>'.length
        const blankPara = '<w:p><w:pPr><w:spacing w:beforeLines="0" w:afterLines="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="楷体_GB2312" w:hAnsi="楷体_GB2312" w:eastAsia="楷体_GB2312"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>'
        renderedXml = renderedXml.substring(0, insertPos) + blankPara + renderedXml.substring(insertPos)
        zip.file('word/document.xml', renderedXml)
      }
    }

    const buf = zip.generate({ type: 'nodebuffer' })

    const dateStr = `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    const locationStr = location === 1 ? '一期' : '二期'
    const fileName = `${dateStr}-${locationStr}加班加点申请表(1).docx`

    // Send binary via node response - bypass Nuxt serialization
    const res = event.node.res
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.setHeader('Content-Length', buf.length)
    res.end(buf)
  } catch (error: any) {
    console.error('Export word error:', error)
    setResponseStatus(event, 500)
    return { success: false, message: error.message }
  }
})

// Safe XML text replacement - works with texts split across w:r blocks
function replaceInXmlSafe(xml: string, search: string, replace: string): string {
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedReplace = replace
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Strategy: collect all <w:r> blocks, find search text across them, replace
  const rRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g
  const blocks: { full: string; text: string }[] = []
  let m
  while ((m = rRegex.exec(xml)) !== null) {
    const full = m[0]
    const tMatch = full.match(/<w:t\b[^>]*>([^<]*)<\/w:t>/)
    blocks.push({ full, text: tMatch ? (tMatch[1] || '') : '' })
  }

  // Join all texts to find search position
  const allText = blocks.map(b => b.text).join('')
  const idx = allText.indexOf(search)
  if (idx === -1) {
    console.warn(`"${search}" not found in template`)
    return xml
  }

  // Find which blocks contain the search text
  let pos = 0
  let firstBlock = -1
  let lastBlock = -1
  let firstOffset = 0
  let lastEnd = 0
  for (let i = 0; i < blocks.length; i++) {
    const end = pos + blocks[i]!.text.length
    if (firstBlock === -1 && idx < end) {
      firstBlock = i
      firstOffset = idx - pos
    }
    if (firstBlock !== -1 && idx + search.length <= end) {
      lastBlock = i
      lastEnd = idx + search.length - pos
      break
    }
    pos = end
  }
  if (firstBlock === -1 || lastBlock === -1) return xml

  if (firstBlock === lastBlock) {
    // Same block
    const b = blocks[firstBlock]!
    const before = b.text.substring(0, firstOffset)
    const after = b.text.substring(lastEnd)
    const newText = before + escapedReplace + after
    const newBlock = b.full.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, `<w:t xml:space="preserve">${newText}</w:t>`)
    xml = xml.replace(b.full, newBlock)
  } else {
    // Multiple blocks: put all replace text in first block, clear intermediate, keep tail in last
    const first = blocks[firstBlock]!
    const before = first.text.substring(0, firstOffset)
    const firstNewText = before + escapedReplace
    let firstNewBlock = first.full.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, `<w:t xml:space="preserve">${firstNewText}</w:t>`)
    xml = xml.replace(first.full, firstNewBlock)

    for (let i = firstBlock + 1; i < lastBlock; i++) {
      const b = blocks[i]!
      if (b.text.trim()) {
        const cleared = b.full.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, '<w:t xml:space="preserve"></w:t>')
        xml = xml.replace(b.full, cleared)
      }
    }

    const last = blocks[lastBlock]!
    const after = last.text.substring(lastEnd)
    let lastNewBlock = last.full.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/, `<w:t xml:space="preserve">${after}</w:t>`)
    xml = xml.replace(last.full, lastNewBlock)
  }

  return xml
}
