# PROJECT MEMORY & ARCHITECTURE

> **CRITICAL DIRECTIVE**: This document is the Single Source of Truth for the project. It serves as the project **Plan**, **Memory & Architecture**, **Commit Log**, and **UI Design Log**.
>
> Every agent and developer working in this codebase **MUST read this file first** before performing any task, and **MUST update this file immediately** upon making any change, architectural decision, or UI adjustment.

---

## 1. Project Plan & Roadmap

### Current Status: Phase 1 Complete (Foundation & Base Shell)

- [x] **Project Initialization**
  - [x] TanStack Start full-stack application configured with React 19, TypeScript, and Vite.
  - [x] Git repository initialized with `main` branch.
  - [x] Clean `.gitignore` and `.env.example` setup for SQLite.
- [x] **Database & ORM Setup**
  - [x] Drizzle ORM configured with SQLite (`better-sqlite3`).
  - [x] Schema definition created (`src/db/schema.ts`).
  - [x] Drizzle config created (`drizzle.config.ts`) and verified with `drizzle-kit push`.
- [x] **Styling & Design System**
  - [x] Tailwind CSS v4 configured with `@tailwindcss/vite`.
  - [x] shadcn/ui v4 installed and configured.
  - [x] Theme configured to standard **Gray** color palette (OKLCH tokens).
  - [x] Typography configured with **Geist Sans** (`@fontsource/geist-sans`).
- [x] **Application Layout Shell**
  - [x] Left drawer menu (`src/components/ui/sheet.tsx` + `src/components/layout/app-layout.tsx`) with toggle trigger.
  - [x] Central panel: full-width (`w-full flex-1`), clean and responsive.
  - [x] Explicitly avoided unsolicited dashboard or extra metric widgets.
