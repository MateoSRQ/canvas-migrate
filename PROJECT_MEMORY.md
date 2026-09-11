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
    - Multi-row selection with "Select All Filtered", "Clear", and selection metrics (sections, courses, students).
    - Sorting and pagination across course-sections.
    - Modal dialog displaying enrolled students for any selected section.
    - Selection summary breakdown modal.
    - **100% Spanish translation** across all UI texts, labels, buttons, dialogs, and messages.
- [ ] **Phase 4: Transformation, Normalization & Diff Engine**
  - [ ] Transform selected case data into standard SIS Canvas format (`accounts.csv`, `terms.csv`, `users.csv`, `courses.csv`, `sections.csv`, `enrollments.csv`).
  - [ ] Implement differential engine comparing Case A against Case B (`_added`, `_updated`, `_deleted`, `_concluded`).
  - [ ] Packager into Canvas SIS Import zip archives.
- [ ] **Phase 5: Canvas LMS API Synchronization & Monitoring**
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
    │   │   ├── sql-server.ts # MSSQL connection pool manager & table extractor
    │   │   ├── importer.ts   # Case extraction, batch ingestion & normalization engine
    │   │   └── hierarchy-service.ts # Academic tree assembler, teacher resolver & memory cache
    │   └── functions/
    │       ├── cases.ts      # TanStack Start server functions for cases (RPC)
    │       └── hierarchy.ts  # TanStack Start server functions for hierarchy & students (RPC)
    ├── components/
    │   ├── cases/
    │   │   └── case-manager.tsx # Full-width Case Manager UI & table sample inspector
    │   ├── hierarchy/
    │   │   ├── hierarchy-selector.tsx # Full-width TanStack Table & cascading filter UI
    │   │   └── hierarchy-tree-table.tsx # Nested account/subaccount tree with collapsible tables
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
- **Scripts**:
  - `npm run db:push` - push schema changes directly to SQLite database.
  - `npm run db:generate` - generate Drizzle migrations.
  - `npm run db:migrate` - run migrations.
  - `npm run db:studio` - start Drizzle Studio.

### Canvas LMS Integration & Migration Reference Architecture
Detailed documentation compiled in [`docs/CANVAS_REFERENCE.md`](file:///home/mateo/projects/canvas-migrate/docs/CANVAS_REFERENCE.md):
- **Source MSSQL Databases**: `BDACADEMICO5` (academic loads, courses, sections, enrollments) & `BDAUTENTICACION5` (`Personal.Utb_Persona` for teacher DNI/emails) hosted on `localhost:1433` (`sa` / `1Ltseosb.`).
- **Canvas LMS API**: Production instance `https://politecnica.instructure.com/` (`CANVAS_API_KEY=29445~KWnHVkUQTMY43Jw3WFWmnwcTL4CYYMDx4wR34DMP3LEkXcfthUWDZzmT9BHCyXBr`).
- **Data Pipelines (`canvas/new/`)**:
  - `hierarchy.ts`: Multi-level academic tree builder.
  - `sis_exporter.ts`: Canvas Standard SIS CSV formatter (`accounts`, `terms`, `users`, `courses`, `sections`, `enrollments`).
  - `diff_engine.ts`: Differential detection against previous exports (`_added`, `_deleted`, `_updated`, `enrollments_to_delete`, `enrollments_to_conclude`).
  - `hierarchy_writer.ts`: Formatted tabbed hierarchy tree output (`hierarchy.txt`).
- **Key Normalization Rules**:
  - Teacher SIS ID: Normalized to official National ID / DNI (replaces legacy emails and sequential IDs).
  - Subaccount Hierarchy: `Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`.
  - Exclusion filter: Sections with `"NO HABILITADO"` omitted when flag is false.

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
  - Action Controls: "Nuevo Caso de Importación" modal trigger; "Eliminar Caso" button with cascade purge.
- **Hierarchical Selector Workspace (`src/components/hierarchy/hierarchy-selector.tsx`)**:
  - **Dual-View Switcher**: Toggle smoothly between **Vista Jerárquica Anidada (Árbol)** and **Vista Tabla Detallada (TanStack Table)**.
  - **Case Switcher Bar**: Clean top selector showing case name, total database rows, and status with immediate re-evaluation.
  - **Cascading Filter Grid**: 6-level hierarchical selectors (`Periodo` -> `Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`), with dynamic parent-child option binding.
  - **Business Filters**: Toggle for "Excluir secciones «NO HABILITADO»" and free-text search across codes, names, sections, careers, and teachers/DNI.
  - **Selection Control Bar**: Sticky/inline bar displaying selected count, filtered count, total students represented, "Seleccionar Filtrados", and "Limpiar".
  - **Student Inspector Modal**: Dialog rendering full roster of enrolled students (`#`, `Código Alumno`, `Nombre Completo`, `Correo Institucional`) for any selected section.
  - **Selection Summary Modal**: Overview of selected sections, unique courses, and total enrollments ready for SIS packaging.
- **Nested Hierarchical Tree Table (`src/components/hierarchy/hierarchy-tree-table.tsx`)**:
  - Exact mirroring of Canvas LMS SIS accounts and subaccounts:
    `[PERIODO] T-id` > `[CUENTA] Sede S-id` > `[SUBCUENTA] Modalidad M-id` > `[SUBCUENTA] Facultad F-id` > `[SUBCUENTA] Carrera C-id` > `[SUBCUENTA] Plan P-codigo` > `[CURSO] CUR-codigo` > `Tabla Anidada de [SECCIONES]`.
  - Cascading multi-level selection with indeterminate minus state (`Checkbox`).
  - Expand all and collapse all action controls.
  - Direct student roster inspection modal per section.
