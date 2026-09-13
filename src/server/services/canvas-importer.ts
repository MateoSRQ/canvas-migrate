import { db } from '#/db/index'
import {
  canvasImportCases,
  canvasCaseRawEntities,
  canvasCaseAccounts,
  canvasCaseCourses,
  canvasCaseEnrollments,
  type CanvasImportCase,
} from '#/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export interface CanvasApiAccount {
  id: number
  name: string
  parent_account_id?: number | null
  root_account_id?: number | null
  sis_account_id?: string | null
  workflow_state?: string
  default_time_zone?: string
  course_template_id?: number | null
}

export interface CanvasApiTerm {
  id: number
  name: string
  sis_term_id?: string | null
  start_at?: string | null
  end_at?: string | null
  workflow_state?: string
}

export interface CanvasApiCourse {
  id: number
  name: string
  course_code?: string
  sis_course_id?: string | null
  account_id: number
  enrollment_term_id?: number
  workflow_state?: string
  total_students?: number
  teachers?: { id: number; display_name?: string; sis_user_id?: string | null; email?: string | null }[]
  sections?: { id: number; name: string; sis_section_id?: string | null; total_students?: number }[]
}

export interface CanvasCourseSectionNode {
  id: number
  name: string
  sisSectionId: string | null
  totalStudents: number
  docentes: { id: number; dni: string; fullName: string; email: string }[]
  estudiantes: { id: number; codigo: string; fullName: string; email: string }[]
  estudiantesCount: number
}

export interface CanvasCourseTreeNode {
  canvasId: number
  name: string
  courseCode: string | null
  sisCourseId: string | null
  accountId: number
  totalStudents: number
  sections: CanvasCourseSectionNode[]
}

export interface CanvasAccountTreeNode {
  canvasId: number
  name: string
  sisAccountId: string | null
  parentAccountId: number | null
  rootAccountId: number | null
  workflowState: string | null
  coursesCount: number
  depth: number
  children: CanvasAccountTreeNode[]
  courses: CanvasCourseTreeNode[]
}

export interface CanvasImportCaseOptions {
  name?: string
  description?: string
  endpoint?: string
  apiKey?: string
  includeCourses?: boolean
}

function getCanvasConfig(options?: { endpoint?: string; apiKey?: string }) {
  const rawEndpoint = options?.endpoint || process.env.CANVAS_API_ENDPOINT
  const token = options?.apiKey || process.env.CANVAS_API_KEY

  if (!rawEndpoint || !token) {
    throw new Error(
      'Configuración de Canvas incompleta: CANVAS_API_ENDPOINT o CANVAS_API_KEY no están definidos.'
    )
  }

  const endpoint = rawEndpoint.replace(/\/+$/, '')
  return { endpoint, token, baseUrl: `${endpoint}/api/v1` }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCanvasPaginated<T>(
  baseUrl: string,
  token: string,
  pathOrUrl: string,
  queryParams?: Record<string, string | number | boolean>
): Promise<T[]> {
  let results: T[] = []
  let currentUrl = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`

  if (queryParams && !pathOrUrl.startsWith('http')) {
    const urlObj = new URL(currentUrl)
    for (const [k, v] of Object.entries(queryParams)) {
      urlObj.searchParams.set(k, String(v))
    }
    currentUrl = urlObj.toString()
  }

  let nextUrl: string | null = currentUrl

  while (nextUrl) {
    let retries = 0
    let res: Response | null = null

    while (retries < 4) {
      try {
        res = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (res.status === 429 || res.status >= 500) {
          retries++
          const waitMs = Math.min(1000 * Math.pow(2, retries), 8000)
          console.warn(`[Canvas API] Reintento ${retries}/4 tras error HTTP ${res.status}. Esperando ${waitMs}ms...`)
          await sleep(waitMs)
          continue
        }

        break
      } catch (err: any) {
        retries++
        if (retries >= 4) throw err
        const waitMs = Math.min(1000 * Math.pow(2, retries), 8000)
        console.warn(`[Canvas API] Error de red. Reintento ${retries}/4 tras ${waitMs}ms:`, err.message)
        await sleep(waitMs)
      }
    }

    if (!res || !res.ok) {
      const errText = res ? await res.text().catch(() => '') : 'Sin respuesta de red'
      throw new Error(`Error en Canvas API (${res?.status || 0}): ${errText.slice(0, 300)}`)
    }

    const json = await res.json()
    const data: T[] = Array.isArray(json)
      ? json
      : (json?.enrollment_terms || json?.courses || json?.accounts || [])

    results = results.concat(data)

    // Analizar Link header para paginación
    const linkHeader = res.headers.get('link') || res.headers.get('Link')
    nextUrl = null

    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      if (match) {
        nextUrl = match[1]
      }
    }
  }

  return results
}

export async function testCanvasApiConnection(endpointOverride?: string, apiKeyOverride?: string) {
  try {
    const { baseUrl, token, endpoint } = getCanvasConfig({
      endpoint: endpointOverride,
      apiKey: apiKeyOverride,
    })

    const res = await fetch(`${baseUrl}/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return {
        success: false,
        endpoint,
        error: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
      }
    }

    const accounts: CanvasApiAccount[] = await res.json()
    const root = accounts.find((a) => !a.parent_account_id) || accounts[0]

    return {
      success: true,
      endpoint,
      rootAccountName: root?.name || 'Cuenta Canvas',
      rootAccountId: root?.id || 1,
    }
  } catch (err: any) {
    return {
      success: false,
      endpoint: endpointOverride || process.env.CANVAS_API_ENDPOINT || '',
      error: err.message,
    }
  }
}

