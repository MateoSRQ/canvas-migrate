# DICCIONARIO DE DATOS MAESTRO: BDACADEMICO Y BDAUTENTICACION

> **Documento Oficial de Referencia Técnica**
> Sistema de Previsión, Planificación Curricular y Migración Canvas LMS
> **Bases de Datos:** `BDACADEMICO6` (371 tablas) y `BDAUTENTICACION5` (14 tablas)
> **Fecha de Actualización:** 16 de Septiembre de 2026

---

## 1. Resumen Ejecutivo del Ecosistema de Datos

El sistema académico opera mediante dos bases de datos principales en Microsoft SQL Server 2022:

1. **`BDACADEMICO6` (Núcleo Operativo y Curricular)**:
   - Contiene **371 tablas** distribuidas en 24 esquemas relacionales.
   - Modela la oferta académica institucional: planes de estudio, mallas curriculares, periodos lectivos, sedes, facultades, carreras, programación horaria de secciones (carga académica), matrículas de estudiantes y seguimiento de egreso.
2. **`BDAUTENTICACION5` (Identidad, Personal y Seguridad)**:
   - Contiene **14 tablas** especializadas en la autenticación de usuarios y el registro maestro de personas/docentes.
   - Alberga la tabla maestra `Personal.Utb_Persona`, indispensable para resolver el **DNI oficial** y correos electrónicos institucionales del cuerpo docente para las migraciones a Canvas LMS.

---

## 2. Mapa General de Esquemas y Volumetría

| Esquema | Propósito Operativo | Tablas | Tablas Destacadas |
|---------|---------------------|--------|-------------------|
| **`Academico`** | Catálogo curricular, planes de estudio, prerequisitos y alumnos. | 14 | `Alumno`, `Curso`, `Plan`, `Curso_Prerequisito` |
| **`Carga_Academica`** | Programación semestral de cursos, horarios, docentes, secciones y cross-listing. | 8 | `Carga_Academica_Sede_Curso`, `Carga_Academica_Sede_Curso_Horario`, `Carga_Academica_Sede_Curso_Horario_Detalle` |
| **`Matricula`** | Inscripción de asignaturas por estudiante, rectificaciones, retiros y reservas. | 16 | `Matricula_Alumno`, `Matricula_Alumno_Curso` (95,656 registros) |
| **`General`** | Maestro de periodos, sedes, facultades, carreras, catálogos y personas. | 29 | `Periodo`, `Sede`, `Carrera`, `SedeCarrera`, `Catalogo`, `Persona` |
| **`Admision`** | Postulantes, modalidades de ingreso, criterios de evaluación y vacantes. | 24 | `Postulantes`, `Modalidad`, `Vacantes` |
| **`GradosTitulos`** | Certificados de estudio, trámites de bachillerato y expedientes de grado. | 26 | `Certificado_Estudio`, `Documento_Alumno` |
| **`Titulacion`** | Cursos de titulación profesional, requisitos y resoluciones. | 17 | `CursoTitulacion`, `CursoTitulacionAlumno`, `Solicitud` |
| **`Ctas_Ctes` & `Tesoreria`** | Liquidaciones, cuotas, pagos y tasas académicas vinculadas a la matrícula. | 60 | `Alumno_Pago`, `Concepto_Pago`, `Comprobante` |
| **`BDAUTENTICACION5`** | Identidad docente con DNI, credenciales de usuario y registros de sesión. | 14 | `Personal.Utb_Persona`, `Auth.Utb_Usuario` |

---

## 3. Esquema `Academico` (14 Tablas)

Contiene la estructura curricular de la universidad: carreras, planes de estudio, asignaturas, prerequisitos, equivalencias y la ficha del estudiante.

### `Academico.Alumno`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 4879 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `cat_categoria_id` ➔ `General.Catalogo(id)` *(FK__Alumno__cat_cate__1590259A)*
  - `cat_ciclo_id` ➔ `General.Catalogo(id)` *(FK__Alumno__cat_cicl__61DB776A)*
  - `cat_condicion_id` ➔ `General.Catalogo(id)` *(FK__Alumno__cat_cond__1DF06171)*
  - `descuento_exc_id` ➔ `Ctas_Ctes.Descuento_Excepcional(id)` *(FK__Alumno__descuent__77C096E8)*
  - `persona_id` ➔ `General.Persona(id)` *(FK__Alumno__persona___11BF94B6)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Alumno__plan_id__1CFC3D38)*
  - `sede_carrera_id` ➔ `General.SedeCarrera(id)` *(FK__Alumno__sede_car__12B3B8EF)*
  - `cat_modalidad_ingreso_id` ➔ `Admision.Modalidad(id)` *(FK_Alumno_ModalidadIngreso)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `persona_id` | `int` | **NOT NULL** | FK ➔ `General.Persona` | Clave foránea relacional hacia entidad maestra. |
| 3 | `sede_carrera_id` | `int` | **NOT NULL** | FK ➔ `General.SedeCarrera` | Clave foránea relacional hacia entidad maestra. |
| 4 | `email_principal` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `email_secundario` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 6 | `periodo_ingreso` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `cat_modalidad_ingreso_id` | `int` | **NOT NULL** | FK ➔ `Admision.Modalidad` | Clave foránea relacional hacia entidad maestra. |
| 8 | `cat_categoria_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Clave foránea relacional hacia entidad maestra. |
| 9 | `socio` | `bit` | NULL | - | Atributo de gestión académica. |
| 10 | `becario` | `bit` | NULL | - | Atributo de gestión académica. |
| 11 | `fotografia` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 12 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 13 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 14 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 15 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 16 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 17 | `codigo_alumno` | `char(14)` | NULL | - | Código institucional del estudiante universitario. |
| 18 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 19 | `cat_ciclo_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | catálogo ciclo |
| 20 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Clave foránea relacional hacia entidad maestra. |
| 21 | `cat_condicion_id` | `int` | NULL | FK ➔ `General.Catalogo` | Clave foránea relacional hacia entidad maestra. |
| 23 | `fecha_primera_matricula` | `date` | NULL | - | Atributo de gestión académica. |
| 24 | `carga_academica_primera_matricula_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 25 | `fecha_ultima_matricula` | `date` | NULL | - | Atributo de gestión académica. |
| 26 | `carga_academica_ultima_matricula_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 27 | `carga_academica_id_actual` | `int` | NULL | - | Atributo de gestión académica. |
| 28 | `turno` | `char(1)` | NULL | - | Turno de dictado de la sección ('D': Diurno, 'N': Nocturno). |
| 29 | `cat_convenio_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 30 | `seccion` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 31 | `pais_colegio` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 32 | `estudio_secundaria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 33 | `colegio_secundario` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 34 | `tipo_colegio_secundario` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 35 | `anio_egreso_colegio_secundario` | `varchar(15)` | NULL | - | Atributo de gestión académica. |
| 36 | `lengua` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 37 | `descuento_exc_id` | `int` | NULL | FK ➔ `Ctas_Ctes.Descuento_Excepcional` | Clave foránea relacional hacia entidad maestra. |

---

### `Academico.Alumno_Grado`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2531 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK_Alumno_Grado_Alumno)*
  - `carrera_id` ➔ `General.Carrera(id)` *(FK_Alumno_Grado_Carrera)*
  - `cat_grado_id` ➔ `General.Catalogo(id)` *(FK_Alumno_Grado_Catalogo_Grado)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 3 | `carrera_id` | `int` | **NOT NULL** | FK ➔ `General.Carrera` | Clave foránea relacional hacia entidad maestra. |
| 4 | `cat_grado_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Clave foránea relacional hacia entidad maestra. |
| 5 | `universidad_origen` | `varchar(200)` | NULL | - | Atributo de gestión académica. |
| 6 | `fecha_obtencion` | `date` | NULL | - | Atributo de gestión académica. |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `created_by` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 10 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Academico.Alumno_Plan`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 693 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK__Alumno_Pl__alumn__7A5D0C71)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Alumno_Pl__plan___7B5130AA)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 3 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Clave foránea relacional hacia entidad maestra. |
| 4 | `ultimo_registro` | `tinyint` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |

---

### `Academico.Convenio_Categoria`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 22 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `convenio_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 2 | `categoria_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |

---

