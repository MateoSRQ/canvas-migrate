# PROJECT MEMORY & ARCHITECTURE

> **CRITICAL DIRECTIVE**: This document is the Single Source of Truth for the project. It serves as the project **Plan**, **Memory & Architecture**, and **UI Design Log**.
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
    - Dual-view switcher: **Nested Hierarchical View (Tree)** vs **Detailed Table View (TanStack Table)**.
    - **Nested Tree Table (`src/components/hierarchy/hierarchy-tree-table.tsx`)**: Account (Sede) > Subaccount (Modalidad > Facultad > Carrera > Plan) > Curso > Nested Table of Secciones, with multi-level cascading checkboxes, collapse/expand all, and student rosters.
    - **Inline Enrolled Roster Breakdown [(D) Teachers / (E) Students]**: Full inline expansion under every section showing assigned teachers with DNI and enrolled students with student code and email, matching `hierarchy.txt` reference.
    - Multi-row selection with "Select All Filtered", "Clear", and selection metrics (sections, courses, students).
    - Sorting and pagination across course-sections.
    - Modal dialog displaying enrolled students for any selected section.
    - Selection summary breakdown modal.
    - **Granular Manual & Batch Folding / Unfolding Engine**: Resolved bounce-back re-expansion bug when clicking "Plegar Todo", added level-based batch controls (Plegar Todo, Nivel Sedes, Nivel Carreras, Nivel Cursos, Todo con Matriculados), branch-level toggles on Periodo, Sede, Carrera, Plan, and Curso with Alt+Click support, plus TanStack Table batch page unfolding controls.
    - **100% Spanish localization** across all UI texts, labels, buttons, dialogs, and messages.
- [x] **Phase 4: Transformation, Normalization & Canvas Migration Exporter**
  - [x] Transform selected case data into standard SIS Canvas format (`accounts.csv`, `terms.csv`, `users.csv`, `courses.csv`, `sections.csv`, `enrollments.csv`).
  - [x] Canvas Exporter engine creating directory `migraciones/[period name - timestamp as YYYYMMDDHHMMSS]` with sanitized path names.
  - [x] Topological sort for Canvas subaccounts (`Sede` -> `Modalidad` -> `Facultad` -> `Carrera` -> `Plan`).
  - [x] Teacher identification normalized to official National ID / DNI and student codes.
  - [x] Automatic generation of visual tree `hierarchy.txt`, technical report `RESUMEN.md`, and ZIP archive `canvas_migration.zip`.
  - [x] Export action button and full-featured confirmation & inspection modal in `HierarchySelector`.
  - [x] Configurable initial/root subaccount in export modal (assigns `parent_account_id` at Campus level in `accounts.csv`, or empty if left blank).
  - [x] Automatic creation and injection of custom root subaccount in `accounts.csv` with `parent_account_id: ""` for immediate provisioning in Canvas LMS SIS Import, with interactive toggle and optional descriptive name in `CanvasExportDialog`.
  - [x] **Technical Debt Architecture & Optimization (Completed)**
    - [x] SQLite database optimization: WAL mode pragmas, `foreign_keys ON`, synchronous NORMAL, and 64MB cache in `better-sqlite3`.
    - [x] Elimination of network overfetching: Lazy loading of enrolled students (`estudiantes: []` and `estudiantesCount: N` in initial payload, reducing JSON transfer from 5.5MB to ~350KB).
    - [x] In-memory bounded LRU cache (`LruCache` max 3 cases, 30 min TTL) and centralization of SQLite helpers in `src/server/services/db-helpers.ts`.
    - [x] Integration of spinning loaders (`Loader2 animate-spin`) across all asynchronous operations and loading states: hierarchy loading, case loading, case detail, inline student expansion in tree and table, inspector modal, and Canvas LMS export.
    - [x] Component modularization: Extraction of modals to `src/components/hierarchy/modals/` and inline roster component `TreeSectionRoster`.
  - [x] **Security & Secret Sanitization Audit (Completed)**
    - [x] Full audit of secrets, tokens, and passwords in source code, git history, and documentation.
    - [x] Removal of hardcoded password fallbacks in `src/server/services/sql-server.ts`.
    - [x] Sanitization of Canvas tokens and database credentials in `docs/CANVAS_REFERENCE.md` and `PROJECT_MEMORY.md`.
    - [x] Verification of isolation in client bundles (no private env vars in `dist/client/`) and exclusion in `.gitignore`.
  - [ ] Implement differential engine comparing Case A against Case B (`_added`, `_updated`, `_deleted`, `_concluded`).
- [x] **Phase 5: Canvas LMS API Synchronization & Live State Extraction (Completed)**
  - [x] Segregated relational schema in SQLite for Canvas cases (`canvas_import_cases`, `canvas_case_raw_entities`, `canvas_case_accounts`, `canvas_case_courses`, `canvas_case_enrollments`).
  - [x] Canvas REST API client service (`src/server/services/canvas-importer.ts`) with Link header pagination, exponential backoff retries, and extraction of accounts, terms, and courses with sections and faculty.
  - [x] TanStack Start server functions (`getCanvasCasesFn`, `getCanvasCaseDetailFn`, `getCanvasCaseAccountsTreeFn`, `runCanvasImportCaseFn`, `deleteCanvasCaseFn`, `getCanvasEntitySampleFn`, `testCanvasConnectionFn`, `getCanvasCourseEnrollmentsFn`).
  - [x] Full hierarchical viewer in `CanvasCaseManager` mirroring the database tree: Account/Subaccount -> Course -> Section -> Teachers (D) with DNI and Students (E) with institutional code.
  - [x] On-demand reactive lazy loading of teachers and students per course with `Loader2` feedback, persistent caching in SQLite, and mass roster folding button.
  - [x] Global navigation tab in top header `Casos Canvas LMS (API)` and drawer menu link (`AppLayout`).
  - [x] Hierarchical visual indentation for Sections, Students, and Teachers with vertical guide lines in both Tree Table and Canvas API Tree.
  - [x] Strict deduplication and accurate resolution of faculty and students in nested views (fixed duplicates in multi-section courses and synchronized real Canvas sections).
- [x] **Technical Debt Audit & Architecture Optimization (Completed)**
  - [x] TypeScript strict type resolution (`tsc --noEmit` and `npm run build` with 0 errors): excluded reference folders in `tsconfig.json`, strictly typed Canvas API responses and headers, fixed state typing in course rosters, and removed unused variables across 9 files.
  - [x] SQLite database optimization: Created compound index `idx_canvas_case_enr_case_course` on `canvas_case_enrollments` to accelerate real-time on-demand queries.
  - [x] Corrected Drizzle query with `.and()` in `getCaseRawTableData` (`importer.ts`) and removed non-standard `integratedSecurity` in MSSQL pool configuration (`sql-server.ts`).
  - [x] Strategic technical debt audit compiled across 5 architectural pillars (Frontend/Memoization, MSSQL storage redundancy, Portable ZIP packaging without CLI, SQLite indexing, and Code-splitting via React.lazy).
