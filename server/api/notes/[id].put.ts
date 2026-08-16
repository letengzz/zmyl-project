import { execute } from '../../utils/db'

// PUT /api/notes/:id - 更新笔记
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { title, content } = body

    await execute(
      'UPDATE notes SET title = ?, content = ? WHERE id = ?',
      [title, content, id]
    )

    return { success: true, message: '保存成功' }
  } catch (error: any) {
    console.error('更新笔记失败:', error)
    return { success: false, message: error.message }
  }
})