### `Academico.Curso`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2257 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `cat_ciclo_id` ➔ `General.Catalogo(id)` *(FK__Curso__cat_ciclo__7CF981FA)*
  - `cat_tipo_curso_id` ➔ `General.Catalogo(id)` *(FK__Curso__cat_tipo___7C055DC1)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Curso__plan_id__764C846B)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `cod_curso` | `varchar(25)` | **NOT NULL** | - | Código del Curso |
| 3 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre del Curso |
| 4 | `abreviatura` | `varchar(50)` | NULL | - | Abreviatura |
| 5 | `creditos` | `int` | **NOT NULL** | - | Total de creditos |
| 6 | `cat_tipo_curso_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Id de Tabla Catalogo |
| 7 | `cat_ciclo_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Id de Tabla Catalogo |
| 9 | `num_horas_sem_practica` | `int` | **NOT NULL** | - | Número de horas |
| 10 | `num_horas_sem_laboratorio` | `int` | **NOT NULL** | - | Número de horas |
| 11 | `total_semanas_ciclo` | `int` | **NOT NULL** | - | Total de semanas |
| 12 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 13 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 14 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 15 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 16 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 17 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Id de Tabla Plan |
| 18 | `num_horas_sem_teoria` | `int` | **NOT NULL** | - | Número de horas |
| 19 | `activo` | `bit` | NULL | - | si se encuentra activo o no |
| 20 | `num_credito_requisito` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 21 | `cod_sui` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 22 | `curso_grupo_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |

---

### `Academico.Curso_Equivalencia`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 37 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `curso_padre_id` ➔ `Academico.Curso(id)` *(FK__Curso_Equ__curso__316D4A39)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `curso_padre_id` | `int` | **NOT NULL** | FK ➔ `Academico.Curso` | Clave foránea relacional hacia entidad maestra. |
| 3 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 4 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 6 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 7 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 8 | `plan_id` | `int` | **NOT NULL** | - | Id de Tabla Plan |
| 9 | `cat_ciclo_id` | `int` | **NOT NULL** | - | Id de Tabla Catalogo |
| 10 | `curso_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |

---

### `Academico.Curso_Evaluacion`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 237 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `curso_id` ➔ `Academico.Curso(id)` *(FK__Curso_Eva__curso__64F7DB37)*
  - `evaluacion_id` ➔ `Academico.Evaluacion(id)` *(FK__Curso_Eva__evalu__65EBFF70)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Curso_Eva__plan___6403B6FE)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Clave foránea relacional hacia entidad maestra. |
| 3 | `curso_id` | `int` | **NOT NULL** | FK ➔ `Academico.Curso` | Clave foránea relacional hacia entidad maestra. |
| 4 | `evaluacion_id` | `int` | **NOT NULL** | FK ➔ `Academico.Evaluacion` | Clave foránea relacional hacia entidad maestra. |
| 5 | `peso` | `int` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Academico.Curso_Prerequisito`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2111 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `curso_padre_id` ➔ `Academico.Curso(id)` *(FK__Curso_Pre__curso__32616E72)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `curso_padre_id` | `int` | **NOT NULL** | FK ➔ `Academico.Curso` | Clave foránea relacional hacia entidad maestra. |
| 3 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 4 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 7 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 8 | `plan_id` | `int` | **NOT NULL** | - | Id de Tabla Plan |
| 9 | `cat_ciclo_id` | `int` | **NOT NULL** | - | Id de Tabla Catalogo |
| 10 | `curso_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |

---

### `Academico.Evaluacion`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 31 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `descripcion` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `abreviatura` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Academico.Plan`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 85 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carrera_id` ➔ `General.Carrera(id)` *(FK__Plan__carrera_id__75586032)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `cod_plan` | `varchar(25)` | **NOT NULL** | - | Codigo del Plan |
| 3 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre de plan |
| 5 | `carrera_id` | `int` | **NOT NULL** | FK ➔ `General.Carrera` | Id Carrera |
| 6 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 12 | `min_hora` | `int` | **NOT NULL** | - | Mínimo de horas |
| 15 | `num_credito_egresado` | `int` | **NOT NULL** | - | Número de creditos para considerar egresado |
| 16 | `publicado` | `bit` | **NOT NULL** | - | DAR DE BAJA FUE PARA DEMO |
| 18 | `numero_documento` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 19 | `num_cursos_dirigidos` | `int` | NULL | - | Atributo de gestión académica. |
| 20 | `num_cursos_obligatorios` | `int` | NULL | - | Atributo de gestión académica. |
| 21 | `num_creditos_obligatorios` | `int` | NULL | - | Atributo de gestión académica. |
| 22 | `num_cursos_electivos` | `int` | NULL | - | Atributo de gestión académica. |
| 23 | `num_creditos_electivos` | `int` | NULL | - | Atributo de gestión académica. |
| 24 | `cat_grado_estudio_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 25 | `sufijo` | `char(1)` | NULL | - | Atributo de gestión académica. |

---

### `Academico.SolicitudConvalidacion`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `codigo_publico` | `uniqueidentifier` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `codigo_alumno` | `varchar(20)` | **NOT NULL** | - | Código institucional del estudiante universitario. |
| 4 | `ciclo_academico` | `varchar(10)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `carrera_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 6 | `postulante_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 7 | `dni` | `varchar(20)` | **NOT NULL** | - | Documento Nacional de Identidad oficial del alumno/docente. |
| 8 | `nombre_completo` | `nvarchar(200)` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `email` | `nvarchar(150)` | NULL | - | Dirección de correo electrónico institucional o de contacto. |
| 10 | `celular` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 11 | `universidad_origen` | `nvarchar(200)` | NULL | - | Atributo de gestión académica. |
| 12 | `sede_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 13 | `sede_nombre` | `nvarchar(150)` | NULL | - | Atributo de gestión académica. |
| 14 | `carrera_nombre` | `nvarchar(200)` | NULL | - | Atributo de gestión académica. |
| 15 | `carrera_origen_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 16 | `carrera_origen_nombre` | `nvarchar(200)` | NULL | - | Atributo de gestión académica. |
| 17 | `estado` | `char(1)` | **NOT NULL** | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |
| 18 | `anulado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 19 | `motivo_anulacion` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 20 | `certificado_url` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 21 | `modalidad_sunedu` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 22 | `pct_virtualidad` | `decimal(5,2)` | NULL | - | Atributo de gestión académica. |
| 23 | `total_creditos` | `decimal(7,2)` | NULL | - | Atributo de gestión académica. |
| 24 | `numero_resolucion` | `varchar(30)` | NULL | - | Atributo de gestión académica. |
| 25 | `fecha_resolucion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 26 | `usuario_evaluador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 27 | `observaciones_generales` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |
| 28 | `fecha_materializacion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 29 | `matricula_alumno_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 30 | `fecha_inicio` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 31 | `fecha_envio` | `datetime` | NULL | - | Atributo de gestión académica. |
| 32 | `usuario_inicio` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 33 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 34 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 35 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 36 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 37 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 38 | `numero_acta` | `varchar(40)` | NULL | - | Atributo de gestión académica. |

---

### `Academico.SolicitudConvalidacionCurso`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `curso_id` ➔ `Academico.Curso(id)` *(FK_SolConvCurso_Curso)*
  - `solicitud_id` ➔ `Academico.SolicitudConvalidacion(id)` *(FK_SolConvCurso_Solicitud)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `solicitud_id` | `int` | **NOT NULL** | FK ➔ `Academico.SolicitudConvalidacion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `curso_id` | `int` | **NOT NULL** | FK ➔ `Academico.Curso` | Clave foránea relacional hacia entidad maestra. |
