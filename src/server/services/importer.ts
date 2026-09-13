import { db } from '#/db/index'
import {
  importCases,
  caseRawTables,
  casePeriods,
  caseCourses,
  caseSections,
  caseUsers,
  caseEnrollments,
  type ImportCase,
} from '#/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { createSqlServerConnection, fetchTableRows } from './sql-server'

export interface CreateImportCaseOptions {
  name?: string
  description?: string
  server?: string
  academicDb?: string
  authDb?: string
}

export const ACADEMIC_TABLES = [
  { full: 'General.Periodo', schema: 'General', table: 'Periodo' },
  { full: 'General.Periodo_Tipo', schema: 'General', table: 'Periodo_Tipo' },
  { full: 'General.Sede', schema: 'General', table: 'Sede' },
  { full: 'General.SedeCarrera', schema: 'General', table: 'SedeCarrera' },
  { full: 'General.Carrera', schema: 'General', table: 'Carrera' },
  { full: 'General.Facultad', schema: 'General', table: 'Facultad' },
  { full: 'Academico.Plan', schema: 'Academico', table: 'Plan' },
  { full: 'Academico.Curso', schema: 'Academico', table: 'Curso' },
  { full: 'General.Catalogo', schema: 'General', table: 'Catalogo' },
  { full: 'Carga_Academica.Carga_Academica', schema: 'Carga_Academica', table: 'Carga_Academica' },
  { full: 'Carga_Academica.Carga_Academica_Sede', schema: 'Carga_Academica', table: 'Carga_Academica_Sede' },
  { full: 'Carga_Academica.Carga_Academica_Sede_Seccion', schema: 'Carga_Academica', table: 'Carga_Academica_Sede_Seccion' },
  { full: 'Carga_Academica.Carga_Academica_Sede_Curso', schema: 'Carga_Academica', table: 'Carga_Academica_Sede_Curso' },
  { full: 'Carga_Academica.Carga_Academica_Sede_Curso_Horario', schema: 'Carga_Academica', table: 'Carga_Academica_Sede_Curso_Horario' },
  { full: 'Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle', schema: 'Carga_Academica', table: 'Carga_Academica_Sede_Curso_Horario_Detalle' },
  { full: 'Matricula.Matricula_Alumno', schema: 'Matricula', table: 'Matricula_Alumno' },
  { full: 'Matricula.Matricula_Alumno_Curso', schema: 'Matricula', table: 'Matricula_Alumno_Curso' },
  { full: 'Academico.Alumno', schema: 'Academico', table: 'Alumno' },
  { full: 'General.Persona', schema: 'General', table: 'Persona' },
]

export const AUTH_TABLES = [
  { full: 'Personal.Utb_Persona', schema: 'Personal', table: 'Utb_Persona' },
]

