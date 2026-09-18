import { getTableFromDb, LruCache } from './db-helpers'

export interface EnrolledTeacher {
  dni: string
  fullName: string
  email: string
}

export interface EnrolledStudent {
  id: number
  codigo: string
  fullName: string
  email: string
  carreraId?: number
  carreraCodigo?: string
  carreraNombre?: string
}

export interface HierarchyItem {
  id: number // Carga_Academica_Sede_Curso.id
  periodoId: number
  periodoNombre: string
  periodoSufijo: string
  sedeId: number
  sedeCodigo: string
  sedeNombre: string
  modalidadId: number
  modalidadNombre: string
  facultadId: number
  facultadCodigo: string
  facultadNombre: string
  carreraId: number
  carreraCodigo: string
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
  docentes: EnrolledTeacher[]
  estudiantes: EnrolledStudent[]
  grupoCodigo: string | null
}

export interface HierarchyFilterOptions {
  periodos: { id: number; nombre: string; sufijo: string }[]
  sedes: { id: number; nombre: string; periodoIds: number[] }[]
  modalidades: { id: number; nombre: string }[]
  facultades: { id: number; nombre: string }[]
  carreras: { id: number; nombre: string; facultadId: number }[]
  planes: { id: number; nombre: string; carreraId: number }[]
}

interface CachedHierarchyCase {
  items: HierarchyItem[]
  fullItems: HierarchyItem[]
  filters: HierarchyFilterOptions
  studentsByCargaCurso: Map<number, EnrolledStudent[]>
}

// Almacén en memoria LRU acotado a un máximo de 3 casos y 30 minutos de TTL
const hierarchyCache = new LruCache<string, CachedHierarchyCase>(3, 30)

export function clearHierarchyCache(caseId?: string) {
  if (caseId) {
    hierarchyCache.delete(caseId)
  } else {
    hierarchyCache.clear()
  }
}