| 4 | `cod_curso` | `varchar(10)` | NULL | - | Código alfanumérico curricular de la asignatura (ej. CUR006380). |
| 5 | `nombre_curso` | `nvarchar(200)` | NULL | - | Atributo de gestión académica. |
| 6 | `creditos_destino` | `decimal(5,2)` | NULL | - | Atributo de gestión académica. |
| 7 | `ciclo_plan` | `int` | NULL | - | Atributo de gestión académica. |
| 8 | `nombre_curso_origen` | `nvarchar(200)` | NULL | - | Atributo de gestión académica. |
| 9 | `creditos_origen` | `decimal(5,2)` | NULL | - | Atributo de gestión académica. |
| 10 | `nota` | `decimal(5,2)` | NULL | - | Atributo de gestión académica. |
| 11 | `es_virtual` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 12 | `silabo_url` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 13 | `silabo_nombre` | `nvarchar(255)` | NULL | - | Atributo de gestión académica. |
| 14 | `observado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 15 | `motivo_observacion` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 16 | `decision_ra` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 17 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 18 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 19 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 20 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 21 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Academico.SolicitudConvalidacionHistorial`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 10 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `solicitud_id` ➔ `Academico.SolicitudConvalidacion(id)` *(FK_SolConvHist_Solicitud)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `bigint` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `solicitud_id` | `int` | **NOT NULL** | FK ➔ `Academico.SolicitudConvalidacion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `curso_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 4 | `estado_anterior` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 5 | `estado_nuevo` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 6 | `accion` | `varchar(40)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `usuario` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `fecha_evento` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `observaciones` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |

---

### `Academico.TablaTemporalCargaAcademica`

- **Esquema:** `Academico`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 3657 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `ciccodi` | `varchar(12)` | NULL | - | Atributo de gestión académica. |
| 2 | `CICIMPR` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `cod_sede` | `varchar(25)` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `nombre_sede` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `carcodi` | `varchar(25)` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `nombre_escuela` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `modalidad` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 8 | `crrcodi` | `varchar(25)` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `nombre_plan` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 10 | `grupo_curso` | `int` | NULL | - | Atributo de gestión académica. |
| 11 | `curcodi` | `varchar(25)` | **NOT NULL** | - | Atributo de gestión académica. |
| 12 | `crunomb` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 13 | `fecha_inicio` | `char(11)` | NULL | - | Atributo de gestión académica. |
| 14 | `fecha_fin` | `char(11)` | NULL | - | Atributo de gestión académica. |
| 15 | `hora_inicio` | `char(5)` | NULL | - | Hora de inicio de la sesión lectiva semanal. |
| 16 | `hora_fin` | `char(5)` | NULL | - | Hora de finalización de la sesión lectiva semanal. |
| 17 | `hordia` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 18 | `aulcodi` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 19 | `duracion_horas` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 20 | `seccodi` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 21 | `secnomb` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 22 | `grupo_horario` | `varchar(20)` | **NOT NULL** | - | Atributo de gestión académica. |
| 23 | `hortipo` | `varchar(1)` | **NOT NULL** | - | Atributo de gestión académica. |
| 24 | `percodi` | `varchar(10)` | NULL | - | Atributo de gestión académica. |
| 25 | `pernomb` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 26 | `perapat` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 27 | `peramat` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 28 | `permail` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 29 | `tipo_periodo` | `varchar(3)` | **NOT NULL** | - | Atributo de gestión académica. |

---

## 4. Esquema `Carga_Academica` (8 Tablas)

Modela la programación de oferta semestral: qué asignaturas se abren en cada sede y periodo, las secciones, horarios semanales, docentes asignados y los grupos de aulas compartidas (cross-listing).

### `Carga_Academica.Carga_Academica`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 20 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `periodo_id` ➔ `General.Periodo(id)` *(FK__Matricula__perio__4668671F)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre descriptivo o denominación oficial. |
| 3 | `periodo_id` | `int` | **NOT NULL** | FK ➔ `General.Periodo` | Clave foránea relacional hacia entidad maestra. |
| 4 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 8 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 9 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `cod_carga_academica` | `varchar(25)` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `vigente` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Carga_Academica.Carga_Academica_Sede`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 283 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_id` ➔ `Carga_Academica.Carga_Academica(id)` *(FK__Carga_Aca__carga__5D4BCC77)*
  - `sede_carrera_id` ➔ `General.SedeCarrera(id)` *(FK__Carga_Aca__sede___5E3FF0B0)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica` | Clave foránea relacional hacia entidad maestra. |
| 3 | `sede_carrera_id` | `int` | **NOT NULL** | FK ➔ `General.SedeCarrera` | Clave foránea relacional hacia entidad maestra. |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 7 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `publicado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 10 | `cerrado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `orden` | `int` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Carga_Academica.Carga_Academica_Sede_Curso`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 3022 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_sede_seccion_id` ➔ `Carga_Academica.Carga_Academica_Sede_Seccion(id)` *(FK__Carga_Aca__carga__611C5D5B)*
  - `cat_modalidad_id` ➔ `General.Catalogo(id)` *(FK__Carga_Aca__cat_m__6304A5CD)*
  - `curso_id` ➔ `Academico.Curso(id)` *(FK__Carga_Aca__curso__62108194)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_seccion_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Seccion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `curso_id` | `int` | **NOT NULL** | FK ➔ `Academico.Curso` | Clave foránea relacional hacia entidad maestra. |
| 4 | `cat_modalidad_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | FK a Catalogo (Modalidad: Presencial, Semi Presencial, A Distancia). |
| 5 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 6 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 10 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |

---

### `Carga_Academica.Carga_Academica_Sede_Curso_Horario`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 3275 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `aula_id_____` ➔ `General.Aula(id)` *(FK__Carga_Aca__aula___64ECEE3F)*
  - `carga_academica_sede_curso_id` ➔ `Carga_Academica.Carga_Academica_Sede_Curso(id)` *(FK__Carga_Aca__carga__63F8CA06)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_curso_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Curso` | Clave foránea relacional hacia entidad maestra. |
| 3 | `docente_firma_acta_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 4 | `nombre_horario` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `aula_id_____` | `int` | NULL | FK ➔ `General.Aula` | Atributo de gestión académica. |
| 6 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 12 | `fecha_firma_acta` | `date` | NULL | - | Atributo de gestión académica. |
| 13 | `fecha_fin____` | `date` | NULL | - | Atributo de gestión académica. |
| 14 | `cat_tipo_id____` | `int` | NULL | - | Atributo de gestión académica. |
| 15 | `curso_dirigido` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 16 | `nro_acta` | `varchar(255)` | NULL | - | Atributo de gestión académica. |

---

### `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 5132 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_sede_curso_horario_id` ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario(id)` *(FK__Carga_Aca__carga__65E11278)*
  - `cat_tipo_hora_id` ➔ `General.Catalogo(id)` *(FK__Carga_Aca__cat_t__2097C3F2)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_curso_horario_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario` | Clave foránea relacional hacia entidad maestra. |
| 5 | `duracion_horas` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 12 | `num_semana` | `int` | **NOT NULL** | - | Número de semana |
| 13 | `hora_inicio` | `time` | **NOT NULL** | - | Hora de inicio de la sesión lectiva semanal. |
| 14 | `hora_fin` | `time` | **NOT NULL** | - | Hora de finalización de la sesión lectiva semanal. |
| 15 | `aula_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 16 | `docente_id` | `int` | NULL | - | Identificador del docente asignado al horario lectivo. |
| 17 | `fecha_inicio` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 18 | `fecha_fin` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 19 | `cat_tipo_id` | `int` | NULL | - | Normal, compartido |
| 20 | `cat_tipo_hora_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | teorico, practico |
| 21 | `grupo` | `varchar(20)` | NULL | - | Código de cross-listing para aulas compartidas entre carreras (ej. EEGG_CCM1D01). |

---

### `Carga_Academica.Carga_Academica_Sede_Curso_Horario_Detalle_Compartido_Bk`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 891 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_curso_horario_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 3 | `duracion_horas` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `activo` | `bit` | **NOT NULL** | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 8 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 9 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 10 | `num_semana` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `hora_inicio` | `time` | **NOT NULL** | - | Hora de inicio de la sesión lectiva semanal. |
| 12 | `hora_fin` | `time` | **NOT NULL** | - | Hora de finalización de la sesión lectiva semanal. |
| 13 | `aula_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 14 | `docente_id` | `int` | NULL | - | Identificador del docente asignado al horario lectivo. |
| 15 | `fecha_inicio` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 16 | `fecha_fin` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 17 | `cat_tipo_id` | `int` | NULL | - | FK a Catalogo (Modo de dictado: Normal 2077 o Compartido 2078). |
| 18 | `cat_tipo_hora_id` | `int` | **NOT NULL** | - | FK a Catalogo (Tipo de sesión horaria: Teoría 2217 o Práctica 2218). |

