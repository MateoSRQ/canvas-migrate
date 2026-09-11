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

export type ImportCase = typeof importCases.$inferSelect
export type NewImportCase = typeof importCases.$inferInsert
export type CaseRawTable = typeof caseRawTables.$inferSelect
export type CasePeriod = typeof casePeriods.$inferSelect
export type CaseCourse = typeof caseCourses.$inferSelect
export type CaseSection = typeof caseSections.$inferSelect
export type CaseUser = typeof caseUsers.$inferSelect
export type CaseEnrollment = typeof caseEnrollments.$inferSelect