export function getCaseHierarchyData(
  caseId: string,
  includeStudents = false
): {
  items: HierarchyItem[]
  filters: HierarchyFilterOptions
} {
  const cached = hierarchyCache.get(caseId)
  if (cached) {
    return {
      items: includeStudents ? cached.fullItems : cached.items,
      filters: cached.filters,
    }
  }

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
  const matriculaAlumnos = getTableFromDb(caseId, 'Matricula.Matricula_Alumno')
  const matriculaAlumnoMap = new Map<number, any>(matriculaAlumnos.map((ma: any) => [ma.id, ma]))
  const matriculas = getTableFromDb(caseId, 'Matricula.Matricula_Alumno_Curso')
  const alumnos = getTableFromDb(caseId, 'Academico.Alumno')
  const personas = getTableFromDb(caseId, 'General.Persona')

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
    if (p.IdPersona) utbMap.set(String(p.IdPersona).trim(), p)
    if (p.Documento) utbMap.set(String(p.Documento).trim(), p)
    if (p.Codigo) utbMap.set(String(p.Codigo).trim(), p)
  }

  // Student lookup map from Academico.Alumno + General.Persona
  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const alumnoMap = new Map<number, EnrolledStudent>()
  for (const a of alumnos) {
    const p = a.persona_id ? personaMap.get(a.persona_id) : null
    const first = (p?.nombre || '').trim()
    const pat = (p?.apellido_paterno || '').trim()
    const mat = (p?.apellido_materno || '').trim()
    const fullName = [first, pat, mat].filter(Boolean).join(' ') || `Estudiante ${a.codigo_alumno}`
    const codigo = String(a.codigo_alumno || '').trim()
    const email =
      a.email_principal && String(a.email_principal).includes('@')
        ? String(a.email_principal).trim()
        : `${codigo}@politecnica.edu.pe`

    let carreraId: number | undefined = undefined
    if (a.sede_carrera_id) {
      const sc = sedeCarreraMap.get(a.sede_carrera_id)
      if (sc?.carrera_id) carreraId = sc.carrera_id
    }
    if (!carreraId && a.plan_id) {
      const pl = planMap.get(a.plan_id)
      if (pl?.carrera_id) carreraId = pl.carrera_id
    }
    const carr = carreraId ? carreraMap.get(carreraId) : undefined
    const carreraNombre = carr?.nombre ? String(carr.nombre).trim() : undefined
    const carreraCodigo = carr?.cod_carrera ? String(carr.cod_carrera).trim() : undefined

    alumnoMap.set(a.id, {
      id: a.id,
      codigo,
      fullName,
      email,
      carreraId,
      carreraCodigo,
      carreraNombre,
    })
  }

  // Students by Horario ID
  const studentsByHorario = new Map<number, EnrolledStudent[]>()
  for (const m of matriculas) {
    const hid = m.carga_academica_sede_curso_horario_id
    if (!hid) continue
    const ma = matriculaAlumnoMap.get(m.matricula_alumno_id)
    if (!ma) continue

    let stu = ma.alumno_id ? alumnoMap.get(ma.alumno_id) : undefined

    // Resolve student career: prefer ma.carrera_id, then ma.plan_id, then stu
    let carreraId: number | undefined = undefined
    if (ma.carrera_id) {
      carreraId = Number(ma.carrera_id)
    } else if (ma.plan_id) {
      const pl = planMap.get(ma.plan_id)
      if (pl?.carrera_id) carreraId = pl.carrera_id
    } else if (stu?.carreraId) {
      carreraId = stu.carreraId
    }

    const carr = carreraId ? carreraMap.get(carreraId) : undefined
    const carreraNombre = carr?.nombre ? String(carr.nombre).trim() : stu?.carreraNombre
    const carreraCodigo = carr?.cod_carrera ? String(carr.cod_carrera).trim() : stu?.carreraCodigo

    if (!stu && ma.codalumno) {
      const codigo = String(ma.codalumno).trim()
      stu = {
        id: ma.alumno_id || ma.id,
        codigo,
        fullName: String(ma.nomalumno || `Estudiante ${codigo}`).trim(),
        email: `${codigo}@politecnica.edu.pe`,
        carreraId,
        carreraCodigo,
        carreraNombre,
      }
    } else if (stu) {
      if (carreraNombre && (!stu.carreraNombre || stu.carreraNombre !== carreraNombre)) {
        stu = {
          ...stu,
          carreraId: carreraId || stu.carreraId,
          carreraCodigo: carreraCodigo || stu.carreraCodigo,
          carreraNombre: carreraNombre || stu.carreraNombre,
        }
      }
    }
    if (!stu) continue

    let list = studentsByHorario.get(hid)
    if (!list) {
      list = []
      studentsByHorario.set(hid, list)
    }
    list.push(stu)
  }

  // Teachers by Horario ID
  const teachersByHorario = new Map<number, EnrolledTeacher[]>()
  for (const d of detalles) {
    if (!d.docente_id) continue
    const hid = d.carga_academica_sede_curso_horario_id
    if (!hid) continue
    let list = teachersByHorario.get(hid)
    if (!list) {
      list = []
      teachersByHorario.set(hid, list)
    }
    const rawP = utbMap.get(String(d.docente_id))
    if (rawP) {
      const first = (rawP.Nombres || rawP.nombres || '').trim()
      const paternal = (rawP.ApellidoPaterno || rawP.apellido_paterno || '').trim()
      const maternal = (rawP.ApellidoMaterno || rawP.apellido_materno || '').trim()
      const fullName = [first, paternal, maternal].filter(Boolean).join(' ') || `Docente ${d.docente_id}`
      const dni = (rawP.Documento || rawP.documento || rawP.Codigo || '').trim()
      const email = (rawP.CorreoCorporativo || rawP.CorreoPersonal || '').trim()
      if (!list.some((t) => t.dni === dni && t.fullName === fullName)) {
        list.push({ dni, fullName, email })
      }
    } else {
      // Fallback: check if docente_id matches an assistant/student in alumnoMap or personaMap
      const stuMatch = alumnoMap.get(Number(d.docente_id))
      if (stuMatch) {
        if (!list.some((t) => t.fullName === stuMatch.fullName)) {
          list.push({
            dni: stuMatch.codigo,
            fullName: stuMatch.fullName,
            email: stuMatch.email,
          })
        }
      } else {
        const perMatch = personaMap.get(Number(d.docente_id))
        if (perMatch) {
          const first = (perMatch.nombre || '').trim()
          const pat = (perMatch.apellido_paterno || '').trim()
          const mat = (perMatch.apellido_materno || '').trim()
          const fullName = [first, pat, mat].filter(Boolean).join(' ') || `Docente ${d.docente_id}`
          const dni = (perMatch.nro_documento || '').trim()
          const email = (perMatch.email || '').trim()
          if (!list.some((t) => t.fullName === fullName)) {
            list.push({ dni, fullName, email })
          }
        } else {
          const fallbackName = `Docente ${d.docente_id}`
          if (!list.some((t) => t.fullName === fallbackName)) {
            list.push({
              dni: '',
              fullName: fallbackName,
              email: '',
            })
          }
        }
      }
    }
  }

  // Grupos by Horario ID (from Carga_Academica_Sede_Curso_Horario_Detalle)
  const gruposByHorario = new Map<number, string>()
  for (const d of detalles) {
    if (d.grupo && typeof d.grupo === 'string' && d.grupo.trim().length > 0) {
      const hid = d.carga_academica_sede_curso_horario_id
      if (hid && !gruposByHorario.has(hid)) {
        gruposByHorario.set(hid, d.grupo.trim())
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
  const fullItems: HierarchyItem[] = []
  const studentsByCargaCurso = new Map<number, EnrolledStudent[]>()
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
    const sectionStudentsMap = new Map<string, EnrolledStudent>()
    const sectionTeachersMap = new Map<string, EnrolledTeacher>()

    let grupoCodigo: string | null = null
    for (const h of hs) {
      if (!grupoCodigo) {
        const g = gruposByHorario.get(h.id)
        if (g) grupoCodigo = g
      }
      const hStudents = studentsByHorario.get(h.id) || []
      for (const s of hStudents) {
        const key = s.codigo || String(s.id)
        if (!sectionStudentsMap.has(key)) {
          sectionStudentsMap.set(key, s)
        }
      }

      const hTeachers = teachersByHorario.get(h.id) || []
      for (const t of hTeachers) {
        const key = t.dni || t.fullName
        if (!sectionTeachersMap.has(key)) {
          sectionTeachersMap.set(key, t)
        }
      }
    }

    const sectionStudents = Array.from(sectionStudentsMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    )
    const sectionTeachers = Array.from(sectionTeachersMap.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    )
    const primaryTeacher = sectionTeachers[0] || null

    const sedeId = sede?.id ?? 0
    const sedeCodigo = sede?.cod_sede ? String(sede.cod_sede).trim() : `S-${sedeId}`
    const sedeNombre = sede?.nombre || 'Sin Sede'
    const facultadId = facultad?.id ?? 0
    const facultadCodigo = facultad?.cod_facultad ? String(facultad.cod_facultad).trim() : `F-${facultadId}`
    const facultadNombre = facultad?.nombre || 'Sin Facultad'
    const carreraId = carrera?.id ?? 0
    const carreraCodigo = carrera?.cod_carrera ? String(carrera.cod_carrera).trim() : `C-${carreraId}`
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

    // Registrar en mapa en memoria O(1) de alumnos para carga bajo demanda inmediata
    studentsByCargaCurso.set(cc.id, sectionStudents)

    const baseItem: HierarchyItem = {
      id: cc.id,
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      periodoSufijo: periodo.sufijo || '',
      sedeId,
      sedeCodigo,
      sedeNombre,
      modalidadId: sc.cat_modalidad_id,
      modalidadNombre: modalidad,
      facultadId,
      facultadCodigo,
      facultadNombre,
      carreraId,
      carreraCodigo,
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
      estudiantesCount: sectionStudents.length,
      docenteNombre: primaryTeacher ? primaryTeacher.fullName : 'Sin Asignar',
      docenteDni: primaryTeacher ? primaryTeacher.dni : '',
      docenteEmail: primaryTeacher ? primaryTeacher.email : '',
      docentes: sectionTeachers,
      estudiantes: [], // Payload optimizado: estudiantes se cargan bajo demanda (lazy loading)
      grupoCodigo,
    }

    items.push(baseItem)
    fullItems.push({
      ...baseItem,
      estudiantes: sectionStudents,
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

  const result: CachedHierarchyCase = {
    items,
    fullItems,
    filters,
    studentsByCargaCurso,
  }
  hierarchyCache.set(caseId, result)

  return {
    items: includeStudents ? fullItems : items,
    filters,
  }
}

export function getSectionEnrolledStudents(caseId: string, cargaCursoId: number): EnrolledStudent[] {
  let cached = hierarchyCache.get(caseId)
  if (!cached) {
    getCaseHierarchyData(caseId, false)
    cached = hierarchyCache.get(caseId)
  }

  if (cached?.studentsByCargaCurso) {
    return cached.studentsByCargaCurso.get(cargaCursoId) || []
  }

  return []
}