- [x] **Canvas LMS Export Audit & Selection UX Optimization (Completed)**
  - [x] Reordered tabs in Header and Drawer: SQL Cases -> Visualization & Selection -> Canvas LMS Cases (API), setting SQL Cases as default landing view.
  - [x] Simplified Export Modal (`CanvasExportDialog`): Highlighted scope metrics at the top (Sections, Unique Courses, Total Enrollments, Academic Period) and removed redundant bottom section. Removed post-export review modal to direct all audit capabilities to a dedicated workspace.
  - [x] Enriched selection controls in `HierarchySelector`: Dynamic "Select All / Deselect All ({N})" button, "Invert Selection" button, and "Clear" button.
  - [x] Canvas LMS Variation Audit Engine (`src/server/services/canvas-audit-service.ts` and RPC `auditCanvasExportFn`).
- [x] **Side-by-Side Manual Comparison: Migration Packages vs Canvas LMS Snapshots (Completed)**
  - [x] Dedicated screen and tab `Side-by-Side Comparison (Migration vs Canvas)` (`/#comparison`) with top navigation and side drawer link.
  - [x] Exported migration package selector (`migraciones/[period - timestamp]`), allowing selection of any historical export package.
  - [x] Independent Canvas LMS API snapshot selector (`canvas_import_cases`).
  - [x] Migration package reading and tree-structuring service (`src/server/services/migration-service.ts` and RPCs `listMigrationsFn`, `getMigrationTreeFn`), assembling the actual exported tree (`accounts.csv`, `courses.csv`, `sections.csv`, `users.csv`, `enrollments.csv`, `RESUMEN.md`).
  - [x] Manual exploratory comparison approach without automated discrepancy engine (recognizing that migrations represent deliberate data subsets).
  - [x] Left panel: Hierarchical tree of the exported migration package (Campuses -> Subaccounts -> Courses -> Sections -> Teachers D with DNI and Students E).
  - [x] Right panel: Hierarchical tree of the Canvas API snapshot (Accounts -> Subaccounts -> Courses -> Sections -> Teachers D and Students E on-demand).
  - [x] Top bar with synchronized simultaneous search across both trees and independent local search inputs.
  - [x] Mass folding and unfolding controls per panel (Courses, Fold All).
- [x] **Sandbox Isolation Testing Mode & SIS Prefixing (3 Configurable Options) (Completed)**
  - [x] Implemented 3 selectable prefixing modes:
    - `No prefix` (`none`): Preserves standard SIS IDs (`S-001`, `CUR006380`, `7115-CUR006380`) for production migrations.
    - `Apply prefix to accounts` (`accounts`): Prefixes subaccounts only (`${rootAccountId}_S-001`, `${rootAccountId}_P004084`), keeping course and section codes standard (Recommended in Sandbox).
    - `Apply prefix to all` (`all`): Prefixes subaccounts, courses (`${rootAccountId}_CUR006380`), sections (`${rootAccountId}_7115-CUR006380`), and enrollments for zero-collision testing.
  - [x] Interactive radio-card selector in `CanvasExportDialog` with explanatory badges and technical notes.
  - [x] Mode propagation across `hierarchy-selector.tsx`, `RESUMEN.md`, and `hierarchy.txt`.
  - [x] Backward-compatible detection with distinct badges in `CaseComparisonView`: Blue badge `Total Isolation ({prefix})` vs Emerald badge `Isolated Accounts ({prefix})`.
- [x] **Reactive Section Synchronization & Canvas API Enrollment Resolution (Completed)**
  - [x] Diagnosis and fix for section display: dynamically fetching and resolving `/courses/:id/sections` upon roster expansion, persisting in SQLite (`sectionsJson`).
  - [x] Single-section course auto-expansion: auto-expands courses with exactly one section to reveal faculty and students immediately.
  - [x] Tolerant enrollment filtering with `isOnlySection`, string ID matching, deduplication, and institutional email display.
- [x] **Complete Data & Database Cleanup (Completed)**
  - [x] Wiped all test records across all SQLite tables in `dev.db` with `VACUUM;` (0 rows across all entities).
  - [x] Cleaned test migration packages in `migraciones/` keeping `.gitkeep`.
- [x] **Security Review & Credential Sanitization for GitHub (Completed)**
  - [x] Thorough audit of codebase, git history, and docs: verified zero credentials, hardcoded passwords, or active API tokens in tracked files.
- [x] **Comprehensive Production Documentation (README.md) for GitHub (Completed)**
  - [x] Replaced TanStack Start boilerplate with complete technical guide covering Purpose, Features, Architecture Mermaid Diagrams, Canvas SIS Specs, 4-Interface Visual Tour, Sandbox Isolation Modes, Installation, Environment Variables, and Security Best Practices.
- [x] **Student Enrollment Foreign Key Resolution Fix (Completed)**
  - [x] Resolved foreign key mismatch in `src/server/services/hierarchy-service.ts`: `Matricula.Matricula_Alumno_Curso.matricula_alumno_id` references `Matricula.Matricula_Alumno.id` (not `Academico.Alumno.id`).
  - [x] Loaded `Matricula.Matricula_Alumno` raw table dump into a lookup map to resolve `ma.alumno_id` into `alumnoMap`, with fallback to `ma.codalumno` / `ma.nomalumno`.
  - [x] Keyed section deduplication map by `s.codigo || String(s.id)` to guarantee 100% accurate student rosters across both lazy-loaded tree components and exported `enrollments.csv`.
- [x] **Database Migration to BDACADEMICO6 (Completed)**
  - [x] Decompressed `LSFWSRVUPPBD_BDACADEMICO_FULL_20260914_100234.7z` containing full backup `LSFWSRVUPPBD_BDACADEMICO_FULL_20260914_100234.bak` (443.6 MB).
  - [x] Restored database `BDACADEMICO6` in local Microsoft SQL Server 2022 with logical file moves (`BDACADEMICO` -> `/var/opt/mssql/data/BDACADEMICO6.mdf`, `BDACADEMICO_log` -> `/var/opt/mssql/data/BDACADEMICO6_log.ldf`).
  - [x] Verified database status (ONLINE, 371 tables, 95,656 enrollments, 2,257 courses, 3,022 course-sections).
  - [x] Updated `.env.local` to point to `DB_NAME=BDACADEMICO6` and updated default fallbacks in `src/server/services/sql-server.ts`, `src/server/services/importer.ts`, and `src/components/cases/case-manager.tsx`.
- [x] **Fresh Database & Generated Packages Purge (Completed)**
  - [x] Wiped all SQLite tables in `dev.db` across SQL cases and Canvas snapshots (0 rows total) and executed `VACUUM;`.
  - [x] Purged all historical export directories in `migraciones/` preserving only `.gitkeep`.
  - [x] Ready for fresh clean extraction and migration pipeline execution from `BDACADEMICO6`.
