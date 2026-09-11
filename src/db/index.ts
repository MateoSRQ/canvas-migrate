import { config } from 'dotenv'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const dbUrl = process.env.DATABASE_URL || 'dev.db'
const sqlite = new Database(dbUrl)

// Pragmas de rendimiento e integridad para SQLite
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('synchronous = NORMAL')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('cache_size = -64000') // 64 MB de memoria caché

export const db = drizzle(sqlite, { schema })
