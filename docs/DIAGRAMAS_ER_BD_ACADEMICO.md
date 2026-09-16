# DIAGRAMAS ENTIDAD-RELACIÓN: ECOSISTEMA ACADÉMICO Y AUTENTICACIÓN

> **Documento Oficial de Modelado y Arquitectura de Datos**
> Diagramas conceptuales, lógicos y relacionales de **`BDACADEMICO6`** y **`BDAUTENTICACION5`**.

---

## 1. Diagrama Maestro de Arquitectura y Flujo de Datos

Visualiza la relación integral entre la estructura curricular, la programación horaria semestral, la matrícula de alumnos y la autenticación docente.

```mermaid
flowchart TD
    subgraph GEN["Ecosistema General y Estructura Organizacional"]
        F["General.Facultad<br/>(Facultades)"] --> C["General.Carrera<br/>(Carreras)"]
        S["General.Sede<br/>(Campus / Sedes)"] --> SC["General.SedeCarrera<br/>(Oferta Sede-Carrera)"]
        C --> SC
        P["General.Periodo<br/>(Periodos Lectivos: 2026-2)"]
        CAT["General.Catalogo<br/>(Modalidad, Ciclo, Turno)"]
        AULA["General.Aula<br/>(Aulas Físicas / Virtuales)"]
    end

    subgraph ACAD["Diseño Curricular (Academico)"]
        C --> PLAN["Academico.Plan<br/>(Planes de Estudio)"]
        PLAN --> CUR["Academico.Curso<br/>(Catálogo de Asignaturas)"]
        CAT -.->|"cat_ciclo_id (1-12)"| CUR
        CUR --> PRE["Academico.Curso_Prerequisito"]
        CUR --> EQUIV["Academico.Curso_Equivalencia"]
    end

    subgraph CARGA["Programación Lectiva (Carga Academica)"]
        P --> CA["Carga_Academica.Carga_Academica"]
        CA --> CAS["Carga_Academica.Carga_Academica_Sede"]
        SC --> CAS
        SEC["Carga_Academica.Carga_Academica_Sede_Seccion<br/>(Secciones: Turno D/N)"]
        CAS --> CASC["Carga_Academica.Carga_Academica_Sede_Curso"]
        CUR --> CASC
        SEC --> CASC
        CASC --> CASCH["Carga_Academica.Carga_Academica_Sede_Curso_Horario<br/>(Cupos y Estado)"]
        CASCH --> CASCHD["Carga_Academica_Sede_Curso_Horario_Detalle<br/>(Horario, Docente, Tipo Hora, Grupo)"]
        AULA --> CASCHD
        CAT -.->|"cat_tipo_hora_id (Teoría/Práctica)"| CASCHD
    end

    subgraph MAT["Inscripción y Matrícula (Matricula)"]
        PER["General.Persona<br/>(Datos Personales)"] --> ALU["Academico.Alumno<br/>(Ficha Estudiante)"]
        PLAN --> ALU
        C --> ALU
        ALU --> MA["Matricula.Matricula_Alumno<br/>(Cabecera Matrícula Periodo)"]
        P -.-> MA
        MA --> MAC["Matricula.Matricula_Alumno_Curso<br/>(95,656 Matrículas en Asignaturas)"]
        CASCH --> MAC
        MAC --> RECT["Matricula_Alumno_Rectificacion_Curso"]
    end

    subgraph AUTH["Identidad y Docencia (BDAUTENTICACION5)"]
        UTBP["Personal.Utb_Persona<br/>(DNI Docente, Correos Institucionales)"]
        USU["Auth.Utb_Usuario<br/>(Credenciales y Accesos)"]
        LOG["Auth.Utb_UsuarioRegistro<br/>(Historial de Sesiones)"]
        USU --> LOG
    end

    CASCHD -.->|"docente_id (Resolución por DNI)"| UTBP
    ALU -.->|"codalumno / DNI"| USU

    classDef primary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef secondary fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef highlight fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef accent fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#b45309;

    class CUR,PLAN,ALU primary;
    class CASC,CASCH,CASCHD,SEC secondary;
    class MA,MAC highlight;
    class UTBP,USU accent;
```

---

## 2. Diagrama ER: Malla Curricular y Estructura Académica

Detalla cómo se relacionan los planes de estudio, asignaturas, prerequisitos y facultades.

