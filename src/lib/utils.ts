import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna el código de modalidad estándar para Canvas:
 * MP = Modalidad Presencial (cat_modalidad_id: 57)
 * MN = Modalidad No Presencial / Semi Presencial (cat_modalidad_id: 5)
 * MD = Modalidad a Distancia (cat_modalidad_id: 2264)
 */
export function getModalidadCode(modalidadId?: number, modalidadNombre?: string): string {
  if (modalidadId === 57) return 'MP'
  if (modalidadId === 5) return 'MN'
  if (modalidadId === 2264) return 'MD'
  const norm = (modalidadNombre || '').toLowerCase()
  if (norm.includes('distancia')) return 'MD'
  if (norm.includes('semi') || norm.includes('no presencial')) return 'MN'
  if (norm.includes('presencial')) return 'MP'
  return 'MP'
}
