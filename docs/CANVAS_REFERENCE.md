# Canvas LMS Integration & Migration Reference Guide

> **Reference Document**: Detailed breakdown of the source Canvas LMS export/import application (`/home/mateo/projects/canvas`), credentials, database architecture, normalization logic, and the modern `/new` processing pipeline.

---

## 1. Environment & Credentials Configuration

The source repository `/home/mateo/projects/canvas` defines connection credentials in `.env` (and `.friday_env`):

### 1.1 Source SQL Server (Academic Database)
* **Host / Server**: `localhost:1433` (`DB_SERVER`)
* **Database (Latest)**: `BDACADEMICO5` (`DB_NAME`)
  * *Historical revisions noted*: `BDACADEMICO`, `BDACADEMICO2`, `BDACADEMICO3`, `BDACADEMICO4`
* **User**: `sa` (`DB_USER`)
* **Password**: `1Ltseosb.` (`DB_PASSWORD`)
* **Client Library**: `mssql` (Node.js TDS driver) with `encrypt: false`, `trustServerCertificate: true`, `minVersion: TLSv1`.

### 1.2 Source SQL Server (Authentication & Person Database)
* **Database (Latest)**: `BDAUTENTICACION5` (`UP_DB_NAME`)
  * *Historical revisions noted*: `BDAUTENTICACION`, `BDAUTENTICACION2`, `BDAUTENTICACION3`, `BDAUTENTICACION4`
* **User**: `sa` (`UP_DB_USER`)
* **Password**: `1Ltseosb.` (`UP_DB_PASSWORD`)
* **Key Table**: `Personal.Utb_Persona` (Contains master teacher records, DNI identification, corporate & personal emails).

### 1.3 Canvas LMS API Credentials
* **Production Endpoint**: `https://politecnica.instructure.com/` (`CANVAS_API_ENDPOINT`)
* **Production Token**: `29445~KWnHVkUQTMY43Jw3WFWmnwcTL4CYYMDx4wR34DMP3LEkXcfthUWDZzmT9BHCyXBr` (`CANVAS_API_KEY`)
* **Beta / Sandbox Endpoint (Commented)**: `https://politecnica.beta.instructure.com`
* **Beta Token**: `29445~QErDTKJG373ECRwwXM3Ew8yVLHwmQFLZzFZuzeXe9mcVEL37MLAcvuL6mhmC2tkE`

### 1.4 Business Rules & Export Flags
* **`INCLUDE_NO_HABILITADO_SECTIONS=false`**: Filters out academic sections containing the substring `"NO HABILITADO"` (case-insensitive) across hierarchy generation, courses, sections, and enrollments.
* **`EXPORT_ALL_COURSES=true`**: Ensures courses with assigned faculty are exported to Canvas even if no students have enrolled yet (allows professors to configure course shells in advance).
* **`EXPORT_ALL_ENTITIES=true` / `EXPORT_ALL_STUDENTS=true`**: Incorporates all registered students from `Academico.Alumno` into `users.csv`.

---

## 2. Source System Database Schema (MSSQL)

The academic relational model comprises 18 core tables mapped across schemas:

1. **General / Academic Periods**:
   - `General.Periodo`: Academic periods (`id`, `nombre`, `fecha_inicio`, `fecha_fin`, `sufijo`, `activo`).
   - `General.Periodo_Tipo`: Period classifications (`semestral`, `modular`, etc.).
2. **Organizational Hierarchy (Sedes, Carreras, Facultades)**:
   - `General.Sede`: Campuses (`cod_sede`, `nombre`, `cat_tipo_sede_id`).
   - `General.Facultad`: Faculties (`cod_facultad`, `nombre`).
   - `General.Carrera`: Degree programs (`cod_carrera`, `nombre`, `facultad_id`, `cat_grado_estudio_id`).
   - `General.SedeCarrera`: Links sedes to carreras.
   - `General.Catalogo`: Reference taxonomy dictionary (study degrees, modalities, course types).
3. **Academic Curriculum (Planes & Cursos)**:
   - `Academico.Plan`: Curricular plans (`cod_plan`, `nombre`, `carrera_id`, `activo`).
   - `Academico.Curso`: Courses (`cod_curso`, `nombre`, `abreviatura`, `plan_id`, `cat_ciclo_id`).
