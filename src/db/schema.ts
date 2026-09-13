import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// 1. Import Cases (Each execution is an independent case)
export const importCases = sqliteTable(
  'import_cases',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status', { enum: ['pending', 'in_progress', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    sourceServer: text('source_server').notNull(),
    sourceAcademicDb: text('source_academic_db').notNull(),
    sourceAuthDb: text('source_auth_db').notNull(),
    totalTables: integer('total_tables').default(0).notNull(),
    totalRows: integer('total_rows').default(0).notNull(),
    tableStats: text('table_stats'), // JSON string: { [table: string]: { rowCount: number, durationMs: number } }
    errorMessage: text('error_message'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_import_cases_status').on(table.status),
    index('idx_import_cases_created_at').on(table.createdAt),
  ]
)

// 2. Case Raw Table Snapshots (Complete raw SQL Server data dumps per case)
export const caseRawTables = sqliteTable(
  'case_raw_tables',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    tableName: text('table_name').notNull(), // e.g. "General.Periodo"
    schemaName: text('schema_name').notNull(), // e.g. "General"
    rowCount: integer('row_count').notNull().default(0),
    dataJson: text('data_json').notNull(), // Full JSON array of rows
    extractedAt: integer('extracted_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index('idx_case_raw_tables_case_id').on(table.caseId),
    uniqueIndex('uidx_case_raw_table_case').on(table.caseId, table.tableName),
  ]
)

// 3. Case Normalized Academic Periods
export const casePeriods = sqliteTable(
  'case_periods',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    periodoId: integer('periodo_id').notNull(),
    nombre: text('nombre').notNull(),
    tipoPeriodo: text('tipo_periodo'),
    fechaInicio: text('fecha_inicio'),
    fechaFin: text('fecha_fin'),
    activo: integer('activo', { mode: 'boolean' }),
    sufijo: text('sufijo'),
  },
  (table) => [
    index('idx_case_periods_case_id').on(table.caseId),
    index('idx_case_periods_periodo_id').on(table.periodoId),
  ]
)

// 4. Case Normalized Courses
export const caseCourses = sqliteTable(
  'case_courses',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    cursoId: integer('curso_id').notNull(),
    codCurso: text('cod_curso').notNull(),
    nombre: text('nombre').notNull(),
    abreviatura: text('abreviatura'),
    planId: integer('plan_id'),
    ciclo: text('ciclo'),
  },
  (table) => [
    index('idx_case_courses_case_id').on(table.caseId),
    index('idx_case_courses_cod_curso').on(table.codCurso),
  ]
)

// 5. Case Normalized Sections
export const caseSections = sqliteTable(
  'case_sections',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    seccionId: integer('seccion_id').notNull(),
    nombre: text('nombre').notNull(),
    activo: integer('activo', { mode: 'boolean' }),
    cargaAcademicaSedeId: integer('carga_academica_sede_id'),
  },
  (table) => [
    index('idx_case_sections_case_id').on(table.caseId),
    index('idx_case_sections_seccion_id').on(table.seccionId),
  ]
)

// 6. Case Normalized Users (Students & Faculty with official DNI)
export const caseUsers = sqliteTable(
  'case_users',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // Student code or Teacher DNI
    sourcePersonaId: integer('source_persona_id'),
    fullName: text('full_name').notNull(),
    email: text('email'),
    userType: text('user_type', { enum: ['student', 'teacher', 'personnel'] }).notNull(),
  },
  (table) => [
    index('idx_case_users_case_id').on(table.caseId),
    index('idx_case_users_user_id').on(table.userId),
    uniqueIndex('uidx_case_user_type').on(table.caseId, table.userId, table.userType),
  ]
)

// 7. Case Normalized Enrollments
export const caseEnrollments = sqliteTable(
  'case_enrollments',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => importCases.id, { onDelete: 'cascade' }),
    courseId: text('course_id').notNull(),
    sectionId: text('section_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role', { enum: ['student', 'teacher'] }).notNull(),
    status: text('status').notNull().default('active'),
  },
  (table) => [
    index('idx_case_enrollments_case_id').on(table.caseId),
    index('idx_case_enrollments_user_id').on(table.userId),
    uniqueIndex('uidx_case_enrollment').on(
      table.caseId,
      table.courseId,
      table.sectionId,
      table.userId,
      table.role
    ),
  ]
)

// 8. Canvas Import Cases (Live state extraction via Canvas LMS REST API)
export const canvasImportCases = sqliteTable(
  'canvas_import_cases',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status', { enum: ['pending', 'in_progress', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    endpoint: text('endpoint').notNull(),
    totalAccounts: integer('total_accounts').default(0).notNull(),
    totalTerms: integer('total_terms').default(0).notNull(),
    totalCourses: integer('total_courses').default(0).notNull(),
    totalRows: integer('total_rows').default(0).notNull(),
    entityStats: text('entity_stats'),
    errorMessage: text('error_message'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_canvas_import_cases_status').on(table.status),
    index('idx_canvas_import_cases_created_at').on(table.createdAt),
  ]
)

