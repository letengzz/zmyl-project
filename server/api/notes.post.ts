import { execute } from '../utils/db'

// POST /api/notes - 创建新笔记
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { title, content } = body

    if (!title) {
      return { success: false, message: '标题不能为空' }
    }

    const result = await execute(
      'INSERT INTO notes (title, content) VALUES (?, ?)',
      [title, content || '']
    )

    return {
      success: true,
      data: { id: (result as any).insertId },
      message: '创建成功'
    }
  } catch (error: any) {
    console.error('创建笔记失败:', error)
    return { success: false, message: error.message }
  }
})