---

### `Carga_Academica.Carga_Academica_Sede_Inscripcion`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 386 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_sede_id` ➔ `Carga_Academica.Carga_Academica_Sede(id)` *(FK__Carga_Aca__carga__5F3414E9)*
  - `cat_inscripcion_id` ➔ `General.Catalogo_Inscripcion(id)` *(FK__Carga_Aca__inscr__77CAB889)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede` | Clave foránea relacional hacia entidad maestra. |
| 3 | `cat_inscripcion_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo_Inscripcion` | Regular, extemporanea |
| 4 | `fecha_inicio` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `fecha_fin` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 12 | `num_credito_min` | `int` | **NOT NULL** | - | Número de creditos min |
| 13 | `num_credito_max` | `int` | **NOT NULL** | - | Número de creditos max |
| 14 | `num_credito_riesgo_academico` | `int` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Carga_Academica.Carga_Academica_Sede_Seccion`

- **Esquema:** `Carga_Academica`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 1173 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 3 | `ciclo_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 4 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre descriptivo o denominación oficial. |
| 5 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 6 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 10 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 11 | `aforo` | `int` | NULL | - | Atributo de gestión académica. |
| 12 | `turno` | `char(1)` | NULL | - | Turno de dictado de la sección ('D': Diurno, 'N': Nocturno). |

---

## 5. Esquema `Matricula` (16 Tablas)

Registra la inscripción real y efectiva de los alumnos en cada periodo académico y en cada sección específica de curso-horario.

### `Matricula.Configuracion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 10 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `clave` | `varchar(80)` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `valor` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 4 | `descripcion` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 8 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 9 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Declaracion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 1 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `codigo` | `varchar(50)` | **NOT NULL** | - | Código identificador oficial de la entidad. |
| 3 | `titulo` | `nvarchar(200)` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `cuerpo` | `nvarchar(max)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `etiqueta_check` | `nvarchar(1000)` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `version_texto` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `solo_convalidantes` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `por_periodo` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `activo` | `bit` | **NOT NULL** | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |
| 10 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 12 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 13 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 14 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Declaracion_Aceptacion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 1056 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `declaracion_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 3 | `version_aceptada` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `codigo_alumno` | `varchar(20)` | **NOT NULL** | - | Código institucional del estudiante universitario. |
| 5 | `alumno_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 6 | `periodo` | `varchar(30)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `id_inscripcion` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 8 | `aceptado_en` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `ip` | `varchar(45)` | NULL | - | Atributo de gestión académica. |
| 10 | `user_agent` | `varchar(500)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Matricula_Alumno`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 2942 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK__Matricula__alumn__0A1E72EE)*
  - `carga_academica_sede_inscripcion_id` ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion(id)` *(FK__Matricula__carga__3CA9F2BB)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Matricula__plan___1EE485AA)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_inscripcion_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 4 | `param_estado_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `num_creditos_disponibles` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `num_creditos_pendientes` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `num_creditos_registrados` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 10 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 11 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 12 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 13 | `codalumno` | `varchar(250)` | **NOT NULL** | - | Código institucional del estudiante universitario. |
| 14 | `nomalumno` | `varchar(250)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 15 | `dnialumno` | `varchar(12)` | NULL | - | Documento Nacional de Identidad oficial del alumno/docente. |
| 16 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Clave foránea relacional hacia entidad maestra. |
| 17 | `num_creditos_minimos` | `int` | NULL | - | Atributo de gestión académica. |
| 18 | `creditos_extras` | `int` | NULL | - | Atributo de gestión académica. |
| 19 | `carga_academica_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 20 | `carrera_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |

---

### `Matricula.Matricula_Alumno_Curso`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 95656 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_sede_curso_horario_id` ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario(id)` *(FK__Matricula__carga__77FFC2B3)*
  - `matricula_alumno_id` ➔ `Matricula.Matricula_Alumno(id)` *(FK__Matricula__matri__75235608)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `matricula_alumno_id` | `int` | **NOT NULL** | FK ➔ `Matricula.Matricula_Alumno` | Clave foránea relacional hacia entidad maestra. |
| 3 | `carga_academica_sede_curso_horario_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario` | Clave foránea relacional hacia entidad maestra. |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 7 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `utilizado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `nota_final` | `decimal(9,2)` | **NOT NULL** | - | Atributo de gestión académica. |
| 13 | `curso_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 14 | `nota_parcial` | `decimal(9,2)` | NULL | - | Atributo de gestión académica. |
| 15 | `resolucion` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 16 | `estado` | `char(1)` | **NOT NULL** | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |

---

### `Matricula.Matricula_Alumno_Curso_bk`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 567 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `matricula_alumno_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 3 | `carga_academica_sede_curso_horario_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `created_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 7 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 9 | `utilizado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 10 | `nota_final` | `decimal(9,2)` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `curso_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 12 | `nota_parcial` | `decimal(9,2)` | NULL | - | Atributo de gestión académica. |
| 13 | `resolucion` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 14 | `estado` | `char(1)` | **NOT NULL** | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |

---

### `Matricula.Matricula_Alumno_Rectificacion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 640 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK__Matricula__alumn__3CFEF876)*
  - `carga_academica_sede_inscripcion_id` ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion(id)` *(FK__Matricula__carga__3EE740E8)*
  - `matricula_alumno_id` ➔ `Matricula.Matricula_Alumno(id)` *(FK__Matricula__matri__45943E77)*
  - `plan_id` ➔ `Academico.Plan(id)` *(FK__Matricula__plan___3DF31CAF)*
  - `solicitud_id` ➔ `Matricula.Matricula_Solicitud(id)` *(FK__Matricula__solic__44A01A3E)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `carga_academica_sede_inscripcion_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 4 | `param_estado_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `num_creditos_disponibles` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `num_creditos_pendientes` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `num_creditos_registrados` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 10 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 11 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 12 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 13 | `codalumno` | `varchar(250)` | **NOT NULL** | - | Código institucional del estudiante universitario. |
| 14 | `nomalumno` | `varchar(250)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 15 | `dnialumno` | `varchar(12)` | NULL | - | Documento Nacional de Identidad oficial del alumno/docente. |
| 16 | `plan_id` | `int` | **NOT NULL** | FK ➔ `Academico.Plan` | Clave foránea relacional hacia entidad maestra. |
| 17 | `solicitud_id` | `int` | **NOT NULL** | FK ➔ `Matricula.Matricula_Solicitud` | Clave foránea relacional hacia entidad maestra. |
| 18 | `matricula_alumno_id` | `int` | **NOT NULL** | FK ➔ `Matricula.Matricula_Alumno` | Clave foránea relacional hacia entidad maestra. |
| 19 | `num_creditos_minimos` | `int` | NULL | - | Atributo de gestión académica. |
| 20 | `creditos_extras` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Matricula_Alumno_Rectificacion_Curso`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 18870 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*
- **Claves Foráneas (FK Salientes):**
  - `carga_academica_sede_curso_horario_id` ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario(id)` *(FK__Matricula__carga__42B7D1CC)*
  - `matricula_alumno_rectificacion_id` ➔ `Matricula.Matricula_Alumno_Rectificacion(id)` *(FK__Matricula__matri__41C3AD93)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `matricula_alumno_rectificacion_id` | `int` | **NOT NULL** | FK ➔ `Matricula.Matricula_Alumno_Rectificacion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `carga_academica_sede_curso_horario_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede_Curso_Horario` | Clave foránea relacional hacia entidad maestra. |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 7 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `utilizado` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `curso_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |

---

### `Matricula.Matricula_Reserva`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 50 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK_Reserva_Alumno)*
  - `carga_academica_sede_id` ➔ `Carga_Academica.Carga_Academica_Sede(id)` *(FK_Reserva_CargaAcademicaSede)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 3 | `carga_academica_sede_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede` | Clave foránea relacional hacia entidad maestra. |
