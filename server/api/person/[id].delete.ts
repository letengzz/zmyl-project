import { execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    const result = await execute('DELETE FROM person WHERE id = ?', [id])

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})