// 9. Canvas Case Raw Entity Snapshots
export const canvasCaseRawEntities = sqliteTable(
  'canvas_case_raw_entities',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => canvasImportCases.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    itemCount: integer('item_count').notNull().default(0),
    dataJson: text('data_json').notNull(),
    extractedAt: integer('extracted_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index('idx_canvas_case_raw_entities_case_id').on(table.caseId),
    uniqueIndex('uidx_canvas_case_raw_entity').on(table.caseId, table.entityType),
  ]
)

// 10. Canvas Case Normalized Accounts
export const canvasCaseAccounts = sqliteTable(
  'canvas_case_accounts',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => canvasImportCases.id, { onDelete: 'cascade' }),
    canvasId: integer('canvas_id').notNull(),
    name: text('name').notNull(),
    parentAccountId: integer('parent_account_id'),
    rootAccountId: integer('root_account_id'),
    sisAccountId: text('sis_account_id'),
    workflowState: text('workflow_state'),
    coursesCount: integer('courses_count').default(0).notNull(),
  },
  (table) => [
    index('idx_canvas_case_accounts_case_id').on(table.caseId),
    index('idx_canvas_case_accounts_canvas_id').on(table.canvasId),
    index('idx_canvas_case_accounts_parent_id').on(table.parentAccountId),
    index('idx_canvas_case_accounts_sis_id').on(table.sisAccountId),
  ]
)

// 11. Canvas Case Normalized Courses
export const canvasCaseCourses = sqliteTable(
  'canvas_case_courses',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => canvasImportCases.id, { onDelete: 'cascade' }),
    canvasId: integer('canvas_id').notNull(),
    name: text('name').notNull(),
    courseCode: text('course_code'),
    sisCourseId: text('sis_course_id'),
    accountId: integer('account_id').notNull(),
    enrollmentTermId: integer('enrollment_term_id'),
    workflowState: text('workflow_state'),
    totalStudents: integer('total_students').default(0).notNull(),
    sectionsJson: text('sections_json'), // JSON array of [{ id, name, sis_section_id, total_students }]
  },
  (table) => [
    index('idx_canvas_case_courses_case_id').on(table.caseId),
    index('idx_canvas_case_courses_account_id').on(table.accountId),
    index('idx_canvas_case_courses_canvas_id').on(table.canvasId),
    index('idx_canvas_case_courses_sis_id').on(table.sisCourseId),
  ]
)

// 12. Canvas Case Normalized Enrollments (Teachers & Students)
export const canvasCaseEnrollments = sqliteTable(
  'canvas_case_enrollments',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    caseId: text('case_id')
      .notNull()
      .references(() => canvasImportCases.id, { onDelete: 'cascade' }),
    courseId: integer('course_id').notNull(),
    sectionId: integer('section_id'),
    userId: integer('user_id').notNull(),
    sisUserId: text('sis_user_id'),
    fullName: text('full_name').notNull(),
    email: text('email'),
    role: text('role').notNull(), // 'teacher' | 'student'
  },
  (table) => [
    index('idx_canvas_case_enr_case_id').on(table.caseId),
    index('idx_canvas_case_enr_course_id').on(table.courseId),
    index('idx_canvas_case_enr_case_course').on(table.caseId, table.courseId),
    index('idx_canvas_case_enr_section_id').on(table.sectionId),
    index('idx_canvas_case_enr_role').on(table.role),
  ]
)

export type ImportCase = typeof importCases.$inferSelect
export type NewImportCase = typeof importCases.$inferInsert
export type CaseRawTable = typeof caseRawTables.$inferSelect
export type CasePeriod = typeof casePeriods.$inferSelect
export type CaseCourse = typeof caseCourses.$inferSelect
export type CaseSection = typeof caseSections.$inferSelect
export type CaseUser = typeof caseUsers.$inferSelect
export type CaseEnrollment = typeof caseEnrollments.$inferSelect
export type CanvasImportCase = typeof canvasImportCases.$inferSelect
export type NewCanvasImportCase = typeof canvasImportCases.$inferInsert
export type CanvasCaseRawEntity = typeof canvasCaseRawEntities.$inferSelect
export type CanvasCaseAccount = typeof canvasCaseAccounts.$inferSelect
export type CanvasCaseCourse = typeof canvasCaseCourses.$inferSelect
export type CanvasCaseEnrollment = typeof canvasCaseEnrollments.$inferSelect