| 4 | `cat_condicion_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `motivo` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 6 | `fecha_reserva` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `created_by` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 9 | `created_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 10 | `modified_by` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 11 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Matricula_Retiro`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 33 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK_Retiro_Alumno)*
  - `carga_academica_sede_id` ➔ `Carga_Academica.Carga_Academica_Sede(id)` *(FK_Retiro_CargaAcademicaSede)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 3 | `carga_academica_sede_id` | `int` | **NOT NULL** | FK ➔ `Carga_Academica.Carga_Academica_Sede` | Clave foránea relacional hacia entidad maestra. |
| 4 | `cat_condicion_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `motivo` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 6 | `fecha_retiro` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Atributo de gestión académica. |
| 8 | `created_by` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 9 | `created_at` | `datetime` | NULL | - | Atributo de gestión académica. |
| 10 | `modified_by` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 11 | `modified_at` | `datetime` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Matricula_Solicitud`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 653 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `alumno_id` ➔ `Academico.Alumno(id)` *(FK__Matricula__alumn__07970BFE)*
  - `carga_academica_sede_inscripcion_id` ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion(id)` *(FK__Matricula__carga__097F5470)*
  - `cat_ins_concepto_id` ➔ `General.Catalogo_Inscripcion(id)` *(FK__Matricula__conce__05AEC38C)*
  - `concepto_pago_id` ➔ `Ctas_Ctes.Concepto_Pago(id)` *(FK__Matricula__conce__3DBE1285)*
  - `param_estado_solicitud_id` ➔ `General.Parametro(id)` *(FK__Matricula__param__06A2E7C5)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `cat_ins_concepto_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo_Inscripcion` | Clave foránea relacional hacia entidad maestra. |
| 3 | `param_estado_solicitud_id` | `int` | **NOT NULL** | FK ➔ `General.Parametro` | Clave foránea relacional hacia entidad maestra. |
| 4 | `alumno_id` | `int` | **NOT NULL** | FK ➔ `Academico.Alumno` | Clave foránea relacional hacia entidad maestra. |
| 5 | `ciclo_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 6 | `carga_academica_sede_inscripcion_id` | `int` | NULL | FK ➔ `Carga_Academica.Carga_Academica_Sede_Inscripcion` | Clave foránea relacional hacia entidad maestra. |
| 7 | `pago_electronico_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 8 | `solicitud` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `observacion` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 10 | `monto_solicitud` | `decimal(9,2)` | NULL | - | Atributo de gestión académica. |
| 11 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 12 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 13 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 14 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 15 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 16 | `credito_extra` | `int` | NULL | - | Atributo de gestión académica. |
| 17 | `concepto_pago_id` | `int` | **NOT NULL** | FK ➔ `Ctas_Ctes.Concepto_Pago` | Clave foránea relacional hacia entidad maestra. |
| 18 | `url_voucher` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 19 | `carrera_id_____` | `int` | NULL | - | Atributo de gestión académica. |
| 20 | `facultad_id_____` | `int` | NULL | - | Atributo de gestión académica. |
| 21 | `facultad_____` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 22 | `carrera_____` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 23 | `sede_____` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 24 | `codigo_concepto_UAP_____` | `varchar(255)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Reinicio_Matricula_Log`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 1 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `fecha` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `codigo_alumno` | `varchar(20)` | **NOT NULL** | - | Código institucional del estudiante universitario. |
| 4 | `matricula_alumno_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `periodo` | `varchar(30)` | NULL | - | Atributo de gestión académica. |
| 6 | `estado_anterior` | `int` | NULL | - | Atributo de gestión académica. |
| 7 | `estado_nuevo` | `int` | NULL | - | Atributo de gestión académica. |
| 8 | `motivo` | `nvarchar(500)` | NULL | - | Atributo de gestión académica. |
| 9 | `usuario` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Requisitos_Solicitud`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 10 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdRequisito` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 2 | `descripcion` | `varchar(600)` | NULL | - | Atributo de gestión académica. |
| 3 | `IdConcepto` | `int` | NULL | - | Atributo de gestión académica. |
| 4 | `observacion` | `varchar(500)` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.Solicitud_Exoneracion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 463 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `solicitud_id` | `int` | **NOT NULL** | - | Clave foránea relacional hacia entidad maestra. |
| 3 | `codigo_alumno` | `varchar(50)` | NULL | - | Código institucional del estudiante universitario. |
| 4 | `cat_ins_concepto_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 5 | `motivo` | `varchar(60)` | NULL | - | Atributo de gestión académica. |
| 6 | `detalle` | `varchar(400)` | NULL | - | Atributo de gestión académica. |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |

---

### `Matricula.tablaReincorporacion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 98 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `CODFACULTAD` | `char(9)` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `CODESCUELA` | `char(9)` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `CRRCODI` | `char(9)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `VIGENCIAPLAN` | `tinyint` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `CREDMINAPROBADOS` | `int` | NULL | - | Atributo de gestión académica. |
| 7 | `CREDMAXAPROBADOS` | `int` | NULL | - | Atributo de gestión académica. |
| 8 | `REINCORPORAR` | `tinyint` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `CAMBIODEPLAN` | `tinyint` | **NOT NULL** | - | Atributo de gestión académica. |
| 10 | `estadoAuditoria` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 11 | `observacion` | `text` | NULL | - | Atributo de gestión académica. |
| 12 | `valida4x4` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Matricula.tablaReincorporacionExoneracion`

- **Esquema:** `Matricula`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 7 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdReincorporacionExoneracion` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 2 | `FechaSolicitud` | `date` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `ALUCODI` | `varchar(10)` | NULL | - | Atributo de gestión académica. |
| 4 | `PerApePaterno` | `varchar(80)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `PerApeMaterno` | `varchar(80)` | NULL | - | Atributo de gestión académica. |
| 6 | `PerNombres` | `varchar(100)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `CICCODI` | `varchar(10)` | NULL | - | Atributo de gestión académica. |
| 8 | `NLUCODI` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 9 | `NLUTIPO` | `varchar(10)` | NULL | - | Atributo de gestión académica. |
| 10 | `FACCODI` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 11 | `FACCODI_NOMBRE` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 12 | `CARCODI` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 13 | `CARCODI_NOMBRE` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 14 | `SEDE` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 15 | `alumail` | `varchar(200)` | NULL | - | Atributo de gestión académica. |
| 16 | `EstadoAuditoria` | `char(1)` | **NOT NULL** | - | Atributo de gestión académica. |
| 17 | `UsuRegistra` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 18 | `FechaRegistra` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 19 | `UsuActualiza` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 20 | `FechaActualiza` | `datetime` | NULL | - | Atributo de gestión académica. |
| 21 | `UsuElimina` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 22 | `FechaElimina` | `datetime` | NULL | - | Atributo de gestión académica. |
| 23 | `ArchivoSustento` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 24 | `Observacion` | `varchar(500)` | NULL | - | Atributo de gestión académica. |

---

## 6. Esquema `General` (Tablas Maestras del Negocio)

Alberga las entidades organizacionales macro y los catálogos transversales que gobiernan toda la universidad.

### `General.Periodo`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 35 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `periodo_tipo_id` ➔ `General.Periodo_Tipo(id)` *(FK__Periodo__periodo__28D80438)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre de Periodo |
| 3 | `fecha_inicio` | `date` | **NOT NULL** | - | Fecha de Inicio |
| 4 | `fecha_fin` | `date` | **NOT NULL** | - | Fecha de Fin |
| 5 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 6 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 10 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 11 | `periodo_tipo_id` | `int` | **NOT NULL** | FK ➔ `General.Periodo_Tipo` | Id PeriodoTipo |
| 12 | `anio_semestre` | `varchar(6)` | NULL | - | Atributo de gestión académica. |
| 13 | `id_hist` | `varchar(10)` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 14 | `sufijo` | `char(1)` | NULL | - | Atributo de gestión académica. |

---

### `General.Periodo_Tipo`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 7 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | id tabla |
| 2 | `descripcion` | `varchar(255)` | **NOT NULL** | - | descripcion |
| 3 | `estado_auditoria` | `bit` | **NOT NULL** | - | campo de auditoría |
| 4 | `created_by` | `varchar(50)` | **NOT NULL** | - | campo de auditoría |
| 5 | `created_at` | `datetime` | NULL | - | campo de auditoría |
| 6 | `modified_by` | `varchar(50)` | NULL | - | campo de auditoría |
| 7 | `modified_at` | `datetime` | NULL | - | campo de auditoría |
| 8 | `abreviatura` | `varchar(255)` | **NOT NULL** | - | Abreviatura |

