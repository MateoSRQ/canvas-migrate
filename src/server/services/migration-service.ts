import fs from 'node:fs/promises'
import path from 'node:path'
import type { SandboxPrefixMode } from './canvas-exporter'

export interface MigrationSummary {
  folderName: string
  periodName: string
  createdAt: string
  mtime: number
  rootAccount: string
  sandboxIsolated?: boolean
  sandboxPrefixMode?: SandboxPrefixMode
  sandboxPrefix?: string
  coursesCount: number
  sectionsCount: number
  usersCount: number
  teachersCount: number
  studentsCount: number
  accountsCount: number
}

export interface MigrationUserNode {
  userId: string
  loginId: string
  fullName: string
  email: string
  role: 'teacher' | 'student'
}

export interface MigrationSectionNode {
  sectionId: string
  courseId: string
  name: string
  teachers: MigrationUserNode[]
  students: MigrationUserNode[]
}

export interface MigrationCourseNode {
  courseId: string
  shortName: string
  longName: string
  accountId: string
  sections: MigrationSectionNode[]
}

export interface MigrationAccountNode {
  accountId: string
  parentAccountId: string | null
  name: string
  depth: number
  children: MigrationAccountNode[]
  courses: MigrationCourseNode[]
}

export interface MigrationTreeResult {
  summary: MigrationSummary
  rootNodes: MigrationAccountNode[]
  totalAccounts: number
  totalCourses: number
  totalSections: number
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length <= 1) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          current += '"'
          c++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] !== undefined ? values[h] : ''
    }
    rows.push(row)
  }
  return rows
}

/**
 * Lista todos los paquetes de migración exportados en la carpeta migraciones/
 */
