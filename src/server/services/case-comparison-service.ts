import { db } from '#/db/index'
import {
  importCases,
  canvasImportCases,
  canvasCaseCourses,
  canvasCaseAccounts,
  canvasCaseRawEntities,
} from '#/db/schema'
import { eq } from 'drizzle-orm'
import { getCaseHierarchyData } from './hierarchy-service'

export type ComparisonStatus = 'matched' | 'diff' | 'only_db' | 'only_canvas'

export interface CaseComparisonItem {
  id: string
  courseCode: string
  courseName: string
  status: ComparisonStatus
  variationReasons: string[]
  dbCourse?: {
    code: string
    name: string
    sede: string
    carrera: string
    plan: string
    sectionsCount: number
    sections: {
      id: number
      name: string
      status: string
      teachers: { dni: string; name: string; email?: string }[]
      studentsCount: number
    }[]
    totalTeachers: number
    totalStudents: number
    teacherNames: string[]
  }
  canvasCourse?: {
    canvasId: number
    sisCourseId: string | null
    courseCode: string | null
    name: string
    accountName?: string
    sectionsCount: number
    sections: {
      id: number
      name: string
      sisSectionId: string | null
      totalStudents: number
    }[]
    totalTeachers: number
    totalStudents: number
    teacherNames: string[]
  }
}

export interface CaseComparisonReport {
  timestamp: string
  dbCase: {
    id: string
    name: string
    createdAt: string
    totalRows: number
    totalCourses: number
    totalSections: number
  }
  canvasCase: {
    id: string
    name: string
    createdAt: string
    endpoint: string
    totalCourses: number
    totalAccounts: number
  }
  stats: {
    totalItems: number
    matchedCount: number
    diffCount: number
    onlyDbCount: number
    onlyCanvasCount: number
    dbCoursesCount: number
    canvasCoursesCount: number
    dbSectionsCount: number
    canvasSectionsCount: number
    dbStudentsCount: number
    canvasStudentsCount: number
    dbTeachersCount: number
    canvasTeachersCount: number
  }
  items: CaseComparisonItem[]
}

/**
 * Compara un caso de base de datos SQL con un snapshot de Canvas LMS (API)
 * de forma 100% local en SQLite, de alta velocidad.
 */