```mermaid
erDiagram
    Facultad ||--o{ Carrera : "agrupa"
    Carrera ||--o{ Plan : "diseña"
    Sede ||--o{ SedeCarrera : "alberga"
    Carrera ||--o{ SedeCarrera : "se_imparte_en"
    Plan ||--o{ Curso : "contiene"
    Curso ||--o{ Curso_Prerequisito : "exige"
    Curso ||--o{ Curso_Equivalencia : "convalida_con"
    Curso ||--o{ Curso_Evaluacion : "pondera"
    Evaluacion ||--o{ Curso_Evaluacion : "define_peso"
    Catalogo ||--o{ Curso : "ciclo_y_tipo"

    Facultad {
        int id PK
        varchar codigo
        varchar nombre
        bit activo
    }

    Carrera {
        int id PK
        varchar codigo
        varchar nombre
        int facultad_id FK
        int cat_grado_estudio_id FK
        bit activo
    }

    Plan {
        int id PK
        varchar cod_plan
        varchar nombre
        int carrera_id FK
        int anio
        bit activo
    }

    Curso {
        int id PK
        varchar cod_curso
        varchar nombre
        int plan_id FK
        int creditos
        int num_horas_sem_teoria
        int num_horas_sem_practica
        int num_horas_sem_laboratorio
        int cat_ciclo_id FK
        int cat_tipo_curso_id FK
        bit activo
    }

    Curso_Prerequisito {
        int id PK
        int curso_id FK
        int curso_padre_id FK
        bit activo
    }

    Curso_Evaluacion {
        int id PK
        int curso_id FK
        int evaluacion_id FK
        decimal peso
    }
```

---

## 3. Diagrama ER: Carga Académica, Horarios y Cross-listing

Modela las secciones de clase, la asignación de profesores, días lectivos y los grupos de aulas compartidas.

```mermaid
erDiagram
    Periodo ||--o{ Carga_Academica : "inicia"
    Carga_Academica ||--o{ Carga_Academica_Sede : "distribuye"
    SedeCarrera ||--o{ Carga_Academica_Sede : "asigna_a"
    Carga_Academica_Sede ||--o{ Carga_Academica_Sede_Curso : "programa"
    Curso ||--o{ Carga_Academica_Sede_Curso : "dicta"
    Carga_Academica_Sede_Seccion ||--o{ Carga_Academica_Sede_Curso : "asocia_seccion"
    Carga_Academica_Sede_Curso ||--o{ Carga_Academica_Sede_Curso_Horario : "define_cupo"
    Carga_Academica_Sede_Curso_Horario ||--o{ Carga_Academica_Sede_Curso_Horario_Detalle : "desglosa_sesiones"
    Aula ||--o{ Carga_Academica_Sede_Curso_Horario_Detalle : "ubica_en"
    Catalogo ||--o{ Carga_Academica_Sede_Curso_Horario_Detalle : "tipo_hora_teoria_practica"

    Carga_Academica_Sede_Seccion {
        int id PK
        varchar codigo
        varchar nombre
        varchar turno
        bit activo
    }

    Carga_Academica_Sede_Curso {
        int id PK
        int carga_academica_sede_id FK
        int curso_id FK
        int carga_academica_sede_seccion_id FK
        int cat_modalidad_id FK
        bit activo
    }

    Carga_Academica_Sede_Curso_Horario {
        int id PK
        int carga_academica_sede_curso_id FK
        int cupo
        int total_inscritos
        int param_estado_id FK
        bit activo
    }

    Carga_Academica_Sede_Curso_Horario_Detalle {
        int id PK
        int carga_academica_sede_curso_horario_id FK
        int dia
        time hora_inicio
        time hora_fin
        int docente_id
        varchar grupo
        int aula_id FK
        int cat_tipo_hora_id FK
        int cat_tipo_id FK
        bit activo
    }
```

> **Regla de Cross-listing en `Carga_Academica_Sede_Curso_Horario_Detalle`**:
> La columna `grupo` (ej. `EEGG_CCM1D01`) agrupa múltiples secciones de diferentes carreras que comparten exactamente el mismo profesor, aula y horario semanal. Esto genera en Canvas SIS el archivo `xlists.csv` y el contenedor unificado `GRP_<grupo>`.

---

## 4. Diagrama ER: Matrícula e Inscripción Estudiantil

Modela cómo un alumno matriculado se conecta con sus asignaturas del semestre.

