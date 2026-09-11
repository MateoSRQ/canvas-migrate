import sql from 'mssql'

export interface SqlServerConnectionOptions {
  user?: string
  password?: string
  server?: string
  port?: number
  academicDb?: string
  authDb?: string
}

function getAcademicConfig(options: SqlServerConnectionOptions = {}): sql.config {
  return {
    user: options.user || process.env.DB_USER || 'sa',
    password: options.password || process.env.DB_PASSWORD || '1Ltseosb.',
    server: options.server || process.env.DB_SERVER || 'localhost',
    database: options.academicDb || process.env.DB_NAME || 'BDACADEMICO5',
    port: options.port || Number(process.env.DB_PORT) || 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      integratedSecurity: false,
      connectTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

function getAuthConfig(options: SqlServerConnectionOptions = {}): sql.config {
  return {
    user: options.user || process.env.UP_DB_USER || process.env.DB_USER || 'sa',
    password: options.password || process.env.UP_DB_PASSWORD || process.env.DB_PASSWORD || '1Ltseosb.',
    server: options.server || process.env.DB_SERVER || 'localhost',
    database: options.authDb || process.env.UP_DB_NAME || 'BDAUTENTICACION5',
    port: options.port || Number(process.env.DB_PORT) || 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      integratedSecurity: false,
      connectTimeout: 30000,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

export async function createSqlServerConnection(options: SqlServerConnectionOptions = {}) {
  const academicConfig = getAcademicConfig(options)
  const authConfig = getAuthConfig(options)

  const academicPool = new sql.ConnectionPool(academicConfig)
  const authPool = new sql.ConnectionPool(authConfig)

  await Promise.all([academicPool.connect(), authPool.connect()])

  return {
    academicPool,
    authPool,
    close: async () => {
      await Promise.allSettled([academicPool.close(), authPool.close()])
    },
  }
}

export async function fetchTableRows(
  pool: sql.ConnectionPool,
  fullTableName: string
): Promise<any[]> {
  const escapedName = fullTableName
    .split('.')
    .map((part) => `[${part.replace(/[\[\]]/g, '')}]`)
    .join('.')

  const result = await pool.request().query(`SELECT * FROM ${escapedName}`)
  return result.recordset || []
}
