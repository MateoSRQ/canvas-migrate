import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getTableFromDb } from './db-helpers'
import {
  getCaseHierarchyData,
  type HierarchyItem,
} from './hierarchy-service'
import { getModalidadCode } from '#/lib/utils'

const execFileAsync = promisify(execFile)

export type SandboxPrefixMode = 'none' | 'accounts' | 'all'

export interface ExportCanvasInput {
  caseId: string
  selectedSectionIds: number[] // Carga_Academica_Sede_Curso.id
  rootAccountId?: string // Subcuenta inicial o raíz en Canvas (opcional)
  createRootAccount?: boolean // Si se debe crear la subcuenta raíz como nueva en accounts.csv
  rootAccountName?: string // Nombre descriptivo para la subcuenta raíz (opcional)
  isolateAccountPrefix?: boolean // Compatibilidad hacia atrás (equivalente a prefixMode: 'accounts')
  prefixMode?: SandboxPrefixMode // Modo de prefijo: 'none' | 'accounts' | 'all'
  enableCrosslisting?: boolean // Habilitar generación de xlists.csv para secciones con grupo (por defecto true)
}

export interface ExportCanvasResult {
  success: boolean
  destinationDir: string
  folderName: string
  periodName: string
  timestamp: string
  rootAccountId?: string
  rootAccountCreated?: boolean
  prefixMode: SandboxPrefixMode
  accountPrefix?: string
  files: { name: string; sizeBytes: number; rowsCount: number }[]
  stats: {
    accountsCount: number
    termsCount: number
    coursesCount: number
    sectionsCount: number
    usersCount: number
    teachersCount: number
    studentsCount: number
    enrollmentsCount: number
    xlistsCount: number
    xlistGroupsCount: number
  }
}

function toCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return ''
      const str = String(v)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    .join(',')
}

