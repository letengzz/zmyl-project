import { execute } from '../../utils/db'

// DELETE /api/notes/:id - 删除笔记
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    await execute('DELETE FROM notes WHERE id = ?', [id])

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除笔记失败:', error)
    return { success: false, message: error.message }
  }
})