4. **Academic Offer & Sections (Carga Académica)**:
   - `Carga_Academica.Carga_Academica`: Maps load to `General.Periodo`.
   - `Carga_Academica.Carga_Academica_Sede`: Links carga to sede and career.
   - `Carga_Academica.Carga_Academica_Sede_Seccion`: Class sections (`nombre`, `activo`).
   - `Carga_Academica.Carga_Academica_Sede_Curso`: Course offerings within sections.
   - `Carga_Academica.Carga_Academica_Sede_Curso_Horario`: Schedule blocks.
   - `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle`: Teacher assignments (`docente_id` pointing logically to `BDAUTENTICACION.Personal.Utb_Persona.id`).
5. **Student Registrations (Matrícula)**:
   - `Academico.Alumno`: Student profiles (`codigo_alumno`, `persona_id`, `email_principal`).
   - `General.Persona`: Personal biographical data (`nombre`, `apellido_paterno`, `apellido_materno`, `documento`).
   - `Matricula.Matricula_Alumno`: Student enrollment header per term/plan.
   - `Matricula.Matricula_Alumno_Curso`: Enrolled courses linked to schedule blocks (`carga_academica_sede_curso_horario_id`).

---

## 3. Architecture of `/new` (The Modern Clean Pipeline)

The directory `/home/mateo/projects/canvas/new/` represents the latest production-grade architecture. It decouples extraction, formatting, differential analysis, and output generation into modular TypeScript components.

```
new/
├── src/
│   ├── index.ts              # Pipeline orchestrator & CLI entrypoint
│   ├── hierarchy.ts          # Assembles hierarchical tree from local JSON/data dumps
│   ├── sis_exporter.ts       # Formats Canvas Standard SIS CSV records
│   ├── diff_engine.ts        # Computes additions, deletions, updates against new/old/
│   ├── hierarchy_writer.ts   # Formats hierarchy.txt tree and HIERARCHY.md metrics
│   └── types.ts              # TypeScript interfaces for Canvas entities & hierarchy nodes
├── export/                   # Current generated SIS CSV files & packaged ZIPs
├── old/                      # Previous export snapshot (used for calculating diffs)
├── queries/                  # Specific SQL investigative audit queries
├── hierarchy.txt             # Tabbed hierarchical visualization (40,000+ lines)
└── HIERARCHY.md              # Markdown summary with per-term breakdown
```

### 3.1 Pipeline Flow (`new/src/index.ts`)
1. **Archive Old Export**: Moves CSVs from `new/export/` to `new/old/` (`archiveCurrentExport`).
2. **Build Master Academic Tree**: `getMasterHierarchy(exportOptions)` resolves:
   `Periodo -> Sede -> Modalidad -> Facultad -> Carrera -> Plan -> Curso -> Seccion -> [Docentes & Alumnos]`.
3. **Generate Standard SIS CSVs**: Emits 6 standard files into `new/export/`:
   - `accounts.csv`
   - `terms.csv`
   - `users.csv`
   - `courses.csv`
   - `sections.csv`
   - `enrollments.csv`
4. **Compute Differences (`diff_engine.ts`)**:
   - Identifies rows added (`_added.csv`), deleted (`_deleted.csv`), and modified (`_updated.csv`).
   - Generates enrollment conclusion and deletion files:
     - `enrollments_to_delete.csv` (`status = deleted`)
     - `enrollments_to_conclude.csv` (`status = completed`)
   - Computes per-student enrollment additions (`nuevos_enrollments_por_alumno.csv`).
5. **Generate Text Hierarchy & Markdown Documentation**:
   - `hierarchy.txt` (structured tab-delimited tree).
   - `HIERARCHY.md` (summary table with counts per academic term).
6. **Package ZIP Archives for Canvas SIS Import**:
   - `canvas_full_migration.zip`: Complete bundle of the 6 core SIS CSVs.
   - `canvas_incremental_update.zip`: Differential bundle containing only modified/added records.

---

## 4. Canvas LMS SIS Data Specifications & ID Conventions

The application follows the official **Instructure Canvas SIS Import CSV Format**:

### 4.1 Accounts (`accounts.csv`)
Hierarchical multi-level subaccount tree:
* **Root / Campus (Sede)**: `account_id = <cod_sede>` (e.g., `S-01`), `parent_account_id = ""`
* **Modality**: `account_id = M-<id>` (e.g., `M-1`), `parent_account_id = <cod_sede>`
* **Faculty**: `account_id = F-<cod_facultad>`, `parent_account_id = M-<id>`
* **Career**: `account_id = C-<cod_carrera>`, `parent_account_id = F-<cod_facultad>`
* **Plan**: `account_id = <cod_plan>` (e.g., `P004117`), `parent_account_id = C-<cod_carrera>`

