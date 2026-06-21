import { execute } from '../utils/db'

// POST /api/overtime
// Body: { date, startTime, endTime, personIds: number[], location, workLocation?, workContent? }
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as {
      date: string
      startTime: string
      endTime: string
      personIds: number[]
      location: number
      workLocation?: string
      workContent?: string
    }

    const { date, startTime, endTime, personIds, location, workLocation, workContent } = body

    if (!date || !startTime || !endTime || !location) {
      return { success: false, message: '缺少必要参数' }
    }

    // 计算加班时长（小时）
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (end <= start) {
      return { success: false, message: '结束时间必须大于开始时间' }
    }

    const durationMs = end.getTime() - start.getTime()
    const durationHours = parseFloat((durationMs / 3600000).toFixed(2))

    // 先删除该日期该位置已有的任务和记录（避免重复）
    // 先删除 overtime_record（因为有外键关联）
    await execute(
      `DELETE r FROM overtime_record r 
       JOIN overtime_task t ON r.task_id = t.id 
       WHERE t.task_date = ? AND t.location = ?`,
      [date, location]
    )
    // 再删除 overtime_task
    await execute('DELETE FROM overtime_task WHERE task_date = ? AND location = ?', [date, location])

    // 插入新任务
    const taskResult = await execute(
      `INSERT INTO overtime_task (task_date, start_time, end_time, location, work_location, work_content, duration_hours) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, startTime, endTime, location, workLocation || null, workContent || null, durationHours]
    ) as any

    const taskId = taskResult.insertId

    // 批量插入人员记录，sort 字段为人员在数组中的位置
    if (personIds.length > 0) {
      const values: any[] = []
      const placeholders: string[] = []
      
      for (let i = 0; i < personIds.length; i++) {
        placeholders.push('(?, ?, ?)')
        values.push(taskId, personIds[i], i + 1)
      }

      const sql = `INSERT INTO overtime_record (task_id, person_id, sort) VALUES ${placeholders.join(',')}`
      await execute(sql, values)
    }

    return { 
      success: true, 
      message: personIds.length > 0
        ? `成功保存 ${personIds.length} 条加班记录，每人 ${durationHours} 小时`
        : `成功保存加班任务（无人员记录）`
    }
  } catch (error: any) {
    console.error('Save overtime error:', error)
    return { success: false, message: error.message }
  }
})
