import { generateOvertimeWord } from '../utils/generate-overtime-word'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const buf = generateOvertimeWord(body)

    const { date, location } = body
    const [year, month, day] = (date || '').split('-').map(Number)
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