function generateCaseId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const randomSuffix = Math.random().toString(36).substring(2, 7)
  return `case_${timestamp}_${randomSuffix}`
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function executeImportCase(
  options: CreateImportCaseOptions = {}
): Promise<ImportCase> {
  const caseId = generateCaseId()
  const server = options.server || process.env.DB_SERVER || 'localhost'
  const academicDb = options.academicDb || process.env.DB_NAME || 'BDACADEMICO5'
  const authDb = options.authDb || process.env.UP_DB_NAME || 'BDAUTENTICACION5'
  const now = new Date()

  const name =
    options.name?.trim() ||
    `Import ${academicDb} (${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`

  // 1. Initialize case record
  await db.insert(importCases).values({
    id: caseId,
    name,
    description: options.description || `Extracted from ${server} [${academicDb} / ${authDb}]`,
    status: 'in_progress',
    sourceServer: server,
    sourceAcademicDb: academicDb,
    sourceAuthDb: authDb,
    totalTables: 0,
    totalRows: 0,
    createdAt: now,
  })

  let sqlConn: Awaited<ReturnType<typeof createSqlServerConnection>> | null = null

  try {
    sqlConn = await createSqlServerConnection({
      server,
      academicDb,
      authDb,
    })

    const tableStatsMap: Record<string, { rowCount: number; durationMs: number }> = {}
    let grandTotalRows = 0
    let tablesProcessed = 0

    const rawDataMap = new Map<string, any[]>()

    // 2. Extract Academic Tables
    for (const t of ACADEMIC_TABLES) {
      const startTime = Date.now()
      const rows = await fetchTableRows(sqlConn.academicPool, t.full)
      const durationMs = Date.now() - startTime
      rawDataMap.set(t.full, rows)
      grandTotalRows += rows.length
      tablesProcessed += 1

      tableStatsMap[t.full] = {
        rowCount: rows.length,
        durationMs,
      }

      await db.insert(caseRawTables).values({
        caseId,
        tableName: t.full,
        schemaName: t.schema,
        rowCount: rows.length,
        dataJson: JSON.stringify(rows),
      })
    }

    // 3. Extract Auth Tables
    for (const t of AUTH_TABLES) {
      const startTime = Date.now()
      const rows = await fetchTableRows(sqlConn.authPool, t.full)
      const durationMs = Date.now() - startTime
      rawDataMap.set(t.full, rows)
      grandTotalRows += rows.length
      tablesProcessed += 1

      tableStatsMap[t.full] = {
        rowCount: rows.length,
        durationMs,
      }

      await db.insert(caseRawTables).values({
        caseId,
        tableName: t.full,
        schemaName: t.schema,
        rowCount: rows.length,
        dataJson: JSON.stringify(rows),
      })
    }

    // 4. Populate normalized case entities for instant relational querying
    // A. Periods
    const rawPeriodos = rawDataMap.get('General.Periodo') || []
    const periodosTipos = rawDataMap.get('General.Periodo_Tipo') || []
    const tipoMap = new Map(periodosTipos.map((pt: any) => [pt.id, pt.nombre]))

    const periodRows = rawPeriodos.map((p: any) => ({
      caseId,
      periodoId: p.id,
      nombre: p.nombre || `Periodo ${p.id}`,
      tipoPeriodo: tipoMap.get(p.periodo_tipo_id) || '',
      fechaInicio: p.fecha_inicio ? String(p.fecha_inicio) : null,
      fechaFin: p.fecha_fin ? String(p.fecha_fin) : null,
      activo: Boolean(p.activo),
      sufijo: p.sufijo || '',
    }))
    if (periodRows.length > 0) {
      for (const chunk of chunkArray(periodRows, 500)) {
        await db.insert(casePeriods).values(chunk)
      }
    }

    // B. Courses
    const rawCursos = rawDataMap.get('Academico.Curso') || []
    const courseRows = rawCursos.map((c: any) => ({
      caseId,
      cursoId: c.id,
      codCurso: String(c.cod_curso || c.id).trim(),
      nombre: String(c.nombre || '').trim(),
      abreviatura: c.abreviatura ? String(c.abreviatura).trim() : null,
      planId: c.plan_id ?? null,
      ciclo: c.cat_ciclo_id ? String(c.cat_ciclo_id) : null,
    }))
    if (courseRows.length > 0) {
      for (const chunk of chunkArray(courseRows, 500)) {
        await db.insert(caseCourses).values(chunk)
      }
    }

    // C. Sections
    const rawSecciones = rawDataMap.get('Carga_Academica.Carga_Academica_Sede_Seccion') || []
    const sectionRows = rawSecciones.map((s: any) => ({
      caseId,
      seccionId: s.id,
      nombre: String(s.nombre || '').trim(),
      activo: Boolean(s.activo),
      cargaAcademicaSedeId: s.carga_academica_sede_id ?? null,
    }))
    if (sectionRows.length > 0) {
      for (const chunk of chunkArray(sectionRows, 500)) {
        await db.insert(caseSections).values(chunk)
      }
    }

    // D. Users: Faculty (with DNI) & Students
    const userMap = new Map<string, {
      caseId: string
      userId: string
      sourcePersonaId: number | null
      fullName: string
      email: string | null
      userType: 'student' | 'teacher' | 'personnel'
    }>()

    // Faculty from Utb_Persona
    const rawPersonasAuth = rawDataMap.get('Personal.Utb_Persona') || []
    for (const p of rawPersonasAuth) {
      const dni = String(p.Codigo || p.Documento || p.Id || '').trim()
      if (!dni) continue

      const first = p.Nombres || p.Nombre || ''
      const lastP = p.ApellidoPaterno || ''
      const lastM = p.ApellidoMaterno || ''
      const fullName = `${first} ${lastP} ${lastM}`.trim().replace(/\s+/g, ' ')
      const email = p.CorreoCorporativo || p.CorreoPersonal || `${dni}@politecnica.edu.pe`

      userMap.set(`teacher_${dni}`, {
        caseId,
        userId: dni,
        sourcePersonaId: p.Id ? Number(p.Id) : null,
        fullName: fullName || `Docente ${dni}`,
        email: String(email).trim(),
        userType: 'teacher',
      })
    }

    // Students from Academico.Alumno + General.Persona
    const rawAlumnos = rawDataMap.get('Academico.Alumno') || []
    const rawPersonasGeneral = rawDataMap.get('General.Persona') || []
    const personaGeneralMap = new Map(rawPersonasGeneral.map((p: any) => [p.id, p]))

    for (const a of rawAlumnos) {
      const studentCode = String(a.codigo_alumno || a.id || '').trim()
      if (!studentCode) continue

      let fullName = ''
      if (a.persona_id) {
        const p: any = personaGeneralMap.get(a.persona_id)
        if (p) {
          const first = p.nombre || ''
          const lastP = p.apellido_paterno || ''
          const lastM = p.apellido_materno || ''
          fullName = `${first} ${lastP} ${lastM}`.trim().replace(/\s+/g, ' ')
        }
      }
      const email = a.email_principal || `${studentCode}@politecnica.edu.pe`

      userMap.set(`student_${studentCode}`, {
        caseId,
        userId: studentCode,
        sourcePersonaId: a.persona_id ? Number(a.persona_id) : null,
        fullName: fullName || `Alumno ${studentCode}`,
        email: String(email).trim(),
        userType: 'student',
      })
    }

    const userRows = Array.from(userMap.values())
    if (userRows.length > 0) {
      for (const chunk of chunkArray(userRows, 500)) {
        await db.insert(caseUsers).values(chunk)
      }
    }

    // E. Enrollments: Student enrollments + Faculty schedules
    const enrollmentMap = new Map<string, {
      caseId: string
      courseId: string
      sectionId: string
      userId: string
      role: 'student' | 'teacher'
      status: string
    }>()

    // Map helpers
    const cursoById = new Map(rawCursos.map((c: any) => [c.id, c]))
    const cargaCursos = rawDataMap.get('Carga_Academica.Carga_Academica_Sede_Curso') || []
    const cargaCursoById = new Map(cargaCursos.map((cc: any) => [cc.id, cc]))

    const horarios = rawDataMap.get('Carga_Academica.Carga_Academica_Sede_Curso_Horario') || []
    const horarioById = new Map(horarios.map((h: any) => [h.id, h]))

    // Student enrollments from Matricula.Matricula_Alumno_Curso
    const matriculaCursos = rawDataMap.get('Matricula.Matricula_Alumno_Curso') || []
    const matriculaAlumnos = rawDataMap.get('Matricula.Matricula_Alumno') || []
    const matriculaAlumnoById = new Map(matriculaAlumnos.map((m: any) => [m.id, m]))
    const alumnoById = new Map(rawAlumnos.map((a: any) => [a.id, a]))

    for (const mc of matriculaCursos) {
      const ma: any = matriculaAlumnoById.get(mc.matricula_alumno_id)
      if (!ma) continue

      const al: any = alumnoById.get(ma.alumno_id)
      if (!al || !al.codigo_alumno) continue
      const studentCode = String(al.codigo_alumno).trim()

      const horario: any = horarioById.get(mc.carga_academica_sede_curso_horario_id)
      if (!horario) continue

      const cc: any = cargaCursoById.get(horario.carga_academica_sede_curso_id)
      if (!cc) continue

      const curso: any = cursoById.get(cc.curso_id)
      if (!curso || !curso.cod_curso) continue
      const courseId = String(curso.cod_curso).trim()
      const sectionId = `${cc.carga_academica_sede_seccion_id}-${courseId}`

      const key = `${courseId}_${sectionId}_${studentCode}_student`
      if (!enrollmentMap.has(key)) {
        enrollmentMap.set(key, {
          caseId,
          courseId,
          sectionId,
          userId: studentCode,
          role: 'student',
          status: 'active',
        })
      }
    }

    // Faculty enrollments from Carga_Academica_Sede_Curso_Horario_Detalle
    const detalles = rawDataMap.get('Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle') || []
    const docenteMap = new Map(rawPersonasAuth.map((p: any) => [p.Id, p]))

    for (const d of detalles) {
      if (!d.docente_id) continue
      const personaAuth: any = docenteMap.get(d.docente_id)
      if (!personaAuth) continue
      const teacherDni = String(personaAuth.Codigo || personaAuth.Documento || personaAuth.Id).trim()
      if (!teacherDni) continue

      const horario: any = horarioById.get(d.carga_academica_sede_curso_horario_id)
      if (!horario) continue

      const cc: any = cargaCursoById.get(horario.carga_academica_sede_curso_id)
      if (!cc) continue

      const curso: any = cursoById.get(cc.curso_id)
      if (!curso || !curso.cod_curso) continue
      const courseId = String(curso.cod_curso).trim()
      const sectionId = `${cc.carga_academica_sede_seccion_id}-${courseId}`

      const key = `${courseId}_${sectionId}_${teacherDni}_teacher`
      if (!enrollmentMap.has(key)) {
        enrollmentMap.set(key, {
          caseId,
          courseId,
          sectionId,
          userId: teacherDni,
          role: 'teacher',
          status: 'active',
        })
      }
    }

    const enrollmentRows = Array.from(enrollmentMap.values())
    if (enrollmentRows.length > 0) {
      for (const chunk of chunkArray(enrollmentRows, 500)) {
        await db.insert(caseEnrollments).values(chunk)
      }
    }

    // 5. Complete case record
    await db
      .update(importCases)
      .set({
        status: 'completed',
        totalTables: tablesProcessed,
        totalRows: grandTotalRows,
        tableStats: JSON.stringify(tableStatsMap),
        completedAt: new Date(),
      })
      .where(eq(importCases.id, caseId))

    const [completedCase] = await db
      .select()
      .from(importCases)
      .where(eq(importCases.id, caseId))

    return completedCase
  } catch (err: any) {
    console.error(`❌ Import Case [${caseId}] failed:`, err)
    await db
      .update(importCases)
      .set({
        status: 'failed',
        errorMessage: err.message || String(err),
        completedAt: new Date(),
      })
      .where(eq(importCases.id, caseId))

    const [failedCase] = await db
      .select()
      .from(importCases)
      .where(eq(importCases.id, caseId))

    return failedCase
  } finally {
    if (sqlConn) {
      await sqlConn.close()
    }
  }
}

