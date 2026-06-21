import { execute } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { orders } = body // orders: [{ person_id, location, sort_order }]

    // 先清空旧的排序数据
    await execute('DELETE FROM person_sort_order')

    // 插入新的排序数据
    for (const order of orders) {
      await execute(
        'INSERT INTO person_sort_order (person_id, location, sort_order) VALUES (?, ?, ?)',
        [order.person_id, order.location, order.sort_order]
      )
    }

    return {
      success: true,
      message: '排序保存成功'
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})
