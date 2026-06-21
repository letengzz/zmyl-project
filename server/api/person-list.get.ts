import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const { page = 1, pageSize = 10, keyword = '', location, position, is_resign, orderSort } = getQuery(event)
    
    const pageNum = Number(page) || 1
    const pageSizeNum = Number(pageSize) || 10
    const offset = (pageNum - 1) * pageSizeNum
    
    // 构建查询条件
    const conditions: string[] = []
    const params: any[] = []
    
    if (keyword) {
      conditions.push('(name LIKE ? OR id_card LIKE ? OR phone LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    
    if (location !== undefined && location !== '') {
      conditions.push('location = ?')
      params.push(Number(location))
    }
    
    if (position !== undefined && position !== '') {
      conditions.push('position = ?')
      params.push(String(position))
    }
    
    if (is_resign !== undefined && is_resign !== '') {
      conditions.push('is_resign = ?')
      params.push(Number(is_resign))
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    
    // 构建排序
    let orderBy = 'location, position, \`order\`'
    if (orderSort === 'asc') {
      orderBy = '\`order\` ASC, id ASC'
    } else if (orderSort === 'desc') {
      orderBy = '\`order\` DESC, id DESC'
    }
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM person ${whereClause}`, params) as any[]
    const total = countResult[0]?.total || 0
    
    // 查询分页数据
    const data = await query(
      `SELECT * FROM person ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, String(pageSizeNum), String(offset)]
    )
    
    return {
      success: true,
      data,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    }
  } catch (error: any) {
    console.error('Database error:', error)
    return {
      success: false,
      message: error.message,
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 }
    }
  }
})
