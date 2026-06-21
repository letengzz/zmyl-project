import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const persons = await query('SELECT * FROM person WHERE (is_resign = 0 OR is_resign IS NULL) ORDER BY `order`')
    console.log('Query result:', persons)
    return {
      success: true,
      data: persons
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message
    }
  }
})