function generateCanvasCaseId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const randomSuffix = Math.random().toString(36).substring(2, 7)
  return `canvas_case_${timestamp}_${randomSuffix}`
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function executeCanvasImportCase(
  options: CanvasImportCaseOptions = {}
): Promise<CanvasImportCase> {
  const caseId = generateCanvasCaseId()
  const { baseUrl, token, endpoint } = getCanvasConfig(options)
  const now = new Date()

  const name =
    options.name?.trim() ||
    `Canvas Import (${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`

  // 1. Inicializar registro del caso Canvas
  await db.insert(canvasImportCases).values({
    id: caseId,
    name,
    description:
      options.description || `Extracción en vivo desde API Canvas LMS (${endpoint})`,
    status: 'in_progress',
    endpoint,
    totalAccounts: 0,
    totalTerms: 0,
    totalCourses: 0,
    totalRows: 0,
    createdAt: now,
  })

  const entityStatsMap: Record<string, { rowCount: number; durationMs: number }> = {}

  try {
    // 2. Extraer Cuentas y Subcuentas
    const t0 = Date.now()
    const rootRes = await fetch(`${baseUrl}/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const roots: CanvasApiAccount[] = await rootRes.json()
    const rootAccount = roots.find((a) => !a.parent_account_id) || roots[0]
    const rootId = rootAccount?.id || 1

    const subAccounts = await fetchCanvasPaginated<CanvasApiAccount>(
      baseUrl,
      token,
      `/accounts/${rootId}/sub_accounts`,
      { recursive: true, per_page: 100 }
    )

    const allAccounts: CanvasApiAccount[] = rootAccount
      ? [rootAccount, ...subAccounts.filter((s) => s.id !== rootAccount.id)]
      : subAccounts

    entityStatsMap['accounts'] = {
      rowCount: allAccounts.length,
      durationMs: Date.now() - t0,
    }

    // 3. Extraer Términos Académicos (Terms)
    const t1 = Date.now()
    const terms = await fetchCanvasPaginated<CanvasApiTerm>(
      baseUrl,
      token,
      `/accounts/${rootId}/terms`,
      { per_page: 100 }
    )
    entityStatsMap['terms'] = {
      rowCount: terms.length,
      durationMs: Date.now() - t1,
    }

    // 4. Extraer Cursos con secciones y docentes (activo por defecto)
    let courses: CanvasApiCourse[] = []
    if (options.includeCourses !== false) {
      const t2 = Date.now()
      courses = await fetchCanvasPaginated<CanvasApiCourse>(
        baseUrl,
        token,
        `/accounts/${rootId}/courses?include[]=sections&include[]=teachers&include[]=term&include[]=total_students`,
        { per_page: 100 }
      )
      entityStatsMap['courses'] = {
        rowCount: courses.length,
        durationMs: Date.now() - t2,
      }
    }

    // Calcular conteo de cursos por cuenta
    const coursesCountByAccount = new Map<number, number>()
    for (const c of courses) {
      if (c.account_id) {
        coursesCountByAccount.set(
          c.account_id,
          (coursesCountByAccount.get(c.account_id) || 0) + 1
        )
      }
    }

    // 5. Guardar volcados crudos JSON en canvas_case_raw_entities
    const rawEntities = [
      { type: 'accounts', data: allAccounts },
      { type: 'terms', data: terms },
      ...(courses.length > 0 ? [{ type: 'courses', data: courses }] : []),
    ]

    for (const entity of rawEntities) {
      await db.insert(canvasCaseRawEntities).values({
        caseId,
        entityType: entity.type,
        itemCount: entity.data.length,
        dataJson: JSON.stringify(entity.data),
        extractedAt: new Date(),
      })
    }

    // 6. Insertar cuentas normalizadas en canvas_case_accounts
    const normalizedAccounts = allAccounts.map((a) => ({
      caseId,
      canvasId: a.id,
      name: a.name || `Cuenta ${a.id}`,
      parentAccountId: a.parent_account_id ?? null,
      rootAccountId: a.root_account_id ?? null,
      sisAccountId: a.sis_account_id ? String(a.sis_account_id).trim() : null,
      workflowState: a.workflow_state ?? 'active',
      coursesCount: coursesCountByAccount.get(a.id) || 0,
    }))

    const accountChunks = chunkArray(normalizedAccounts, 200)
    for (const chunk of accountChunks) {
      await db.insert(canvasCaseAccounts).values(chunk)
    }

    // 7. Insertar cursos normalizados en canvas_case_courses
    if (courses.length > 0) {
      const normalizedCourses = courses.map((c) => ({
        caseId,
        canvasId: c.id,
        name: c.name || `Curso ${c.id}`,
        courseCode: c.course_code || null,
        sisCourseId: c.sis_course_id ? String(c.sis_course_id).trim() : null,
        accountId: c.account_id,
        enrollmentTermId: c.enrollment_term_id ?? null,
        workflowState: c.workflow_state ?? 'active',
        totalStudents: c.total_students ?? 0,
        sectionsJson: JSON.stringify(
          (c.sections || []).map((s) => ({
            id: s.id,
            name: s.name,
            sisSectionId: s.sis_section_id ? String(s.sis_section_id).trim() : null,
            totalStudents: s.total_students ?? 0,
          }))
        ),
      }))

      const courseChunks = chunkArray(normalizedCourses, 100)
      for (const chunk of courseChunks) {
        await db.insert(canvasCaseCourses).values(chunk)
      }
    }

    const totalRows = allAccounts.length + terms.length + courses.length

    // 8. Marcar caso como completado
    await db
      .update(canvasImportCases)
      .set({
        status: 'completed',
        totalAccounts: allAccounts.length,
        totalTerms: terms.length,
        totalCourses: courses.length,
        totalRows,
        entityStats: JSON.stringify(entityStatsMap),
        completedAt: new Date(),
      })
      .where(eq(canvasImportCases.id, caseId))

    const completedCase = await db
      .select()
      .from(canvasImportCases)
      .where(eq(canvasImportCases.id, caseId))
      .get()

    return completedCase!
  } catch (error: any) {
    console.error(`[Canvas Importer] Falló la importación del caso ${caseId}:`, error)
    await db
      .update(canvasImportCases)
      .set({
        status: 'failed',
        errorMessage: error?.message || 'Error desconocido al consultar la API de Canvas LMS',
        completedAt: new Date(),
      })
      .where(eq(canvasImportCases.id, caseId))

    throw error
  }
}

export async function listAllCanvasCases(): Promise<CanvasImportCase[]> {
  return await db
    .select()
    .from(canvasImportCases)
    .orderBy(desc(canvasImportCases.createdAt))
    .all()
}

export async function getCanvasCaseById(caseId: string) {
  const caseItem = await db
    .select()
    .from(canvasImportCases)
    .where(eq(canvasImportCases.id, caseId))
    .get()

  if (!caseItem) return null

  const entities = await db
    .select({
      id: canvasCaseRawEntities.id,
      entityType: canvasCaseRawEntities.entityType,
      itemCount: canvasCaseRawEntities.itemCount,
      extractedAt: canvasCaseRawEntities.extractedAt,
    })
    .from(canvasCaseRawEntities)
    .where(eq(canvasCaseRawEntities.caseId, caseId))
    .all()

  return { caseItem, entities }
}

export async function getCanvasCaseAccountsTree(caseId: string) {
  const [accounts, courses] = await Promise.all([
    db.select().from(canvasCaseAccounts).where(eq(canvasCaseAccounts.caseId, caseId)).all(),
    db.select().from(canvasCaseCourses).where(eq(canvasCaseCourses.caseId, caseId)).all(),
  ])

  if (!accounts || accounts.length === 0) {
    return {
      rootNodes: [],
      totalAccounts: 0,
      withSisCount: 0,
      withoutSisCount: 0,
      totalCourses: 0,
    }
  }

  const withSisCount = accounts.filter((a) => a.sisAccountId).length
  const withoutSisCount = accounts.length - withSisCount
  const totalCourses = courses.length || accounts.reduce((acc, cur) => acc + (cur.coursesCount || 0), 0)

  // Mapear cursos por cuenta
  const coursesByAccount = new Map<number, CanvasCourseTreeNode[]>()
  for (const c of courses) {
    if (!coursesByAccount.has(c.accountId)) {
      coursesByAccount.set(c.accountId, [])
    }

    let parsedSections: any[] = []
    try {
      if (c.sectionsJson) parsedSections = JSON.parse(c.sectionsJson)
    } catch {}

    const sections: CanvasCourseSectionNode[] = (
      parsedSections.length > 0
        ? parsedSections
        : [
            {
              id: c.canvasId,
              name: 'Sección Principal',
              sisSectionId: c.sisCourseId,
              totalStudents: c.totalStudents,
            },
          ]
    ).map((s: any) => ({
      id: s.id,
      name: s.name,
      sisSectionId: s.sisSectionId || s.sis_section_id || null,
      totalStudents: s.totalStudents ?? s.total_students ?? 0,
      docentes: [],
      estudiantes: [],
      estudiantesCount: s.totalStudents ?? s.total_students ?? 0,
    }))

    coursesByAccount.get(c.accountId)!.push({
      canvasId: c.canvasId,
      name: c.name,
      courseCode: c.courseCode,
      sisCourseId: c.sisCourseId,
      accountId: c.accountId,
      totalStudents: c.totalStudents,
      sections,
    })
  }

  // Armar mapa de cuentas por canvasId
  const nodeMap = new Map<number, CanvasAccountTreeNode>()
  for (const a of accounts) {
    const accCourses = (coursesByAccount.get(a.canvasId) || []).sort((x, y) =>
      x.name.localeCompare(y.name)
    )

    nodeMap.set(a.canvasId, {
      canvasId: a.canvasId,
      name: a.name,
      sisAccountId: a.sisAccountId,
      parentAccountId: a.parentAccountId,
      rootAccountId: a.rootAccountId,
      workflowState: a.workflowState,
      coursesCount: accCourses.length || a.coursesCount,
      depth: 0,
      children: [],
      courses: accCourses,
    })
  }

  const rootNodes: CanvasAccountTreeNode[] = []

  for (const a of accounts) {
    const node = nodeMap.get(a.canvasId)!
    const parentId = a.parentAccountId

    if (parentId && nodeMap.has(parentId) && parentId !== a.canvasId) {
      nodeMap.get(parentId)!.children.push(node)
    } else {
      rootNodes.push(node)
    }
  }

  // Asignar profundidad recursivamente
  function assignDepth(nodes: CanvasAccountTreeNode[], currentDepth: number) {
    for (const n of nodes) {
      n.depth = currentDepth
      n.children.sort((a, b) => a.name.localeCompare(b.name))
      assignDepth(n.children, currentDepth + 1)
    }
  }

  assignDepth(rootNodes, 0)
  rootNodes.sort((a, b) => a.name.localeCompare(b.name))

  return {
    rootNodes,
    totalAccounts: accounts.length,
    withSisCount,
    withoutSisCount,
    totalCourses,
  }
}

export async function getCanvasCourseEnrollments(caseId: string, courseId: number) {
  // 1. Revisar si ya están en base de datos SQLite
  const cached = await db
    .select()
    .from(canvasCaseEnrollments)
    .where(
      and(
        eq(canvasCaseEnrollments.caseId, caseId),
        eq(canvasCaseEnrollments.courseId, courseId)
      )
    )
    .all()

  if (cached.length > 0) {
    const docentes = cached
      .filter((r) => r.role === 'teacher')
      .map((r) => ({
        id: r.userId,
        sectionId: r.sectionId,
        dni: r.sisUserId || '',
        fullName: r.fullName,
        email: r.email || '',
      }))

    const estudiantes = cached
      .filter((r) => r.role === 'student')
      .map((r) => ({
        id: r.userId,
        sectionId: r.sectionId,
        codigo: r.sisUserId || '',
        fullName: r.fullName,
        email: r.email || '',
      }))

    return { docentes, estudiantes }
  }

  // 2. Extraer desde Canvas API en vivo
  const { baseUrl, token } = getCanvasConfig()
  const enrollments = await fetchCanvasPaginated<any>(
    baseUrl,
    token,
    `/courses/${courseId}/enrollments?include[]=user`,
    { per_page: 100 }
  )

  const toInsert: (typeof canvasCaseEnrollments.$inferInsert)[] = []
  const seenKeys = new Set<string>()

  for (const e of enrollments) {
    if (!e.user) continue
    const isTeacher = e.type === 'TeacherEnrollment' || e.role === 'TeacherEnrollment'
    const isStudent = e.type === 'StudentEnrollment' || e.role === 'StudentEnrollment'
    if (!isTeacher && !isStudent) continue

    const role = isTeacher ? ('teacher' as const) : ('student' as const)
    const key = `${e.user.id}-${e.course_section_id}-${role}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    toInsert.push({
      caseId,
      courseId,
      sectionId: e.course_section_id ?? null,
      userId: e.user.id,
      sisUserId: e.user.sis_user_id ? String(e.user.sis_user_id).trim() : null,
      fullName: e.user.name ? String(e.user.name).trim() : `Usuario ${e.user.id}`,
      email: e.user.email
        ? String(e.user.email).trim()
        : e.user.login_id
          ? String(e.user.login_id).trim()
          : null,
      role,
    })
  }

  if (toInsert.length > 0) {
    const chunks = chunkArray(toInsert, 100)
    for (const chunk of chunks) {
      await db.insert(canvasCaseEnrollments).values(chunk)
    }
  }

  // 3. Sincronizar secciones del curso si no existen o estaban vacías
  try {
    const courseRecord = await db
      .select()
      .from(canvasCaseCourses)
      .where(
        and(
          eq(canvasCaseCourses.caseId, caseId),
          eq(canvasCaseCourses.canvasId, courseId)
        )
      )
      .get()

    let hasValidSections = false
    if (courseRecord?.sectionsJson) {
      try {
        const parsed = JSON.parse(courseRecord.sectionsJson)
        if (Array.isArray(parsed) && parsed.length > 0) hasValidSections = true
      } catch {}
    }

    if (!hasValidSections) {
      const apiSections = await fetchCanvasPaginated<any>(
        baseUrl,
        token,
        `/courses/${courseId}/sections`,
        { per_page: 100 }
      )
      if (apiSections.length > 0) {
        const mapped = apiSections.map((s: any) => ({
          id: s.id,
          name: s.name,
          sisSectionId: s.sis_section_id ? String(s.sis_section_id).trim() : null,
          totalStudents: s.total_students ?? 0,
        }))
        await db
          .update(canvasCaseCourses)
          .set({ sectionsJson: JSON.stringify(mapped) })
          .where(
            and(
              eq(canvasCaseCourses.caseId, caseId),
              eq(canvasCaseCourses.canvasId, courseId)
            )
          )
      }
    }
  } catch (secErr) {
    console.warn(`No se pudieron sincronizar secciones para el curso ${courseId}:`, secErr)
  }

  const docentes = toInsert
    .filter((r) => r.role === 'teacher')
    .map((r) => ({
      id: r.userId,
      sectionId: r.sectionId,
      dni: r.sisUserId || '',
      fullName: r.fullName,
      email: r.email || '',
    }))

  const estudiantes = toInsert
    .filter((r) => r.role === 'student')
    .map((r) => ({
      id: r.userId,
      sectionId: r.sectionId,
      codigo: r.sisUserId || '',
      fullName: r.fullName,
      email: r.email || '',
    }))

  return { docentes, estudiantes }
}

export async function getCanvasRawEntitySample(caseId: string, entityType: string): Promise<any[]> {
  const row = await db
    .select({ dataJson: canvasCaseRawEntities.dataJson })
    .from(canvasCaseRawEntities)
    .where(
      and(
        eq(canvasCaseRawEntities.caseId, caseId),
        eq(canvasCaseRawEntities.entityType, entityType)
      )
    )
    .get()

  if (!row?.dataJson) return []
  try {
    const list = JSON.parse(row.dataJson)
    return Array.isArray(list) ? list.slice(0, 50) : []
  } catch (err) {
    console.error('Error al deserializar entidad raw de Canvas:', err)
    return []
  }
}

export async function deleteCanvasCase(caseId: string) {
  const res = await db
    .delete(canvasImportCases)
    .where(eq(canvasImportCases.id, caseId))
  return { success: true, caseId }
}