export async function listAllImportCases(): Promise<ImportCase[]> {
  return db.select().from(importCases).orderBy(desc(importCases.createdAt))
}

export async function getImportCaseById(caseId: string): Promise<ImportCase | null> {
  const [c] = await db.select().from(importCases).where(eq(importCases.id, caseId))
  return c || null
}

export async function getCaseRawTablesList(caseId: string) {
  return db
    .select({
      id: caseRawTables.id,
      tableName: caseRawTables.tableName,
      schemaName: caseRawTables.schemaName,
      rowCount: caseRawTables.rowCount,
      extractedAt: caseRawTables.extractedAt,
    })
    .from(caseRawTables)
    .where(eq(caseRawTables.caseId, caseId))
    .orderBy(caseRawTables.tableName)
}

export async function getCaseRawTableData(caseId: string, tableName: string): Promise<any[]> {
  const entry = db
    .select()
    .from(caseRawTables)
    .where(and(eq(caseRawTables.caseId, caseId), eq(caseRawTables.tableName, tableName)))
    .get()

  if (!entry) return []
  try {
    return JSON.parse(entry.dataJson)
  } catch {
    return []
  }
}

export async function deleteImportCase(caseId: string): Promise<boolean> {
  // Cascades automatically to raw tables, periods, courses, sections, users, enrollments
  await db.delete(importCases).where(eq(importCases.id, caseId))
  return true
}