export async function compareDbCaseWithCanvasCase(
  dbCaseId: string,
  canvasCaseId: string
): Promise<CaseComparisonReport> {
  const timestamp = new Date().toISOString()

  // 1. Obtener metadatos del caso de base de datos
  const dbCaseRecord = await db
    .select()
    .from(importCases)
    .where(eq(importCases.id, dbCaseId))
    .get()

  if (!dbCaseRecord) {
    throw new Error(`El caso de base de datos ${dbCaseId} no existe.`)
  }

  // 2. Obtener metadatos del caso Canvas LMS
  const canvasCaseRecord = await db
    .select()
    .from(canvasImportCases)
    .where(eq(canvasImportCases.id, canvasCaseId))
    .get()

  if (!canvasCaseRecord) {
    throw new Error(`El caso de Canvas LMS ${canvasCaseId} no existe.`)
  }

  // 3. Cargar la jerarquía del caso de BD
  const hierarchy = await getCaseHierarchyData(dbCaseId, false)

  // Agrupar secciones por curso en BD
  interface DbCourseAccumulator {
    code: string
    name: string
    sede: string
    carrera: string
    plan: string
    sections: {
      id: number
      name: string
      status: string
      teachers: { dni: string; name: string; email?: string }[]
      studentsCount: number
    }[]
    totalTeachers: number
    totalStudents: number
    teacherDnis: Set<string>
    teacherNames: Set<string>
  }

  const dbCoursesMap = new Map<string, DbCourseAccumulator>()

  for (const item of hierarchy.items) {
    const rawCode = (item.cursoCodigo || '').trim()
    if (!rawCode) continue
    const key = rawCode.toUpperCase()

    if (!dbCoursesMap.has(key)) {
      dbCoursesMap.set(key, {
        code: rawCode,
        name: item.cursoNombre || rawCode,
        sede: item.sedeNombre || '',
        carrera: item.carreraNombre || '',
        plan: item.planCodigo || '',
        sections: [],
        totalTeachers: 0,
        totalStudents: 0,
        teacherDnis: new Set(),
        teacherNames: new Set(),
      })
    }

    const cGroup = dbCoursesMap.get(key)!
    cGroup.sections.push({
      id: item.seccionId,
      name: item.seccionNombre || `Sección ${item.seccionId}`,
      status: item.isNoHabilitado ? 'NO HABILITADO' : 'HABILITADO',
      teachers: item.docentes.map((d) => ({
        dni: d.dni,
        name: d.fullName,
        email: d.email,
      })),
      studentsCount: item.estudiantesCount || 0,
    })

    cGroup.totalStudents += item.estudiantesCount || 0
    for (const d of item.docentes) {
      if (d.dni) cGroup.teacherDnis.add(d.dni.trim().toUpperCase())
      if (d.fullName) cGroup.teacherNames.add(d.fullName.trim())
    }
  }

  for (const cGroup of dbCoursesMap.values()) {
    cGroup.totalTeachers = cGroup.teacherNames.size
  }

  // 4. Cargar datos del snapshot de Canvas LMS
  const canvasCourses = await db
    .select()
    .from(canvasCaseCourses)
    .where(eq(canvasCaseCourses.caseId, canvasCaseId))
    .all()

  const canvasAccounts = await db
    .select()
    .from(canvasCaseAccounts)
    .where(eq(canvasCaseAccounts.caseId, canvasCaseId))
    .all()

  const accountNameMap = new Map<number, string>()
  for (const acc of canvasAccounts) {
    accountNameMap.set(acc.canvasId, acc.name)
  }

  // Cargar docentes desde el volcado crudo si existe
  const rawEntity = await db
    .select({ dataJson: canvasCaseRawEntities.dataJson })
    .from(canvasCaseRawEntities)
    .where(
      eq(canvasCaseRawEntities.caseId, canvasCaseId)
    )
    .all()

  const rawTeachersByCourseId = new Map<number, string[]>()
  for (const rent of rawEntity) {
    try {
      const parsed = JSON.parse(rent.dataJson)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.id && Array.isArray(item.teachers) && item.teachers.length > 0) {
            const names = item.teachers
              .map((t: any) => t.display_name || t.name)
              .filter(Boolean)
            if (names.length > 0) {
              rawTeachersByCourseId.set(item.id, names)
            }
          }
        }
      }
    } catch {}
  }

  interface CanvasCourseAccumulator {
    canvasId: number
    sisCourseId: string | null
    courseCode: string | null
    name: string
    accountName?: string
    sections: {
      id: number
      name: string
      sisSectionId: string | null
      totalStudents: number
    }[]
    totalTeachers: number
    totalStudents: number
    teacherNames: string[]
  }

  const canvasCoursesMap = new Map<string, CanvasCourseAccumulator>()

  for (const c of canvasCourses) {
    let sections: {
      id: number
      name: string
      sisSectionId: string | null
      totalStudents: number
    }[] = []

    if (c.sectionsJson) {
      try {
        const parsed = JSON.parse(c.sectionsJson)
        if (Array.isArray(parsed)) {
          sections = parsed.map((s: any) => ({
            id: s.id,
            name: s.name,
            sisSectionId: s.sisSectionId || s.sis_section_id || null,
            totalStudents: s.totalStudents ?? s.total_students ?? 0,
          }))
        }
      } catch {}
    }

    const teacherNames = rawTeachersByCourseId.get(c.canvasId) || []
    const accName = c.accountId ? accountNameMap.get(c.accountId) : undefined

    const canvasItem: CanvasCourseAccumulator = {
      canvasId: c.canvasId,
      sisCourseId: c.sisCourseId,
      courseCode: c.courseCode,
      name: c.name,
      accountName: accName,
      sections,
      totalTeachers: teacherNames.length,
      totalStudents: c.totalStudents ?? 0,
      teacherNames,
    }

    // Indexar por SIS ID primero, y luego por courseCode si no hay colisión
    if (c.sisCourseId) {
      canvasCoursesMap.set(c.sisCourseId.trim().toUpperCase(), canvasItem)
    }
    if (c.courseCode && !canvasCoursesMap.has(c.courseCode.trim().toUpperCase())) {
      canvasCoursesMap.set(c.courseCode.trim().toUpperCase(), canvasItem)
    }
  }

  // 5. Unificar y comparar cursos
  const allCourseKeys = new Set<string>([
    ...dbCoursesMap.keys(),
    ...canvasCoursesMap.keys(),
  ])

  const items: CaseComparisonItem[] = []

  let matchedCount = 0
  let diffCount = 0
  let onlyDbCount = 0
  let onlyCanvasCount = 0

  let dbSectionsCount = 0
  let canvasSectionsCount = 0
  let dbStudentsCount = 0
  let canvasStudentsCount = 0
  let dbTeachersCount = 0
  let canvasTeachersCount = 0

  for (const key of allCourseKeys) {
    const dbC = dbCoursesMap.get(key)
    const canvasC = canvasCoursesMap.get(key)

    if (dbC) {
      dbSectionsCount += dbC.sections.length
      dbStudentsCount += dbC.totalStudents
      dbTeachersCount += dbC.totalTeachers
    }
    if (canvasC) {
      canvasSectionsCount += canvasC.sections.length
      canvasStudentsCount += canvasC.totalStudents
      canvasTeachersCount += canvasC.totalTeachers
    }

    if (dbC && canvasC) {
      const variationReasons: string[] = []

      // Diferencia en nombre
      const normDbName = dbC.name.trim().toLowerCase()
      const normCanvasName = canvasC.name.trim().toLowerCase()
      if (normDbName !== normCanvasName) {
        variationReasons.push(
          `Nombre diferente: "${dbC.name}" (BD) vs "${canvasC.name}" (Canvas)`
        )
      }

      // Diferencia en cantidad de secciones
      if (dbC.sections.length !== canvasC.sections.length) {
        variationReasons.push(
          `Secciones: ${dbC.sections.length} en BD vs ${canvasC.sections.length} en Canvas`
        )
      }

      // Diferencia en alumnos matriculados
      if (dbC.totalStudents !== canvasC.totalStudents) {
        variationReasons.push(
          `Alumnos: ${dbC.totalStudents} en BD vs ${canvasC.totalStudents} en Canvas`
        )
      }

      // Diferencia en docentes
      if (dbC.totalTeachers !== canvasC.totalTeachers && canvasC.totalTeachers > 0) {
        variationReasons.push(
          `Docentes: ${dbC.totalTeachers} en BD vs ${canvasC.totalTeachers} en Canvas`
        )
      }

      const status: ComparisonStatus =
        variationReasons.length === 0 ? 'matched' : 'diff'

      if (status === 'matched') {
        matchedCount++
      } else {
        diffCount++
      }

      items.push({
        id: key,
        courseCode: dbC.code,
        courseName: dbC.name,
        status,
        variationReasons,
        dbCourse: {
          code: dbC.code,
          name: dbC.name,
          sede: dbC.sede,
          carrera: dbC.carrera,
          plan: dbC.plan,
          sectionsCount: dbC.sections.length,
          sections: dbC.sections,
          totalTeachers: dbC.totalTeachers,
          totalStudents: dbC.totalStudents,
          teacherNames: Array.from(dbC.teacherNames),
        },
        canvasCourse: {
          canvasId: canvasC.canvasId,
          sisCourseId: canvasC.sisCourseId,
          courseCode: canvasC.courseCode,
          name: canvasC.name,
          accountName: canvasC.accountName,
          sectionsCount: canvasC.sections.length,
          sections: canvasC.sections,
          totalTeachers: canvasC.totalTeachers,
          totalStudents: canvasC.totalStudents,
          teacherNames: canvasC.teacherNames,
        },
      })
    } else if (dbC) {
      onlyDbCount++
      items.push({
        id: key,
        courseCode: dbC.code,
        courseName: dbC.name,
        status: 'only_db',
        variationReasons: [
          'No existe en este Snapshot de Canvas LMS (Pendiente de exportar o migrar)',
        ],
        dbCourse: {
          code: dbC.code,
          name: dbC.name,
          sede: dbC.sede,
          carrera: dbC.carrera,
          plan: dbC.plan,
          sectionsCount: dbC.sections.length,
          sections: dbC.sections,
          totalTeachers: dbC.totalTeachers,
          totalStudents: dbC.totalStudents,
          teacherNames: Array.from(dbC.teacherNames),
        },
      })
    } else if (canvasC) {
      onlyCanvasCount++
      items.push({
        id: key,
        courseCode: canvasC.sisCourseId || canvasC.courseCode || `CANVAS-${canvasC.canvasId}`,
        courseName: canvasC.name,
        status: 'only_canvas',
        variationReasons: [
          'No existe en el caso de Base de Datos seleccionado',
        ],
        canvasCourse: {
          canvasId: canvasC.canvasId,
          sisCourseId: canvasC.sisCourseId,
          courseCode: canvasC.courseCode,
          name: canvasC.name,
          accountName: canvasC.accountName,
          sectionsCount: canvasC.sections.length,
          sections: canvasC.sections,
          totalTeachers: canvasC.totalTeachers,
          totalStudents: canvasC.totalStudents,
          teacherNames: canvasC.teacherNames,
        },
      })
    }
  }

  // Ordenar elementos: primero diferencias, luego solo en BD, luego coincidentes, luego solo en Canvas
  const statusPriority: Record<ComparisonStatus, number> = {
    diff: 0,
    only_db: 1,
    matched: 2,
    only_canvas: 3,
  }

  items.sort((a, b) => {
    const pDiff = statusPriority[a.status] - statusPriority[b.status]
    if (pDiff !== 0) return pDiff
    return a.courseCode.localeCompare(b.courseCode)
  })

  return {
    timestamp,
    dbCase: {
      id: dbCaseRecord.id,
      name: dbCaseRecord.name,
      createdAt: dbCaseRecord.createdAt.toISOString(),
      totalRows: dbCaseRecord.totalRows,
      totalCourses: dbCoursesMap.size,
      totalSections: dbSectionsCount,
    },
    canvasCase: {
      id: canvasCaseRecord.id,
      name: canvasCaseRecord.name,
      createdAt: canvasCaseRecord.createdAt.toISOString(),
      endpoint: canvasCaseRecord.endpoint,
      totalCourses: canvasCaseRecord.totalCourses,
      totalAccounts: canvasCaseRecord.totalAccounts,
    },
    stats: {
      totalItems: items.length,
      matchedCount,
      diffCount,
      onlyDbCount,
      onlyCanvasCount,
      dbCoursesCount: dbCoursesMap.size,
      canvasCoursesCount: canvasCoursesMap.size,
      dbSectionsCount,
      canvasSectionsCount,
      dbStudentsCount,
      canvasStudentsCount,
      dbTeachersCount,
      canvasTeachersCount,
    },
    items,
  }
}
