import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDatabasePool() {
  const config = useRuntimeConfig()
  
  if (!pool) {
    pool = mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    })
  }
  return pool
}

export async function query(sql: string, values?: any[]) {
  const connection = await getDatabasePool().getConnection()
  try {
    const [rows] = await connection.execute(sql, values)
    return rows
  } finally {
    connection.release()
  }
}

export async function execute(sql: string, values?: any[]) {
  const connection = await getDatabasePool().getConnection()
  try {
    const [result] = await connection.execute(sql, values)
    return result
  } finally {
    connection.release()
  }
}
