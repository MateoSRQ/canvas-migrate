import { getCaseHierarchyData, getSectionEnrolledStudents, type HierarchyItem } from './hierarchy-service'
import { getModalidadCode } from '#/lib/utils'

export interface CanvasAuditOptions {
  caseId: string
  selectedSectionIds: number[]
  rootAccountId?: string
  endpoint?: string
  apiKey?: string
}

export interface CanvasVariationItem {
  id: string
  entityType: 'course' | 'section' | 'teacher' | 'student'
  status: 'match' | 'missing' | 'name_diff' | 'state_diff' | 'extra'
  severity: 'success' | 'warning' | 'error' | 'info'
  courseCode: string
  courseName: string
  sectionName?: string
  name: string
  sisId: string
  exportedValue: string
  canvasValue?: string
  description: string
}

export interface CanvasAuditReport {
  success: boolean
  error?: string
  timestamp: string
  endpoint: string
  totalCourses: number
  matchedCourses: number
  missingCourses: number
  diffCourses: number
  totalSections: number
  matchedSections: number
  missingSections: number
  totalTeachers: number
  matchedTeachers: number
  missingTeachers: number
  totalStudents: number
  matchedStudents: number
  missingStudents: number
  variationsCount: number
  variations: CanvasVariationItem[]
}