```mermaid
erDiagram
    Persona ||--o{ Alumno : "identifica"
    Carrera ||--o{ Alumno : "cursa"
    Plan ||--o{ Alumno : "rige"
    Alumno ||--o{ Matricula_Alumno : "matricula_en_periodo"
    Periodo ||--o{ Matricula_Alumno : "periodo_activo"
    Matricula_Alumno ||--o{ Matricula_Alumno_Curso : "inscribe_cursos"
    Carga_Academica_Sede_Curso_Horario ||--o{ Matricula_Alumno_Curso : "recibe_alumno"
    Matricula_Alumno ||--o{ Matricula_Alumno_Rectificacion : "modifica"
    Matricula_Alumno_Rectificacion ||--o{ Matricula_Alumno_Rectificacion_Curso : "agrega_o_retira"

    Persona {
        int id PK
        varchar num_doc
        varchar nom_persona
        varchar ape_paterno
        varchar ape_materno
        varchar email
    }

    Alumno {
        int id PK
        varchar codalumno
        varchar dnialumno
        varchar nomalumno
        int persona_id FK
        int carrera_id FK
        int plan_id FK
        int cat_ciclo_id FK
        bit activo
    }

    Matricula_Alumno {
        int id PK
        int alumno_id FK
        int periodo_id FK
        int carrera_id FK
        int plan_id FK
        varchar codalumno
        varchar dnialumno
        varchar nomalumno
        datetime fecha_matricula
        bit activo
    }

    Matricula_Alumno_Curso {
        int id PK
        int matricula_alumno_id FK
        int carga_academica_sede_curso_horario_id FK
        int creditos
        int ciclo
        varchar estado
        bit activo
    }
```

> **Resolución Clave de Matrícula**:
> `Matricula.Matricula_Alumno_Curso.matricula_alumno_id` referencia directamente a `Matricula.Matricula_Alumno.id` (la cabecera semestral), y desde allí se accede a `alumno_id` (`Academico.Alumno`) y a `persona_id` (`General.Persona`), garantizando exactitud absoluta en los 95,656 registros.

---

## 5. Diagrama ER: Autenticación, Docentes y Seguridad (`BDAUTENTICACION5`)

Modela la infraestructura de identidad docente y seguridad de acceso.

```mermaid
erDiagram
    Utb_Usuario ||--o{ Utb_UsuarioRol : "posee"
    Utb_Rol ||--o{ Utb_UsuarioRol : "asigna"
    Utb_Usuario ||--o{ Utb_UsuarioRegistro : "registra_login"
    Utb_Usuario ||--o{ Utb_Usuario_Log : "audita_evento"
    Utb_Persona ||..o{ Utb_Usuario : "corresponde_a"

    Utb_Persona {
        int Id_Persona PK
        varchar Num_Doc UK
        varchar Nom_Persona
        varchar Ape_Paterno
        varchar Ape_Materno
        varchar Correo_Electronico_Inst
        varchar Correo_Electronico_Per
        varchar Celular
        bit Activo
    }

    Utb_Usuario {
        int Id_Usuario PK
        varchar Nom_Usuario UK
        varchar Clave
        bit Activo
        datetime Fec_Registro
    }

    Utb_Rol {
        int Id_Rol PK
        varchar Nom_Rol
        bit Activo
    }

    Utb_UsuarioRegistro {
        int Id_UsuarioRegistro PK
        int Id_Usuario FK
        varchar Ip_Cliente
        datetime Fec_Registro
    }
```

---

## 6. Mapeo de Flujo de Datos hacia Instructure Canvas LMS

```mermaid
flowchart LR
    subgraph MSSQL["Bases de Datos Origen (SQL Server)"]
        DBA["BDACADEMICO6"]
        DBU["BDAUTENTICACION5"]
    end

    subgraph ENGINE["Motor de Migración (canvas-migrate)"]
        EXT["Extractor Relacional por Lotes"]
        NORM["Normalizador de Identidad DNI"]
        DIFF["Motor Diferencial SIS"]
        XLIST["Agrupador Cross-listing (grupo)"]
    end

    subgraph SIS["Paquete Canvas SIS CSV"]
        ACC["accounts.csv"]
        TERM["terms.csv"]
        USR["users.csv"]
        CRS["courses.csv"]
        SEC["sections.csv"]
        ENR["enrollments.csv"]
        XLS["xlists.csv"]
    end

    DBA --> EXT
    DBU --> NORM
    EXT --> NORM
    NORM --> DIFF
    DIFF --> XLIST
    XLIST --> ACC & TERM & USR & CRS & SEC & ENR & XLS
```
