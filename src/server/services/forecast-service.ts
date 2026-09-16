import { getTableFromDb, LruCache } from './db-helpers'
import { db } from '#/db/index'
import { importCases } from '#/db/schema'
import { eq } from 'drizzle-orm'

export interface ForecastCourseItem {
  cursoId: number
  codCurso: string
  nombre: string
  cicloId: number | null
  cicloNombre: string
  cicloOrden: number
  creditos: number
  planId: number
  planNombre: string
  seccionesCount: number
  alumnosCount: number
  matriculasCount: number
}

export interface ForecastCareerCycleData {
  alumnos: number
  matriculas: number
}

export interface ForecastCareerRow {
  carreraId: number
  carreraCodigo: string
  carreraNombre: string
  facultadId: number
  facultadNombre: string
  totalAlumnos: number
  totalMatriculas: number
  byCycle: Record<string, ForecastCareerCycleData>
  courses: ForecastCourseItem[]
}

export interface ForecastPeriodOption {
  id: number
  nombre: string
  sufijo?: string
  totalMatriculas: number
  totalAlumnos: number
}

export interface ForecastSedeOption {
  id: number
  nombre: string
  codigo: string
}

export interface ForecastCycleColumn {
  id: number
  nombre: string
  orden: number
}

export interface ForecastTotals {
  totalAlumnosGeneral: number
  totalMatriculasGeneral: number
  byCycle: Record<string, ForecastCareerCycleData>
}

export interface ForecastResult {
  caseId: string
  caseName: string
  periodos: ForecastPeriodOption[]
  sedes: ForecastSedeOption[]
  ciclos: ForecastCycleColumn[]
  carreras: ForecastCareerRow[]
  totals: ForecastTotals
  selectedPeriodoId: number | null
  selectedPeriodoIds: number[]
  selectedSedeId: number | null
}

interface CachedRawForecastData {
  caseName: string
  periodos: any[]
  sedes: any[]
  carreras: any[]
  facultades: any[]
  planes: any[]
  cursos: any[]
  catalogos: any[]
  matAlumnos: any[]
  matCursos: any[]
  cargaCursos: any[]
  cargaHorarios: any[]
  cargaSedes: any[]
  cargaSecciones: any[]
  sedeCarreras: any[]
  cargas: any[]
}

const rawCache = new LruCache<string, CachedRawForecastData>(3, 30)

function loadRawForecastData(caseId: string): CachedRawForecastData {
  const cached = rawCache.get(caseId)
  if (cached) return cached

  const caseRow = db
    .select({ name: importCases.name })
    .from(importCases)
    .where(eq(importCases.id, caseId))
    .get()

  const data: CachedRawForecastData = {
    caseName: caseRow?.name || caseId,
    periodos: getTableFromDb(caseId, 'General.Periodo'),
    sedes: getTableFromDb(caseId, 'General.Sede'),
    carreras: getTableFromDb(caseId, 'General.Carrera'),
    facultades: getTableFromDb(caseId, 'General.Facultad'),
    planes: getTableFromDb(caseId, 'Academico.Plan'),
    cursos: getTableFromDb(caseId, 'Academico.Curso'),
    catalogos: getTableFromDb(caseId, 'General.Catalogo'),
    matAlumnos: getTableFromDb(caseId, 'Matricula.Matricula_Alumno'),
    matCursos: getTableFromDb(caseId, 'Matricula.Matricula_Alumno_Curso'),
    cargaCursos: getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso'),
    cargaHorarios: getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso_Horario'),
    cargaSedes: getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede'),
    cargaSecciones: getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Seccion'),
    sedeCarreras: getTableFromDb(caseId, 'General.SedeCarrera'),
    cargas: getTableFromDb(caseId, 'Carga_Academica.Carga_Academica'),
  }

  rawCache.set(caseId, data)
  return data
}