---

### `General.Sede`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 34 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `cat_tipo_sede_id` ➔ `General.Catalogo(id)` *(FK__Sede__cat_tipo_s__3EC74557)*
  - `ubigeo_id` ➔ `General.Ubigeo(id)` *(FK__Sede__id_ubigeo__4A8310C6)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `cod_sede` | `varchar(25)` | **NOT NULL** | - | Codigo de Sede |
| 3 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre de Sede |
| 4 | `ubigeo_id` | `int` | **NOT NULL** | FK ➔ `General.Ubigeo` | Id Ubigeo |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 12 | `telefono ` | `varchar(15)` | NULL | - | Telefono de la Sede |
| 13 | `direccion` | `varchar(255)` | NULL | - | Dirección de la Sede |
| 14 | `latitud` | `varchar(255)` | NULL | - | Datos geolocalización |
| 15 | `longitud` | `varchar(255)` | NULL | - | Datos geolocalización |
| 16 | `correo` | `varchar(255)` | NULL | - | correo de la sede |
| 17 | `cat_tipo_sede_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Id de Tabla Catalogo |
| 18 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |

---

### `General.Facultad`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 7 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `cod_facultad` | `varchar(25)` | **NOT NULL** | - | Codigo de Facultad |
| 3 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre de la Facultad |
| 4 | `abreviatura` | `varchar(50)` | **NOT NULL** | - | Abreviatura de la Facultad |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 12 | `activo` | `bit` | NULL | - | si se encuentra activo o no |

---

### `General.Carrera`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 53 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `cat_grado_estudio_id` ➔ `General.Catalogo(id)` *(FK__Carrera__id_cat___5224328E)*
  - `facultad_id` ➔ `General.Facultad(id)` *(FK__Carrera__id_facu__4D5F7D71)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `cod_carrera` | `varchar(25)` | **NOT NULL** | - | Codigo de Carrera |
| 3 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre de la Carrera |
| 4 | `facultad_id` | `int` | **NOT NULL** | FK ➔ `General.Facultad` | Id de Tabla Facultad |
| 6 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 9 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 12 | `cat_grado_estudio_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Id de Tabla Catalogo |
| 13 | `cat_modalidad_id___` | `int` | NULL | - | Id de Tabla Catalogo |
| 14 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 15 | `activo` | `bit` | NULL | - | si se encuentra activo o no |
| 17 | `num_ciclo` | `int` | **NOT NULL** | - | Número de ciclos |

---

### `General.SedeCarrera`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 176 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `carrera_id` ➔ `General.Carrera(id)` *(FK__SedeCarre__id_ca__45BE5BA9)*
  - `sede_id` ➔ `General.Sede(id)` *(FK__SedeCarre__id_se__489AC854)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Id Tabla |
| 2 | `sede_id` | `int` | **NOT NULL** | FK ➔ `General.Sede` | Id de Tabla Sede |
| 3 | `carrera_id` | `int` | **NOT NULL** | FK ➔ `General.Carrera` | Id de Tabla Carrera |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 5 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 8 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `cat_modalidad_id` | `int` | **NOT NULL** | - | Id de Tabla Catalogo |
| 12 | `meta` | `int` | NULL | - | Atributo de gestión académica. |
| 13 | `cod_sui` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `General.Catalogo_Tipo`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 25 filas
- **Clave Primaria (PK):** `id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | id tabla |
| 2 | `descripcion` | `varchar(255)` | **NOT NULL** | - | descripcion |
| 3 | `estado_auditoria` | `bit` | **NOT NULL** | - | campo de auditoría |
| 4 | `created_by` | `varchar(50)` | **NOT NULL** | - | campo de auditoría |
| 5 | `created_at` | `datetime` | NULL | - | campo de auditoría |
| 6 | `modified_by` | `varchar(50)` | NULL | - | campo de auditoría |
| 7 | `modified_at` | `datetime` | NULL | - | campo de auditoría |
| 10 | `abreviatura` | `varchar(255)` | **NOT NULL** | - | Abreviatura |

---

### `General.Catalogo`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 289 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `catalogo_tipo_id` ➔ `General.Catalogo_Tipo(id)` *(FK__Catalogo__id_cat__4F47C5E3)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | id tabla |
| 2 | `catalogo_tipo_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo_Tipo` | id catalogotipo |
| 3 | `descripcion` | `varchar(255)` | **NOT NULL** | - | descripcion |
| 4 | `estado_auditoria` | `bit` | **NOT NULL** | - | campo de auditoría |
| 5 | `created_by` | `varchar(50)` | **NOT NULL** | - | campo de auditoría |
| 6 | `created_at` | `datetime` | NULL | - | campo de auditoría |
| 7 | `modified_by` | `varchar(50)` | NULL | - | campo de auditoría |
| 8 | `modified_at` | `datetime` | NULL | - | campo de auditoría |
| 12 | `valor_orden` | `int` | NULL | - | valor para ordenar. Ejem. ciclos |
| 13 | `abreviatura` | `varchar(255)` | NULL | - | abreviatura del campo |

---

### `General.Persona`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 9536 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `cat_tipo_documento_id` ➔ `General.Catalogo(id)` *(FK__Persona__cat_tip__168449D3)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre descriptivo o denominación oficial. |
| 3 | `apellido_paterno` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 4 | `apellido_materno` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 5 | `cat_tipo_documento_id` | `int` | **NOT NULL** | FK ➔ `General.Catalogo` | Clave foránea relacional hacia entidad maestra. |
| 6 | `nro_documento` | `varchar(255)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `sexo` | `tinyint` | NULL | - | Atributo de gestión académica. |
| 8 | `direccion` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 9 | `email` | `varchar(255)` | NULL | - | Dirección de correo electrónico institucional o de contacto. |
| 10 | `fecha_nacimiento` | `date` | NULL | - | Atributo de gestión académica. |
| 11 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 12 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 13 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 14 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 15 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 16 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 17 | `celular` | `varchar(14)` | NULL | - | Atributo de gestión académica. |
| 18 | `telefono` | `varchar(14)` | NULL | - | Atributo de gestión académica. |
| 19 | `ubigeo_id` | `int` | NULL | - | Clave foránea relacional hacia entidad maestra. |
| 20 | `discapacidad` | `bit` | NULL | - | Atributo de gestión académica. |
| 21 | `carnet_conadis` | `char(10)` | NULL | - | Atributo de gestión académica. |
| 22 | `estadosap` | `char(1)` | NULL | - | Atributo de gestión académica. |
| 23 | `celular2` | `varchar(14)` | NULL | - | Atributo de gestión académica. |

---

### `General.Aula`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 779 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `sede_carrera_id` ➔ `General.SedeCarrera(id)` *(FK__Aula__carrera_id__27E3DFFF)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `nombre` | `varchar(255)` | **NOT NULL** | - | Nombre descriptivo o denominación oficial. |
| 3 | `cat_tipo_id` | `int` | **NOT NULL** | - | FK a Catalogo (Modo de dictado: Normal 2077 o Compartido 2078). |
| 4 | `aforo` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `sede_carrera_id` | `int` | **NOT NULL** | FK ➔ `General.SedeCarrera` | Clave foránea relacional hacia entidad maestra. |
| 6 | `activo` | `bit` | **NOT NULL** | - | si se encuentra activo o no |
| 7 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 9 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 10 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 11 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 12 | `num_piso` | `int` | NULL | - | Atributo de gestión académica. |
| 13 | `cat_modalidad_id` | `int` | **NOT NULL** | - | FK a Catalogo (Modalidad: Presencial, Semi Presencial, A Distancia). |

---

### `General.Parametro`

- **Esquema:** `General`
- **Base de Datos:** `BDACADEMICO6`
- **Registros Actuales:** 66 filas
- **Clave Primaria (PK):** `id`
- **Claves Foráneas (FK Salientes):**
  - `parametro_tipo_id` ➔ `General.Parametro_Tipo(id)` *(FK__Parametro__param__4BB72C21)*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `id` | `int` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `parametro` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 3 | `abreviatura` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 4 | `valor` | `varchar(255)` | NULL | - | Atributo de gestión académica. |