### 4.2 Terms (`terms.csv`)
* **`term_id`**: Prefixed with `T-` + Period ID (e.g., `T-3074`).
* **`name`**: Academic term name (e.g., `2026-2 PREGRADO`).
* **`start_date` / `end_date`**: Timezone formatted (`America/Lima` -> `yyyy-MM-dd HH:mm:ssXXX`).

### 4.3 Users (`users.csv`)
* **Students**:
  - `user_id`: Student code (`codigo_alumno`, e.g., `26011121010074`).
  - `login_id`: Student email (`<codigo>@politecnica.edu.pe`).
  - `email`: Student email.
  - `full_name` / `sortable_name`: Full name.
* **Teachers (Crucial Normalization Rule)**:
  - `user_id`: **Official National ID / DNI** from `Utb_Persona` (e.g., `40404379`).
  - *Correction Rule*: Replaces legacy email-based logins (e.g., `luisayala@politecnica.edu.pe`) and sequential IDs (e.g., `348`) with official DNI.
  - `login_id`: Corporate email (or `<dni>@politecnica.edu.pe`).

### 4.4 Courses (`courses.csv`)
* **`course_id`**: `<cod_curso>` (e.g., `C00123`).
* **`account_id`**: Associated Plan SIS ID (`<cod_plan>`).
* **`term_id`**: `T-<periodo_id>`.
* **`course_format`**: `"online"`.

### 4.5 Sections (`sections.csv`)
* **`section_id`**: Unique compound key `<seccion_id>-<course_id>`.
* **`course_id`**: `<cod_curso>`.
* **`name`**: Section display name (e.g., `GRUPO 01`).

### 4.6 Enrollments (`enrollments.csv`)
* **`course_id`**: `<cod_curso>`.
* **`section_id`**: `<seccion_id>-<course_id>`.
* **`user_id`**: Student code or Teacher DNI.
* **`role`**: `"student"` or `"teacher"`.
* **`status`**: `"active"`, `"deleted"`, or `"completed"`.

### 4.7 SIS ID Change Mapping (`change_sis_id.csv`)
Used by Canvas SIS import when migrating legacy user IDs:
* Headers: `old_id,new_id,type`
* Example: `luisayala@politecnica.edu.pe,40404379,user`

---

## 5. Canvas LMS Import & Export APIs

### 5.1 Push to Canvas: SIS Import API (`src/import_accounts.ts`)
* **Upload Endpoint**:
  ```http
  POST /api/v1/accounts/:rootAccountId/sis_imports?import_type=instructure_csv&override_sis_stickiness=true
  Content-Type: multipart/form-data | application/zip | text/csv
  Authorization: Bearer <CANVAS_API_KEY>
  ```
* **Status Polling**:
  ```http
  GET /api/v1/accounts/:rootAccountId/sis_imports/:importJobId
  ```
* **States**: `created` -> `importing` / `processing` -> `imported` / `imported_with_messages` / `failed`.

### 5.2 Pull from Canvas: Live Extraction API (`src/from_canvas.ts`)
Extracts live Canvas cloud state to compare against local SQL databases:
* `GET /api/v1/accounts/1` (Root Account)
* `GET /api/v1/accounts/1/sub_accounts?recursive=true&per_page=100` (Subaccounts)
* `GET /api/v1/accounts/1/terms?per_page=100` (Academic Terms)
* `GET /api/v1/accounts/1/courses?include[]=term&include[]=total_students&include[]=teachers&include[]=sections&per_page=100`
* `GET /api/v1/courses/:id/sections?per_page=100`
* `GET /api/v1/courses/:id/enrollments?include[]=user&per_page=100`
* **Concurrency Pool**: 8 simultaneous worker threads with exponential backoff on HTTP 429 / 403 / 500.

### 5.3 Account Management & Deletion (`src/manage_accounts.ts`)
* `GET /api/v1/accounts/:id` or `GET /api/v1/accounts/sis_account_id:<sis_id>`
* `DELETE /api/v1/accounts/:parentId/sub_accounts/:id` (Direct API deletion)
* Bulk deletion via SIS import CSV with `status = deleted`.