export function getForecastData(
  caseId: string,
  options?: {
    periodoId?: number | null
    periodoIds?: number[] | null
    sedeId?: number | null
  }
): ForecastResult {
  const raw = loadRawForecastData(caseId)

  // Fast maps
  const catalogoMap = new Map<number, any>(raw.catalogos.map((c) => [c.id, c]))
  const carreraMap = new Map<number, any>(raw.carreras.map((c) => [c.id, c]))
  const facultadMap = new Map<number, any>(raw.facultades.map((f) => [f.id, f]))
  const planMap = new Map<number, any>(raw.planes.map((p) => [p.id, p]))
  const cursoMap = new Map<number, any>(raw.cursos.map((c) => [c.id, c]))
  const matAlumnoMap = new Map<number, any>(raw.matAlumnos.map((m) => [m.id, m]))
  const horarioMap = new Map<number, any>(raw.cargaHorarios.map((h) => [h.id, h]))
  const cargaCursoMap = new Map<number, any>(raw.cargaCursos.map((cc) => [cc.id, cc]))
  const seccionMap = new Map<number, any>(raw.cargaSecciones.map((s) => [s.id, s]))
  const cargaSedeMap = new Map<number, any>(raw.cargaSedes.map((cs) => [cs.id, cs]))
  const cargaMap = new Map<number, any>(raw.cargas.map((c) => [c.id, c]))
  const periodoMap = new Map<number, any>(raw.periodos.map((p) => [p.id, p]))
  const sedeMap = new Map<number, any>(raw.sedes.map((s) => [s.id, s]))
  const sedeCarreraMap = new Map<number, any>(raw.sedeCarreras.map((sc) => [sc.id, sc]))

  // Cycle catalog lookup & order
  const cycleMetaMap = new Map<
    number,
    { id: number; nombre: string; orden: number }
  >()
  for (const cat of raw.catalogos) {
    if (
      cat.catalogo_tipo_id === 5 ||
      /ciclo\s+\d+/i.test(cat.descripcion || '')
    ) {
      const desc = String(cat.descripcion || '').trim().toUpperCase()
      const orden =
        typeof cat.valor_orden === 'number'
          ? cat.valor_orden
          : parseInt(desc.replace(/\D/g, ''), 10) || 99
      cycleMetaMap.set(cat.id, {
        id: cat.id,
        nombre: desc,
        orden,
      })
    }
  }

  // Calculate stats for all available periods
  const periodStatsMap = new Map<
    number,
    { matriculas: number; students: Set<string> }
  >()
  const usedSedesSet = new Set<number>()

  for (const mc of raw.matCursos) {
    const h = horarioMap.get(mc.carga_academica_sede_curso_horario_id)
    if (!h) continue
    const cc = cargaCursoMap.get(h.carga_academica_sede_curso_id)
    if (!cc) continue
    const sec = seccionMap.get(cc.carga_academica_sede_seccion_id)
    if (!sec) continue
    const cs = cargaSedeMap.get(sec.carga_academica_sede_id)
    if (!cs) continue
    const c = cargaMap.get(cs.carga_academica_id)
    if (!c || !c.periodo_id) continue

    const sc = sedeCarreraMap.get(cs.sede_carrera_id)
    if (sc?.sede_id) usedSedesSet.add(sc.sede_id)

    if (!periodStatsMap.has(c.periodo_id)) {
      periodStatsMap.set(c.periodo_id, {
        matriculas: 0,
        students: new Set(),
      })
    }
    const stat = periodStatsMap.get(c.periodo_id)!
    stat.matriculas++

    const ma = matAlumnoMap.get(mc.matricula_alumno_id)
    const sId = ma ? String(ma.codalumno || ma.alumno_id || ma.id) : String(mc.matricula_alumno_id)
    stat.students.add(sId)
  }

  // Build sorted list of available periods
  const periodos: ForecastPeriodOption[] = Array.from(periodStatsMap.entries())
    .map(([pid, stat]) => {
      const p = periodoMap.get(pid)
      return {
        id: pid,
        nombre: p?.nombre || `Periodo ${pid}`,
        sufijo: p?.sufijo || '',
        totalMatriculas: stat.matriculas,
        totalAlumnos: stat.students.size,
      }
    })
    .sort((a, b) => b.totalMatriculas - a.totalMatriculas)

  // Build sorted list of available Sedes
  const sedes: ForecastSedeOption[] = Array.from(usedSedesSet)
    .map((sid) => {
      const s = sedeMap.get(sid)
      return {
        id: sid,
        nombre: s?.nombre || `Sede ${sid}`,
        codigo: s?.cod_sede ? String(s.cod_sede).trim() : `S-${sid}`,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Determine active period filter:
  // Default on initial load is ONLY the first period (single item marked)
  let activePeriodoIdsSet: Set<number> | null = null
  if (Array.isArray(options?.periodoIds)) {
    activePeriodoIdsSet = new Set(options!.periodoIds)
  } else if (typeof options?.periodoId === 'number') {
    activePeriodoIdsSet = new Set([options.periodoId])
  } else if (periodos.length > 0) {
    // Initial default: exactly one period marked
    activePeriodoIdsSet = new Set([periodos[0].id])
  } else {
    activePeriodoIdsSet = new Set()
  }

  const activeSedeId = typeof options?.sedeId === 'number' ? options.sedeId : null

  // Aggregation containers
  // carreraId -> Set<studentCode>
  const carreraStudentsMap = new Map<number, Set<string>>()
  // carreraId -> total matriculas
  const carreraMatriculasMap = new Map<number, number>()
  // carreraId -> cycleNombre -> Set<studentCode>
  const carreraCycleStudentsMap = new Map<number, Map<string, Set<string>>>()
  // carreraId -> cycleNombre -> count
  const carreraCycleMatriculasMap = new Map<number, Map<string, number>>()
  // carreraId -> cursoId -> { course, sections: Set<secId>, students: Set<studentCode>, matriculas: number }
  const carreraCoursesMap = new Map<
    number,
    Map<
      number,
      {
        curso: any
        sections: Set<number>
        students: Set<string>
        matriculas: number
      }
    >
  >()

  // Global totals
  const globalStudentsSet = new Set<string>()
  let globalMatriculas = 0
  const globalCycleStudentsMap = new Map<string, Set<string>>()
  const globalCycleMatriculasMap = new Map<string, number>()

  // Keep track of cycles that have actual data
  const usedCyclesMap = new Map<string, ForecastCycleColumn>()

  for (const mc of raw.matCursos) {
    const h = horarioMap.get(mc.carga_academica_sede_curso_horario_id)
    if (!h) continue
    const cc = cargaCursoMap.get(h.carga_academica_sede_curso_id)
    if (!cc) continue
    const sec = seccionMap.get(cc.carga_academica_sede_seccion_id)
    if (!sec) continue
    const cs = cargaSedeMap.get(sec.carga_academica_sede_id)
    if (!cs) continue
    const c = cargaMap.get(cs.carga_academica_id)
    if (!c || !c.periodo_id) continue

    // Period filter
    if (activePeriodoIdsSet !== null && !activePeriodoIdsSet.has(c.periodo_id)) {
      continue
    }

    // Sede filter
    const sc = sedeCarreraMap.get(cs.sede_carrera_id)
    if (activeSedeId !== null && sc?.sede_id !== activeSedeId) {
      continue
    }

    const curso = cursoMap.get(cc.curso_id)
    if (!curso) continue

    // Resolve Carrera
    const plan = curso.plan_id ? planMap.get(curso.plan_id) : null
    const carreraId = (sc && sc.carrera_id) || (plan && plan.carrera_id) || 0
    if (!carreraId) continue

    // Resolve Cycle
    const cycleMeta = curso.cat_ciclo_id ? cycleMetaMap.get(curso.cat_ciclo_id) : null
    const cicloNombre = cycleMeta?.nombre || (curso.cat_ciclo_id ? `CICLO ${curso.cat_ciclo_id}` : 'SIN CICLO')
    const cicloOrden = cycleMeta?.orden ?? 99

    if (!usedCyclesMap.has(cicloNombre)) {
      usedCyclesMap.set(cicloNombre, {
        id: cycleMeta?.id || 0,
        nombre: cicloNombre,
        orden: cicloOrden,
      })
    }

    // Resolve Student
    const ma = matAlumnoMap.get(mc.matricula_alumno_id)
    const studentCode = ma ? String(ma.codalumno || ma.alumno_id || ma.id) : String(mc.matricula_alumno_id)

    // Update Carrera aggregations
    if (!carreraStudentsMap.has(carreraId)) carreraStudentsMap.set(carreraId, new Set())
    carreraStudentsMap.get(carreraId)!.add(studentCode)

    carreraMatriculasMap.set(carreraId, (carreraMatriculasMap.get(carreraId) || 0) + 1)

    // By cycle in carrera
    if (!carreraCycleStudentsMap.has(carreraId)) carreraCycleStudentsMap.set(carreraId, new Map())
    const cCycleMap = carreraCycleStudentsMap.get(carreraId)!
    if (!cCycleMap.has(cicloNombre)) cCycleMap.set(cicloNombre, new Set())
    cCycleMap.get(cicloNombre)!.add(studentCode)

    if (!carreraCycleMatriculasMap.has(carreraId)) carreraCycleMatriculasMap.set(carreraId, new Map())
    const cMatMap = carreraCycleMatriculasMap.get(carreraId)!
    cMatMap.set(cicloNombre, (cMatMap.get(cicloNombre) || 0) + 1)

    // By course in carrera
    if (!carreraCoursesMap.has(carreraId)) carreraCoursesMap.set(carreraId, new Map())
    const courseMap = carreraCoursesMap.get(carreraId)!
    if (!courseMap.has(curso.id)) {
      courseMap.set(curso.id, {
        curso,
        sections: new Set(),
        students: new Set(),
        matriculas: 0,
      })
    }
    const courseEntry = courseMap.get(curso.id)!
    courseEntry.sections.add(sec.id)
    courseEntry.students.add(studentCode)
    courseEntry.matriculas++

    // Global aggregations
    globalStudentsSet.add(studentCode)
    globalMatriculas++

    if (!globalCycleStudentsMap.has(cicloNombre)) globalCycleStudentsMap.set(cicloNombre, new Set())
    globalCycleStudentsMap.get(cicloNombre)!.add(studentCode)

    globalCycleMatriculasMap.set(cicloNombre, (globalCycleMatriculasMap.get(cicloNombre) || 0) + 1)
  }

  // Sorted list of all institutional cycles (CICLO 1 to CICLO 12) from catalog
  // Ensures cohort advancement forecast (Ciclo N -> Ciclo N+1) always has next cycle available
  const sortedCycles = Array.from(cycleMetaMap.values()).sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden
    return a.nombre.localeCompare(b.nombre)
  })

  // Build Career Rows
  const carreras: ForecastCareerRow[] = Array.from(carreraStudentsMap.keys()).map((carrId) => {
    const carr = carreraMap.get(carrId)
    const fac = carr?.facultad_id ? facultadMap.get(carr.facultad_id) : null

    const totalAlumnos = carreraStudentsMap.get(carrId)?.size || 0
    const totalMatriculas = carreraMatriculasMap.get(carrId) || 0

    const cCycleStudents = carreraCycleStudentsMap.get(carrId) || new Map()
    const cCycleMat = carreraCycleMatriculasMap.get(carrId) || new Map()

    const byCycle: Record<string, ForecastCareerCycleData> = {}
    for (const cy of sortedCycles) {
      byCycle[cy.nombre] = {
        alumnos: cCycleStudents.get(cy.nombre)?.size || 0,
        matriculas: cCycleMat.get(cy.nombre) || 0,
      }
    }

    // Courses for this career
    const courseMap = carreraCoursesMap.get(carrId) || new Map()
    const courses: ForecastCourseItem[] = Array.from(courseMap.values()).map((entry) => {
      const c = entry.curso
      const cPlan = c.plan_id ? planMap.get(c.plan_id) : null
      const cMeta = c.cat_ciclo_id ? cycleMetaMap.get(c.cat_ciclo_id) : null
      const cNombre = cMeta?.nombre || (c.cat_ciclo_id ? `CICLO ${c.cat_ciclo_id}` : 'SIN CICLO')
      const cOrden = cMeta?.orden ?? 99

      return {
        cursoId: c.id,
        codCurso: String(c.cod_curso || c.id).trim(),
        nombre: String(c.nombre || '').trim(),
        cicloId: c.cat_ciclo_id ?? null,
        cicloNombre: cNombre,
        cicloOrden: cOrden,
        creditos: Number(c.creditos) || 0,
        planId: c.plan_id || 0,
        planNombre: cPlan?.nombre || cPlan?.cod_plan || 'Plan General',
        seccionesCount: entry.sections.size,
        alumnosCount: entry.students.size,
        matriculasCount: entry.matriculas,
      }
    })

    // Sort courses by cycle order then by course code/name
    courses.sort((a, b) => {
      if (a.cicloOrden !== b.cicloOrden) return a.cicloOrden - b.cicloOrden
      return a.codCurso.localeCompare(b.codCurso)
    })

    return {
      carreraId: carrId,
      carreraCodigo: carr?.cod_carrera ? String(carr.cod_carrera).trim() : `C-${carrId}`,
      carreraNombre: carr?.nombre || `Carrera ${carrId}`,
      facultadId: fac?.id || 0,
      facultadNombre: fac?.nombre || 'Facultad General',
      totalAlumnos,
      totalMatriculas,
      byCycle,
      courses,
    }
  })

  // Sort carreras by total students descending
  carreras.sort((a, b) => b.totalAlumnos - a.totalAlumnos)

  // Totals row
  const totalsByCycle: Record<string, ForecastCareerCycleData> = {}
  for (const cy of sortedCycles) {
    totalsByCycle[cy.nombre] = {
      alumnos: globalCycleStudentsMap.get(cy.nombre)?.size || 0,
      matriculas: globalCycleMatriculasMap.get(cy.nombre) || 0,
    }
  }

  const totals: ForecastTotals = {
    totalAlumnosGeneral: globalStudentsSet.size,
    totalMatriculasGeneral: globalMatriculas,
    byCycle: totalsByCycle,
  }

  return {
    caseId,
    caseName: raw.caseName,
    periodos,
    sedes,
    ciclos: sortedCycles,
    carreras,
    totals,
    selectedPeriodoId:
      activePeriodoIdsSet && activePeriodoIdsSet.size === 1
        ? Array.from(activePeriodoIdsSet)[0]
        : null,
    selectedPeriodoIds: Array.from(activePeriodoIdsSet),
    selectedSedeId: activeSedeId,
  }
}