- [x] **Feature: Canvas Cross-listing & Grouping (`feature/groups`) (Completed)**
  - [x] Created feature branch `feature/groups`.
  - [x] Database discovery: Identified `grupo` (`varchar(20)`) in `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle` (1,284 course-sections across 269 multi-section groups) linking shared classroom courses taught by the same teacher.
  - [x] Architectural definition: Instructure Canvas SIS `xlists.csv` standard and Canvas REST API `nonxlist_course_id` resolution.
  - [x] Implementation of `grupoCodigo` field in `HierarchyItem` and normalization services (`hierarchy-service.ts`).
  - [x] Implementation of Canvas SIS Cross-listing exporter (`xlists.csv` generation, `GRP_<grupo>` container courses in `courses.csv`, zip inclusion, and `RESUMEN.md` reporting).
  - [x] Automatic generation of `CURSOS_COMPARTIDOS.md` detailing full parent-child relationships (master container courses, combined sections, original curricular courses, student counts, teachers, and career locations).
  - [x] Global database audit file `CURSOS_GRUPOS_COMPLETOS.md` generated covering all 269 groups and 1,246 course-sections across all periods, modalities, and careers.
  - [x] UI visual enhancements: Cross-list badges and indicators in Tree Table, Table View, Comparison Workspace, and Canvas API Case Manager.
- [x] **Feature: Previsión de Matrícula / Forecast por Carrera y Ciclo (`forecast`) (Completed)**
  - [x] Created feature branch `forecast` based on `feature/groups`.
  - [x] Data lineage discovery & relational reconciliation:
    - Enrolled students: `Matricula.Matricula_Alumno_Curso` linked to `Matricula.Matricula_Alumno` (student identity: `codalumno`, `dnialumno`, `nomalumno`).
    - Course & Cycle: `Carga_Academica_Sede_Curso_Horario` -> `Carga_Academica_Sede_Curso` -> `Academico.Curso` (cycle defined in `cat_ciclo_id` -> `General.Catalogo`, ordered by `valor_orden` 1 to 12).
    - Career & Academic Offer: `Academico.Curso.plan_id` -> `Academico.Plan.carrera_id` -> `General.Carrera`, matching `Carga_Academica_Sede` -> `General.SedeCarrera` -> `General.Carrera` 100% (95,656 of 95,656 records).
  - [x] Implemented forecast engine service (`src/server/services/forecast-service.ts`) with bounded LRU caching (`LruCache`), dynamic cycle sorting, career aggregation, multi-level student deduplication, and course breakdown.
  - [x] Implemented TanStack Start server function RPC (`src/server/functions/forecast.ts` with `getForecastDataFn`).
  - [x] Full-width Previsión de Matrícula (Forecast) workspace (`src/components/forecast/forecast-view.tsx`):
    - Case directory switcher, institutional campus (Sede) filter, and **Multi-Period Selection Popover (`periodoIds: number[]`)**:
      - Default on initial load: **exactly one item marked** (the primary period with the highest enrollment count, e.g. `2026-2 PREGRADO`), avoiding unsolicited all-period clutter.
      - Interactive popover dropdown with checkboxes, search filter, "Todos" / "Limpiar" batch buttons, and instant "Solo este" 1-click focus button.
      - Displays active period badges with quick removal (×) and multi-period aggregation (e.g. combining regular + convalidation periods like `2026-2 PREGRADO` + `2026-2 CONVALIDANTES`).
    - Dynamic metric switcher: "Alumnos Únicos" vs "Matrículas-Curso (Cupos)".
    - **Next-Semester Cohort Advancement Simulation (`enablePrediction`)**:
      - **3-Step Mathematical Prediction Model**:
        1. **Deserción / Abandono ($d\% \in [0, 100]$)**: Personas que abandonan la universidad y se restan antes de cualquier otro cálculo: $D_k = \text{round}(A_k \times \frac{d}{100})$, quedando $R_k = \max(0, A_k - D_k)$.
        2. **Traslado ($t\% \in [0, 100]$) vs Repitencia ($100 - t\%$)**: De los que quedan ($R_k$):
           - Pasan al ciclo siguiente: $P_k = \text{round}(R_k \times \frac{t}{100})$.
           - No pasan (repiten y continúan en el mismo ciclo): $M_k = \max(0, R_k - P_k)$.
        3. **Proyectado por Ciclo**: $\text{Proyectado}(k) = M_k + (k > 1 ? P_{k-1} : 0)$.
      - **Dual Interactive Sliders**:
        - Slider 1: **Tasa de Deserción** (0% a 100%, color Rosa/Rojo, nunca negativo, con presets: 0%, 5%, 10%, 15%, 20%, 30%).
        - Slider 2: **Tasa de Traslado** (0% a 100%, color Púrpura, con presets: 100%, 90%, 85%, 75%, 50%, 0%).
      - Dual cell rendering: Displays the current value next to the projected value in distinctive Emerald Green styling (`Actual → Proyectado`) with comprehensive breakdown tooltip.
      - Side-by-side totals across every cycle column, total column, and overall general summary footer.
    - Interactive matrix table (Pivot table) displaying career rows across cycle columns (Ciclo 1 to 12) with sticky headers and sticky career column.
    - Expandable nested course catalog under every career showing Course Code, Name, Curricular Plan, Credits, Open Sections count, enrolled students count, and estimated course projection proportional to cycle dynamics.
    - Instant client-side text filtering across career names, faculties, course names, and codes.
    - Summary footer row calculating total students and total enrollments per cycle and overall total.
    - CSV export engine (`handleExportCsv`) generating downloadable spreadsheet with dual Actual/Projected columns, deserción rate, and retention rate metadata.
  - [x] **TanStack Charts Integration: Visual Bar Chart Tab (`ForecastChartView`) (Completed)**:
    - Installed official `@tanstack/charts` and `@tanstack/react-charts` (v0.18.0).
    - **Dual Aggregated & Expandable Detail Architecture (Matching Table View)**:
      - **Nivel Agregado por Carrera (`CareerExpandableBarCard`)**:
        - Cada carrera se presenta como una tarjeta interactiva con su cabecera, código, facultad, número de cursos, totales Actual vs Proyectado y chevron de despliegue.
        - Muestra un gráfico de barras verticales (`barY`) de distribución por ciclo curricular (Ciclo 1 al 12) comparando Actual (Gris Slate `#64748b`) vs Proyectado (Verde Esmeralda `#10b981`).
      - **Despliegue en Detalle por Asignatura / Curso (`isExpanded`)**:
        - Al desplegar cualquier carrera (o mediante "Expandir Todo"), se despliega un gráfico de barras horizontales (`barX`) que visualiza cada curso/asignatura con su código institucional y nombre, comparando alumnos matriculados actuales vs proyección estimada.
        - Fórmula de proyección de curso proporcional al avance de cohortes y tasa de deserción del ciclo correspondiente.
        - Altura adaptativa dinámica según la cantidad de asignaturas (`carr.courses.length * 36 + 70`) para máxima legibilidad.
        - Tabla compacta de desglose de asignaturas debajo del gráfico.
      - **Sincronización Bidireccional de Expansión**:
        - El estado de expansión (`expandedCarreras: Set<number>`) y los botones por lote "Expandir Todo" / "Plegar Todo" se comparten y sincronizan entre la Tabla Matricial y el Gráfico de Barras.
      - **Sub-vistas Adicionales**:
        - `Por Carreras y Cursos (Expandible)`: Vista principal idéntica a la tabla en formato de barras.
        - `Consolidado por Ciclos`: Gráfico institucional macro de todos los ciclos combinados.
        - `Comparativa de Carreras`: Gráfico horizontal de todas las carreras con selectores de límite y ordenación.
      - **Resumen KPI Global**: Total Actual, Total Proyectado, Variación Neta ($+/-$ y $\%$) y parámetros activos de simulación.
    - **Tab Switcher Toolbar**: Segmented control en la barra de herramientas de `ForecastView` para alternar entre **"Tabla Matricial"** (`TableIcon`) y **"Gráfico de Barras"** (`BarChart3`).
    - [x] **Filtros por Modalidad de Estudio y Turno de Clases**:
      - Data lineage & relational resolution:
        - **Modalidad**: `Carga_Academica_Sede_Curso.cat_modalidad_id` y `General.SedeCarrera.cat_modalidad_id` vinculados a `General.Catalogo` (`catalogo_tipo_id = 1`): ID 57 ("Presencial"), ID 5 ("Semi Presencial"), ID 2264 ("A Distancia").
        - **Turno**: Resuelto combinando la sección y el alumno (`Carga_Academica_Sede_Seccion.turno` || `Academico.Alumno.turno`): `'D'` ("Diurno"), `'N'` ("Nocturno"), y `'SIN_TURNO'` para registros no clasificados.
      - Dynamic scope calculation: `forecast-service.ts` compila dinámicamente las modalidades y turnos presentes en el periodo y sede activos con conteos de matrículas y alumnos únicos.
      - Full-stack RPC integration: `getForecastDataFn` acepta `modalidadId` (`number | 'all' | null`) y `turno` (`string | 'all' | null`).
      - UI integration in `ForecastView`:
        - Barra de filtros ampliada a 6 columnas responsivas: Caso BD, Periodos, Sede, Modalidad (`Laptop`), Turno (`Clock`), Buscador (`Search`).
        - Badges interactivos de filtros activos (Sede, Modalidad azul, Turno ámbar) con eliminación de un clic (`×`).
        - Auto-ajuste de filtros al cambiar de periodo/caso si la opción ya no existe en el nuevo alcance.
        - Exportación CSV enriquecida con metadatos de Modalidad y Turno y sufijos dinámicos en el nombre del archivo.
        - Reactividad completa: Recomputa en tiempo real tanto la **Tabla Matricial** como los gráficos de **TanStack Charts** (agregados y detallados).
  - [x] Navigation integration: Added top header tab and left drawer menu item (`Previsión de Matrícula (Forecast)`) with `#forecast` hash routing in `app-layout.tsx` and `routes/index.tsx`.