- [x] **Source Canvas LMS Reference & Architecture Audit**
  - [x] Extracted connection credentials from `/home/mateo/projects/canvas/.env` (MSSQL `BDACADEMICO5`, `BDAUTENTICACION5`, Canvas API production and sandbox tokens).
  - [x] Audited latest `/new` architecture: clean pipeline, differential export engine, hierarchy writer, and ZIP packager.
  - [x] Documented Canvas LMS SIS import/export specs, teacher DNI normalization, subaccount tree, and REST API sync in [`docs/CANVAS_REFERENCE.md`](file:///home/mateo/projects/canvas-migrate/docs/CANVAS_REFERENCE.md).
- [x] **Phase 2: SQL Server Data Extraction & Independent Case System**
  - [x] Implemented relational schema in SQLite / Drizzle supporting segregated import cases (`import_cases`, `case_raw_tables`, `case_periods`, `case_courses`, `case_sections`, `case_users`, `case_enrollments`).
  - [x] Multi-database MSSQL connection pool (`BDACADEMICO5` + `BDAUTENTICACION5`) on `localhost:1433`.
  - [x] Extracted 20 source tables (19 academic tables + `Personal.Utb_Persona`) with reserved keyword escaping (`[Academico].[Plan]`).
  - [x] Fast batch ingestion (500 records/batch) into SQLite: raw JSON table dumps and normalized relational records.
  - [x] Verified complete isolation between runs (e.g. `case_20260911161211_xhnnq` and `case_20260911161521_nizlz` co-exist with 121,091 records each without cross-contamination).
  - [x] TanStack Start server functions (`runImportCaseFn`, `getCasesFn`, `getCaseDetailFn`, `deleteCaseFn`, `getTableSampleFn`).
  - [x] Full-width Case Manager UI with modal import launcher, status badges, table list, and top-50 record inspector.
- [x] **Phase 3: Hierarchical Data Selection & TanStack Table Engine**
  - [x] Implemented hierarchy aggregation service (`src/server/services/hierarchy-service.ts`) linking 2,925 course-sections, 2,199 teachers with official DNI, and student enrollments with sub-millisecond caching.
  - [x] TanStack Start server functions (`getCaseHierarchyFn`, `getSectionStudentsFn`, `clearHierarchyCacheFn`).
  - [x] Installed `@tanstack/react-table` (v8) and created shadcn `Checkbox` (with indeterminate minus support) and `Input` components.
  - [x] Full-width Hierarchical Data Selection workspace (`src/components/hierarchy/hierarchy-selector.tsx`):
    - Case selector switching seamlessly between import cases.
    - 6-level cascading hierarchical filters (Periodo, Sede, Modalidad, Facultad, Carrera, Plan).
    - "Exclude 'NO HABILITADO'" sections toggle and global text search filter.
    - Dual-view switcher: **Vista Jerárquica Anidada (Árbol)** vs **Vista Tabla Detallada (TanStack Table)**.
    - **Nested Tree Table (`src/components/hierarchy/hierarchy-tree-table.tsx`)**: Account (Sede) > Subaccount (Modalidad > Facultad > Carrera > Plan) > Curso > Nested Table of Secciones, with multi-level cascading checkboxes, collapse/expand all, and student rosters.
    - **Inline Matriculados Breakdown [(D) Docentes / (E) Estudiantes]**: Full inline expansion under every section showing assigned teachers with DNI and enrolled students with student code and email, matching `hierarchy.txt` reference.
    - Multi-row selection with "Select All Filtered", "Clear", and selection metrics (sections, courses, students).
    - Sorting and pagination across course-sections.
    - Modal dialog displaying enrolled students for any selected section.
    - Selection summary breakdown modal.
    - **Granular Manual & Batch Folding / Unfolding Engine**: Resolved bounce-back re-expansion bug when clicking "Plegar Todo", added level-based batch controls (Plegar Todo, Nivel Sedes, Nivel Carreras, Nivel Cursos, Todo con Matriculados), branch-level toggles on Periodo, Sede, Carrera, Plan, and Curso with Alt+Click support, plus TanStack Table batch page unfolding controls.
    - **100% Spanish translation** across all UI texts, labels, buttons, dialogs, and messages.
- [x] **Phase 4: Transformation, Normalization & Canvas Migration Exporter**
  - [x] Transform selected case data into standard SIS Canvas format (`accounts.csv`, `terms.csv`, `users.csv`, `courses.csv`, `sections.csv`, `enrollments.csv`).
  - [x] Canvas Exporter engine creating directory `migraciones/[nombre de periodo - timestamp como YYYYMMDDHHMMSS]` with sanitized path names.
  - [x] Topological sort for Canvas subaccounts (`Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`).
  - [x] Teacher identification normalized to official National ID / DNI and student codes.
  - [x] Automatic generation of visual tree `hierarchy.txt`, technical report `RESUMEN.md`, and ZIP archive `canvas_migration.zip`.
  - [x] Export action button and full-featured confirmation & inspection modal in `HierarchySelector`.
  - [x] Subcuenta inicial / raíz configurable en modal de exportación (asigna `parent_account_id` a nivel de Sedes en `accounts.csv`, o vacío si se deja en blanco).
  - [x] Creación e inyección automática de subcuenta raíz personalizada en `accounts.csv` con `parent_account_id: ""` para alta inmediata en Canvas LMS SIS Import, conmutador interactivo y nombre descriptivo opcional en `CanvasExportDialog`.
  - [x] **Arquitectura y Optimización de Deuda Técnica (Completado)**
    - [x] Optimización de base de datos SQLite: Pragmas WAL mode, foreign_keys ON, synchronous NORMAL y 64MB cache en `better-sqlite3`.
    - [x] Eliminación de sobrecarga de red (Overfetching): Lazy loading de alumnos matriculados (`estudiantes: []` y `estudiantesCount: N` en payload inicial, reduciendo transferencia JSON de 5.5MB a ~350KB).
    - [x] Cache en memoria acotado tipo LRU (`LruCache` max 3 casos, TTL 30 min) y centralización de helpers de SQLite en `src/server/services/db-helpers.ts`.
    - [x] Integración de spinning loaders (`Loader2 animate-spin`) en todos los tiempos de espera y operaciones asíncronas: carga de jerarquía, carga de casos, detalle de caso, despliegue inline de alumnos en árbol y tabla, modal de inspección y exportación a Canvas LMS.
    - [x] Modularización de componentes: Extracción de modales a `src/components/hierarchy/modals/` y componente de desglose inline `TreeSectionRoster`.
  - [x] **Auditoría y Sanitización de Credenciales y Secretos (Completado)**
    - [x] Auditoría completa de secretos, tokens y contraseñas en código fuente, historial git y documentación.
    - [x] Eliminación de fallback de contraseña quemada en `src/server/services/sql-server.ts`.
    - [x] Sanitización de tokens Canvas y credenciales de base de datos en `docs/CANVAS_REFERENCE.md` y `PROJECT_MEMORY.md`.
    - [x] Verificación de aislamiento en bundles Vite/cliente (`dist/client/` libre de variables privadas) y verificación de exclusión en `.gitignore`.
  - [ ] Implement differential engine comparing Case A against Case B (`_added`, `_updated`, `_deleted`, `_concluded`).
- [x] **Phase 5: Canvas LMS API Synchronization & Live State Extraction (Completado)**
  - [x] Esquema relacional segregado en SQLite para casos Canvas (`canvas_import_cases`, `canvas_case_raw_entities`, `canvas_case_accounts`, `canvas_case_courses`, `canvas_case_enrollments`).
  - [x] Servicio cliente Canvas REST API (`src/server/services/canvas-importer.ts`) con paginación Link header, reintentos exponenciales y extracción de cuentas, términos y cursos completos con secciones y docentes.
  - [x] TanStack Start server functions (`getCanvasCasesFn`, `getCanvasCaseDetailFn`, `getCanvasCaseAccountsTreeFn`, `runCanvasImportCaseFn`, `deleteCanvasCaseFn`, `getCanvasEntitySampleFn`, `testCanvasConnectionFn`, `getCanvasCourseEnrollmentsFn`).
  - [x] Visualizador jerárquico completo en `CanvasCaseManager` análogo al árbol de base de datos: Cuenta/Subcuenta -> Curso -> Sección -> Docentes (D) con DNI y Estudiantes (E) con código institucional.
  - [x] Carga bajo demanda reactiva (Lazy Loading) de docentes y alumnos por curso con feedback `Loader2`, almacenamiento en caché persistente en SQLite y botón de plegado masivo de matrículas.
  - [x] Pestaña de navegación en el shell superior `Casos Canvas LMS (API)` y enlace en el drawer menú lateral (`AppLayout`).
  - [ ] Canvas REST API client for direct SIS upload (`POST /api/v1/accounts/1/sis_imports`).
  - [ ] Job status polling, import log inspection, and error auditing.

---

## 2. Memory & Architecture

### System Architecture
The application is a full-stack React application built on **TanStack Start**, leveraging server-side rendering (SSR) and client hydration backed by **Vite** and an embedded **SQLite** database via **Drizzle ORM**.

```
[ Browser / Client ]
       │
       ▼ (SSR / Client Hydration)
[ TanStack Start & Router (Vite) ]
       │
       ▼ (Type-Safe Database Access)
[ Drizzle ORM (better-sqlite3) ]
       │
       ▼
[ SQLite Database (dev.db) ]
```

### Technology Stack
- **Framework**: TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`)
- **Runtime / Bundler**: Vite 8 with `@vitejs/plugin-react`
- **Language**: TypeScript 5+ (Strict mode, verbatim module syntax, bundler resolution)
- **Database**: SQLite (`dev.db`)
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `better-sqlite3`)
- **CSS / Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@theme inline`)
- **UI Components**: shadcn/ui v4 (`button`, `sheet`, Radix primitives)
- **Typography**: Geist Sans (`@fontsource/geist-sans`)
- **Icons**: Lucide React (`lucide-react`)