| 5 | `estado_auditoria` | `bit` | **NOT NULL** | - | Campo de Auditoria |
| 6 | `created_at` | `datetime` | **NOT NULL** | - | Campo de Auditoria |
| 7 | `created_by` | `varchar(50)` | **NOT NULL** | - | Campo de Auditoria |
| 8 | `modified_at` | `datetime` | NULL | - | Campo de Auditoria |
| 9 | `modified_by` | `varchar(50)` | NULL | - | Campo de Auditoria |
| 10 | `parametro_tipo_id` | `int` | **NOT NULL** | FK ➔ `General.Parametro_Tipo` | Clave foránea relacional hacia entidad maestra. |

---

## 7. Base de Datos `BDAUTENTICACION5` (Identidad y Personal)

Base de datos complementaria indispensable para la normalización de la identidad del cuerpo docente y credenciales institucionales.

### `Auth.Utb_ConfiguracionMensaje`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 27 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdMensaje` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(20)` | NULL | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(2000)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Descripcion` | `varchar(2000)` | NULL | - | Atributo de gestión académica. |
| 5 | `OperadorBusqueda` | `varchar(10)` | NULL | - | Atributo de gestión académica. |
| 6 | `CadenaBusqueda` | `varchar(2000)` | NULL | - | Atributo de gestión académica. |
| 7 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |
| 8 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 9 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 10 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 11 | `TotalUso` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_Grupo`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 0 filas
- **Clave Primaria (PK):** `IdGrupo`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdGrupo` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(100)` | NULL | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(250)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Alias` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 5 | `Descripcion` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 6 | `FechaHora` | `datetime` | NULL | - | Atributo de gestión académica. |
| 7 | `CodigoMultimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 8 | `Multimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 9 | `Nivel` | `tinyint` | NULL | - | Atributo de gestión académica. |
| 10 | `IdPrincipal` | `bigint` | NULL | - | Atributo de gestión académica. |
| 11 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |
| 12 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 13 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 14 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_GrupoUsuario`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 0 filas
- **Clave Primaria (PK):** `IdGrupoUsuario`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdGrupoUsuario` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `IdGrupo` | `bigint` | NULL | - | Atributo de gestión académica. |
| 3 | `IdUsuario` | `bigint` | NULL | - | Atributo de gestión académica. |
| 4 | `Descripcion` | `varchar(4000)` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_Log`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 26 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdMensaje` | `bigint` | **NOT NULL** | - | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(20)` | NULL | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(2000)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Descripcion` | `varchar(2000)` | NULL | - | Atributo de gestión académica. |
| 5 | `Tipo` | `int` | NULL | - | Atributo de gestión académica. |
| 6 | `Numero` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_Rol`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 8 filas
- **Clave Primaria (PK):** `IdRol`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdRol` | `int` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(50)` | NULL | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(100)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Alias` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 5 | `Descripcion` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 6 | `FechaHora` | `datetime` | NULL | - | Atributo de gestión académica. |
| 7 | `CodigoMultimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 8 | `Multimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 9 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |
| 10 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 11 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 12 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_Usuario`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 4116 filas
- **Clave Primaria (PK):** `IdUsuario`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuario` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(50)` | NULL | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(100)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Alias` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 5 | `Descripcion` | `varchar(250)` | NULL | - | Atributo de gestión académica. |
| 6 | `Inicial` | `char(2)` | NULL | - | Atributo de gestión académica. |
| 7 | `Cuenta` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 8 | `EstaVerificado` | `bit` | NULL | - | Atributo de gestión académica. |
| 9 | `Clave` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 10 | `FechaHora` | `datetime` | NULL | - | Atributo de gestión académica. |
| 11 | `Token` | `varchar(256)` | NULL | - | Atributo de gestión académica. |
| 12 | `CodigoMultimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 13 | `Multimedia` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 14 | `RestablecerClave` | `bit` | NULL | - | Atributo de gestión académica. |
| 15 | `ConfirmarRegistro` | `bit` | NULL | - | Atributo de gestión académica. |
| 16 | `UltimaSesion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 17 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 18 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 19 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 20 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |
| 21 | `Clave2` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 22 | `IdTipo` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_Usuario_Log`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 476051 filas
- **Clave Primaria (PK):** `FechaHora`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuario` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(50)` | **NOT NULL** | - | Código identificador oficial de la entidad. |
| 3 | `Nombre` | `varchar(250)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 4 | `Alias` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 5 | `Descripcion` | `varchar(500)` | NULL | - | Atributo de gestión académica. |
| 6 | `Inicial` | `varchar(2)` | NULL | - | Atributo de gestión académica. |
| 7 | `FechaHora` | `datetime` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 8 | `Cuenta` | `varchar(100)` | **NOT NULL** | - | Atributo de gestión académica. |
| 9 | `EstaVerificado` | `bit` | NULL | - | Atributo de gestión académica. |
| 10 | `Clave` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 11 | `Clave2` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 12 | `ForzarCambioClave` | `tinyint` | NULL | - | Atributo de gestión académica. |
| 13 | `Rol` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 14 | `AsignarLicencia` | `bit` | NULL | - | Atributo de gestión académica. |
| 15 | `Licencias` | `varchar(1000)` | NULL | - | Atributo de gestión académica. |
| 16 | `Ubicacion` | `varchar(5)` | NULL | - | Atributo de gestión académica. |
| 17 | `AutorizacionUso` | `tinyint` | NULL | - | Atributo de gestión académica. |
| 18 | `EmailEnviado` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 19 | `TipoObservacion` | `smallint` | NULL | - | Atributo de gestión académica. |
| 20 | `CodigoObservacion` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 21 | `Observacion` | `varchar(4000)` | NULL | - | Atributo de gestión académica. |
| 22 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_UsuarioGrupo`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 0 filas
- **Clave Primaria (PK):** `IdUsuarioGrupo`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuarioGrupo` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `IdUsuario` | `bigint` | NULL | - | Atributo de gestión académica. |
| 3 | `IdGrupo` | `bigint` | NULL | - | Atributo de gestión académica. |
| 4 | `EsPropietario` | `bit` | NULL | - | Atributo de gestión académica. |
| 5 | `EsAdministrador` | `bit` | NULL | - | Atributo de gestión académica. |
| 6 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_UsuarioRegistro`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 909782 filas
- **Clave Primaria (PK):** `IdUsuarioRegistro`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuarioRegistro` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `Codigo` | `varchar(100)` | **NOT NULL** | - | Código identificador oficial de la entidad. |
| 3 | `IdUsuario` | `int` | NULL | - | Atributo de gestión académica. |
| 4 | `FechaHoraOriginal` | `datetime` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `FechaHora` | `datetime` | NULL | - | Atributo de gestión académica. |
| 6 | `Datos` | `varchar(8000)` | NULL | - | Atributo de gestión académica. |
| 7 | `IdPrincipal` | `bigint` | NULL | - | Atributo de gestión académica. |
| 8 | `IdRegistro` | `int` | NULL | - | Atributo de gestión académica. |
| 9 | `IdInstanciaRegistro` | `bigint` | NULL | - | Atributo de gestión académica. |
| 10 | `IdEstado` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 11 | `Response` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |

---

### `Auth.Utb_UsuarioRol`

- **Esquema:** `Auth`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 0 filas
- **Clave Primaria (PK):** `IdUsuarioRol`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuarioRol` | `bigint` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 2 | `IdUsuario` | `bigint` | NULL | - | Atributo de gestión académica. |
| 3 | `IdRol` | `bigint` | NULL | - | Atributo de gestión académica. |
| 4 | `IdEstado` | `int` | NULL | - | Atributo de gestión académica. |

---

### `dbo.SyncLog`

- **Esquema:** `dbo`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 72853 filas
- **Clave Primaria (PK):** `Id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `Id` | `bigint` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `FechaBd` | `datetime2` | **NOT NULL** | - | Atributo de gestión académica. |
| 3 | `Fecha` | `datetime2` | **NOT NULL** | - | Atributo de gestión académica. |
| 4 | `Nivel` | `nvarchar(20)` | **NOT NULL** | - | Atributo de gestión académica. |
| 5 | `Mensaje` | `nvarchar(max)` | **NOT NULL** | - | Atributo de gestión académica. |
| 6 | `Detalles` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |
| 7 | `Objeto` | `nvarchar(250)` | NULL | - | Atributo de gestión académica. |

