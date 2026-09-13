import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getTableFromDb } from './db-helpers'
import {
  getCaseHierarchyData,
  type HierarchyItem,
  type EnrolledTeacher,
  type EnrolledStudent,
} from './hierarchy-service'

const execFileAsync = promisify(execFile)

export interface ExportCanvasInput {
  caseId: string
  selectedSectionIds: number[] // Carga_Academica_Sede_Curso.id
  rootAccountId?: string // Subcuenta inicial o raíz en Canvas (opcional)
}

export interface ExportCanvasResult {
  success: boolean
  destinationDir: string
  folderName: string
  periodName: string
  timestamp: string
  rootAccountId?: string
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

  const accountsMap = new Map<string, AccountRow>()
  const sedesOrder: AccountRow[] = []
  const modalidadesOrder: AccountRow[] = []
  const facultadesOrder: AccountRow[] = []
  const carrerasOrder: AccountRow[] = []
  const planesOrder: AccountRow[] = []

  for (const it of selectedItems) {
    const sedeAccId = sedeCodeMap.get(it.sedeId) || `S-${it.sedeId}`
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

    const modAccId = `M-${it.modalidadId}`
    if (!accountsMap.has(modAccId)) {
      const row: AccountRow = {
        account_id: modAccId,
        parent_account_id: sedeAccId,
        name: it.modalidadNombre.trim(),
        status: 'active',
      }
      accountsMap.set(modAccId, row)
      modalidadesOrder.push(row)
    }

    const facCode = facultadCodeMap.get(it.facultadId) || `F-${it.facultadId}`
    const facAccId = facCode.startsWith('F-') ? facCode : `F-${facCode}`
    if (!accountsMap.has(facAccId)) {
      const row: AccountRow = {
        account_id: facAccId,
        parent_account_id: modAccId,
        name: it.facultadNombre.trim(),
        status: 'active',
      }
      accountsMap.set(facAccId, row)
      facultadesOrder.push(row)
    }

    const carrCode = carreraCodeMap.get(it.carreraId) || `C-${it.carreraId}`
    const carrAccId = carrCode.startsWith('C-') ? carrCode : `C-${carrCode}`
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

    const planAccId = it.planCodigo ? it.planCodigo.trim() : `P-${it.planId}`
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

  // Orden topológico: Cuentas raíz (Sedes) -> Modalidades -> Facultades -> Carreras -> Planes
  const sortedAccounts = [
    ...sedesOrder,
    ...modalidadesOrder,
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
    const courseId = it.cursoCodigo.trim()
    const planAccId = it.planCodigo ? it.planCodigo.trim() : `P-${it.planId}`
    const rawCurso = cursoRawMap.get(it.cursoId)
    const shortName = rawCurso?.abreviatura
      ? String(rawCurso.abreviatura).trim()
      : courseId

    if (!coursesMap.has(courseId)) {
      coursesMap.set(courseId, {
        course_id: courseId,
        short_name: shortName,
        long_name: it.cursoNombre.trim(),
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
    const courseId = it.cursoCodigo.trim()
    const sectionId = `${it.seccionId}-${courseId}`
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
    const courseId = it.cursoCodigo.trim()
    const sectionId = `${it.seccionId}-${courseId}`

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
      ? [`# Subcuenta Inicial Canvas (parent_account_id): ${cleanRootAccountId}`]
      : []),
    `# Fecha de exportación: ${new Date().toLocaleString('es-ES')}`,
    `# Total secciones: ${selectedItems.length} | Cursos: ${coursesList.length}`,
    `# =========================================================================`,
    ``,
  ]

  // Agrupar items por estructura jerárquica para hierarchy.txt
  const periodoGroup = new Map<string, any>()
  for (const it of selectedItems) {
    const pKey = it.periodoNombre
    if (!periodoGroup.has(pKey)) periodoGroup.set(pKey, new Map())
    const sedesG = periodoGroup.get(pKey)!

    const sKey = it.sedeNombre
    if (!sedesG.has(sKey)) sedesG.set(sKey, new Map())
    const modG = sedesG.get(sKey)!

    const mKey = it.modalidadNombre
    if (!modG.has(mKey)) modG.set(mKey, new Map())
    const facG = modG.get(mKey)!

    const fKey = it.facultadNombre
    if (!facG.has(fKey)) facG.set(fKey, new Map())
    const carrG = facG.get(fKey)!

    const cKey = it.carreraNombre
    if (!carrG.has(cKey)) carrG.set(cKey, new Map())
    const planG = carrG.get(cKey)!

    const plKey = `${it.planCodigo} - ${it.planNombre}`
    if (!planG.has(plKey)) planG.set(plKey, new Map())
    const curG = planG.get(plKey)!

    const curKey = `${it.cursoCodigo} - ${it.cursoNombre}`
    if (!curG.has(curKey)) curG.set(curKey, [])
    curG.get(curKey)!.push(it)
  }

  for (const [pName, sedesG] of periodoGroup) {
    treeLines.push(`[PERIODO] ${pName}`)
    if (cleanRootAccountId) {
      treeLines.push(`\t[SUBCUENTA INICIAL] ${cleanRootAccountId}`)
    }
    const rootIndent = cleanRootAccountId ? '\t' : ''
    for (const [sName, modG] of sedesG) {
      treeLines.push(`\t${rootIndent}[CUENTA] ${sName}`)
      for (const [mName, facG] of modG) {
        treeLines.push(`\t\t${rootIndent}[SUBCUENTA] ${mName}`)
        for (const [fName, carrG] of facG) {
          treeLines.push(`\t\t\t${rootIndent}[SUBCUENTA] ${fName}`)
          for (const [cName, planG] of carrG) {
            treeLines.push(`\t\t\t\t${rootIndent}[SUBCUENTA] ${cName}`)
            for (const [plName, curG] of planG) {
              treeLines.push(`\t\t\t\t\t${rootIndent}[SUBCUENTA PLAN] ${plName}`)
              for (const [curName, secs] of curG) {
                treeLines.push(`\t\t\t\t\t\t${rootIndent}[CURSO] ${curName}`)
                for (const s of secs as HierarchyItem[]) {
                  treeLines.push(
                    `\t\t\t\t\t\t\t${rootIndent}[SECCION] ${s.seccionNombre} (SEC: ${s.seccionId}-${s.cursoCodigo}) - ${s.estudiantes.length} alumnos`
                  )
                  for (const d of s.docentes) {
                    treeLines.push(
                      `\t\t\t\t\t\t\t\t${rootIndent}(D) [DOCENTE] DNI:${d.dni} - ${d.fullName} <${d.email}>`
                    )
                  }
                  for (const e of s.estudiantes) {
                    treeLines.push(
                      `\t\t\t\t\t\t\t\t${rootIndent}(E) [ESTUDIANTE] COD:${e.codigo} - ${e.fullName} <${e.email}>`
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  await fs.writeFile(path.join(targetDir, 'hierarchy.txt'), treeLines.join('\n'), 'utf8')

  // 10. Generar RESUMEN.md
  const resumenContent = `# RESUMEN DE MIGRACIÓN A CANVAS LMS

**Periodo Principal:** ${primaryPeriodName}  
**Subcuenta Inicial (parent_account_id de Sedes):** ${cleanRootAccountId ? `\`${cleanRootAccountId}\`` : '*Ninguna (Raíz institucional de Canvas)*'}  
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

---

## Archivos Generados en este Directorio

1. **\`accounts.csv\`**: Árbol ordenado topológicamente de Cuentas (Sede) y Subcuentas (Modalidad > Facultad > Carrera > Plan).
2. **\`terms.csv\`**: Periodos académicos Canvas con formato de fecha SIS.
3. **\`courses.csv\`**: Cursos académicos en formato online enlazados al plan curricular.
4. **\`sections.csv\`**: Secciones de clase identificadas por clave compuesta \`<seccion_id>-<cod_curso>\`.
5. **\`users.csv\`**: Docentes con DNI oficial normalizado y alumnos con código universitario.
6. **\`enrollments.csv\`**: Relaciones de alumnos (rol \`student\`) y profesores (rol \`teacher\`).
7. **\`hierarchy.txt\`**: Visualización jerárquica indentada de toda la estructura académica exportada.
8. **\`canvas_migration.zip\`**: Paquete ZIP comprimido listo para importar en Canvas LMS (Admin > SIS Import).

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

  // 11. Generar paquete comprimido canvas_migration.zip
  let zipCreated = false
  try {
    await execFileAsync(
      'zip',
      [
        '-j',
        'canvas_migration.zip',
        'accounts.csv',
        'terms.csv',
        'courses.csv',
        'sections.csv',
        'users.csv',
        'enrollments.csv',
      ],
      { cwd: targetDir }
    )
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
        return { name: f, sizeBytes: stat.size, rowsCount: rows }
      } catch {
        return { name: f, sizeBytes: 0, rowsCount: 0 }
      }
    })
  )

  return {
    success: true,
    destinationDir: targetDir,
    folderName,
    periodName: primaryPeriodName,
    timestamp: timestampStr,
    rootAccountId: cleanRootAccountId || undefined,
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
    },
  }
}