function getCanvasApiConfig(options?: { endpoint?: string; apiKey?: string }) {
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

export async function auditExportAgainstCanvasApi(
  options: CanvasAuditOptions
): Promise<CanvasAuditReport> {
  const timestamp = new Date().toISOString()
  let config: { endpoint: string; token: string; baseUrl: string }

  try {
    config = getCanvasApiConfig(options)
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Credenciales de Canvas API no configuradas.',
      timestamp,
      endpoint: '',
      totalCourses: 0,
      matchedCourses: 0,
      missingCourses: 0,
      diffCourses: 0,
      totalSections: 0,
      matchedSections: 0,
      missingSections: 0,
      totalTeachers: 0,
      matchedTeachers: 0,
      missingTeachers: 0,
      totalStudents: 0,
      matchedStudents: 0,
      missingStudents: 0,
      variationsCount: 0,
      variations: [],
    }
  }

  // 1. Obtener la jerarquía del caso y filtrar por secciones seleccionadas
  const hierarchy = await getCaseHierarchyData(options.caseId)
  const selectedSet = new Set(options.selectedSectionIds)
  const selectedItems = hierarchy.items.filter((it) => selectedSet.has(it.id))

  if (selectedItems.length === 0) {
    return {
      success: true,
      timestamp,
      endpoint: config.endpoint,
      totalCourses: 0,
      matchedCourses: 0,
      missingCourses: 0,
      diffCourses: 0,
      totalSections: 0,
      matchedSections: 0,
      missingSections: 0,
      totalTeachers: 0,
      matchedTeachers: 0,
      missingTeachers: 0,
      totalStudents: 0,
      matchedStudents: 0,
      missingStudents: 0,
      variationsCount: 0,
      variations: [],
    }
  }

  // 2. Agrupar por curso (v2: Cada combinación de curso y sección es un curso individual)
  interface CourseGroup {
    courseId: number
    courseSisId: string
    courseName: string
    rawCourseId: string
    modCode: string
    sections: HierarchyItem[]
  }

  const courseGroupsMap = new Map<string, CourseGroup>()
  for (const it of selectedItems) {
    const modCode = getModalidadCode(it.modalidadId, it.modalidadNombre)
    const rawCourseId = `${modCode}-${it.cursoCodigo.trim()}-${it.seccionNombre.trim()}`
    const courseSisId = rawCourseId
    const courseName = `[${modCode} ${it.cursoCodigo.trim()} ${it.seccionNombre.trim()}] ${it.cursoNombre.trim()}`

    if (!courseGroupsMap.has(courseSisId)) {
      courseGroupsMap.set(courseSisId, {
        courseId: it.cursoId,
        courseSisId,
        courseName,
        rawCourseId,
        modCode,
        sections: [],
      })
    }
    courseGroupsMap.get(courseSisId)!.sections.push(it)
  }

  const courseGroups = Array.from(courseGroupsMap.values())
  const variations: CanvasVariationItem[] = []

  let matchedCoursesCount = 0
  let missingCoursesCount = 0
  let diffCoursesCount = 0

  let totalSectionsCount = 0
  let matchedSectionsCount = 0
  let missingSectionsCount = 0

  let totalTeachersCount = 0
  let matchedTeachersCount = 0
  let missingTeachersCount = 0

  let totalStudentsCount = 0
  let matchedStudentsCount = 0
  let missingStudentsCount = 0

  // 3. Auditar cada curso en Canvas REST API
  // Limitamos concurrencia para proteger rate limits
  const concurrency = 4
  for (let i = 0; i < courseGroups.length; i += concurrency) {
    const chunk = courseGroups.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (grp) => {
        const courseSisId = grp.courseSisId
        let canvasCourse: any = null

        // Consultar curso por SIS ID en Canvas
        try {
          const courseUrl = `${config.baseUrl}/courses/sis_course_id:${encodeURIComponent(courseSisId)}`
          const courseRes = await fetch(courseUrl, {
            headers: { Authorization: `Bearer ${config.token}` },
          })

          if (courseRes.ok) {
            canvasCourse = await courseRes.json()
          }
        } catch (err) {
          console.error(`Error consultando curso ${courseSisId} en Canvas API:`, err)
        }

        if (!canvasCourse) {
          // El curso no existe en Canvas
          missingCoursesCount++
          variations.push({
            id: `course-missing-${courseSisId}`,
            entityType: 'course',
            status: 'missing',
            severity: 'warning',
            courseCode: courseSisId,
            courseName: grp.courseName,
            name: grp.courseName,
            sisId: courseSisId,
            exportedValue: `${grp.courseName} (SIS: ${courseSisId})`,
            canvasValue: 'No existe en Canvas',
            description: 'El curso fue exportado para la migración pero aún no ha sido dado de alta en Canvas LMS (pendiente de SIS Import).',
          })

          // Registrar secciones, docentes y alumnos como pendientes
          for (const sec of grp.sections) {
            totalSectionsCount++
            missingSectionsCount++
            const sisSectionId = `${sec.seccionId}-${grp.rawCourseId}`

            variations.push({
              id: `section-missing-${sec.id}`,
              entityType: 'section',
              status: 'missing',
              severity: 'warning',
              courseCode: courseSisId,
              courseName: grp.courseName,
              sectionName: sec.seccionNombre,
              name: sec.seccionNombre,
              sisId: sisSectionId,
              exportedValue: sec.seccionNombre,
              canvasValue: 'No existe (Curso ausente)',
              description: 'La sección no se encuentra en Canvas debido a que el curso aún no existe en el sistema.',
            })

            // Docentes
            for (const doc of sec.docentes || []) {
              totalTeachersCount++
              missingTeachersCount++
              variations.push({
                id: `teacher-missing-${sec.id}-${doc.dni}`,
                entityType: 'teacher',
                status: 'missing',
                severity: 'warning',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: doc.fullName,
                sisId: doc.dni,
                exportedValue: `${doc.fullName} (DNI: ${doc.dni})`,
                canvasValue: 'Sin asignación (Curso ausente)',
                description: 'Docente no asignado en Canvas LMS.',
              })
            }

            // Alumnos
            let students = sec.estudiantes || []
            if (students.length === 0 && sec.estudiantesCount > 0) {
              try {
                students = await getSectionEnrolledStudents(options.caseId, sec.id)
              } catch {
                students = []
              }
            }

            for (const est of students) {
              totalStudentsCount++
              missingStudentsCount++
              variations.push({
                id: `student-missing-${sec.id}-${est.id}`,
                entityType: 'student',
                status: 'missing',
                severity: 'info',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: est.fullName,
                sisId: est.codigo,
                exportedValue: `${est.fullName} (Cód: ${est.codigo})`,
                canvasValue: 'Sin matrícula (Curso ausente)',
                description: 'Estudiante no matriculado en Canvas LMS.',
              })
            }
          }
          return
        }

        // El curso SÍ existe en Canvas. Comparar metadatos
        matchedCoursesCount++
        const canvasCourseName = String(canvasCourse.name || '').trim()
        const isNameEqual = canvasCourseName.toLowerCase() === grp.courseName.toLowerCase()

        if (!isNameEqual) {
          diffCoursesCount++
          variations.push({
            id: `course-name-diff-${courseSisId}`,
            entityType: 'course',
            status: 'name_diff',
            severity: 'warning',
            courseCode: courseSisId,
            courseName: grp.courseName,
            name: grp.courseName,
            sisId: courseSisId,
            exportedValue: grp.courseName,
            canvasValue: canvasCourseName,
            description: `Variación de nombre: En base de datos se exportó "${grp.courseName}", pero en Canvas figura como "${canvasCourseName}".`,
          })
        } else {
          variations.push({
            id: `course-match-${courseSisId}`,
            entityType: 'course',
            status: 'match',
            severity: 'success',
            courseCode: courseSisId,
            courseName: grp.courseName,
            name: grp.courseName,
            sisId: courseSisId,
            exportedValue: grp.courseName,
            canvasValue: canvasCourseName,
            description: 'Curso verificado y coincidente en Canvas LMS.',
          })
        }

        // Obtener secciones y matrículas reales de Canvas para este curso
        let canvasSections: any[] = []
        let canvasEnrollments: any[] = []

        try {
          const [secRes, enrRes] = await Promise.all([
            fetch(`${config.baseUrl}/courses/${canvasCourse.id}/sections`, {
              headers: { Authorization: `Bearer ${config.token}` },
            }),
            fetch(`${config.baseUrl}/courses/${canvasCourse.id}/enrollments?per_page=100`, {
              headers: { Authorization: `Bearer ${config.token}` },
            }),
          ])

          if (secRes.ok) canvasSections = await secRes.json()
          if (enrRes.ok) canvasEnrollments = await enrRes.json()
        } catch (err) {
          console.error(`Error obteniendo secciones/matrículas para curso ${canvasCourse.id}:`, err)
        }

        // Crear mapas de búsqueda en Canvas
        const canvasSecBySis = new Map<string, any>()
        const canvasSecByName = new Map<string, any>()
        for (const s of canvasSections) {
          if (s.sis_section_id) canvasSecBySis.set(String(s.sis_section_id).trim().toLowerCase(), s)
          if (s.name) canvasSecByName.set(String(s.name).trim().toLowerCase(), s)
        }

        // Enrollments de Canvas agrupados por tipo
        const canvasTeachers = canvasEnrollments.filter(
          (e) => e.role === 'TeacherEnrollment' || e.type === 'TeacherEnrollment'
        )
        const canvasStudents = canvasEnrollments.filter(
          (e) => e.role === 'StudentEnrollment' || e.type === 'StudentEnrollment'
        )

        const canvasTeacherSisSet = new Set(
          canvasTeachers.map((t) => String(t.user?.sis_user_id || '').trim().toLowerCase())
        )
        const canvasStudentSisSet = new Set(
          canvasStudents.map((s) => String(s.user?.sis_user_id || '').trim().toLowerCase())
        )

        // Comparar Secciones
        for (const sec of grp.sections) {
          totalSectionsCount++
          const expectedSis = `${sec.seccionId}-${grp.rawCourseId}`.toLowerCase()
          const expectedName = sec.seccionNombre.trim().toLowerCase()

          const matchedSec =
            canvasSecBySis.get(expectedSis) || canvasSecByName.get(expectedName)

          if (matchedSec) {
            matchedSectionsCount++
            variations.push({
              id: `section-match-${sec.id}`,
              entityType: 'section',
              status: 'match',
              severity: 'success',
              courseCode: courseSisId,
              courseName: grp.courseName,
              sectionName: sec.seccionNombre,
              name: sec.seccionNombre,
              sisId: expectedSis,
              exportedValue: sec.seccionNombre,
              canvasValue: matchedSec.name,
              description: `Sección confirmada en Canvas LMS (ID: ${matchedSec.id}).`,
            })
          } else {
            missingSectionsCount++
            variations.push({
              id: `section-missing-${sec.id}`,
              entityType: 'section',
              status: 'missing',
              severity: 'warning',
              courseCode: courseSisId,
              courseName: grp.courseName,
              sectionName: sec.seccionNombre,
              name: sec.seccionNombre,
              sisId: expectedSis,
              exportedValue: sec.seccionNombre,
              canvasValue: 'No existe en Canvas',
              description: `La sección "${sec.seccionNombre}" no figura entre las secciones activas de este curso en Canvas.`,
            })
          }

          // Comparar Docentes de esta sección
          for (const doc of sec.docentes || []) {
            totalTeachersCount++
            const dniKey = doc.dni.trim().toLowerCase()
            const foundInCanvas = dniKey && canvasTeacherSisSet.has(dniKey)

            if (foundInCanvas) {
              matchedTeachersCount++
              variations.push({
                id: `teacher-match-${sec.id}-${doc.dni}`,
                entityType: 'teacher',
                status: 'match',
                severity: 'success',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: doc.fullName,
                sisId: doc.dni,
                exportedValue: `${doc.fullName} (DNI: ${doc.dni})`,
                canvasValue: 'Docente Asignado',
                description: 'Docente verificado con DNI oficial en Canvas LMS.',
              })
            } else {
              missingTeachersCount++
              variations.push({
                id: `teacher-missing-${sec.id}-${doc.dni}`,
                entityType: 'teacher',
                status: 'missing',
                severity: 'warning',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: doc.fullName,
                sisId: doc.dni,
                exportedValue: `${doc.fullName} (DNI: ${doc.dni})`,
                canvasValue: 'No asignado en Canvas',
                description: `El docente "${doc.fullName}" (DNI: ${doc.dni}) no está asignado a este curso en Canvas LMS.`,
              })
            }
          }

          // Comparar Estudiantes de esta sección
          let students = sec.estudiantes || []
          if (students.length === 0 && sec.estudiantesCount > 0) {
            try {
              students = await getSectionEnrolledStudents(options.caseId, sec.id)
            } catch {
              students = []
            }
          }

          for (const est of students) {
            totalStudentsCount++
            const codKey = est.codigo.trim().toLowerCase()
            const foundInCanvas = codKey && canvasStudentSisSet.has(codKey)

            if (foundInCanvas) {
              matchedStudentsCount++
              variations.push({
                id: `student-match-${sec.id}-${est.id}`,
                entityType: 'student',
                status: 'match',
                severity: 'success',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: est.fullName,
                sisId: est.codigo,
                exportedValue: `${est.fullName} (Cód: ${est.codigo})`,
                canvasValue: 'Matriculado en Canvas',
                description: 'Estudiante verificado en la lista de matriculados de Canvas.',
              })
            } else {
              missingStudentsCount++
              variations.push({
                id: `student-missing-${sec.id}-${est.id}`,
                entityType: 'student',
                status: 'missing',
                severity: 'info',
                courseCode: courseSisId,
                courseName: grp.courseName,
                sectionName: sec.seccionNombre,
                name: est.fullName,
                sisId: est.codigo,
                exportedValue: `${est.fullName} (Cód: ${est.codigo})`,
                canvasValue: 'No matriculado en Canvas',
                description: `Estudiante "${est.fullName}" (Cód: ${est.codigo}) no figura matriculado en este curso en Canvas.`,
              })
            }
          }
        }
      })
    )
  }

  const variationsCount = variations.filter((v) => v.status !== 'match').length

  return {
    success: true,
    timestamp,
    endpoint: config.endpoint,
    totalCourses: courseGroups.length,
    matchedCourses: matchedCoursesCount,
    missingCourses: missingCoursesCount,
    diffCourses: diffCoursesCount,
    totalSections: totalSectionsCount,
    matchedSections: matchedSectionsCount,
    missingSections: missingSectionsCount,
    totalTeachers: totalTeachersCount,
    matchedTeachers: matchedTeachersCount,
    missingTeachers: missingTeachersCount,
    totalStudents: totalStudentsCount,
    matchedStudents: matchedStudentsCount,
    missingStudents: missingStudentsCount,
    variationsCount,
    variations,
  }
}