---

### `dbo.UsersSyncLog`

- **Esquema:** `dbo`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 484 filas
- **Clave Primaria (PK):** `Id`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `Id` | `bigint` | **NOT NULL** | **PK** | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `Fecha` | `datetime` | NULL | - | Atributo de gestión académica. |
| 3 | `TipoCambio` | `nvarchar(10)` | NULL | - | Atributo de gestión académica. |
| 4 | `IdExterno` | `int` | NULL | - | Atributo de gestión académica. |
| 5 | `Detalles` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |
| 6 | `Estado` | `nvarchar(20)` | NULL | - | Flag de estado lógico (1: Activo/Habilitado, 0: Inactivo). |
| 7 | `MensajeError` | `nvarchar(max)` | NULL | - | Atributo de gestión académica. |

---

### `dbo.Usuarios`

- **Esquema:** `dbo`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 12 filas
- **Clave Primaria (PK):** *Sin PK formal declarada*

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `IdUsuario` | `int` | **NOT NULL** | - | Atributo de gestión académica. |
| 2 | `Nombre` | `varchar(100)` | NULL | - | Nombre descriptivo o denominación oficial. |
| 3 | `FechaCreacion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 4 | `FechaModificacion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 5 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 6 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 7 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 8 | `FechaCreacionAuditoria` | `datetime2` | NULL | - | Atributo de gestión académica. |
| 9 | `UsuarioCreacionAuditoria` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 10 | `FechaModificacionAuditoria` | `datetime2` | NULL | - | Atributo de gestión académica. |
| 11 | `UsuarioModificacionAuditoria` | `nvarchar(100)` | NULL | - | Atributo de gestión académica. |
| 12 | `TotalModificacionAuditoria` | `smallint` | NULL | - | Atributo de gestión académica. |
| 13 | `EstadoAuditoria` | `bit` | NULL | - | Atributo de gestión académica. |

---

### `Personal.Utb_Persona`

- **Esquema:** `Personal`
- **Base de Datos:** `BDAUTENTICACION5`
- **Registros Actuales:** 479 filas
- **Clave Primaria (PK):** `IdPersona`

| # | Columna | Tipo de Dato | Nulo | Llave | Descripción / Negocio |
|---|---------|--------------|------|-------|-----------------------|
| 1 | `Id` | `bigint` | **NOT NULL** | - | Identificador único primario (PK) autoincremental de la fila. |
| 2 | `IdPersona` | `varchar(20)` | **NOT NULL** | **PK** | Atributo de gestión académica. |
| 3 | `Codigo` | `varchar(50)` | NULL | - | Código identificador oficial de la entidad. |
| 4 | `ApellidoPaterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 5 | `ApellidoMaterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 6 | `Nombres` | `varchar(50)` | **NOT NULL** | - | Atributo de gestión académica. |
| 7 | `TipoDocumento` | `varchar(3)` | NULL | - | Atributo de gestión académica. |
| 8 | `Documento` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 9 | `FechaHora` | `datetime` | NULL | - | Atributo de gestión académica. |
| 10 | `FechaNacimiento` | `date` | NULL | - | Atributo de gestión académica. |
| 11 | `Genero` | `varchar(1)` | NULL | - | Atributo de gestión académica. |
| 12 | `CorreoPersonal` | `varchar(50)` | NULL | - | Dirección de correo electrónico institucional o de contacto. |
| 13 | `CorreoCorporativo` | `varchar(50)` | NULL | - | Dirección de correo electrónico institucional o de contacto. |
| 14 | `Celular` | `varchar(20)` | NULL | - | Atributo de gestión académica. |
| 15 | `FechaIngreso` | `date` | NULL | - | Atributo de gestión académica. |
| 16 | `FechaCese` | `date` | NULL | - | Atributo de gestión académica. |
| 17 | `EstaHabilitado` | `bit` | NULL | - | Atributo de gestión académica. |
| 18 | `ModalidadTrabajo` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 19 | `Puesto` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 20 | `UltimaValidacionCese` | `datetime` | NULL | - | Atributo de gestión académica. |
| 21 | `RealizarValidacionCese` | `int` | NULL | - | Atributo de gestión académica. |
| 22 | `HorarioEntrada` | `varchar(8)` | NULL | - | Atributo de gestión académica. |
| 23 | `HorarioSalida` | `varchar(8)` | NULL | - | Atributo de gestión académica. |
| 24 | `Identificador` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 25 | `IdentificadorUnico` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 26 | `IdentificadorExterno` | `varchar(50)` | NULL | - | Atributo de gestión académica. |
| 27 | `FechaCreacion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 28 | `FechaModificacion` | `datetime` | NULL | - | Atributo de gestión académica. |
| 29 | `FechaCreacionAuditoria` | `datetime` | NULL | - | Atributo de gestión académica. |
| 30 | `UsuarioCreacionAuditoria` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 31 | `FechaModificacionAuditoria` | `datetime` | NULL | - | Atributo de gestión académica. |
| 32 | `UsuarioModificacionAuditoria` | `varchar(100)` | NULL | - | Atributo de gestión académica. |
| 33 | `TotalModificacionAuditoria` | `smallint` | NULL | - | Atributo de gestión académica. |
| 34 | `EstadoAuditoria` | `bit` | NULL | - | Atributo de gestión académica. |

---

## 8. Esquemas de Soporte Académico y Ciclo de Vida del Estudiante

### 8.1 Admisión y Postulantes (`Admision`)
Controla el proceso de atracción e incorporación estudiantil:
- `Admision.Postulantes`: Ficha del postulante, carrera deseada, modalidad de ingreso.
- `Admision.Modalidad`: Modalidades de ingreso (Ordinario, Traslado Externo, Primeros Puestos, etc.).
- `Admision.Vacantes`: Cuotas de vacantes autorizadas por carrera, sede y periodo.

### 8.2 Grados, Títulos y Titulación (`GradosTitulos` & `Titulacion`)
- `GradosTitulos.Certificado_Estudio` & `Certificado_Estudio_Curso`: Historial oficial de notas y créditos aprobados.
- `GradosTitulos.Documento_Alumno`: Registro de diplomas, grados de Bachiller y títulos profesionales.
- `Titulacion.CursoTitulacion`: Programas especiales de titulación profesional y sustentación de tesis.

---

## 9. Matriz de Integración Cross-Database y Canvas SIS

| Entidad Canvas SIS | Origen MSSQL Principal | Origen Complementario | Regla de Normalización / Lineage |
|--------------------|------------------------|-----------------------|----------------------------------|
| **Docente (users.csv)** | `Carga_Academica_Sede_Curso_Horario_Detalle.docente_id` | `BDAUTENTICACION5.Personal.Utb_Persona` | Se vincula por DNI (`Num_Doc`) garantizando el ID oficial en Canvas LMS. |
| **Estudiante (users.csv)** | `Matricula.Matricula_Alumno` | `Academico.Alumno` ➔ `General.Persona` | Se extrae `codalumno` institucional y `dnialumno` para el perfil SIS. |
| **Cursos (courses.csv)** | `Academico.Curso` | `Academico.Plan` ➔ `General.Carrera` | El curso se asocia a la subcuenta del Plan (`account_id: <cod_plan>`). |
| **Secciones (sections.csv)** | `Carga_Academica_Sede_Seccion` | `Carga_Academica_Sede_Curso_Horario` | Se identifica por `{periodo}-{cod_curso}-{seccion}`. |
| **Matrículas (enrollments.csv)** | `Matricula.Matricula_Alumno_Curso` (95,656 filas) | `Matricula.Matricula_Alumno` | Resuelto vía `matricula_alumno_id` vinculando al horario exacto. |
| **Cross-listing (xlists.csv)** | `Carga_Academica_Sede_Curso_Horario_Detalle.grupo` | Cursos que comparten aula física/virtual | Se genera contenedor maestro `GRP_<grupo>` unificando secciones. |
| **Previsión de Matrícula** | `Matricula.Matricula_Alumno_Curso` | `Academico.Curso.cat_ciclo_id` | Matriz dinámica Carrera x Ciclo (1 al 12) x Modalidad x Turno. |