### Directory Structure
```
canvas-migrate/
├── .env.example              # Environment variables template (MSSQL & SQLite config)
├── .env.local                # Local environment secrets (ignored)
├── AGENTS.md                 # Agent instructions & memory reading rule
├── GEMINI.md                 # Gemini / Antigravity workspace rule
├── PROJECT_MEMORY.md         # Single Source of Truth (Plan, Memory, Commit Log, UI Log)
├── components.json           # shadcn/ui configuration (baseColor: gray)
├── drizzle.config.ts         # Drizzle kit configuration for SQLite
├── package.json              # Project dependencies and npm scripts
├── tsconfig.json             # TypeScript compiler options and path aliases
├── vite.config.ts            # Vite configuration with Tailwind and TanStack Start
└── src/
    ├── db/
    │   ├── index.ts          # Drizzle client instance (better-sqlite3)
    │   └── schema.ts         # SQLite schema: import_cases, case_raw_tables, case_*
    ├── lib/
    │   └── utils.ts          # Utility functions (cn helper)
    ├── server/
    │   ├── services/
    │   │   ├── db-helpers.ts # Helper centralizado SQLite getTableFromDb y cache LRU acotado
    │   │   ├── sql-server.ts # MSSQL connection pool manager & table extractor
    │   │   ├── importer.ts   # Case extraction, batch ingestion & normalization engine
    │   │   ├── hierarchy-service.ts # Academic tree assembler, teacher resolver, LRU & lazy student map
    │   │   └── canvas-exporter.ts # Canvas SIS CSV exporter, hierarchy writer & zip packager
    │   └── functions/
    │       ├── cases.ts      # TanStack Start server functions for cases (RPC)
    │       └── hierarchy.ts  # TanStack Start server functions for hierarchy & students (RPC)
    ├── components/
    │   ├── cases/
    │   │   └── case-manager.tsx # Full-width Case Manager UI & table sample inspector con spinning loaders
    │   ├── hierarchy/
    │   │   ├── modals/
    │   │   │   ├── student-inspector-dialog.tsx # Modal de inspección de alumnos matriculados con Loader2
    │   │   │   ├── selection-summary-dialog.tsx # Modal de resumen cuantitativo de selección activa
    │   │   │   └── canvas-export-dialog.tsx     # Modal de exportación a CSV para Canvas LMS con Loader2
    │   │   ├── tree-section-roster.tsx # Desglose modular de docentes y alumnos con carga bajo demanda
    │   │   ├── hierarchy-selector.tsx # Full-width TanStack Table & cascading filter UI modularizado
    │   │   └── hierarchy-tree-table.tsx # Nested account/subaccount tree con carga bajo demanda y Loader2
    │   ├── layout/
    │   │   └── app-layout.tsx# Global layout: Top header, left drawer menu, full-width panel
    │   └── ui/
    │       ├── badge.tsx     # shadcn Badge component
    │       ├── button.tsx    # shadcn Button component
    │       ├── checkbox.tsx  # shadcn Checkbox component
    │       ├── dialog.tsx    # shadcn Dialog modal component
    │       ├── input.tsx     # shadcn Input component
    │       ├── sheet.tsx     # shadcn Sheet component (drawer)
    │       └── table.tsx     # shadcn Table component
    ├── routes/
    │   ├── __root.tsx        # Root route shell with AppLayout & font integration
    │   └── index.tsx         # Home route with tab switching (Hierarchy & Selection / Cases)
    ├── router.tsx            # TanStack router factory
    └── styles.css            # Tailwind v4 styles, Gray theme OKLCH tokens & Geist font
```

### Path Aliasing
- `#/` and `@/` both resolve to `./src/*` across `package.json` imports and `tsconfig.json` paths.

### Database Architecture & Independent Case Model
- **Provider**: SQLite via `better-sqlite3` (`dev.db`).
- **Isolation Guarantee**: Each import run creates a distinct, globally unique `case_id` (`case_<timestamp>_<rand>`). Subsequent imports never overwrite, mutate, or conflict with previous imports.
- **Relational Case Tables**:
  - `import_cases`: Metadata, status (`pending`, `in_progress`, `completed`, `failed`), timing, total tables, total rows, and JSON execution stats per table.
  - `case_raw_tables`: Full raw snapshot of every extracted table as JSON (`data_json`), indexed by `(case_id, table_name)`. Enables lossless historic diffing and debugging.
  - `case_periods`: Normalized academic periods for the case (`periodo_id`, `nombre`, `tipo_periodo`, `activo`).
  - `case_courses`: Normalized courses for the case (`curso_id`, `cod_curso`, `nombre`, `plan_id`, `ciclo`).
  - `case_sections`: Normalized class sections for the case (`seccion_id`, `nombre`, `carga_academica_sede_id`).
  - `case_users`: Normalized teachers and students with official National ID / DNI (`user_id`, `full_name`, `email`, `user_type`).
  - `case_enrollments`: Normalized enrollment records linking users to courses and sections with roles (`student`, `teacher`).