- [ ] Canvas REST API client for direct SIS upload (`POST /api/v1/accounts/1/sis_imports`).
- [ ] Job status polling, import log inspection, and error auditing.
- [ ] Theory vs. Practice Session Modeling: Badges and indicators in Tree/Table and selective cross-listing support for decoupled theory and practice schedules.

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
- **Data Table**: TanStack Table (`@tanstack/react-table` v8)
- **Charts / Visualizations**: TanStack Charts (`@tanstack/charts`, `@tanstack/react-charts` v0.18.0)
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
├── PROJECT_MEMORY.md         # Single Source of Truth (Plan, Memory & Architecture, UI Log)
├── README.md                 # GitHub repository guide & technical documentation
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
    │   │   ├── db-helpers.ts # Centralized SQLite helpers and bounded LRU cache
    │   │   ├── sql-server.ts # MSSQL connection pool manager & table extractor
    │   │   ├── importer.ts   # Case extraction, batch ingestion & normalization engine
    │   │   ├── hierarchy-service.ts # Academic tree assembler, teacher resolver, LRU & lazy student map
    │   │   ├── forecast-service.ts  # Enrollment matrix & cohort advancement prediction engine
    │   │   ├── canvas-exporter.ts # Canvas SIS CSV exporter, hierarchy writer & zip packager
    │   │   ├── canvas-importer.ts # Canvas API client, live accounts & course ingestion
    │   │   ├── canvas-audit-service.ts # Audit service against Canvas REST API
    │   │   ├── case-comparison-service.ts # Local comparison engine (DB vs Canvas Snapshot)
    │   │   └── migration-service.ts # Migration package reader & parser service
    │   └── functions/
    │       ├── cases.ts      # TanStack Start server functions for cases & comparison (RPC)
    │       ├── hierarchy.ts  # TanStack Start server functions for hierarchy & students (RPC)
    │       ├── forecast.ts   # TanStack Start server functions for enrollment forecasting (RPC)
    │       ├── canvas.ts     # TanStack Start server functions for Canvas API (RPC)
    │       └── migrations.ts # TanStack Start server functions for migration packages (RPC)
    ├── components/
    │   ├── cases/
    │   │   └── case-manager.tsx # Full-width Case Manager UI & table sample inspector with spinning loaders
    │   ├── canvas/
    │   │   └── canvas-case-manager.tsx # Live Canvas LMS account and course visualizer
    │   ├── comparison/
    │   │   └── case-comparison-view.tsx # Side-by-side comparison screen (Migration vs Canvas) with filters
    │   ├── forecast/
    │   │   ├── forecast-view.tsx       # Previsión de matrícula workspace with Table & Chart tabs
    │   │   └── forecast-chart-view.tsx # Visual grouped bar charts (TanStack Charts barY & barX)
    │   ├── hierarchy/
    │   │   ├── modals/
    │   │   │   ├── student-inspector-dialog.tsx # Enrolled student inspection modal with Loader2
    │   │   │   ├── selection-summary-dialog.tsx # Active selection quantitative summary modal
    │   │   │   └── canvas-export-dialog.tsx     # Simplified Canvas LMS CSV export modal
    │   │   ├── tree-section-roster.tsx # Modular roster component with on-demand lazy loading
    │   │   ├── hierarchy-selector.tsx # Full-width TanStack Table & cascading filter UI
    │   │   └── hierarchy-tree-table.tsx # Nested account/subaccount tree with on-demand loading & Loader2
    │   ├── layout/
    │   │   └── app-layout.tsx# Global layout: Top header, left drawer menu with Comparison, full-width panel
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
    │   └── index.tsx         # Home route with tab switching (Cases, Visualization, Comparison, Canvas)
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
  - `canvas_import_cases`: Extraction metadata from Canvas API (`endpoint`, `status`, `totalAccounts`, `totalTerms`, `totalCourses`, `totalRows`, `entityStats`).
  - `canvas_case_raw_entities`: Raw JSON snapshots per entity type (`accounts`, `terms`, `courses`).
  - `canvas_case_accounts`: Normalized accounts and subaccounts (`canvasId`, `name`, `sisAccountId`, `parentAccountId`, `rootAccountId`, `coursesCount`).
  - `canvas_case_courses`: Normalized courses extracted from Canvas (`canvasId`, `name`, `courseCode`, `sisCourseId`, `accountId`, `totalStudents`, `sectionsJson`).
  - `canvas_case_enrollments`: Enrolled teachers (`teacher`) and students (`student`), resolved on-demand and indexed by `(case_id, course_id, section_id, role)` with persistent SQLite storage.