function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`
}

function sanitizePath(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
}

export async function exportSelectedToCanvasCsv(
  input: ExportCanvasInput
): Promise<ExportCanvasResult> {
  const { caseId, selectedSectionIds } = input

  if (!selectedSectionIds || selectedSectionIds.length === 0) {
    throw new Error('Debe seleccionar al menos una sección para exportar.')
  }

  const selectedSet = new Set(selectedSectionIds)

  // 1. Obtener la jerarquía completa del caso con estudiantes incluidos
  const hierarchy = getCaseHierarchyData(caseId, true)
  const selectedItems = hierarchy.items.filter((it) => selectedSet.has(it.id))

  if (selectedItems.length === 0) {
    throw new Error('No se encontraron registros coincidentes con los IDs seleccionados.')
  }

  // Cargar tablas auxiliares para códigos oficiales
  const sedesRaw = getTableFromDb(caseId, 'General.Sede')
  const facultadesRaw = getTableFromDb(caseId, 'General.Facultad')
  const carrerasRaw = getTableFromDb(caseId, 'General.Carrera')
  const periodosRaw = getTableFromDb(caseId, 'General.Periodo')
  const cursosRaw = getTableFromDb(caseId, 'Academico.Curso')

  const sedeCodeMap = new Map<number, string>()
  for (const s of sedesRaw) {
    if (s.id !== undefined) {
      sedeCodeMap.set(s.id, s.cod_sede ? String(s.cod_sede).trim() : `S-${s.id}`)
    }
  }

  const facultadCodeMap = new Map<number, string>()
  for (const f of facultadesRaw) {
    if (f.id !== undefined) {
      facultadCodeMap.set(f.id, f.cod_facultad ? String(f.cod_facultad).trim() : `F-${f.id}`)
    }
  }

  const carreraCodeMap = new Map<number, string>()
  for (const c of carrerasRaw) {
    if (c.id !== undefined) {
      carreraCodeMap.set(c.id, c.cod_carrera ? String(c.cod_carrera).trim() : `C-${c.id}`)
    }
  }

  const periodoRawMap = new Map<number, any>()
  for (const p of periodosRaw) {
    if (p.id !== undefined) periodoRawMap.set(p.id, p)
  }

  const cursoRawMap = new Map<number, any>()
  for (const c of cursosRaw) {
    if (c.id !== undefined) cursoRawMap.set(c.id, c)
  }

  // 2. Determinar nombre de periodo y timestamp para el directorio
  const primaryPeriodName = selectedItems[0]?.periodoNombre || 'PERIODO'
  const sanitizedPeriod = sanitizePath(primaryPeriodName)
  const timestampStr = formatTimestamp(new Date())
  const folderName = `${sanitizedPeriod} - ${timestampStr}`

  // Directorio destino: /home/mateo/projects/canvas-migrate/migraciones/[nombre de periodo - timestamp]
  const baseMigrationsDir = path.join(process.cwd(), 'migraciones')
  const targetDir = path.join(baseMigrationsDir, folderName)

  await fs.mkdir(targetDir, { recursive: true })

  // 3. Estructurar Cuentas (accounts.csv)
  interface AccountRow {
    account_id: string
    parent_account_id: string
    name: string
    status: string
  }

  const cleanRootAccountId = input.rootAccountId ? input.rootAccountId.trim() : ''
  const shouldCreateRootAccount = Boolean(input.createRootAccount && cleanRootAccountId)
  const rootAccountName = input.rootAccountName?.trim() || cleanRootAccountId

  const prefixMode: SandboxPrefixMode =
    input.prefixMode ||
    (input.isolateAccountPrefix ? 'accounts' : 'none')
  const shouldPrefixAccounts = Boolean(
    cleanRootAccountId && (prefixMode === 'accounts' || prefixMode === 'all')
  )
  const shouldPrefixCourses = Boolean(cleanRootAccountId && prefixMode === 'all')
  const accPrefix = shouldPrefixAccounts ? `${cleanRootAccountId}_` : ''
  const coursePrefix = shouldPrefixCourses ? `${cleanRootAccountId}_` : ''

  const accountsMap = new Map<string, AccountRow>()
  const rootOrder: AccountRow[] = []
  const sedesOrder: AccountRow[] = []
  const facultadesOrder: AccountRow[] = []
  const carrerasOrder: AccountRow[] = []
  const planesOrder: AccountRow[] = []

  // Si se solicita crear la subcuenta raíz en Canvas LMS (cuenta padre de las sedes)
  if (shouldCreateRootAccount) {
    const rootRow: AccountRow = {
      account_id: cleanRootAccountId,
      parent_account_id: '', // Se crea en la raíz institucional de Canvas
      name: rootAccountName,
      status: 'active',
    }
    accountsMap.set(cleanRootAccountId, rootRow)
    rootOrder.push(rootRow)
  }

  for (const it of selectedItems) {
    const rawSedeAccId = it.sedeCodigo || sedeCodeMap.get(it.sedeId) || `S-${it.sedeId}`
    const sedeAccId = accPrefix ? `${accPrefix}${rawSedeAccId}` : rawSedeAccId
    if (!accountsMap.has(sedeAccId)) {
      const row: AccountRow = {
        account_id: sedeAccId,
        parent_account_id: cleanRootAccountId,
        name: it.sedeNombre.trim(),
        status: 'active',
      }
      accountsMap.set(sedeAccId, row)
      sedesOrder.push(row)
    }

    const facCode = it.facultadCodigo || facultadCodeMap.get(it.facultadId) || `F-${it.facultadId}`
    const rawFacAccId = facCode.startsWith('F-') ? facCode : `F-${facCode}`
    const facAccId = accPrefix ? `${accPrefix}${rawFacAccId}` : rawFacAccId
    if (!accountsMap.has(facAccId)) {
      const row: AccountRow = {
        account_id: facAccId,
        parent_account_id: sedeAccId,
        name: it.facultadNombre.trim(),
        status: 'active',
      }
      accountsMap.set(facAccId, row)
      facultadesOrder.push(row)
    }

    const carrCode = it.carreraCodigo || carreraCodeMap.get(it.carreraId) || `C-${it.carreraId}`
    const rawCarrAccId = carrCode.startsWith('C-') ? carrCode : `C-${carrCode}`
    const carrAccId = accPrefix ? `${accPrefix}${rawCarrAccId}` : rawCarrAccId
    if (!accountsMap.has(carrAccId)) {
      const row: AccountRow = {
        account_id: carrAccId,
        parent_account_id: facAccId,
        name: it.carreraNombre.trim(),
        status: 'active',
      }
      accountsMap.set(carrAccId, row)
      carrerasOrder.push(row)
    }

    const rawPlanAccId = it.planCodigo ? it.planCodigo.trim() : `P-${it.planId}`
    const planAccId = accPrefix ? `${accPrefix}${rawPlanAccId}` : rawPlanAccId
    if (!accountsMap.has(planAccId)) {
      const row: AccountRow = {
        account_id: planAccId,
        parent_account_id: carrAccId,
        name: it.planNombre.trim(),
        status: 'active',
      }
      accountsMap.set(planAccId, row)
      planesOrder.push(row)
    }
  }

  // Orden topológico: Subcuenta raíz personalizada (si se crea) -> Sedes -> Facultades -> Carreras -> Planes
  const sortedAccounts = [
    ...rootOrder,
    ...sedesOrder,
    ...facultadesOrder,
    ...carrerasOrder,
    ...planesOrder,
  ]

  const accountsCsvLines = [
    toCsvRow(['account_id', 'parent_account_id', 'name', 'status']),
    ...sortedAccounts.map((a) => toCsvRow([a.account_id, a.parent_account_id, a.name, a.status])),
  ]
  await fs.writeFile(path.join(targetDir, 'accounts.csv'), accountsCsvLines.join('\n'), 'utf8')

  // 4. Periodos Académicos (terms.csv)
  interface TermRow {
    term_id: string
    name: string
    status: string
    start_date: string
    end_date: string
  }

  const termsMap = new Map<number, TermRow>()
  for (const it of selectedItems) {
    if (!termsMap.has(it.periodoId)) {
      const rawP = periodoRawMap.get(it.periodoId)
      termsMap.set(it.periodoId, {
        term_id: `T-${it.periodoId}`,
        name: it.periodoNombre.trim(),
        status: 'active',
        start_date: rawP?.fecha_inicio ? String(rawP.fecha_inicio).slice(0, 10) : '',
        end_date: rawP?.fecha_fin ? String(rawP.fecha_fin).slice(0, 10) : '',
      })
    }
  }

  const termsList = Array.from(termsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  const termsCsvLines = [
    toCsvRow(['term_id', 'name', 'status', 'start_date', 'end_date']),
    ...termsList.map((t) => toCsvRow([t.term_id, t.name, t.status, t.start_date, t.end_date])),
  ]
  await fs.writeFile(path.join(targetDir, 'terms.csv'), termsCsvLines.join('\n'), 'utf8')

  // 5. Cursos (courses.csv)
  interface CourseRow {
    course_id: string
    short_name: string
    long_name: string
    account_id: string
    term_id: string
    status: string
    start_date: string
    end_date: string
    course_format: string
    blueprint_course_id: string
  }

  const coursesMap = new Map<string, CourseRow>()
  for (const it of selectedItems) {
    const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
    const rawCourseId = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
    const courseId = coursePrefix ? `${coursePrefix}${rawCourseId}` : rawCourseId
    const rawPlanAccId = it.planCodigo ? it.planCodigo.trim() : `P-${it.planId}`
    const planAccId = accPrefix ? `${accPrefix}${rawPlanAccId}` : rawPlanAccId
    const rawCurso = cursoRawMap.get(it.cursoId)
    const shortName = rawCurso?.abreviatura
      ? `${modCode} - ${String(rawCurso.abreviatura).trim()} - ${it.seccionNombre.trim()}`
      : (coursePrefix ? `${coursePrefix}${rawCourseId}` : rawCourseId)
    const longName = `${modCode} - ${it.cursoNombre.trim()} - ${it.seccionNombre.trim()}`

    if (!coursesMap.has(courseId)) {
      coursesMap.set(courseId, {
        course_id: courseId,
        short_name: shortName,
        long_name: longName,
        account_id: planAccId,
        term_id: `T-${it.periodoId}`,
        status: 'active',
        start_date: '',
        end_date: '',
        course_format: 'online',
        blueprint_course_id: '',
      })
    }
  }

  // 5.1 Agrupaciones y Cursos Contenedores Cross-listing (xlists.csv)
  interface XlistRow {
    xlist_course_id: string
    section_id: string
    status: string
  }

  const xlistsMap = new Map<string, XlistRow>()
  const xlistGroupsMap = new Map<string, HierarchyItem[]>()

  if (input.enableCrosslisting !== false) {
    for (const it of selectedItems) {
      if (it.grupoCodigo && it.grupoCodigo.trim().length > 0) {
        const g = it.grupoCodigo.trim()
        if (!xlistGroupsMap.has(g)) xlistGroupsMap.set(g, [])
        xlistGroupsMap.get(g)!.push(it)
      }
    }

    for (const [grupo, groupItems] of xlistGroupsMap.entries()) {
      // Si el grupo tiene 2 o más secciones seleccionadas, crear curso contenedor maestro y mapear xlist
      if (groupItems.length >= 2) {
        const rawXlistCourseId = `GRP_${grupo}`
        const xlistCourseId = coursePrefix ? `${coursePrefix}${rawXlistCourseId}` : rawXlistCourseId
        const firstIt = groupItems[0]
        const rawPlanAccId = firstIt.planCodigo ? firstIt.planCodigo.trim() : `P-${firstIt.planId}`
        const planAccId = accPrefix ? `${accPrefix}${rawPlanAccId}` : rawPlanAccId

        // Registrar curso maestro contenedor en courses.csv si no existe
        if (!coursesMap.has(xlistCourseId)) {
          coursesMap.set(xlistCourseId, {
            course_id: xlistCourseId,
            short_name: grupo,
            long_name: `[GRUPO ${grupo}] ${firstIt.cursoNombre.trim()}`,
            account_id: planAccId,
            term_id: `T-${firstIt.periodoId}`,
            status: 'active',
            start_date: '',
            end_date: '',
            course_format: 'online',
            blueprint_course_id: '',
          })
        }

        // Mapear cada sección del grupo hacia el curso contenedor
        for (const it of groupItems) {
          const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
          const rawCourseId = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
          const rawSectionId = `${it.seccionId}-${rawCourseId}`
          const sectionId = coursePrefix ? `${coursePrefix}${rawSectionId}` : rawSectionId
          xlistsMap.set(sectionId, {
            xlist_course_id: xlistCourseId,
            section_id: sectionId,
            status: 'active',
          })
        }
      }
    }
  }

  const coursesList = Array.from(coursesMap.values()).sort((a, b) =>
    a.course_id.localeCompare(b.course_id)
  )
  const coursesCsvLines = [
    toCsvRow([
      'course_id',
      'short_name',
      'long_name',
      'account_id',
      'term_id',
      'status',
      'start_date',
      'end_date',
      'course_format',
      'blueprint_course_id',
    ]),
    ...coursesList.map((c) =>
      toCsvRow([
        c.course_id,
        c.short_name,
        c.long_name,
        c.account_id,
        c.term_id,
        c.status,
        c.start_date,
        c.end_date,
        c.course_format,
        c.blueprint_course_id,
      ])
    ),
  ]
  await fs.writeFile(path.join(targetDir, 'courses.csv'), coursesCsvLines.join('\n'), 'utf8')

  // 6. Secciones (sections.csv)
  interface SectionRow {
    section_id: string
    course_id: string
    name: string
    status: string
    start_date: string
    end_date: string
  }

  const sectionsMap = new Map<string, SectionRow>()
  for (const it of selectedItems) {
    const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
    const rawCourseId = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
    const courseId = coursePrefix ? `${coursePrefix}${rawCourseId}` : rawCourseId
    const rawSectionId = `${it.seccionId}-${rawCourseId}`
    const sectionId = coursePrefix ? `${coursePrefix}${rawSectionId}` : rawSectionId
    if (!sectionsMap.has(sectionId)) {
      sectionsMap.set(sectionId, {
        section_id: sectionId,
        course_id: courseId,
        name: it.seccionNombre.trim(),
        status: 'active',
        start_date: '',
        end_date: '',
      })
    }
  }

  const sectionsList = Array.from(sectionsMap.values()).sort((a, b) =>
    a.section_id.localeCompare(b.section_id)
  )
  const sectionsCsvLines = [
    toCsvRow(['section_id', 'course_id', 'name', 'status', 'start_date', 'end_date']),
    ...sectionsList.map((s) =>
      toCsvRow([s.section_id, s.course_id, s.name, s.status, s.start_date, s.end_date])
    ),
  ]
  await fs.writeFile(path.join(targetDir, 'sections.csv'), sectionsCsvLines.join('\n'), 'utf8')

  // 6.1 Combinaciones de Secciones y Cross-listing (xlists.csv)
  const xlistsList = Array.from(xlistsMap.values()).sort((a, b) => {
    const c = a.xlist_course_id.localeCompare(b.xlist_course_id)
    if (c !== 0) return c
    return a.section_id.localeCompare(b.section_id)
  })

  if (xlistsList.length > 0) {
    const xlistsCsvLines = [
      toCsvRow(['xlist_course_id', 'section_id', 'status']),
      ...xlistsList.map((x) => toCsvRow([x.xlist_course_id, x.section_id, x.status])),
    ]
    await fs.writeFile(path.join(targetDir, 'xlists.csv'), xlistsCsvLines.join('\n'), 'utf8')
  }

  // 7. Usuarios (users.csv)
  interface UserRow {
    user_id: string
    integration_id: string
    login_id: string
    password: string
    first_name: string
    last_name: string
    full_name: string
    sortable_name: string
    short_name: string
    email: string
    status: string
  }

  const usersMap = new Map<string, UserRow>()
  let teachersCount = 0
  let studentsCount = 0

  for (const it of selectedItems) {
    // A. Docentes
    for (const doc of it.docentes) {
      const teacherUserId = doc.dni ? doc.dni.trim() : ''
      if (!teacherUserId) continue

      if (!usersMap.has(teacherUserId)) {
        teachersCount++
        const email =
          doc.email && doc.email.includes('@')
            ? doc.email.trim()
            : `${teacherUserId}@politecnica.edu.pe`
        const fullName = doc.fullName.trim()
        usersMap.set(teacherUserId, {
          user_id: teacherUserId,
          integration_id: '',
          login_id: email,
          password: '',
          first_name: '',
          last_name: '',
          full_name: fullName,
          sortable_name: fullName,
          short_name: fullName,
          email,
          status: 'active',
        })
      }
    }

    // B. Estudiantes
    for (const est of it.estudiantes) {
      const studentUserId = est.codigo ? est.codigo.trim() : ''
      if (!studentUserId) continue

      if (!usersMap.has(studentUserId)) {
        studentsCount++
        const email =
          est.email && est.email.includes('@')
            ? est.email.trim()
            : `${studentUserId}@politecnica.edu.pe`
        const fullName = est.fullName.trim()
        usersMap.set(studentUserId, {
          user_id: studentUserId,
          integration_id: '',
          login_id: email,
          password: '',
          first_name: '',
          last_name: '',
          full_name: fullName,
          sortable_name: fullName,
          short_name: fullName,
          email,
          status: 'active',
        })
      }
    }
  }

  const usersList = Array.from(usersMap.values()).sort((a, b) =>
    a.user_id.localeCompare(b.user_id)
  )
  const usersCsvLines = [
    toCsvRow([
      'user_id',
      'integration_id',
      'login_id',
      'password',
      'first_name',
      'last_name',
      'full_name',
      'sortable_name',
      'short_name',
      'email',
      'status',
    ]),
    ...usersList.map((u) =>
      toCsvRow([
        u.user_id,
        u.integration_id,
        u.login_id,
        u.password,
        u.first_name,
        u.last_name,
        u.full_name,
        u.sortable_name,
        u.short_name,
        u.email,
        u.status,
      ])
    ),
  ]
  await fs.writeFile(path.join(targetDir, 'users.csv'), usersCsvLines.join('\n'), 'utf8')

  // 8. Matrículas / Asignaciones (enrollments.csv)
  interface EnrollmentRow {
    course_id: string
    root_account: string
    user_id: string
    role: string
    role_id: string
    section_id: string
    status: string
    associated_user_id: string
    limit_section_privileges: string
  }

  const enrollmentsMap = new Map<string, EnrollmentRow>()

  for (const it of selectedItems) {
    const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
    const rawCourseId = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
    const courseId = coursePrefix ? `${coursePrefix}${rawCourseId}` : rawCourseId
    const rawSectionId = `${it.seccionId}-${rawCourseId}`
    const sectionId = coursePrefix ? `${coursePrefix}${rawSectionId}` : rawSectionId

    // Docentes
    for (const doc of it.docentes) {
      const teacherUserId = doc.dni ? doc.dni.trim() : ''
      if (!teacherUserId) continue
      const key = `${courseId}-${teacherUserId}-${sectionId}-teacher`
      if (!enrollmentsMap.has(key)) {
        enrollmentsMap.set(key, {
          course_id: courseId,
          root_account: '',
          user_id: teacherUserId,
          role: 'teacher',
          role_id: '',
          section_id: sectionId,
          status: 'active',
          associated_user_id: '',
          limit_section_privileges: '',
        })
      }
    }

    // Estudiantes
    for (const est of it.estudiantes) {
      const studentUserId = est.codigo ? est.codigo.trim() : ''
      if (!studentUserId) continue
      const key = `${courseId}-${studentUserId}-${sectionId}-student`
      if (!enrollmentsMap.has(key)) {
        enrollmentsMap.set(key, {
          course_id: courseId,
          root_account: '',
          user_id: studentUserId,
          role: 'student',
          role_id: '',
          section_id: sectionId,
          status: 'active',
          associated_user_id: '',
          limit_section_privileges: '',
        })
      }
    }
  }

  const enrollmentsList = Array.from(enrollmentsMap.values()).sort((a, b) => {
    const cDiff = a.course_id.localeCompare(b.course_id)
    if (cDiff !== 0) return cDiff
    return a.user_id.localeCompare(b.user_id)
  })

  const enrollmentsCsvLines = [
    toCsvRow([
      'course_id',
      'root_account',
      'user_id',
      'role',
      'role_id',
      'section_id',
      'status',
      'associated_user_id',
      'limit_section_privileges',
    ]),
    ...enrollmentsList.map((e) =>
      toCsvRow([
        e.course_id,
        e.root_account,
        e.user_id,
        e.role,
        e.role_id,
        e.section_id,
        e.status,
        e.associated_user_id,
        e.limit_section_privileges,
      ])
    ),
  ]
  await fs.writeFile(path.join(targetDir, 'enrollments.csv'), enrollmentsCsvLines.join('\n'), 'utf8')

  // 9. Generar archivo visual hierarchy.txt
  const treeLines: string[] = [
    `# =========================================================================`,
    `# ARBOL JERARQUICO DE MIGRACION A CANVAS LMS`,
    `# Periodo: ${primaryPeriodName}`,
    ...(cleanRootAccountId
      ? [
          `# Subcuenta Inicial Canvas (parent_account_id): ${cleanRootAccountId} (${shouldCreateRootAccount ? `Creada como "${rootAccountName}"` : 'Existente en Canvas'})`,
          ...(prefixMode !== 'none'
            ? [
                `# Modo Aislamiento / Prefijo: ${
                  prefixMode === 'all'
                    ? `TOTAL (Cuentas, Cursos y Secciones prefijados con "${coursePrefix}")`
                    : `CUENTAS (Subcuentas prefijadas con "${accPrefix}")`
                }`,
              ]
            : []),
        ]
      : []),
    `# Fecha de exportación: ${new Date().toLocaleString('es-ES')}`,
    `# Total secciones: ${selectedItems.length} | Cursos: ${coursesList.length}`,
    `# =========================================================================`,
    ``,
  ]

  // Agrupar items por estructura jerárquica para hierarchy.txt (Sede -> Facultad -> Carrera -> Plan -> Curso -> Sección)
  const periodoGroup = new Map<string, any>()
  for (const it of selectedItems) {
    const pKey = it.periodoNombre
    if (!periodoGroup.has(pKey)) periodoGroup.set(pKey, new Map())
    const sedesG = periodoGroup.get(pKey)!

    const sKey = it.sedeNombre
    if (!sedesG.has(sKey)) sedesG.set(sKey, new Map())
    const facG = sedesG.get(sKey)!

    const fKey = it.facultadNombre
    if (!facG.has(fKey)) facG.set(fKey, new Map())
    const carrG = facG.get(fKey)!

    const cKey = it.carreraNombre
    if (!carrG.has(cKey)) carrG.set(cKey, new Map())
    const planG = carrG.get(cKey)!

    const plKey = `${it.planCodigo} - ${it.planNombre}`
    if (!planG.has(plKey)) planG.set(plKey, new Map())
    const curG = planG.get(plKey)!

    const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
    const rawCurCode = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
    const curCode = coursePrefix ? `${coursePrefix}${rawCurCode}` : rawCurCode
    const curKey = `${curCode} - ${modCode} - ${it.cursoNombre.trim()} - ${it.seccionNombre.trim()}`
    if (!curG.has(curKey)) curG.set(curKey, [])
    curG.get(curKey)!.push(it)
  }

  for (const [pName, sedesG] of periodoGroup) {
    treeLines.push(`[PERIODO] ${pName}`)
    if (shouldCreateRootAccount) {
      treeLines.push(`\t[SUBCUENTA RAÍZ CREADA] ${cleanRootAccountId}: ${rootAccountName}`)
    } else if (cleanRootAccountId) {
      treeLines.push(`\t[SUBCUENTA INICIAL EXISTENTE] ${cleanRootAccountId}`)
    }
    const rootIndent = cleanRootAccountId ? '\t' : ''
    for (const [sName, facG] of sedesG) {
      treeLines.push(`\t${rootIndent}[CUENTA] ${sName}`)
      for (const [fName, carrG] of facG) {
        treeLines.push(`\t\t${rootIndent}[SUBCUENTA] ${fName}`)
        for (const [cName, planG] of carrG) {
          treeLines.push(`\t\t\t${rootIndent}[SUBCUENTA] ${cName}`)
          for (const [plName, curG] of planG) {
            treeLines.push(`\t\t\t\t${rootIndent}[SUBCUENTA PLAN] ${plName}`)
            for (const [curName, secs] of curG) {
              treeLines.push(`\t\t\t\t\t${rootIndent}[CURSO] ${curName}`)
              for (const s of secs as HierarchyItem[]) {
                const sModCode = getModalidadCode(s.modalidadId, s.modalidadNombre)
                const rawSecCourseId = `${sModCode}-${s.cursoCodigo.trim()}-${s.seccionNombre.trim()}`
                const rawSecId = `${s.seccionId}-${rawSecCourseId}`
                const secId = coursePrefix ? `${coursePrefix}${rawSecId}` : rawSecId
                treeLines.push(
                  `\t\t\t\t\t\t${rootIndent}[SECCION] ${s.seccionNombre} (SEC: ${secId})${s.grupoCodigo ? ` [GRUPO: ${s.grupoCodigo}]` : ''} - ${s.estudiantes.length} alumnos`
                )
                const seenDocKeys = new Set<string>()
                for (const d of s.docentes) {
                  const key = d.dni ? d.dni.trim() : d.fullName.trim()
                  if (seenDocKeys.has(key)) continue
                  seenDocKeys.add(key)
                  treeLines.push(
                    `\t\t\t\t\t\t\t${rootIndent}(D) [DOCENTE] DNI:${d.dni} - ${d.fullName} <${d.email}>`
                  )
                }
                const seenEstKeys = new Set<string>()
                for (const e of s.estudiantes) {
                  const key = e.codigo ? e.codigo.trim() : e.fullName.trim()
                  if (seenEstKeys.has(key)) continue
                  seenEstKeys.add(key)
                  treeLines.push(
                    `\t\t\t\t\t\t\t${rootIndent}(E) [ESTUDIANTE] COD:${e.codigo} - ${e.fullName} <${e.email}>`
                  )
                }
              }
            }
          }
        }
      }
    }
  }

  if (xlistsList.length > 0) {
    treeLines.push('')
    treeLines.push('# =========================================================================')
    treeLines.push('# SECCIONES COMBINADAS Y CROSS-LISTING (xlists.csv)')
    treeLines.push(`# Total combinaciones: ${xlistsList.length} | Grupos: ${xlistGroupsMap.size}`)
    treeLines.push('# =========================================================================')
    for (const [g, gItems] of xlistGroupsMap.entries()) {
      if (gItems.length >= 2) {
        const rawXlistId = `GRP_${g}`
        const xlistId = coursePrefix ? `${coursePrefix}${rawXlistId}` : rawXlistId
        treeLines.push(`[CURSO MAESTRO / CONTENEDOR] ${xlistId} - GRUPO ${g}`)
        for (const item of gItems) {
          const itemModCode = getModalidadCode(item.modalidadId, item.modalidadNombre)
          const rawItemCourseId = `${itemModCode}-${item.cursoCodigo.trim()}-${item.seccionNombre.trim()}`
          const rawSecId = `${item.seccionId}-${rawItemCourseId}`
          const secId = coursePrefix ? `${coursePrefix}${rawSecId}` : rawSecId
          treeLines.push(
            `\t-> [SECCION COMBINADA] ${secId} (${item.seccionNombre}) - Curso: ${rawItemCourseId} "${itemModCode} - ${item.cursoNombre.trim()} - ${item.seccionNombre.trim()}"`
          )
        }
      }
    }
  }
  await fs.writeFile(path.join(targetDir, 'hierarchy.txt'), treeLines.join('\n'), 'utf8')

  // 10. Generar RESUMEN.md
  const prefixModeLabel =
    prefixMode === 'all'
      ? `Aplicar prefijo a todos (Cuentas, Cursos y Secciones prefijados con \`${coursePrefix}\`)`
      : prefixMode === 'accounts'
      ? `Aplicar prefijo a cuentas (Solo subcuentas prefijadas con \`${accPrefix}\`)`
      : 'Sin prefijo (SIS IDs globales estándar)'

  const resumenContent = `# RESUMEN DE MIGRACIÓN A CANVAS LMS

**Periodo Principal:** ${primaryPeriodName}  
**Subcuenta Inicial (parent_account_id de Sedes):** ${cleanRootAccountId ? `\`${cleanRootAccountId}\`${shouldCreateRootAccount ? ` (Creada en la migración como "${rootAccountName}")` : ' (Subcuenta existente en Canvas)'}` : '*Ninguna (Raíz institucional de Canvas)*'}  
**Modo de Aislamiento / Prefijo:** ${prefixModeLabel}  
**Fecha de Exportación:** ${new Date().toLocaleString('es-ES')}  
**Directorio:** \`${targetDir}\`  
**Caso de Origen:** \`${caseId}\`

---

## Métricas de la Migración

| Entidad | Total Exportado | Archivo SIS |
| :--- | :--- | :--- |
| **Cuentas y Subcuentas** | ${sortedAccounts.length} | \`accounts.csv\` |
| **Periodos Académicos** | ${termsList.length} | \`terms.csv\` |
| **Cursos** | ${coursesList.length} | \`courses.csv\` |
| **Secciones** | ${sectionsList.length} | \`sections.csv\` |
| **Usuarios Totales** | ${usersList.length} | \`users.csv\` |
| - *Docentes (DNI)* | ${teachersCount} | \`users.csv\` |
| - *Estudiantes* | ${studentsCount} | \`users.csv\` |
| **Matrículas / Asignaciones** | ${enrollmentsList.length} | \`enrollments.csv\` |
${xlistsList.length > 0 ? `| **Combinaciones (Cross-listing)** | ${xlistsList.length} (${xlistGroupsMap.size} grupos) | \`xlists.csv\` |\n` : ''}
---