- **Cascade Deletion**: All `case_*` rows reference `import_cases.id` with `onDelete: 'cascade'`, ensuring clean atomic case removals without orphaned records.

### Canvas LMS Live Snapshot & Hierarchical Database Architecture
- **Provider**: SQLite via `better-sqlite3` (`dev.db`).
- **Canvas Live Case Tables**:
  - `canvas_import_cases`: Metadata de la extracción de Canvas API (`endpoint`, `status`, `totalAccounts`, `totalTerms`, `totalCourses`, `totalRows`, `entityStats`).
  - `canvas_case_raw_entities`: Snapshots crudos JSON por tipo de entidad (`accounts`, `terms`, `courses`).
  - `canvas_case_accounts`: Cuentas y subcuentas normalizadas (`canvasId`, `name`, `sisAccountId`, `parentAccountId`, `rootAccountId`, `coursesCount`).
  - `canvas_case_courses`: Cursos normalizados extraídos de Canvas (`canvasId`, `name`, `courseCode`, `sisCourseId`, `accountId`, `totalStudents`, `sectionsJson`).
  - `canvas_case_enrollments`: Docentes (`teacher`) y alumnos (`student`) matriculados, resueltos bajo demanda e indexados por `(case_id, course_id, section_id, role)` con almacenamiento persistente en SQLite.
- **Cascade Purge**: Todas las tablas `canvas_case_*` eliminan atómicamente sus registros cuando se purga un caso (`onDelete: 'cascade'`).
- **Scripts**:
  - `npm run db:push` - push schema changes directly to SQLite database.
  - `npm run db:generate` - generate Drizzle migrations.
  - `npm run db:migrate` - run migrations.
  - `npm run db:studio` - start Drizzle Studio.

