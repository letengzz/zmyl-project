import { execute } from '../utils/db'

// POST /api/overtime
// Body: { date, location, tasks: Array<{ startTime, endTime, personIds: number[], workLocation?, workContent? }> }
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as {
      date: string
      location: number
      tasks: Array<{
        id?: number
        startTime: string
        endTime: string
        personIds: number[]
        workLocation?: string
        workContent?: string
      }>
    }

    const { date, location, tasks } = body

    if (!date || !location || !tasks) {
      return { success: false, message: '\u7f3a\u5c11\u5fc5\u8981\u53c2\u6570' }
    }

    for (const task of tasks) {
      if (!task.startTime || !task.endTime) {
        return { success: false, message: '\u7f3a\u5c11\u4efb\u52a1\u5f00\u59cb\u6216\u7ed3\u675f\u65f6\u95f4' }
      }
      const start = new Date(task.startTime)
      const end = new Date(task.endTime)
      if (end <= start) {
        return { success: false, message: '\u4efb\u52a1\u7ed3\u675f\u65f6\u95f4\u5fc5\u987b\u5927\u4e8e\u5f00\u59cb\u65f6\u95f4' }
      }
    }

    await execute(
      `DELETE r FROM overtime_record r 
       JOIN overtime_task t ON r.task_id = t.id 
       WHERE t.task_date = ? AND t.location = ?`,
      [date, location]
    )
    await execute('DELETE FROM overtime_task WHERE task_date = ? AND location = ?', [date, location])

    // 如果没有任务，直接返回（已清除旧数据）
    if (tasks.length === 0) {
      return { success: true, message: '已清除加班记录' }
    }

    const results: string[] = []
    for (const task of tasks) {
      const start = new Date(task.startTime)
      const end = new Date(task.endTime)
      const durationMs = end.getTime() - start.getTime()
      const durationHours = parseFloat((durationMs / 3600000).toFixed(2))

      const taskResult = await execute(
        `INSERT INTO overtime_task (task_date, start_time, end_time, location, work_location, work_content, duration_hours) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, task.startTime, task.endTime, location, task.workLocation || null, task.workContent || null, durationHours]
      ) as any

      const taskId = taskResult.insertId

      if (task.personIds && task.personIds.length > 0) {
        const values: any[] = []
        const placeholders: string[] = []
        
        for (let i = 0; i < task.personIds.length; i++) {
          placeholders.push('(?, ?, ?)')
          values.push(taskId, task.personIds[i], i + 1)
        }

        const sql = `INSERT INTO overtime_record (task_id, person_id, sort) VALUES ${placeholders.join(',')}`
        await execute(sql, values)
        results.push(`\u4eba\u5458 ${task.personIds.length} \u4eba\uff0c\u65f6\u957f ${durationHours}h`)
      } else {
        results.push(`\u65e0\u4eba\u5458\uff0c\u65f6\u957f ${durationHours}h`)
      }
    }

    return { 
      success: true, 
      message: `\u6210\u529f\u4fdd\u5b58 ${tasks.length} \u6761\u52a0\u73ed\u4efb\u52a1`,
      details: results
    }
  } catch (error: any) {
    console.error('Save overtime error:', error)
    return { success: false, message: error.message }
  }
})