## Archivos Generados en este Directorio

1. **\`accounts.csv\`**: Árbol ordenado topológicamente de Cuentas (Sede) y Subcuentas (Facultad > Carrera > Plan).
2. **\`terms.csv\`**: Periodos académicos Canvas con formato de fecha SIS.
3. **\`courses.csv\`**: Cursos individuales por combinación de curso y sección con código de modalidad al inicio (\`MP\`, \`MN\`, \`MD\`) en formato online enlazados al plan curricular (incluye cursos contenedores de grupos).
4. **\`sections.csv\`**: Secciones de clase identificadas por clave compuesta \`<seccion_id>-<modalidad>-<cod_curso>-<seccion>\`.
5. **\`users.csv\`**: Docentes con DNI oficial normalizado y alumnos con código universitario.
6. **\`enrollments.csv\`**: Relaciones de alumnos (rol \`student\`) y profesores (rol \`teacher\`).
${xlistsList.length > 0 ? `7. **\`xlists.csv\`**: Combinaciones (cross-listing) de secciones bajo cursos contenedores maestros compartidos.\n8.` : '7.'} **\`hierarchy.txt\`**: Visualización jerárquica indentada de toda la estructura académica exportada.
${xlistsList.length > 0 ? '9.' : '8.'} **\`canvas_migration.zip\`**: Paquete ZIP comprimido listo para importar en Canvas LMS (Admin > SIS Import).

---

## Instrucciones para Carga en Canvas LMS

1. Ingrese a la consola de administración de Canvas LMS (\`https://politecnica.instructure.com/\`).
2. Vaya a **Configuración de la Cuenta** > **Importación de SIS** (*SIS Import*).
3. Seleccione el archivo **\`canvas_migration.zip\`** o los archivos CSV individuales generados en este directorio.
4. En tipo de importación, elija **CSV estándar de Instructure** (*Instructure CSV*).
5. Active **Invalidar persistencia de SIS** (*Override SIS Stickiness*) si es una actualización de datos existentes.
6. Haga clic en **Procesar Datos** (*Process Data*).
`
  await fs.writeFile(path.join(targetDir, 'RESUMEN.md'), resumenContent, 'utf8')

  // 10.1 Generar CURSOS_COMPARTIDOS.md si existen combinaciones cross-listing
  if (xlistsList.length > 0) {
    const ccLines: string[] = [
      '# RELACIÓN COMPLETA DE CURSOS COMPARTIDOS (CROSS-LISTING)',
      '',
      `> **Periodo Principal:** ${primaryPeriodName}  `,
      `> **Estándar:** Canvas LMS SIS Cross-Listing (\`xlists.csv\`)  `,
      `> **Total de Cursos Contenedores Padres:** ${xlistGroupsMap.size}  `,
      `> **Total de Secciones Hijas Combinadas:** ${xlistsList.length}  `,
      '',
      '---',
      '',
      '## Índice de Asignaturas y Cursos Contenedores',
      '',
    ]

    const sortedGroups = Array.from(xlistGroupsMap.entries()).sort((a, b) => {
      const nameA = a[1][0]?.cursoNombre || a[0]
      const nameB = b[1][0]?.cursoNombre || b[0]
      return nameA.localeCompare(nameB)
    })

    sortedGroups.forEach(([g, gItems], idx) => {
      const rawXlistId = `GRP_${g}`
      const xlistId = coursePrefix ? `${coursePrefix}${rawXlistId}` : rawXlistId
      const masterName = `[GRUPO ${g}] ${gItems[0]?.cursoNombre.trim() || g}`
      const totalAlumnos = gItems.reduce((acc, it) => acc + (it.estudiantes?.length || 0), 0)
      const anchor = xlistId.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      ccLines.push(
        `${idx + 1}. [**${masterName}**](#${anchor}) — \`${xlistId}\` (${gItems.length} secciones, ${totalAlumnos} alumnos)`
      )
    })

    ccLines.push('')
    ccLines.push('---')
    ccLines.push('')
    ccLines.push('## Detalle de Cursos Padres e Hijos')
    ccLines.push('')

    sortedGroups.forEach(([g, gItems], idx) => {
      const rawXlistId = `GRP_${g}`
      const xlistId = coursePrefix ? `${coursePrefix}${rawXlistId}` : rawXlistId
      const masterName = `[GRUPO ${g}] ${gItems[0]?.cursoNombre.trim() || g}`
      const totalAlumnos = gItems.reduce((acc, it) => acc + (it.estudiantes?.length || 0), 0)
      const anchor = xlistId.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      const firstItem = gItems[0]
      const rawPlanAccId = `P${firstItem.planCodigo.replace(/^P0*/, '').padStart(6, '0')}`
      const planAccId = accPrefix ? `${accPrefix}${rawPlanAccId}` : rawPlanAccId

      // Docentes únicos
      const teacherMap = new Map<string, string>()
      for (const it of gItems) {
        if (it.docentes && it.docentes.length > 0) {
          for (const d of it.docentes) {
            teacherMap.set(d.dni, `${d.fullName} (DNI: \`${d.dni}\`${d.email ? `, Email: \`${d.email}\`` : ''})`)
          }
        } else if (it.docenteDni) {
          teacherMap.set(it.docenteDni, `${it.docenteNombre} (DNI: \`${it.docenteDni}\`${it.docenteEmail ? `, Email: \`${it.docenteEmail}\`` : ''})`)
        }
      }
      const teachersList = Array.from(teacherMap.values())

      const distinctCourses = new Set(gItems.map((it) => it.cursoCodigo))

      ccLines.push(`### ${idx + 1}. <a id="${anchor}"></a>${masterName}`)
      ccLines.push('')
      ccLines.push('#### 📌 Información del Curso Padre (Contenedor Maestro en Canvas)')
      ccLines.push(`- **SIS Course ID (Padre):** \`${xlistId}\``)
      ccLines.push(`- **Nombre en Canvas:** ${masterName}`)
      ccLines.push(`- **Código de Grupo:** \`${g}\``)
      ccLines.push(`- **Subcuenta Canvas Asignada:** \`${planAccId}\` (${firstItem.carreraNombre} > ${firstItem.planNombre})`)
      ccLines.push(`- **Total Secciones Hijas:** ${gItems.length} secciones (${distinctCourses.size} cursos curriculares diferentes)`)
      ccLines.push(`- **Total Alumnos Acumulados:** ${totalAlumnos} matriculados`)
      ccLines.push(
        `- **Docente(s) del Grupo:** ${teachersList.length > 0 ? teachersList.join(', ') : '*(Sin docente asignado)*'}`
      )
      ccLines.push('')
      ccLines.push('#### 👶 Secciones Hijas Combinadas (Cross-Listed)')
      ccLines.push('')
      ccLines.push('| Sección (Hijo) | SIS Section ID | Curso Curricular Original | Carrera / Plan (Ubicación) | Alumnos | Docente de Sección |')
      ccLines.push('| :--- | :--- | :--- | :--- | :---: | :--- |')

      for (const it of gItems) {
        const itModCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
        const rawCourseId = `${itModCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
        const courseId = coursePrefix ? `${coursePrefix}${rawCourseId}` : rawCourseId
        const rawSecId = `${it.seccionId}-${rawCourseId}`
        const secId = coursePrefix ? `${coursePrefix}${rawSecId}` : rawSecId
        const teachStr =
          it.docentes && it.docentes.length > 0
            ? it.docentes.map((d) => `${d.fullName} (\`${d.dni}\`)`).join('<br>')
            : it.docenteNombre
            ? `${it.docenteNombre} (\`${it.docenteDni}\`)`
            : '*(Sin asignar)*'
        const alumnosCount = it.estudiantes?.length || 0
        ccLines.push(
          `| **${it.seccionNombre}** | \`${secId}\` | \`${courseId}\`<br>${itModCode} - ${it.cursoNombre.trim()} - ${it.seccionNombre.trim()} | ${it.carreraNombre} > ${it.planNombre} | **${alumnosCount}** | ${teachStr} |`
        )
      }

      ccLines.push('')
      ccLines.push('---')
      ccLines.push('')
    })

    await fs.writeFile(path.join(targetDir, 'CURSOS_COMPARTIDOS.md'), ccLines.join('\n'), 'utf8')
  }

  // 11. Generar paquete comprimido canvas_migration.zip
  let zipCreated = false
  try {
    const zipFiles = [
      'accounts.csv',
      'terms.csv',
      'courses.csv',
      'sections.csv',
      'users.csv',
      'enrollments.csv',
    ]
    if (xlistsList.length > 0) zipFiles.push('xlists.csv')

    await execFileAsync('zip', ['-j', 'canvas_migration.zip', ...zipFiles], {
      cwd: targetDir,
    })
    zipCreated = true
  } catch (zipErr) {
    console.warn('No se pudo generar el archivo ZIP automáticamente:', zipErr)
  }

  // Obtener tamaños de archivos para el resultado
  const fileNames = [
    'accounts.csv',
    'terms.csv',
    'courses.csv',
    'sections.csv',
    'users.csv',
    'enrollments.csv',
    'hierarchy.txt',
    'RESUMEN.md',
  ]
  if (xlistsList.length > 0) {
    fileNames.push('xlists.csv')
    fileNames.push('CURSOS_COMPARTIDOS.md')
  }
  if (zipCreated) fileNames.push('canvas_migration.zip')

  const filesMeta = await Promise.all(
    fileNames.map(async (f) => {
      try {
        const stat = await fs.stat(path.join(targetDir, f))
        let rows = 0
        if (f === 'accounts.csv') rows = sortedAccounts.length
        else if (f === 'terms.csv') rows = termsList.length
        else if (f === 'courses.csv') rows = coursesList.length
        else if (f === 'sections.csv') rows = sectionsList.length
        else if (f === 'users.csv') rows = usersList.length
        else if (f === 'enrollments.csv') rows = enrollmentsList.length
        else if (f === 'xlists.csv') rows = xlistsList.length
        return { name: f, sizeBytes: stat.size, rowsCount: rows }
      } catch {
        return { name: f, sizeBytes: 0, rowsCount: 0 }
      }
    })
  )

  const activePrefix = coursePrefix || accPrefix || undefined

  return {
    success: true,
    destinationDir: targetDir,
    folderName,
    periodName: primaryPeriodName,
    timestamp: timestampStr,
    rootAccountId: cleanRootAccountId || undefined,
    rootAccountCreated: shouldCreateRootAccount,
    prefixMode,
    accountPrefix: activePrefix,
    files: filesMeta,
    stats: {
      accountsCount: sortedAccounts.length,
      termsCount: termsList.length,
      coursesCount: coursesList.length,
      sectionsCount: sectionsList.length,
      usersCount: usersList.length,
      teachersCount,
      studentsCount,
      enrollmentsCount: enrollmentsList.length,
      xlistsCount: xlistsList.length,
      xlistGroupsCount: xlistGroupsMap.size,
    },
  }
}
