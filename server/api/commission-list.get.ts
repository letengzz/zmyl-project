import { query } from '../utils/db'

// GET /api/commission-list?search=xxx&page=1&pageSize=20
export default defineEventHandler(async (event) => {
  try {
    const { search, page, pageSize } = getQuery(event) as { search?: string; page?: string; pageSize?: string }
    
    const currentPage = Math.max(1, parseInt(page || '1'))
    const size = Math.max(1, Math.min(100, parseInt(pageSize || '10')))
    const offset = (currentPage - 1) * size

    let whereSql = 'WHERE is_deleted = 0'
    const params: any[] = []
    
    if (search) {
      whereSql += ' AND (commission_no LIKE ? OR applicant_unit LIKE ?)'
      params.push('%' + search + '%', '%' + search + '%')
    }

    // 统计总数
    const countResult = await query('SELECT COUNT(*) as total FROM scaffold_commission ' + whereSql, params) as any[]
    const total = countResult[0]?.total || 0

    // 分页查询，按委托单编号从大到小
    const data = await query(
      'SELECT * FROM scaffold_commission ' + whereSql + ' ORDER BY commission_no DESC LIMIT ' + size + ' OFFSET ' + offset,
      params
    ) as any[]
    
    const list = data.map(item => ({
      ...item,
      photo_urls: item.photo_urls ? JSON.parse(item.photo_urls) : []
    }))
    
    return {
      success: true,
      data: list,
      pagination: { page: currentPage, pageSize: size, total }
    }
  } catch (error: any) {
    console.error('获取架设委托列表失败:', error)
    return { success: false, message: error.message }
  }
})