### Canvas LMS Integration & Migration Reference Architecture
Detailed documentation compiled in [`docs/CANVAS_REFERENCE.md`](file:///home/mateo/projects/canvas-migrate/docs/CANVAS_REFERENCE.md):
- **Source MSSQL Databases**: `BDACADEMICO5` (academic loads, courses, sections, enrollments) & `BDAUTENTICACION5` (`Personal.Utb_Persona` for teacher DNI/emails) hosted on `localhost:1433` (`sa` / credenciales cargadas vía `process.env.DB_PASSWORD` en `.env.local`).
- **Canvas LMS API**: Production instance `https://politecnica.instructure.com/` (Token de autenticación cargado vía `process.env.CANVAS_API_KEY` en `.env.local`).
- **Data Pipelines (`canvas/new/`)**:
  - `hierarchy.ts`: Multi-level academic tree builder.
  - `sis_exporter.ts`: Canvas Standard SIS CSV formatter (`accounts`, `terms`, `users`, `courses`, `sections`, `enrollments`).
  - `diff_engine.ts`: Differential detection against previous exports (`_added`, `_deleted`, `_updated`, `enrollments_to_delete`, `enrollments_to_conclude`).
  - `hierarchy_writer.ts`: Formatted tabbed hierarchy tree output (`hierarchy.txt`).
- **Key Normalization Rules**:
  - Teacher SIS ID: Normalized to official National ID / DNI (replaces legacy emails and sequential IDs).
  - Subaccount Hierarchy: `Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`.
  - Exclusion filter: Sections with `"NO HABILITADO"` omitted when flag is false.
  - Course Placement (`courses.csv`): Associated directly with the Curricular Plan subaccount (`account_id: <cod_plan>`).
  - Root Account Association & SIS Provisioning: Top-level Sedes point to `parent_account_id: cleanRootAccountId` (o `""` para colgar directo de la raíz institucional de Canvas). Cuando `createRootAccount` está activo, el exportador genera en la primera fila de `accounts.csv` la definición de dicha subcuenta raíz personalizada con `parent_account_id: ""` y `status: "active"`. De este modo, Canvas LMS crea la subcuenta en el mismo proceso de importación SIS y cuelga de inmediato las Sedes sin emitir alertas de *"Parent account didn't exist"*. Se incluye además nombre visible opcional (`rootAccountName`).

---

## 3. Commit & Change Log

| Timestamp (ISO) | Commit | Author | Type | Description | Files Affected |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-09-11T10:00:00` | - | Antigravity | Initial | Git initialized (`main` branch) | `.git` |
| `2026-09-11T10:05:00` | - | Antigravity | Scaffold | Scaffolded TanStack Start app with React, Vite, Drizzle, and SQLite | `package.json`, `vite.config.ts`, `src/db/*` |
| `2026-09-11T10:07:00` | - | Antigravity | Config | Configured shadcn 4 with `baseColor: "gray"` | `components.json` |
| `2026-09-11T10:08:00` | - | Antigravity | Font | Installed and imported Geist Sans (`@fontsource/geist-sans`) | `package.json`, `src/styles.css` |
| `2026-09-11T10:10:00` | - | Antigravity | UI Components | Added shadcn `button` and `sheet` components; adjusted path aliases | `src/components/ui/button.tsx`, `src/components/ui/sheet.tsx` |
| `2026-09-11T10:11:00` | - | Antigravity | Theme | Applied clean Gray palette OKLCH tokens and Geist Sans typography to Tailwind v4 | `src/styles.css` |
| `2026-09-11T10:12:00` | - | Antigravity | Layout | Implemented `AppLayout` with left drawer menu (`Sheet`) and full-width central panel | `src/components/layout/app-layout.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` |
| `2026-09-11T10:13:00` | - | Antigravity | DB | Executed `db:push` to verify SQLite database generation | `dev.db`, `.gitignore` |
| `2026-09-11T10:14:00` | - | Antigravity | Docs/Rules | Created `PROJECT_MEMORY.md`, configured `AGENTS.md` and `GEMINI.md` as mandatory read/update rules | `PROJECT_MEMORY.md`, `AGENTS.md`, `GEMINI.md` |
| `2026-09-11T10:16:00` | `11f84fe` | Antigravity | Commit | Initial commit of TanStack Start foundation, SQLite, shadcn 4, Gray theme, and Geist Sans | All project files |
| `2026-09-11T10:28:00` | `fc34acf` | Antigravity | Reference | Analyzed Canvas source app, credentials, /new pipeline, and created CANVAS_REFERENCE.md | `docs/CANVAS_REFERENCE.md`, `PROJECT_MEMORY.md` |
| `2026-09-11T11:25:00` | `9d2eea2` | Antigravity | Feature | MSSQL multi-db extraction engine and relational independent case schema in SQLite | `src/server/services/sql-server.ts`, `src/server/services/importer.ts`, `src/db/schema.ts`, `src/db/index.ts` |
| `2026-09-11T11:28:00` | `9d2eea2` | Antigravity | UI/RPC | TanStack Start server functions and full-width Case Manager UI with sample inspector | `src/components/cases/case-manager.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/table.tsx`, `src/server/functions/cases.ts`, `src/routes/index.tsx` |
| `2026-09-11T12:00:00` | `b0e5e29` | Antigravity | Feature/UI | Hierarchical data selection, 6-level cascading filters, TanStack Table v8, and student inspector | `src/components/hierarchy/hierarchy-selector.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/input.tsx`, `src/server/services/hierarchy-service.ts`, `src/server/functions/hierarchy.ts`, `src/routes/index.tsx`, `src/components/layout/app-layout.tsx` |
| `2026-09-11T12:10:00` | `a881abf` | Antigravity | Feature/UI | Nested account/subaccount tree table view, dual-view mode switcher, and complete Spanish UI translation | `src/components/hierarchy/hierarchy-tree-table.tsx`, `src/components/hierarchy/hierarchy-selector.tsx`, `src/components/cases/case-manager.tsx`, `src/routes/index.tsx`, `src/components/layout/app-layout.tsx` |
| `2026-09-11T12:20:00` | `4a7e9b1` | Antigravity | Feature/UX | Cross-case selection & exploration linking Case Manager table/detail directly with Hierarchy Selector | `src/components/hierarchy/hierarchy-selector.tsx`, `src/components/cases/case-manager.tsx`, `src/routes/index.tsx` |
| `2026-09-11T12:30:00` | `a02718c` | Antigravity | Feature/UI | Inline Docentes (D) & Alumnos Matriculados (E) breakdown under sections across Tree Table & TanStack Table | `src/server/services/hierarchy-service.ts`, `src/components/hierarchy/hierarchy-tree-table.tsx`, `src/components/hierarchy/hierarchy-selector.tsx` |
| `2026-09-11T12:41:00` | `4079c8b` | Antigravity | Fix/UX | Resolved collapse bounce-back bug, added granular level-based batch unfolding and branch-level toggles | `src/components/hierarchy/hierarchy-tree-table.tsx`, `src/components/hierarchy/hierarchy-selector.tsx` |
| `2026-09-11T12:55:00` | `e5cb780` | Antigravity | Feature/Export | Exportación a archivos CSV para migración Canvas en /migraciones/[periodo - YYYYMMDDHHMMSS] con hierarchy.txt y zip | `src/server/services/canvas-exporter.ts`, `src/server/functions/hierarchy.ts`, `src/components/hierarchy/hierarchy-selector.tsx`, `.gitignore` |
| `2026-09-11T13:25:00` | `e2bcdc0` | Antigravity | Fix/UX | Corrección integral del sistema de plegado/desplegado: toggleBranchKeys basado en estado de raíz, botón Plegar Matriculados, autosincronización y poda de claves válidas y startTransition de React 19 | `src/components/hierarchy/hierarchy-tree-table.tsx`, `src/components/hierarchy/hierarchy-selector.tsx` |
| `2026-09-11T13:28:00` | `ae10003` | Antigravity | Perf/DB | Configuración de pragmas de SQLite en better-sqlite3: WAL mode, foreign_keys ON, synchronous NORMAL y 64MB caché | `src/db/index.ts` |
| `2026-09-11T13:42:00` | `e2cbb25` | Antigravity | Refactor/Perf | Optimización de payload (lazy loading de alumnos de 5.5MB a 350KB), cache LRU en memoria, modularización de modales y spinning loaders (Loader2) en todas las operaciones asíncronas | `src/server/services/db-helpers.ts`, `src/server/services/hierarchy-service.ts`, `src/server/services/canvas-exporter.ts`, `src/components/hierarchy/modals/*`, `src/components/hierarchy/tree-section-roster.tsx`, `src/components/hierarchy/hierarchy-tree-table.tsx`, `src/components/hierarchy/hierarchy-selector.tsx`, `src/components/cases/case-manager.tsx` |
| `2026-09-11T16:55:00` | `90cc0c2` | Antigravity | Sec/Audit | Auditoría de seguridad y credenciales: eliminación de contraseñas fallback quemadas en `sql-server.ts`, ofuscación y sanitización de tokens Canvas y passwords de base de datos en documentación y memoria del proyecto | `src/server/services/sql-server.ts`, `docs/CANVAS_REFERENCE.md`, `PROJECT_MEMORY.md` |
| `2026-09-12T23:42:00` | - | Antigravity | Docs/Architecture | Documentación de arquitectura de ubicación de cursos en Canvas LMS y diseño de cuenta raíz personalizable | `PROJECT_MEMORY.md` |
| `2026-09-12T23:48:00` | `292e92a` | Antigravity | Feature/Export | Soporte para subcuenta inicial/raíz opcional en exportador Canvas LMS y UI del modal | `src/server/services/canvas-exporter.ts`, `src/components/hierarchy/modals/canvas-export-dialog.tsx`, `src/components/hierarchy/hierarchy-selector.tsx`, `PROJECT_MEMORY.md` |
| `2026-09-13T00:00:00` | `46bd26a` | Antigravity | Feature/CanvasAPI | Importador de casos Canvas LMS vía REST API y visualizador jerárquico de cuentas con buscador y métricas | `src/db/schema.ts`, `src/server/services/canvas-importer.ts`, `src/server/functions/canvas.ts`, `src/components/canvas/canvas-case-manager.tsx`, `src/routes/index.tsx`, `src/components/layout/app-layout.tsx`, `PROJECT_MEMORY.md` |
| `2026-09-13T00:18:00` | `ab929d7` | Antigravity | Feature/CanvasHierarchy | Visualización análoga de Cursos, Secciones, Docentes (D) con DNI y Estudiantes (E) en el árbol Canvas LMS con lazy loading y caché SQLite | `src/db/schema.ts`, `src/server/services/canvas-importer.ts`, `src/server/functions/canvas.ts`, `src/components/canvas/canvas-case-manager.tsx`, `PROJECT_MEMORY.md` |
| `2026-09-13T10:30:00` | `fc7fcf7` | Antigravity | Fix/SISExport | Corrección de resolución de códigos de Sede (S-001 vs S-174) y clarificación de parent_account_id en exportador Canvas | `src/server/services/hierarchy-service.ts`, `src/server/services/canvas-exporter.ts`, `src/components/hierarchy/modals/canvas-export-dialog.tsx`, `PROJECT_MEMORY.md` |
| `2026-09-13T10:45:00` | - | Antigravity | Feature/SISExport | Creación automática de subcuenta padre en accounts.csv para SIS import y campos de control en modal de exportación | `src/server/services/canvas-exporter.ts`, `src/components/hierarchy/modals/canvas-export-dialog.tsx`, `src/components/hierarchy/hierarchy-selector.tsx`, `PROJECT_MEMORY.md` |



---

## 4. UI Design Log

### Theme Foundation
- **Base Color Palette**: Gray (neutral gray scale with crisp contrast, clean light and dark mode tokens defined in OKLCH).
  - `--background`: Clean white `oklch(1 0 0)` in light mode, deep dark gray `oklch(0.145 0 0)` in dark mode.
  - `--foreground`: High contrast `oklch(0.145 0 0)` in light mode, crisp white `oklch(0.985 0 0)` in dark mode.
  - `--primary`: Deep slate gray `oklch(0.205 0 0)` in light mode, pure light gray `oklch(0.985 0 0)` in dark mode.
  - `--border` & `--input`: Subtle gray borders `oklch(0.922 0 0)` / `oklch(0.269 0 0)`.
  - `--sidebar`: Dedicated sidebar tokens matching the gray theme.

### Typography & Language
- **Primary Font**: **Geist Sans** (`'Geist Sans', system-ui, -apple-system, sans-serif`).
- Imported via `@fontsource/geist-sans` in `src/styles.css`.
- Font weights: Regular (400), Medium (500), SemiBold (600), Bold (700).
- **Language**: **100% Spanish (Español)** across all components, badges, forms, headers, tooltips, dialogs, empty states, and action buttons.

### Layout & Surface Design
- **Top Header**:
  - Sticky at top, `h-14`, semi-transparent backdrop blur (`bg-background/95 backdrop-blur`).
  - Contains left drawer trigger (`Button variant="ghost" size="icon"` with Lucide `Menu` icon).
  - Displays application branding: "Canvas Migrate".
- **Left Drawer Menu**:
  - Built with shadcn `Sheet` (`SheetContent side="left"`).
  - Dimensions: `w-72 sm:w-80`, anchored to the left.
  - Contains clean navigation items in Spanish (`Jerarquía y Selección`, `Registro de Casos de Importación`).
  - Drawer closes upon navigation link click or backdrop/close click.
- **Central Panel**:
  - Full width (`w-full flex-1`), expanding across the entire viewport.
  - Flexible height (`min-h-[calc(100vh-3.5rem)]`).
  - Zero unrequested dashboard components, metrics cards, or charts. Pure, focused canvas workspace.

### Component Design
- **Case Manager (`src/components/cases/case-manager.tsx`)**:
  - Clean two-column split on desktop (Case directory list on the left, selected case detail & inspector on the right).
  - Status Indicators: Minimalist `Badge` components in Spanish (`Completado`, `En Progreso`, `Fallido`).
  - Table Catalog: Lists all 20 extracted tables with row counts and duration, offering a "Ver Registros" button.
  - Raw Record Inspector: Modal `Dialog` displaying top 50 rows in a scrollable, monospace `Table` with auto-derived column headers from JSON keys.
  - Action Controls: "Nuevo Caso de Importación" modal trigger; "Ver Jerarquía" button on each table row; "Explorar Jerarquía" in inspector header; "Eliminar Caso" button with cascade purge.
- **Hierarchical Selector Workspace (`src/components/hierarchy/hierarchy-selector.tsx`)**:
  - **Dual-View Switcher**: Toggle smoothly between **Vista Jerárquica Anidada (Árbol)** and **Vista Tabla Detallada (TanStack Table)**.
  - **Case Switcher Bar**: Clean top selector showing case name, total database rows, and status with immediate re-evaluation, synchronized bidirectionally with Case Manager.
  - **Cascading Filter Grid**: 6-level hierarchical selectors (`Periodo` -> `Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`), with dynamic parent-child option binding.
  - **Business Filters**: Toggle for "Excluir secciones «NO HABILITADO»" and free-text search across codes, names, sections, careers, and teachers/DNI.
  - **Selection Control Bar**: Sticky/inline bar displaying selected count, filtered count, total students represented, "Seleccionar Filtrados", and "Limpiar".
  - **Student Inspector Modal**: Dialog rendering full roster of enrolled students (`#`, `Código Alumno`, `Nombre Completo`, `Correo Institucional`) for any selected section.
  - **Selection Summary Modal**: Overview of selected sections, unique courses, and total enrollments ready for SIS packaging.
  - **TanStack Table Sub-toolbar**: Batch page unfolding button (`Desplegar Página (N)`) and `Plegar Todo` for inline teacher & student rosters, with counter badge.
- **Nested Hierarchical Tree Table (`src/components/hierarchy/hierarchy-tree-table.tsx`)**:
  - Exact mirroring of Canvas LMS SIS accounts and subaccounts:
    `[PERIODO] T-id` > `[CUENTA] Sede S-id` > `[SUBCUENTA] Modalidad M-id` > `[SUBCUENTA] Facultad F-id` > `[SUBCUENTA] Carrera C-id` > `[SUBCUENTA] Plan P-codigo` > `[CURSO] CUR-codigo` > `[SECCION]` > `[MATRICULADOS]`.
  - **Inline Matriculados Breakdown**:
    - `(D) [DOCENTE] <DNI> - <Nombre Completo> <<Email>>` with official DNI normalization. Supports multiple teachers per section (`+N más`).
    - `(E) [ESTUDIANTE] <Código> - <Nombre Completo> <<Email>>` with numbered roster and active SIS status.
    - Fallback `(Sin alumnos ni docentes matriculados)` for inactive/unassigned sections.
  - Cascading multi-level selection with indeterminate minus state (`Checkbox`).
  - **Granular Batch & Branch Folding/Unfolding**:
    - **Global Level Batch Controls**: "Plegar Todo", "Plegar Matriculados", "Nivel Sedes", "Nivel Carreras", "Nivel Cursos", and "Todo (+ Matriculados)".
    - **Plegar Todo**: Plegado limpio a 0 nodos abiertos con deshabilitación automática cuando `visibleExpandedCount === 0`.
    - **Plegar Matriculados ({N})**: Botón contextual que aparece al haber desgloses de alumnos/docentes abiertos (`sec-*`), plegando instantáneamente todas las listas de estudiantes sin cerrar los cursos ni subcuentas.
    - **Branch Toggles Inversos Corregidos**: Botones "Rama..." en Periodo, Sede, Carrera, Plan y Curso basan su decisión en el estado del nodo raíz (`isRootOpen`), plegando la rama y eliminando nodos huérfanos si la raíz estaba abierta, o desplegándola si estaba cerrada.
    - **Alt+Click Shortcut**: Funcionalidad en chevrons para alternar ramas completas con comportamiento simétrico.
    - **Renderizado Concurrente No Bloqueante (`useTransition`)**: Actualizaciones del árbol jerárquico envueltas en `startTransition` de React 19 con spinner de feedback en vivo (`Loader2`), garantizando que la UI nunca congele la pestaña ni pierda eventos de clic.
    - **Autosincronización y Poda de Claves**: `allValidKeys` valida las ramas abiertas ante cambios de filtros en cascada o cambio de caso (`key={selectedCaseId}`), autodesplegando el primer periodo y sede si la vista está vacía sin claves obsoletas.
    - **Límite de 30 Alumnos Inline por Sección**: Despliegue de los primeros 30 estudiantes con botón directo al modal para los restantes, previniendo sobrecarga en el DOM ante despliegues masivos.
    - **Contador Dinámico Preciso**: Badge con conteo exacto de ramas visibles válidas (`N ramas desplegadas` o `Todo plegado`).
  - Direct student roster inspection modal per section with search by student code and teacher DNI.
- **Exportación a Canvas LMS SIS CSV (`src/components/hierarchy/hierarchy-selector.tsx` & `src/server/services/canvas-exporter.ts`)**:
  - **Botón de Exportación en Barra de Selección**: `Exportar para Canvas ({selectedCount})` con acento visual en esmeralda (`bg-emerald-600 hover:bg-emerald-700`), visible de inmediato al seleccionar 1 o más secciones tanto en vista árbol como tabla.
  - **Acceso Cruzado desde Resumen**: Botón de exportación integrado directamente dentro del modal de "Resumen de Selección Activa".
  - **Modal de Exportación Multifase (`Dialog`)**:
    - **Fase Inicial (Confirmación, Alcance y Configuración de Raíz)**: Desglose cuantitativo (secciones, cursos únicos, matrículas totales estimadas, periodo académico), campo de entrada `Input` para "Subcuenta Inicial / Raíz en Canvas (Opcional)" (`parent_account_id`) con texto explicativo. Al ingresar un código, se despliega un `Checkbox` para indicar si debe crearse dicha subcuenta en Canvas LMS (incorporándola en la primera fila de `accounts.csv` como cuenta padre) y un campo opcional para su nombre visible. Directorio destino objetivo `migraciones/[Periodo] - [YYYYMMDDHHMMSS]/`, y lista de los 6 archivos CSV estándar de Canvas + documentación + ZIP.
    - **Fase de Procesamiento**: Indicador giratorio con feedback en tiempo real mientras se ensamblan las cuentas, términos, cursos, secciones, usuarios y matrículas y se genera el archivo ZIP.
    - **Fase de Éxito e Inspección**:
      - Banner de éxito con icono de confirmación.
      - Tarjeta de directorio con ruta absoluta copiable en un clic (`navigator.clipboard.writeText`) y badge de confirmación "¡Ruta Copiada!".
      - Muestra dinámica de la Subcuenta Raíz utilizada indicando si fue creada en la migración o si es una subcuenta existente en Canvas.
      - Cuadrícula de 6 métricas clave: Cuentas, Periodos, Cursos, Secciones, Usuarios (Docentes D / Estudiantes E), Matrículas Totales.
      - Tabla de archivos generados con nombres, tipos, conteo de filas y tamaño en KB (`accounts.csv`, `terms.csv`, `courses.csv`, `sections.csv`, `users.csv`, `enrollments.csv`, `hierarchy.txt`, `RESUMEN.md`, `canvas_migration.zip`).
      - Guía rápida paso a paso para carga de SIS Import en la consola de administración de Canvas LMS.
- **Spinning Loaders y Retroalimentación Visual Reactiva (`Loader2 animate-spin`)**:
  - **Carga de Jerarquía Académica**: Contenedor central con indicador giratorio `Loader2` en tono `primary` y texto descriptivo del proceso asíncrono ("Cargando jerarquía académica... Construyendo jerarquía académica y resolviendo cuentas, subcuentas, cursos y secciones").
  - **Desglose Inline de Alumnos Matriculados**: Tanto en la vista de árbol (`HierarchyTreeTable` / `TreeSectionRoster`) como en la vista de tabla (`HierarchySelector`), las secciones que no tienen alumnos pre-cargados muestran un spinner activo en el botón de alternancia ("Cargando...") y un bloque de carga elegante en el cuerpo de la sección ("Cargando lista de alumnos matriculados..."). Una vez cargados, se retienen en un mapa en memoria para reaperturas instantáneas sin peticiones redundantes.
  - **Inspección de Alumnos en Modal (`StudentInspectorDialog`)**: Spinner animado `Loader2` centrado con mensaje de progreso durante la resolución de registros.
  - **Gestor de Casos (`CaseManager`)**: Retroalimentación giratoria en vivo durante la lectura inicial de casos (`isLoadingCases`), la carga del detalle del caso (`isLoadingDetail`), la extracción asíncrona de 20 tablas desde Microsoft SQL Server (`isImporting`) y la obtención de la muestra de 50 registros (`isLoadingSample`).
  - **Exportación para Canvas LMS (`CanvasExportDialog`)**: Spinner de gran tamaño `size-10 text-emerald-600 animate-spin` con detalles del empaquetado ZIP y generación de CSVs.
- **Gestor de Casos Canvas LMS y Visualizador de Cuentas (`CanvasCaseManager`)**:
  - **Pestaña Global & Menú**: Acceso directo desde la barra de navegación superior con icono `Globe` (`Casos Canvas LMS (API)`) y en el menú drawer lateral (`/#canvas`).
  - **Directorio de Casos en Vivo**: Panel lateral izquierdo con listado cronológico de instantáneas de Canvas, badges de estado (`Completado`, `En Progreso`, `Fallido`), endpoint objetivo, métricas rápidas de cuentas y cursos, y botón de eliminación atómica con confirmación.
  - **Modal de Creación con Test de Conexión**: Permite ingresar nombre, descripción, alternar la descarga de cursos oficiales, y botón "Probar Conexión" que consulta en vivo la cuenta raíz de Canvas LMS con retroalimentación inmediata.
  - **Visualizador Jerárquico de Cuentas, Cursos y Secciones (Árbol Canvas)**:
    - Reconstrucción recursiva de la estructura completa: `[CUENTA/SUBCUENTA]` -> `[CURSO]` -> `[SECCIÓN]` -> `(D) [DOCENTE]` / `(E) [ESTUDIANTE]`.
    - Indentación por niveles de profundidad con chevrons plegables y controles masivos: "Desplegar Todo", "Plegar Todo", "Plegar Matriculados", y botones por cuenta "Desplegar Cursos" / "Plegar Cursos".
    - Badges distintivos: SIS ID (`SIS: S-001`, `SIS: CUR006380`, `SIS: 7115-CUR006380`) con borde esmeralda vs `Sin SIS ID` en borde punteado, ID numérico de Canvas, conteo de cursos y conteo de alumnos.
    - Búsqueda en tiempo real que filtra recursivamente cuentas, subcuentas, nombres de curso, códigos SIS y secciones manteniendo los nodos ascendentes visibles.
    - **Desglose Análogo de Matriculados por Sección**:
      - `(D) [DOCENTE]`: Badge ámbar, DNI normalizado (ej: `DNI:09375116`), nombre completo y correo corporativo.
      - `(E) [ESTUDIANTE]`: Roster numerado con badge esmeralda, código institucional (ej: `COD:msanroman@...`), nombre completo y correo electrónico.
      - **Carga Bajo Demanda (Lazy Loading)**: Consulta instantánea al endpoint de Canvas API `/courses/:id/enrollments` únicamente cuando el usuario expande el curso o sección, almacenando en caché SQLite (`canvas_case_enrollments`) para reaperturas inmediatas en 0 ms con spinner `Loader2` no bloqueante.
  - **Inspector de Entidades Raw**: Vista alternativa en tabla con conteo de registros para `accounts`, `terms` y `courses`, con visor modal monospace de los primeros 50 registros crudos devueltos por la API.



