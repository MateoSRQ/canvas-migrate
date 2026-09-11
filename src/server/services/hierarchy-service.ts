import { db } from '#/db'
import { caseRawTables } from '#/db/schema'
import { eq, and } from 'drizzle-orm'

export interface HierarchyItem {
  id: number // Carga_Academica_Sede_Curso.id
  periodoId: number
  periodoNombre: string
  periodoSufijo: string
  sedeId: number
  sedeNombre: string
  modalidadId: number
  modalidadNombre: string
  facultadId: number
  facultadNombre: string
  carreraId: number
  carreraNombre: string
  planId: number
  planNombre: string
  planCodigo: string
  cursoId: number
  cursoCodigo: string
  cursoNombre: string
  seccionId: number
  seccionNombre: string
  isNoHabilitado: boolean
  estudiantesCount: number
  docenteNombre: string
  docenteDni: string
  docenteEmail: string
}

export interface HierarchyFilterOptions {
  periodos: { id: number; nombre: string; sufijo: string }[]
  sedes: { id: number; nombre: string; periodoIds: number[] }[]
  modalidades: { id: number; nombre: string }[]
  facultades: { id: number; nombre: string }[]
  carreras: { id: number; nombre: string; facultadId: number }[]
  planes: { id: number; nombre: string; carreraId: number }[]
}

export interface EnrolledStudent {
  id: number
  codigo: string
  fullName: string
  email: string
}

// In-memory cache for loaded cases to guarantee sub-millisecond response times
const hierarchyCache = new Map<string, { items: HierarchyItem[]; filters: HierarchyFilterOptions }>()

function getTableFromDb(caseId: string, tableName: string): any[] {
  const row = db
    .select({ dataJson: caseRawTables.dataJson })
    .from(caseRawTables)
    .where(and(eq(caseRawTables.caseId, caseId), eq(caseRawTables.tableName, tableName)))
    .get()

  if (!row?.dataJson) return []
  try {
    return JSON.parse(row.dataJson)
  } catch {
    return []
  }
}

export function clearHierarchyCache(caseId?: string) {
  if (caseId) {
    hierarchyCache.delete(caseId)
  } else {
    hierarchyCache.clear()
  }
}