export async function listMigrationPackages(): Promise<MigrationSummary[]> {
  const baseDir = path.resolve(process.cwd(), 'migraciones')

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    const summaries: MigrationSummary[] = []

    for (const e of entries) {
      if (!e.isDirectory()) continue
      const dir = path.join(baseDir, e.name)

      let resumen = ''
      try {
        resumen = await fs.readFile(path.join(dir, 'RESUMEN.md'), 'utf8')
      } catch {}

      const periodMatch = resumen.match(/\*\*Periodo Principal:\*\*\s*(.+)/)
      const dateMatch = resumen.match(/\*\*Fecha de Exportación:\*\*\s*(.+)/)
      const rootMatch = resumen.match(/\*\*Subcuenta Inicial[^*]*:\*\*\s*(.+)/)
      const modeMatch = resumen.match(/\*\*(?:Modo de Aislamiento \/ Prefijo|Modo Aislamiento Sandbox):\*\*\s*(.+)/)
      let sandboxPrefixMode: SandboxPrefixMode = 'none'
      let isSandbox = false
      let prefixMatch: RegExpMatchArray | null = null

      if (modeMatch) {
        const modeText = modeMatch[1]
        prefixMatch = modeText.match(/`([^`]+)`/)
        if (modeText.includes('todos') || modeText.includes('Cuentas, Cursos y Secciones')) {
          sandboxPrefixMode = 'all'
          isSandbox = true
        } else if (modeText.includes('cuentas') || modeText.includes('subcuentas') || modeText.includes('Activo')) {
          sandboxPrefixMode = 'accounts'
          isSandbox = true
        } else {
          sandboxPrefixMode = 'none'
          isSandbox = false
        }
      }

      const coursesMatch = resumen.match(/\|\s*\*\*Cursos\*\*\s*\|\s*(\d+)\s*\|/)
      const sectionsMatch = resumen.match(/\|\s*\*\*Secciones\*\*\s*\|\s*(\d+)\s*\|/)
      const usersMatch = resumen.match(/\|\s*\*\*Usuarios Totales\*\*\s*\|\s*(\d+)\s*\|/)
      const teachersMatch = resumen.match(/\|\s*-\s*\*Docentes[^*]*\*\s*\|\s*(\d+)\s*\|/)
      const studentsMatch = resumen.match(/\|\s*-\s*\*Estudiantes\*\s*\|\s*(\d+)\s*\|/)
      const accountsMatch = resumen.match(/\|\s*\*\*Cuentas y Subcuentas\*\*\s*\|\s*(\d+)\s*\|/)

      let mtime = Date.now()
      try {
        const stat = await fs.stat(dir)
        mtime = stat.mtimeMs
      } catch {}

      summaries.push({
        folderName: e.name,
        periodName: periodMatch ? periodMatch[1].trim() : e.name.split(' - ')[0],
        createdAt: dateMatch ? dateMatch[1].trim() : new Date(mtime).toLocaleString(),
        mtime,
        rootAccount: rootMatch ? rootMatch[1].trim() : '',
        sandboxIsolated: isSandbox,
        sandboxPrefixMode,
        sandboxPrefix: prefixMatch ? prefixMatch[1] : undefined,
        coursesCount: coursesMatch ? parseInt(coursesMatch[1], 10) : 0,
        sectionsCount: sectionsMatch ? parseInt(sectionsMatch[1], 10) : 0,
        usersCount: usersMatch ? parseInt(usersMatch[1], 10) : 0,
        teachersCount: teachersMatch ? parseInt(teachersMatch[1], 10) : 0,
        studentsCount: studentsMatch ? parseInt(studentsMatch[1], 10) : 0,
        accountsCount: accountsMatch ? parseInt(accountsMatch[1], 10) : 0,
      })
    }

    return summaries.sort((a, b) => b.mtime - a.mtime)
  } catch (err) {
    console.error('Error listando paquetes de migración:', err)
    return []
  }
}

/**
 * Obtiene y estructura en árbol jerárquico el contenido de una migración exportada
 */
export async function getMigrationTree(folderName: string): Promise<MigrationTreeResult | null> {
  const dir = path.resolve(process.cwd(), 'migraciones', folderName)

  try {
    const [accountsCsv, coursesCsv, sectionsCsv, usersCsv, enrollmentsCsv] =
      await Promise.all([
        fs.readFile(path.join(dir, 'accounts.csv'), 'utf8').catch(() => ''),
        fs.readFile(path.join(dir, 'courses.csv'), 'utf8').catch(() => ''),
        fs.readFile(path.join(dir, 'sections.csv'), 'utf8').catch(() => ''),
        fs.readFile(path.join(dir, 'users.csv'), 'utf8').catch(() => ''),
        fs.readFile(path.join(dir, 'enrollments.csv'), 'utf8').catch(() => ''),
      ])

    const accounts = parseCsv(accountsCsv)
    const courses = parseCsv(coursesCsv)
    const sections = parseCsv(sectionsCsv)
    const users = parseCsv(usersCsv)
    const enrollments = parseCsv(enrollmentsCsv)

    // 1. Mapeo de usuarios por user_id
    const userMap = new Map<string, { id: string; login: string; fullName: string; email: string }>()
    for (const u of users) {
      const id = u.user_id?.trim()
      if (!id) continue
      const first = (u.first_name || '').trim()
      const last = (u.last_name || '').trim()
      const fullName = [first, last].filter(Boolean).join(' ') || id
      userMap.set(id, {
        id,
        login: (u.login_id || '').trim(),
        fullName,
        email: (u.email || '').trim(),
      })
    }

    // 2. Mapeo de matrículas por section_id
    const enrBySection = new Map<string, { teachers: MigrationUserNode[]; students: MigrationUserNode[] }>()
    for (const enr of enrollments) {
      const secId = enr.section_id?.trim()
      const userId = enr.user_id?.trim()
      const role = enr.role?.trim()
      if (!secId || !userId) continue

      if (!enrBySection.has(secId)) {
        enrBySection.set(secId, { teachers: [], students: [] })
      }
      const target = enrBySection.get(secId)!
      const u = userMap.get(userId) || { id: userId, login: '', fullName: userId, email: '' }

      if (role === 'teacher') {
        target.teachers.push({
          userId: u.id,
          loginId: u.login,
          fullName: u.fullName,
          email: u.email,
          role: 'teacher',
        })
      } else {
        target.students.push({
          userId: u.id,
          loginId: u.login,
          fullName: u.fullName,
          email: u.email,
          role: 'student',
        })
      }
    }

    // 3. Mapeo de secciones por course_id
    const secByCourse = new Map<string, MigrationSectionNode[]>()
    for (const s of sections) {
      const cId = s.course_id?.trim()
      const sId = s.section_id?.trim()
      if (!cId || !sId) continue

      if (!secByCourse.has(cId)) {
        secByCourse.set(cId, [])
      }
      const enrs = enrBySection.get(sId) || { teachers: [], students: [] }
      secByCourse.get(cId)!.push({
        sectionId: sId,
        courseId: cId,
        name: s.name?.trim() || `Sección ${sId}`,
        teachers: enrs.teachers,
        students: enrs.students,
      })
    }

    // 4. Mapeo de cursos por account_id
    const coursesByAccount = new Map<string, MigrationCourseNode[]>()
    for (const c of courses) {
      const cId = c.course_id?.trim()
      const accId = c.account_id?.trim() || 'ROOT'
      if (!cId) continue

      if (!coursesByAccount.has(accId)) {
        coursesByAccount.set(accId, [])
      }

      coursesByAccount.get(accId)!.push({
        courseId: cId,
        shortName: (c.short_name || cId).trim(),
        longName: (c.long_name || c.short_name || cId).trim(),
        accountId: accId,
        sections: secByCourse.get(cId) || [],
      })
    }

    // 5. Armar nodos de cuenta y estructura de árbol
    const nodeMap = new Map<string, MigrationAccountNode>()
    for (const a of accounts) {
      const accId = a.account_id?.trim()
      if (!accId) continue
      const pId = a.parent_account_id?.trim() || null
      const accCourses = coursesByAccount.get(accId) || []

      nodeMap.set(accId, {
        accountId: accId,
        parentAccountId: pId,
        name: a.name?.trim() || accId,
        depth: 0,
        children: [],
        courses: accCourses,
      })
    }

    // Añadir cuentas implícitas si algún curso tiene accountId no listada en accounts.csv
    for (const [accId, cList] of coursesByAccount.entries()) {
      if (!nodeMap.has(accId)) {
        nodeMap.set(accId, {
          accountId: accId,
          parentAccountId: null,
          name: `Cuenta ${accId}`,
          depth: 0,
          children: [],
          courses: cList,
        })
      }
    }

    // Construir jerarquía recursiva
    const rootNodes: MigrationAccountNode[] = []
    for (const node of nodeMap.values()) {
      if (node.parentAccountId && nodeMap.has(node.parentAccountId) && node.parentAccountId !== node.accountId) {
        nodeMap.get(node.parentAccountId)!.children.push(node)
      } else {
        rootNodes.push(node)
      }
    }

    // Calcular profundidad
    function assignDepth(nodes: MigrationAccountNode[], currentDepth: number) {
      for (const n of nodes) {
        n.depth = currentDepth
        n.children.sort((x, y) => x.name.localeCompare(y.name))
        n.courses.sort((x, y) => x.longName.localeCompare(y.longName))
        assignDepth(n.children, currentDepth + 1)
      }
    }
    assignDepth(rootNodes, 0)
    rootNodes.sort((a, b) => a.name.localeCompare(b.name))

    // Obtener resumen
    const allSummaries = await listMigrationPackages()
    const summary = allSummaries.find((s) => s.folderName === folderName) || {
      folderName,
      periodName: folderName.split(' - ')[0],
      createdAt: new Date().toLocaleString(),
      mtime: Date.now(),
      rootAccount: '',
      coursesCount: courses.length,
      sectionsCount: sections.length,
      usersCount: users.length,
      teachersCount: users.length,
      studentsCount: users.length,
      accountsCount: accounts.length,
    }

    return {
      summary,
      rootNodes,
      totalAccounts: nodeMap.size,
      totalCourses: courses.length,
      totalSections: sections.length,
    }
  } catch (err) {
    console.error(`Error leyendo migración ${folderName}:`, err)
    return null
  }
}