- **Cascade Purge**: All `canvas_case_*` tables atomically purge records when a case is deleted (`onDelete: 'cascade'`).
- **Database Scripts**:
  - `npm run db:push` - push schema changes directly to SQLite database.
  - `npm run db:generate` - generate Drizzle migrations.
  - `npm run db:migrate` - run migrations.
  - `npm run db:studio` - start Drizzle Studio.

### Canvas LMS Integration & Migration Reference Architecture
Detailed documentation compiled in [`docs/CANVAS_REFERENCE.md`](file:///home/mateo/projects/canvas-migrate/docs/CANVAS_REFERENCE.md):
- **Source MSSQL Databases**: `BDACADEMICO6` (academic loads, courses, sections, enrollments - updated from `BDACADEMICO5`) & `BDAUTENTICACION5` (`Personal.Utb_Persona` for teacher DNI/emails) hosted on `localhost:1433` (credentials loaded via `process.env.DB_PASSWORD` in `.env.local`).
- **Canvas LMS API**: Production instance `https://politecnica.instructure.com/` (authentication token loaded via `process.env.CANVAS_API_KEY` in `.env.local`).
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
  - Root Account Association & SIS Provisioning: Top-level Sedes point to `parent_account_id: cleanRootAccountId` (or `""` to attach directly to Canvas institutional root). When `createRootAccount` is enabled, the exporter generates the custom root definition in the first row of `accounts.csv` with `parent_account_id: ""` and `status: "active"`. This enables Canvas LMS to create the subaccount during the same SIS import process and attach Sedes immediately without *"Parent account didn't exist"* warnings. Includes optional descriptive display name (`rootAccountName`).
  - Sandbox Isolation Testing Mode (Prefixing): Enabling `isolateAccountPrefix` with a root subaccount (e.g. `TEST-5`) prefixes all generated subaccounts (Campus, Modality, Faculty, Career, Plan) with `${rootAccountId}_` (e.g. `TEST-5_S-001`, `TEST-5_M-2264`, `TEST-5_P004084`) and links them coherently in `courses.csv`. This guarantees a 100% isolated tree in Canvas LMS, preventing Canvas from moving or reparenting the real institutional `SEDE LIMA` (`S-001`) or dragging unselected faculties.
  - Student Enrollment Foreign Key Resolution: In MSSQL `BDACADEMICO5`, the table `Matricula.Matricula_Alumno_Curso` links to `Matricula.Matricula_Alumno.id` via `matricula_alumno_id` (the student's term enrollment header record), NOT directly to `Academico.Alumno.id`. The service resolves `matricula_alumno_id` -> `Matricula.Matricula_Alumno` -> `Academico.Alumno.id` -> `General.Persona` (with fallback to `Matricula.Matricula_Alumno.codalumno`), preventing accidental primary key ID collisions with `Academico.Alumno.id` and guaranteeing 100% accurate student rosters in both UI views and `enrollments.csv`.
  - Multi-Course Grouping & Shared Classrooms (`grupo`): In table `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle`, the column `grupo` (`varchar(20)`) unifies course-sections from different plans/careers that share the exact same teacher, weekly schedule, and physical/virtual classroom (e.g. `EEGG_CCM1D01`, `FI_MIC01`). Enables Canvas LMS cross-listing (sections grouped under a single master course) or Canvas Groups generation.
  - Theory vs. Practice Session Classification: In `Academico.Curso`, hours are defined by `num_horas_sem_teoria`, `num_horas_sem_practica`, and `num_horas_sem_laboratorio`. In academic scheduling, `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle.cat_tipo_hora_id` links directly to `General.Catalogo` (`2217` = "Teoría" with 2,870 sessions, `2218` = "Práctica" with 2,262 sessions), with `cat_tipo_id` indicating session mode (`2077` = "Normal", `2078` = "Compartido"). This schema allows distinguishing sections where theory and practice have different teachers (271 instances) or distinct cross-listing groups (37 instances).
  - Cross-listing Cluster Patterns (`xlists.csv`): In `2026-2 PREGRADO`, 499 section combinations are grouped into 62 container courses across 24 core academic disciplines. Groups follow the standard university nomenclature `EEGG_<MATERIA><TURNO: D=Diurno/N=Nocturno><NUM>` (e.g., `EEGG_CCM1D01`). Groups cluster up to 18 sections and 7-8 different curricular plans simultaneously under shared general studies classrooms (Health cluster: Nursing + Stomatology + Physical Therapy; Engineering cluster: Civil + Industrial + Systems + Cybersecurity; Business/Humanities cluster: Administration + Communication + Law + Psychology + Accounting).
  - Enrollment Resolution & Academic Forecast (Course x Career x Cycle):
    - Course & Cycle: In `Academico.Curso`, `cat_ciclo_id` links directly to `General.Catalogo` (`catalogo_tipo_id = 5`) defining institutional cycles (`CICLO 1` to `CICLO 12`), with exact sorting driven by `valor_orden` (1 to 12).
    - Career Alignment: Curricular plans (`Academico.Plan.carrera_id`) and course sections (`Carga_Academica_Sede` -> `General.SedeCarrera.carrera_id`) match 100% across all 95,656 enrollments in the database (`matches: 95656, diffs: 0`).
    - Multi-cohort Academic Progression: Lower cycles (Ciclo 1-2) dominate regular undergraduate admissions in 2026-2 PREGRADO (e.g. Estomatología: 24 in Ciclo 1, 35 in Ciclo 2), upper cycles (Ciclos 5-12) dominate convalidation programs in 2026-2 CONVALIDANTES, and posgrado (Maestrías) populate separate terms.
    - Aggregation Engine (`forecast-service.ts`): Computes dual metrics: unique students (`totalAlumnos`) and total course-level registrations (`totalMatriculas`), with bounded LRU caching (`LruCache`), cascading period/sede filtering, and full course catalogs with credit hours and section counts.
    - Cohort Advancement Predictive Modeling:
      - 3-Step Mathematical Prediction Engine:
        1. **Deserción ($d\% \in [0, 100]$)**: Alumnos que abandonan se restan primero antes de cualquier otro cálculo: $D_k = \text{round}(A_k \times \frac{d}{100})$, quedando $R_k = \max(0, A_k - D_k)$.
        2. **Traslado ($t\% \in [0, 100]$) vs Repitencia ($100 - t\%$)**: De los que quedan ($R_k$), $P_k = \text{round}(R_k \times \frac{t}{100})$ pasan al ciclo siguiente ($k + 1$), mientras que los que no pasan ($M_k = R_k - P_k$) repiten y continúan en el mismo ciclo ($k$).
        3. **Proyectado por Ciclo**: $\text{Proyectado}(k) = M_k + (k > 1 ? P_{k-1} : 0)$. Para Ciclo 1, al no tener cohorte institucional previa, $\text{Proyectado}(1) = M_1$ (exclusivamente sus repitentes).
      - Catalog Cycle Provisioning: `forecast-service.ts` includes all 12 institutional catalog cycles in `sortedCycles` (CICLO 1 to 12), ensuring target cycles (e.g. Ciclo 3 receiving from Ciclo 2) automatically have column definitions and reactive aggregation.
      - Initial Period Filter Default: In `forecast-service.ts`, when no `periodoIds` is passed (initial page load), the filter defaults to selecting strictly a single period (`[periodos[0].id]`), avoiding initial multi-period clutter.
      - Modalidad and Turno Resolution & Dynamic Scope Filtering:
        - **Modalidad**: Resuelta vía `Carga_Academica_Sede_Curso.cat_modalidad_id` con respaldo de `General.SedeCarrera.cat_modalidad_id`, mapeada a `General.Catalogo` (`catalogo_tipo_id = 1`) -> `57` ("Presencial"), `5` ("Semi Presencial"), `2264` ("A Distancia"). Cobertura de datos del 100% en la base institucional.
        - **Turno**: Resuelto combinando la sección y la ficha del alumno (`Carga_Academica_Sede_Seccion.turno` || `Academico.Alumno.turno`) -> `'D'` ("Diurno"), `'N'` ("Nocturno"), o `'SIN_TURNO'` para registros no especificados. Cobertura del 99.8% (solo 215 registros sin turno en 95,656 registros).
        - **Cálculo Dinámico de Alcance**: Las listas de opciones y conteos de matrículas/alumnos únicos para Modalidad y Turno se calculan en memoria a partir del periodo(s) y campus activos, garantizando que el usuario solo visualice opciones reales sin listas muertas.

---

## 3. UI Design Log

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
- **Interface Language**: The interactive application interface is localized in **Spanish (Español)** for institutional university operators, while all architectural documentation and developer logs are maintained in **English**.

### Layout & Surface Design
- **Top Header**:
  - Sticky at top, `h-14`, semi-transparent backdrop blur (`bg-background/95 backdrop-blur`).
  - Contains left drawer trigger (`Button variant="ghost" size="icon"` with Lucide `Menu` icon).
  - Displays application branding: "Canvas Migrate".
- **Left Drawer Menu**:
  - Built with shadcn `Sheet` (`SheetContent side="left"`).
  - Dimensions: `w-72 sm:w-80`, anchored to the left.
  - Contains clean navigation items in Spanish (`Registro de Casos SQL`, `Visualización y Selección`, `Comparativa Lado a Lado`, `Casos Canvas LMS (API)`).
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
  - **Business Filters**: Toggle for "Excluir secciones «NO HABILITADO»" and global text search filter.
  - **Enriched Selection Toolbar**: Explicit controls "Seleccionar Todos / Deseleccionar Todos ({N})", "Invertir Selección", and "Limpiar".
- **Simplified Export Modal (`CanvasExportDialog`)**:
  - Modal focused exclusively on scope configuration (Sections, Unique Courses, Estimated Total Enrollments, Academic Period) and root subaccount parameters (`parent_account_id`).
  - **Sandbox Isolation Testing Mode (Prefixing)**: Interactive card with 3 options:
    1. **Sin prefijo (Estándar / Producción)**: Preserves global SIS IDs (`S-001`, `CUR006380`). Suitable for official deployments where accounts are shared.
    2. **Aplicar prefijo a cuentas**: Emerald badge `Recomendado en Sandbox`. Prefixes subaccounts only (`TEST-5_S-001`, `TEST-5_P004084`), preserving original codes in courses and sections. Prevents moving the real Lima Campus in Canvas.
    3. **Aplicar prefijo a todos (Cuentas, Cursos y Secciones)**: Blue badge `Aislamiento Total`. Prefixes accounts, courses (`TEST-5_CUR006380`), sections (`TEST-5_7115-CUR006380`), and enrollments to guarantee zero conflicts.
  - Removed redundant bottom files section and post-export audit to keep modal lightweight, directing comparison auditing to the dedicated workspace.
- **Side-by-Side Comparison Workspace (`CaseComparisonView`)**:
  - **Manual Visual Comparison**:
    - 100% manual and visual exploration between the selected exported migration and the Canvas LMS snapshot.
    - Avoids misleading automated discrepancy engines that mark intentionally unselected courses as "missing".
  - **Migration Package Selector (Left Panel)**:
    - Dropdown selector to choose any historical folder from `migraciones/` (e.g. `2026-2 POSGRADO - 20260913120429`).
    - Package metrics: total accounts, exported courses, sections, teachers (DNI), and students.
    - True hierarchical tree matching export: Campuses -> Subaccounts (Modality > Faculty > Career > Plan) -> Courses -> Sections -> Teachers `(D)` with DNI and Students `(E)` with student code.
    - Mass action controls: `Cursos`, `Plegar`. Local text search.
  - **Canvas LMS Snapshot Selector (Right Panel)**:
    - Dropdown selector to choose any historical snapshot from Canvas LMS API (`canvas_import_cases`).
    - Snapshot metrics: total accounts and courses.
    - Structured Canvas tree: Accounts -> Subaccounts -> Courses (with SIS ID and Canvas ID) -> Sections with SIS ID -> Teachers `(D)` and Students `(E)` with on-demand real-time fetching.
    - Mass action controls: `Cuentas`, `Plegar`. Local text search.
  - **Synchronized Dual Search**:
    - Central top search bar filtering both trees simultaneously in real time (e.g. `CUR006380`, `7121`, or professor surname), allowing instant visual verification between export and Canvas cloud state.
    - Independent local search inputs for asymmetric exploration.
  - **Auto-Expansion of Single-Section Courses**:
    - When a course contains exactly 1 section (common pattern in graduate programs), expanding the course automatically unfolds the single section in both trees, immediately revealing teachers and students without requiring a second click.
  - **Contact Identifiers & Institutional Emails**:
    - Displays institutional email for both faculty (`<email>`) and students (`<email>`) across both panels.
  - **Dynamic Enrollment Counts in Section Header**:
    - Displays real count of loaded students (`{count} estudiantes`) in Canvas section bar, replacing initial `0 estudiantes` from Canvas course summary.
- **Nested Hierarchical Tree Table (`src/components/hierarchy/hierarchy-tree-table.tsx`)**:
  - Exact mirroring of Canvas LMS SIS accounts and subaccounts:
    `[PERIODO] T-id` > `[CUENTA] Sede S-id` > `[SUBCUENTA] Modalidad M-id` > `[SUBCUENTA] Facultad F-id` > `[SUBCUENTA] Carrera C-id` > `[SUBCUENTA] Plan P-codigo` > `[CURSO] CUR-codigo` > `[SECCION]` > `[MATRICULADOS]`.
  - **Inline Enrolled Roster Breakdown**:
    - `(D) [DOCENTE] <DNI> - <Full Name> <<Email>>` with official DNI normalization. Supports multiple teachers per section (`+N más`).
    - `(E) [ESTUDIANTE] <Code> - <Full Name> <<Email>>` with numbered roster and active SIS status.
    - Fallback `(Sin alumnos ni docentes matriculados)` for inactive/unassigned sections.
  - Cascading multi-level selection with indeterminate minus state (`Checkbox`).
  - **Granular Batch & Branch Folding/Unfolding**:
    - **Global Level Batch Controls**: "Plegar Todo", "Plegar Matriculados", "Nivel Sedes", "Nivel Carreras", "Nivel Cursos", and "Todo (+ Matriculados)".
    - **Plegar Todo (Fold All)**: Clean collapse to 0 open nodes with automatic disabled state when `visibleExpandedCount === 0`.
    - **Plegar Matriculados (Fold Rosters)**: Contextual button appearing when student/faculty rosters are expanded (`sec-*`), instantly collapsing all roster lists without closing parent courses or subaccounts.
    - **Root-Based Branch Toggles**: "Rama..." buttons on Period, Campus, Career, Plan, and Course base toggling on root node state (`isRootOpen`), folding the branch and removing orphan keys if open, or expanding if closed.
    - **Alt+Click Shortcut**: Chevron shortcut to toggle entire branches with symmetric behavior.
    - **Concurrent Non-Blocking Rendering (`useTransition`)**: Hierarchical tree updates wrapped in React 19 `startTransition` with live feedback spinner (`Loader2`), preventing UI tab freezing during massive expansions.
    - **Auto-Synchronization & Key Pruning**: `allValidKeys` validates open branches upon cascading filter changes or case switching (`key={selectedCaseId}`), auto-expanding the first period and campus if the view is empty.
    - **30-Student Inline Display Limit**: Renders first 30 students with direct button to inspection modal for remaining students, preventing DOM overload on large sections.
    - **Dynamic Counter Badge**: Shows exact count of valid visible branches (`N ramas desplegadas` or `Todo plegado`).
- **Live Canvas LMS Case Manager (`CanvasCaseManager`)**:
  - **Global Tab & Menu**: Direct access from top header navigation bar (`Casos Canvas LMS (API)`) and drawer menu (`/#canvas`).
  - **Live Case Directory**: Left side panel listing Canvas snapshots, status badges (`Completado`, `En Progreso`, `Fallido`), target endpoint, account/course metrics, and atomic delete button.
  - **Creation Modal with Connection Test**: Configure name, description, toggle official courses fetch, and "Probar Conexión" button testing root account connectivity in real time.
  - **Hierarchical Account, Course and Section Visualizer (Canvas Tree)**:
    - Recursive structure: `[CUENTA/SUBCUENTA]` -> `[CURSO]` -> `[SECCIÓN]` -> `(D) [DOCENTE]` / `(E) [ESTUDIANTE]`.
    - Depth indentation with collapsible chevrons and mass controls: "Desplegar Todo", "Plegar Todo", "Plegar Matriculados", and per-account "Desplegar Cursos" / "Plegar Cursos".
    - Distinct badges: SIS ID (`SIS: S-001`, `SIS: CUR006380`, `SIS: 7115-CUR006380`) with emerald border vs `Sin SIS ID` with dashed border, numeric Canvas ID, course count, and student count.
    - Real-time search recursively filtering accounts, subaccounts, course names, SIS codes, and sections while maintaining ancestor nodes visible.
    - Visual vertical guidelines: Section indentation (`border-l-2 border-primary/25`), inline roster guides (`border-l-2 border-emerald-600/30`), teachers guide (`border-l-2 border-amber-500/40`), and students guide (`border-l-2 border-emerald-500/40`).
    - Teacher and student deduplication by unique ID/DNI per section.
    - On-demand lazy loading: Queries `/courses/:id/enrollments` only when user expands course/section, caching in SQLite (`canvas_case_enrollments`) for instant 0 ms re-expansions.
- **Spinning Loaders & Reactive Visual Feedback (`Loader2 animate-spin`)**:
  - **Hierarchy Loading**: Centered container with `Loader2` spinner and descriptive progress message ("Cargando jerarquía académica...").
  - **Inline Student Roster**: Active spinner in toggle button ("Cargando...") and elegant loading block inside section body.
  - **Student Inspector Modal (`StudentInspectorDialog`)**: Centered animated spinner during record resolution.
  - **Case Manager (`CaseManager`)**: Live feedback during initial case loading, case detail retrieval, MSSQL 20-table extraction, and 50-row sample inspection.
  - **Canvas Export (`CanvasExportDialog`)**: Large `size-10 text-emerald-600 animate-spin` indicator during ZIP packing and CSV compilation.
- **Reorganization of Navigation Tabs (`AppLayout` & `routes/index.tsx`)**:
  - Top header and drawer tab sequence:
    1. `Registro de Casos SQL` (`Database`): Default landing screen (`/#cases`).
    2. `Visualización y Selección` (`Layers`): Tree and table workspace (`/#visualization`).
    3. `Previsión de Matrícula (Forecast)` (`TrendingUp`): Career x Cycle enrollment matrix workspace (`/#forecast`).
    4. `Comparativa Lado a Lado (BD vs Canvas)` (`GitCompare`): Dual-panel comparison (`/#comparison`).
    5. `Casos Canvas LMS (API)` (`Globe`): Canvas cloud snapshots (`/#canvas`).
- **Enrollment Forecast Workspace (`ForecastView` - `src/components/forecast/forecast-view.tsx`)**:
  - **Full-Width Interactive Pivot Table**: Displays Careers on the Y-axis and Academic Cycles (Ciclo 1 to 12) on the X-axis, with sticky column for Career names and sticky header for cycle labels.
  - **Dual Metric Toggle**: Smooth switcher between "Alumnos Únicos" (distinct student headcount per career/cycle) and "Matrículas-Curso (Cupos)" (total enrollments / class seat occupancy).
  - **Next-Semester Predictive Simulation Engine (`enablePrediction`)**:
    - Toggle action button with `Sparkles` icon (`Simular Próximo Semestre` / `Ocultar Proyección`).
    - **Dual Interactive Sliders** (`src/components/ui/slider.tsx`):
      1. **Tasa de Deserción (Abandono)**: Rose/Red theme (`bg-rose-500`), range 0% to 100% (never negative), with quick presets: `0% (Sin deserción)`, `5%`, `10%`, `15%`, `20%`, `30%`. Alumnos que abandonan se restan primero antes de cualquier otro cálculo.
      2. **Tasa de Traslado (Avance de Ciclo)**: Purple theme (`bg-purple-600`), range 0% to 100%, with quick presets: `100% (Pasan todos)`, `90%`, `85%`, `75%`, `50%`, `0% (Todos repiten)`. De los alumnos que quedan tras deserción, define quiénes avanzan al ciclo $N+1$ y quiénes repiten ($100 - t\%$) quedándose en el ciclo actual $N$.
    - **Simulation Pipeline Flow & Legend Banner**: Displays 3 clear summary badges:
      - Deserción: `${desercionRate}%` (se restan)
      - Repitencia: `${100 - retentionRate}%` de los que quedan (mismo ciclo)
      - Traslado: `${retentionRate}%` de los que quedan (siguiente ciclo)
    - **Dual-Value Cell Rendering (Side-by-Side Dual Color Display)**:
      - Current value: Neutral foreground text (`text-foreground font-semibold`).
      - Projected value: High-contrast Emerald Green badge (`bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold px-1.5 py-0.5 rounded shadow-2xs`), separated by transition arrow `→`.
      - Cell breakdown tooltip on hover: Reveals exact arithmetic: `Proyección Ciclo N: {total} ({promovidos} promovidos de Ciclo anterior + {repitentes} repitentes de este ciclo | {desertores} desertores)`.
      - When projected value is 0, rendered in subdued gray font (`text-muted-foreground/30`).
    - **Dual Totals**:
      - Career total column: `Actual` (muted gray badge `bg-muted text-foreground`) `→` `Proyectado` (prominent emerald badge `bg-emerald-600 text-white font-bold px-2 py-0.5 rounded shadow-xs`).
      - Column footer totals: Dual sums per cycle with subtle separator.
      - Grand total badge: Dual aggregate sum across all careers and cycles.
    - Nested course catalog breakdown: Shows both actual enrolled students and estimated course projection scaled proportionally to parent cycle projection dynamics.
  - **Nested Course Roster Expansion**: Clicking any career row reveals the granular curricular breakdown of open courses for that career: Ciclo, Course Code, Asignatura, Curricular Plan, Credits, Section count, enrolled students, and projected enrollment badge.
  - **Cascading Filter Bar & Multi-Period Popover**: Seamless switching between SQL Cases, Institutional Campuses (Sedes), and **Multi-Period Selection**:
    - Default on initial load: **Only one single item checked** (e.g. `2026-2 PREGRADO`), avoiding massive initial multi-period overfetch.
    - Interactive popover trigger with period count badge and dynamic labels (`Todos los Periodos`, individual period name, or `N periodos seleccionados`).
    - Internal period search filter, `Todos` and `Limpiar` actions, individual checkboxes, and quick `Solo este` button per period.
    - Removable active period pill badges (`Badge`) with `×` button for instant scope adjustment.
  - **Instant Search Filter**: Instant client-side text filtering across career names, faculties, course names, and codes.
  - **Mass Batch Controls**: "Expandir Todo" and "Plegar Todo" buttons for unfolding all careers simultaneously.
  - **Export to CSV**: Client-side CSV generator compiling both the high-level Career x Cycle matrix and the exhaustive course breakdown, with dynamic filename reflecting selected period(s), dual `Actual` and `Proyectado` columns, and complete simulation metadata (Tasa Deserción, Tasa Traslado, Tasa Repitencia).
  - **Dual-View Workspace Tabs: "Tabla Matricial" vs "Gráfico de Barras" (`activeTab: 'table' | 'chart'`)**:
    - Clean segmented pill switcher in the top right actions toolbar allowing seamless switching between tabular and graphical analysis without losing active simulation or filter states.
    - **TanStack Charts Bar Visualization (`ForecastChartView`)**:
      - **Hierarchical Career-to-Course Expandable Bar Charts**:
        - Cada carrera se representa como un contenedor `CareerExpandableBarCard` interactivo.
        - **Nivel Agregado (Ciclos)**: Gráfico de barras verticales (`barY`) de Ciclo 1 al 12 para la carrera, comparando Actual (Slate `#64748b`) vs Proyectado (Emerald `#10b981`), con fila de chips de resumen por ciclo.
        - **Nivel Detalle Desplegado (Cursos)**: Al hacer clic en el chevron o en "Desplegar Detalle", se despliega un gráfico de barras horizontales (`barX`) que compara los alumnos matriculados actuales vs proyección estimada de cada asignatura, con altura adaptativa (`carr.courses.length * 36 + 70`) y tabla detallada.
        - **Sincronización Total de Expansión**: La expansión interactúa de forma coordinada con la variable de estado `expandedCarreras` y los botones "Expandir Todo" / "Plegar Todo".
      - **Sub-View Switcher**:
        - `Por Carreras y Cursos (Expandible)`: Vista principal por agregados desplegables en detalle.
        - `Consolidado por Ciclos`: Macro-gráfico de todos los ciclos institucionales.
        - `Comparativa de Carreras`: Gráfico horizontal de todas las carreras con selectores de límite y ordenación.
      - **Summary KPI Metric Cards**: Tarjetas superiores con Total Actual, Total Proyectado, Variación Neta ($+/-$ y $\%$), y parámetros activos.
      - **Strict Component Policy**: Gráficos SVG puros de TanStack Charts sin widgets superfluos de dashboard.
  - **Filtros Dinámicos de Modalidad y Turno (`ForecastView`)**:
    - **Barra de Herramientas de 6 Columnas Responsiva**:
      - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3` garantizando que Caso, Periodos, Sede, Modalidad, Turno y Buscador se organicen con balance visual óptimo en cualquier pantalla.
      - Selector de Modalidad con icono `Laptop` y conteo de alumnos únicos por opción.
      - Selector de Turno con icono `Clock` y conteo de alumnos únicos por opción.
    - **Chips / Badges de Filtros Activos**:
      - Sede activa: Badge neutro con icono `Building2` y botón `×`.
      - Modalidad activa: Badge azul (`bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800`) con icono `Laptop` y botón `×`.
      - Turno activo: Badge ámbar (`bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`) con icono `Clock` y botón `×`.
    - **Sincronización Total en Tiempo Real**: La selección de Modalidad o Turno filtra de inmediato la Tabla Matricial, los cursos expandibles, los gráficos agregados por ciclo (`barY`) y los gráficos detallados por curso (`barX`).
- **GitHub Interface & Visual Architecture Documentation (`README.md`)**:
  - ASCII visual layout of navigation header, drawer, and 4 core workspaces.
  - Mermaid architecture flowchart representing the full data pipeline.
  - Instructure Canvas standard SIS CSV specification tables and identity normalization rules.
- **Cross-listing & Multi-Course Group Badging (Purple OKLCH Design)**:
  - Nested Tree & Detailed Table: Sections with `grupoCodigo` display an outline badge `Grupo: {codigo}` with purple background (`bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800`), font-mono styling, and pulsating indicator dot. Search bar automatically matches group codes.
  - Comparison Workspace: Left panel displays `Xlist: {masterCourseId}` on exported sections and `{count} Xlist` in summary bar. Right panel parses `nonxlist_course_id` and displays `Cross-list (Origen: #{id})`. Synchronized and local search engines automatically match `xlistCourseId` and section IDs when filtering migration trees.
  - Canvas Case Manager: Sections originating from cross-listing dynamically render purple `Cross-list (Origen: #{id})` badge.