export function getCaseHierarchyData(caseId: string): {
  items: HierarchyItem[]
  filters: HierarchyFilterOptions
} {
  const cached = hierarchyCache.get(caseId)
  if (cached) return cached

  // Load raw tables
  const periodos = getTableFromDb(caseId, 'General.Periodo')
  const sedes = getTableFromDb(caseId, 'General.Sede')
  const carreras = getTableFromDb(caseId, 'General.Carrera')
  const facultades = getTableFromDb(caseId, 'General.Facultad')
  const planes = getTableFromDb(caseId, 'Academico.Plan')
  const cursos = getTableFromDb(caseId, 'Academico.Curso')
  const cargas = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica')
  const cargaSedes = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede')
  const secciones = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Seccion')
  const cargaCursos = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso')
  const sedeCarreras = getTableFromDb(caseId, 'General.SedeCarrera')
  const catalogos = getTableFromDb(caseId, 'General.Catalogo')
  const horarios = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso_Horario')
  const detalles = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle')
  const utbPersonas = getTableFromDb(caseId, 'Personal.Utb_Persona')
  const matriculas = getTableFromDb(caseId, 'Matricula.Matricula_Alumno_Curso')

  // Build lookup maps
  const periodoMap = new Map(periodos.map((p) => [p.id, p]))
  const sedeMap = new Map(sedes.map((s) => [s.id, s]))
  const carreraMap = new Map(carreras.map((c) => [c.id, c]))
  const facultadMap = new Map(facultades.map((f) => [f.id, f]))
  const planMap = new Map(planes.map((p) => [p.id, p]))
  const cursoMap = new Map(cursos.map((c) => [c.id, c]))
  const seccionMap = new Map(secciones.map((s) => [s.id, s]))
  const catalogoMap = new Map(catalogos.map((c) => [c.id, c.descripcion]))
  const cargaSedeMap = new Map(cargaSedes.map((cs) => [cs.id, cs]))
  const cargaMap = new Map(cargas.map((c) => [c.id, c]))
  const sedeCarreraMap = new Map(sedeCarreras.map((sc) => [sc.id, sc]))

  // Teacher lookup map from Personal.Utb_Persona
  const utbMap = new Map()
  for (const p of utbPersonas) {
    const id = p.Id !== undefined ? String(p.Id).trim() : (p.id !== undefined ? String(p.id).trim() : null)
    if (id) utbMap.set(id, p)
  }

  // Count matriculas by horario id
  const matriculaCountByHorario = new Map<number, number>()
  for (const m of matriculas) {
    const hid = m.carga_academica_sede_curso_horario_id
    if (hid) {
      matriculaCountByHorario.set(hid, (matriculaCountByHorario.get(hid) || 0) + 1)
    }
  }

  // Teacher by horario id
  const teacherByHorario = new Map<number, { name: string; dni: string; email: string }>()
  for (const d of detalles) {
    if (d.docente_id && !teacherByHorario.has(d.carga_academica_sede_curso_horario_id)) {
      const rawP = utbMap.get(String(d.docente_id))
      if (rawP) {
        const first = (rawP.Nombres || rawP.nombres || '').trim()
        const paternal = (rawP.ApellidoPaterno || rawP.apellido_paterno || '').trim()
        const maternal = (rawP.ApellidoMaterno || rawP.apellido_materno || '').trim()
        const name = [first, paternal, maternal].filter(Boolean).join(' ')
        const dni = (rawP.Documento || rawP.documento || rawP.Codigo || '').trim()
        const email = (rawP.CorreoCorporativo || rawP.CorreoPersonal || '').trim()
        teacherByHorario.set(d.carga_academica_sede_curso_horario_id, { name, dni, email })
      } else {
        teacherByHorario.set(d.carga_academica_sede_curso_horario_id, {
          name: `Docente ${d.docente_id}`,
          dni: '',
          email: '',
        })
      }
    }
  }

  // Horarios by carga curso id
  const horariosByCargaCurso = new Map<number, any[]>()
  for (const h of horarios) {
    if (!horariosByCargaCurso.has(h.carga_academica_sede_curso_id)) {
      horariosByCargaCurso.set(h.carga_academica_sede_curso_id, [])
    }
    horariosByCargaCurso.get(h.carga_academica_sede_curso_id)!.push(h)
  }

  const items: HierarchyItem[] = []
  const usedPeriodoIds = new Set<number>()
  const usedSedesMap = new Map<number, { id: number; nombre: string; periodoIds: Set<number> }>()
  const usedModalidadesMap = new Map<number, string>()
  const usedFacultadesMap = new Map<number, string>()
  const usedCarrerasMap = new Map<number, { id: number; nombre: string; facultadId: number }>()
  const usedPlanesMap = new Map<number, { id: number; nombre: string; carreraId: number }>()

  for (const cc of cargaCursos) {
    const sec = seccionMap.get(cc.carga_academica_sede_seccion_id)
    if (!sec) continue
    const cs = cargaSedeMap.get(sec.carga_academica_sede_id)
    if (!cs) continue
    const carga = cargaMap.get(cs.carga_academica_id)
    if (!carga) continue
    const periodo = periodoMap.get(carga.periodo_id)
    if (!periodo) continue
    const sc = sedeCarreraMap.get(cs.sede_carrera_id)
    if (!sc) continue
    const sede = sedeMap.get(sc.sede_id)
    const carrera = carreraMap.get(sc.carrera_id)
    const facultad = carrera ? facultadMap.get(carrera.facultad_id) : null
    const modalidad = catalogoMap.get(sc.cat_modalidad_id) || 'Desconocida'
    const curso = cursoMap.get(cc.curso_id)
    if (!curso) continue
    const plan = planMap.get(curso.plan_id)

    const hs = horariosByCargaCurso.get(cc.id) || []
    let totalStudents = 0
    let teacher: { name: string; dni: string; email: string } | null = null

    for (const h of hs) {
      totalStudents += matriculaCountByHorario.get(h.id) || 0
      if (!teacher && teacherByHorario.has(h.id)) {
        teacher = teacherByHorario.get(h.id)!
      }
    }

    const sedeId = sede?.id ?? 0
    const sedeNombre = sede?.nombre || 'Sin Sede'
    const facultadId = facultad?.id ?? 0
    const facultadNombre = facultad?.nombre || 'Sin Facultad'
    const carreraId = carrera?.id ?? 0
    const carreraNombre = carrera?.nombre || 'Sin Carrera'
    const planId = plan?.id ?? 0
    const planNombre = plan?.nombre || plan?.cod_plan || 'Sin Plan'
    const planCodigo = plan?.cod_plan || ''

    usedPeriodoIds.add(periodo.id)

    if (!usedSedesMap.has(sedeId)) {
      usedSedesMap.set(sedeId, { id: sedeId, nombre: sedeNombre, periodoIds: new Set() })
    }
    usedSedesMap.get(sedeId)!.periodoIds.add(periodo.id)

    usedModalidadesMap.set(sc.cat_modalidad_id, modalidad)
    if (facultadId) usedFacultadesMap.set(facultadId, facultadNombre)
    if (carreraId) usedCarrerasMap.set(carreraId, { id: carreraId, nombre: carreraNombre, facultadId })
    if (planId) usedPlanesMap.set(planId, { id: planId, nombre: planNombre, carreraId })

    items.push({
      id: cc.id,
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      periodoSufijo: periodo.sufijo || '',
      sedeId,
      sedeNombre,
      modalidadId: sc.cat_modalidad_id,
      modalidadNombre: modalidad,
      facultadId,
      facultadNombre,
      carreraId,
      carreraNombre,
      planId,
      planNombre,
      planCodigo,
      cursoId: curso.id,
      cursoCodigo: curso.cod_curso,
      cursoNombre: curso.nombre,
      seccionId: sec.id,
      seccionNombre: sec.nombre,
      isNoHabilitado: /no\s+habilitad/i.test(sec.nombre || ''),
      estudiantesCount: totalStudents,
      docenteNombre: teacher?.name || 'Sin Asignar',
      docenteDni: teacher?.dni || '',
      docenteEmail: teacher?.email || '',
    })
  }

  // Filter lists
  const filterPeriodos = Array.from(usedPeriodoIds)
    .map((pid) => {
      const p = periodoMap.get(pid)
      return { id: pid, nombre: p?.nombre || `Periodo ${pid}`, sufijo: p?.sufijo || '' }
    })
    .sort((a, b) => b.nombre.localeCompare(a.nombre))

  const filterSedes = Array.from(usedSedesMap.values())
    .map((s) => ({ id: s.id, nombre: s.nombre, periodoIds: Array.from(s.periodoIds) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const filterModalidades = Array.from(usedModalidadesMap.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const filterFacultades = Array.from(usedFacultadesMap.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const filterCarreras = Array.from(usedCarrerasMap.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  )

  const filterPlanes = Array.from(usedPlanesMap.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  )

  const filters: HierarchyFilterOptions = {
    periodos: filterPeriodos,
    sedes: filterSedes,
    modalidades: filterModalidades,
    facultades: filterFacultades,
    carreras: filterCarreras,
    planes: filterPlanes,
  }

  const result = { items, filters }
  hierarchyCache.set(caseId, result)
  return result
}

export function getSectionEnrolledStudents(caseId: string, cargaCursoId: number): EnrolledStudent[] {
  const matriculas = getTableFromDb(caseId, 'Matricula.Matricula_Alumno_Curso')
  const alumnos = getTableFromDb(caseId, 'Academico.Alumno')
  const personas = getTableFromDb(caseId, 'General.Persona')
  const horarios = getTableFromDb(caseId, 'Carga_Academica.Carga_Academica_Sede_Curso_Horario')

  const alumnoMap = new Map(alumnos.map((a) => [a.id, a]))
  const personaMap = new Map(personas.map((p) => [p.id, p]))

  const targetHorarios = horarios
    .filter((h) => h.carga_academica_sede_curso_id === cargaCursoId)
    .map((h) => h.id)
  const hSet = new Set(targetHorarios)

  const enrolled = matriculas.filter((m) => hSet.has(m.carga_academica_sede_curso_horario_id))
  const seenStudentIds = new Set<number>()
  const result: EnrolledStudent[] = []

  for (const m of enrolled) {
    const al = alumnoMap.get(m.matricula_alumno_id)
    if (!al || seenStudentIds.has(al.id)) continue
    seenStudentIds.add(al.id)

    const p = al.persona_id ? personaMap.get(al.persona_id) : null
    const first = (p?.nombre || '').trim()
    const pat = (p?.apellido_paterno || '').trim()
    const mat = (p?.apellido_materno || '').trim()
    const fullName = [first, pat, mat].filter(Boolean).join(' ') || `Estudiante ${al.codigo_alumno}`
    const codigo = String(al.codigo_alumno || '').trim()
    const email =
      al.email_principal && String(al.email_principal).includes('@')
        ? String(al.email_principal).trim()
        : `${codigo}@politecnica.edu.pe`

    result.push({
      id: al.id,
      codigo,
      fullName,
      email,
    })
  }

  return result.sort((a, b) => a.fullName.localeCompare(b.fullName))
}
