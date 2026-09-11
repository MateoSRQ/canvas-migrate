import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const dbUrl = process.env.DATABASE_URL || 'dev.db'
export const db = drizzle(dbUrl, { schema })
