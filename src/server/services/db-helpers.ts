import { db } from '#/db/index'
import { caseRawTables } from '#/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Consulta y deserializa de forma segura una tabla cruda almacenada en case_raw_tables
 */
export function getTableFromDb(caseId: string, tableName: string): any[] {
  const row = db
    .select({ dataJson: caseRawTables.dataJson })
    .from(caseRawTables)
    .where(and(eq(caseRawTables.caseId, caseId), eq(caseRawTables.tableName, tableName)))
    .get()

  if (!row?.dataJson) return []
  try {
    return JSON.parse(row.dataJson)
  } catch (err) {
    console.error(`Error al deserializar tabla ${tableName} para el caso ${caseId}:`, err)
    return []
  }
}

/**
 * Almacén en memoria tipo LRU (Least Recently Used) con expiración por TTL
 * Evita el crecimiento desmedido de memoria RAM al retener únicamente los casos más recientes.
 */
export class LruCache<K, V> {
  private readonly max: number
  private readonly ttlMs: number
  private readonly map: Map<K, { value: V; expiresAt: number }>

  constructor(max: number = 3, ttlMinutes: number = 30) {
    this.max = Math.max(1, max)
    this.ttlMs = ttlMinutes * 60 * 1000
    this.map = new Map()
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return undefined
    }

    // Renovar posición en el LRU
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.max) {
      // Desalojar el elemento más antiguo
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
      }
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  size(): number {
    return this.map.size
  }
}
