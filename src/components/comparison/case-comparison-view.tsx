import * as React from 'react'
import {
  Database,
  Globe,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  BookOpen,
  Building,
  Layers,
  GraduationCap,
  FoldVertical,
  Maximize2,
  X,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { getCasesFn } from '#/server/functions/cases'
import {
  getCanvasCasesFn,
  getCanvasCaseAccountsTreeFn,
  getCanvasCourseEnrollmentsFn,
} from '#/server/functions/canvas'
import {
  getCaseHierarchyFn,
  getSectionStudentsFn,
} from '#/server/functions/hierarchy'
import type { ImportCase, CanvasImportCase } from '#/db/schema'
import type {
  HierarchyItem,
  EnrolledStudent,
} from '#/server/services/hierarchy-service'
import type {
  CanvasAccountTreeNode,
  CanvasCourseTreeNode,
} from '#/server/services/canvas-importer'

interface CaseComparisonViewProps {
  initialDbCaseId?: string
  initialCanvasCaseId?: string
}

export function CaseComparisonView({
  initialDbCaseId,
  initialCanvasCaseId,
}: CaseComparisonViewProps) {
  // 1. Listados de casos disponibles
  const [dbCases, setDbCases] = React.useState<ImportCase[]>([])
  const [canvasCases, setCanvasCases] = React.useState<CanvasImportCase[]>([])
  const [isLoadingCases, setIsLoadingCases] = React.useState(true)

  // 2. Selección de versiones
  const [selectedDbCaseId, setSelectedDbCaseId] = React.useState<string>(
    initialDbCaseId || ''
  )
  const [selectedCanvasCaseId, setSelectedCanvasCaseId] = React.useState<string>(
    initialCanvasCaseId || ''
  )

  // 3. Búsqueda compartida / independiente
  const [sharedSearch, setSharedSearch] = React.useState('')
  const [dbSearch, setDbSearch] = React.useState('')
  const [canvasSearch, setCanvasSearch] = React.useState('')

  // 4. Datos del caso SQL (Izquierda)
  const [dbItems, setDbItems] = React.useState<HierarchyItem[]>([])
  const [isLoadingDb, setIsLoadingDb] = React.useState(false)
  const [dbExpandedNodes, setDbExpandedNodes] = React.useState<Set<string>>(
    new Set()
  )
  const [dbLoadedStudents, setDbLoadedStudents] = React.useState<
    Record<number, EnrolledStudent[]>
  >({})
  const [dbLoadingSections, setDbLoadingSections] = React.useState<Set<number>>(
    new Set()
  )

  // 5. Datos del caso Canvas (Derecha)
  const [canvasTree, setCanvasTree] = React.useState<{
    rootNodes: CanvasAccountTreeNode[]
    totalAccounts: number
    withSisCount: number
    withoutSisCount: number
    totalCourses: number
  } | null>(null)
  const [isLoadingCanvas, setIsLoadingCanvas] = React.useState(false)
  const [canvasExpandedNodes, setCanvasExpandedNodes] = React.useState<
    Set<number>
  >(new Set())
  const [canvasExpandedCourses, setCanvasExpandedCourses] = React.useState<
    Set<number>
  >(new Set())
  const [canvasExpandedSections, setCanvasExpandedSections] = React.useState<
    Set<string>
  >(new Set())
  const [canvasRosters, setCanvasRosters] = React.useState<
    Record<
      number,
      {
        docentes: {
          id: number
          sectionId?: number | null
          dni: string
          fullName: string
          email: string
        }[]
        estudiantes: {
          id: number
          sectionId?: number | null
          codigo: string
          fullName: string
          email: string
        }[]
      }
    >
  >({})
  const [canvasLoadingRosters, setCanvasLoadingRosters] = React.useState<
    Set<number>
  >(new Set())

  // Carga inicial de listas de casos
  React.useEffect(() => {
    let isMounted = true
    async function loadCases() {
      setIsLoadingCases(true)
      try {
        const [dbList, canvasList] = await Promise.all([
          getCasesFn(),
          getCanvasCasesFn(),
        ])
        if (!isMounted) return

        setDbCases(dbList)
        setCanvasCases(canvasList)

        let defDbId = initialDbCaseId
        if (!defDbId && dbList.length > 0) {
          const completedDb = dbList.find((c) => c.status === 'completed')
          defDbId = completedDb ? completedDb.id : dbList[0].id
        }
        if (defDbId) setSelectedDbCaseId(defDbId)

        let defCanvasId = initialCanvasCaseId
        if (!defCanvasId && canvasList.length > 0) {
          const completedCanvas = canvasList.find(
            (c) => c.status === 'completed'
          )
          defCanvasId = completedCanvas ? completedCanvas.id : canvasList[0].id
        }
        if (defCanvasId) setSelectedCanvasCaseId(defCanvasId)
      } catch (err) {
        console.error('Error cargando casos para comparativa:', err)
      } finally {
        if (isMounted) setIsLoadingCases(false)
      }
    }

    loadCases()
    return () => {
      isMounted = false
    }
  }, [initialDbCaseId, initialCanvasCaseId])

  // Cargar jerarquía de Caso SQL cuando cambia el caso
  React.useEffect(() => {
    if (!selectedDbCaseId) {
      setDbItems([])
      return
    }
    let isMounted = true
    setIsLoadingDb(true)
    setDbLoadedStudents({})
    setDbExpandedNodes(new Set())

    getCaseHierarchyFn({ data: selectedDbCaseId })
      .then((res) => {
        if (!isMounted) return
        setDbItems(res.items || [])
        // Auto-expandir el primer periodo y sede si existe
        if (res.items && res.items.length > 0) {
          const first = res.items[0]
          const autoKeys = new Set<string>()
          autoKeys.add(`p-${first.periodoId}`)
          autoKeys.add(`s-${first.sedeId}`)
          setDbExpandedNodes(autoKeys)
        }
      })
      .catch((err) => {
        console.error('Error cargando jerarquía del caso SQL:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingDb(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedDbCaseId])

  // Cargar árbol de Caso Canvas cuando cambia el snapshot
  React.useEffect(() => {
    if (!selectedCanvasCaseId) {
      setCanvasTree(null)
      return
    }
    let isMounted = true
    setIsLoadingCanvas(true)
    setCanvasRosters({})
    setCanvasExpandedNodes(new Set())
    setCanvasExpandedCourses(new Set())
    setCanvasExpandedSections(new Set())

    getCanvasCaseAccountsTreeFn({ data: selectedCanvasCaseId })
      .then((tree) => {
        if (!isMounted) return
        setCanvasTree(tree)
        // Auto-expandir cuentas raíz
        if (tree?.rootNodes) {
          const autoKeys = new Set<number>(tree.rootNodes.map((r) => r.canvasId))
          setCanvasExpandedNodes(autoKeys)
        }
      })
      .catch((err) => {
        console.error('Error cargando árbol de cuentas de Canvas:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingCanvas(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCanvasCaseId])

  // Carga bajo demanda de alumnos para sección SQL
  const fetchDbSectionStudents = React.useCallback(
    async (sectionId: number) => {
      if (
        !selectedDbCaseId ||
        dbLoadedStudents[sectionId] ||
        dbLoadingSections.has(sectionId)
      )
        return
      setDbLoadingSections((prev) => new Set(prev).add(sectionId))
      try {
        const list = await getSectionStudentsFn({
          data: { caseId: selectedDbCaseId, cargaCursoId: sectionId },
        })
        setDbLoadedStudents((prev) => ({ ...prev, [sectionId]: list }))
      } catch (err) {
        console.error('Error cargando alumnos SQL para sección:', sectionId, err)
      } finally {
        setDbLoadingSections((prev) => {
          const next = new Set(prev)
          next.delete(sectionId)
          return next
        })
      }
    },
    [selectedDbCaseId, dbLoadedStudents, dbLoadingSections]
  )

  // Carga bajo demanda de matriculados para curso Canvas
  const fetchCanvasEnrollments = React.useCallback(
    async (courseId: number) => {
      if (
        !selectedCanvasCaseId ||
        canvasRosters[courseId] ||
        canvasLoadingRosters.has(courseId)
      )
        return
      setCanvasLoadingRosters((prev) => new Set(prev).add(courseId))
      try {
        const data = await getCanvasCourseEnrollmentsFn({
          data: { caseId: selectedCanvasCaseId, courseId },
        })
        setCanvasRosters((prev) => ({ ...prev, [courseId]: data }))
      } catch (err) {
        console.error('Error cargando matriculados Canvas para curso:', courseId, err)
      } finally {
        setCanvasLoadingRosters((prev) => {
          const next = new Set(prev)
          next.delete(courseId)
          return next
        })
      }
    },
    [selectedCanvasCaseId, canvasRosters, canvasLoadingRosters]
  )

  // Manejo de alternancia de nodos en árbol SQL
  const toggleDbNode = (key: string) => {
    setDbExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Manejo de alternancia de nodos en árbol Canvas
  const toggleCanvasNode = (id: number) => {
    setCanvasExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCanvasCourse = (courseId: number) => {
    setCanvasExpandedCourses((prev) => {
      const next = new Set(prev)
      const willExpand = !next.has(courseId)
      if (willExpand) {
        next.add(courseId)
        fetchCanvasEnrollments(courseId)
      } else {
        next.delete(courseId)
      }
      return next
    })
  }

  const toggleCanvasSection = (key: string, courseId: number) => {
    setCanvasExpandedSections((prev) => {
      const next = new Set(prev)
      const willExpand = !next.has(key)
      if (willExpand) {
        next.add(key)
        fetchCanvasEnrollments(courseId)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  // Filtro de búsqueda efectivo
  const effectiveDbSearch = (sharedSearch || dbSearch).trim().toLowerCase()
  const effectiveCanvasSearch = (sharedSearch || canvasSearch).trim().toLowerCase()

  // 6. Construir árbol estructurado para Caso SQL
  interface SqlCourseItem {
    cursoId: number
    cursoCodigo: string
    cursoNombre: string
    secciones: HierarchyItem[]
    totalStudents: number
  }

  interface SqlPlanItem {
    planCodigo: string
    planNombre: string
    cursos: SqlCourseItem[]
  }

  interface SqlCarreraItem {
    carreraNombre: string
    carreraCodigo: string
    planes: SqlPlanItem[]
  }

  interface SqlSedeItem {
    sedeId: number
    sedeNombre: string
    carreras: SqlCarreraItem[]
  }

  const sqlTree = React.useMemo<SqlSedeItem[]>(() => {
    if (!dbItems || dbItems.length === 0) return []

    // Filtrar por texto si hay búsqueda
    let filtered = dbItems
    if (effectiveDbSearch) {
      filtered = filtered.filter((it) => {
        const q = effectiveDbSearch
        return (
          it.cursoCodigo.toLowerCase().includes(q) ||
          it.cursoNombre.toLowerCase().includes(q) ||
          it.seccionNombre.toLowerCase().includes(q) ||
          it.carreraNombre.toLowerCase().includes(q) ||
          it.sedeNombre.toLowerCase().includes(q) ||
          it.docentes.some(
            (d) =>
              d.dni.toLowerCase().includes(q) ||
              d.fullName.toLowerCase().includes(q)
          )
        )
      })
    }

    // Agrupar Sede -> Carrera -> Plan -> Curso
    const sedeMap = new Map<number, { sedeNombre: string; carreraMap: Map<string, { carreraCodigo: string; planMap: Map<string, { planNombre: string; cursoMap: Map<string, SqlCourseItem> }> }> }>()

    for (const it of filtered) {
      if (!sedeMap.has(it.sedeId)) {
        sedeMap.set(it.sedeId, {
          sedeNombre: it.sedeNombre,
          carreraMap: new Map(),
        })
      }
      const s = sedeMap.get(it.sedeId)!

      const carKey = it.carreraNombre || 'Sin Carrera'
      if (!s.carreraMap.has(carKey)) {
        s.carreraMap.set(carKey, {
          carreraCodigo: it.carreraCodigo,
          planMap: new Map(),
        })
      }
      const c = s.carreraMap.get(carKey)!

      const planKey = it.planCodigo || 'Sin Plan'
      if (!c.planMap.has(planKey)) {
        c.planMap.set(planKey, {
          planNombre: it.planNombre,
          cursoMap: new Map(),
        })
      }
      const p = c.planMap.get(planKey)!

      const cursoKey = it.cursoCodigo || `CURSO-${it.cursoId}`
      if (!p.cursoMap.has(cursoKey)) {
        p.cursoMap.set(cursoKey, {
          cursoId: it.cursoId,
          cursoCodigo: it.cursoCodigo,
          cursoNombre: it.cursoNombre,
          secciones: [],
          totalStudents: 0,
        })
      }
      const cur = p.cursoMap.get(cursoKey)!
      cur.secciones.push(it)
      cur.totalStudents += it.estudiantesCount || 0
    }

    const result: SqlSedeItem[] = []
    for (const [sedeId, s] of sedeMap.entries()) {
      const carreras: SqlCarreraItem[] = []
      for (const [carreraNombre, c] of s.carreraMap.entries()) {
        const planes: SqlPlanItem[] = []
        for (const [planCodigo, p] of c.planMap.entries()) {
          planes.push({
            planCodigo,
            planNombre: p.planNombre,
            cursos: Array.from(p.cursoMap.values()),
          })
        }
        carreras.push({
          carreraNombre,
          carreraCodigo: c.carreraCodigo,
          planes,
        })
      }
      result.push({
        sedeId,
        sedeNombre: s.sedeNombre,
        carreras,
      })
    }

    return result
  }, [dbItems, effectiveDbSearch])

  // Controles de plegado para SQL
  const handleCollapseAllSql = () => {
    setDbExpandedNodes(new Set())
  }

  const handleExpandCoursesSql = () => {
    const next = new Set<string>()
    for (const s of sqlTree) {
      next.add(`s-${s.sedeId}`)
      for (const c of s.carreras) {
        next.add(`car-${s.sedeId}-${c.carreraNombre}`)
        for (const p of c.planes) {
          next.add(`plan-${s.sedeId}-${c.carreraNombre}-${p.planCodigo}`)
          for (const cur of p.cursos) {
            next.add(`cur-${s.sedeId}-${cur.cursoCodigo}`)
          }
        }
      }
    }
    setDbExpandedNodes(next)
  }

  const handleCollapseRostersSql = () => {
    setDbExpandedNodes((prev) => {
      const next = new Set<string>()
      for (const k of prev) {
        if (!k.startsWith('sec-')) next.add(k)
      }
      return next
    })
  }

  // Controles de plegado para Canvas
  const handleCollapseAllCanvas = () => {
    setCanvasExpandedNodes(new Set())
    setCanvasExpandedCourses(new Set())
    setCanvasExpandedSections(new Set())
  }

  const handleExpandAllCanvasAccounts = () => {
    if (!canvasTree) return
    const all = new Set<number>()
    function collect(nodes: CanvasAccountTreeNode[]) {
      for (const n of nodes) {
        all.add(n.canvasId)
        if (n.children) collect(n.children)
      }
    }
    collect(canvasTree.rootNodes)
    setCanvasExpandedNodes(all)
  }

  const handleCollapseCanvasRosters = () => {
    setCanvasExpandedSections(new Set())
  }

  // Renderizador recursivo de cuentas en Canvas
  const renderCanvasAccount = (node: CanvasAccountTreeNode): React.ReactNode => {
    const isExpanded =
      canvasExpandedNodes.has(node.canvasId) ||
      Boolean(effectiveCanvasSearch && effectiveCanvasSearch.length > 0)
    const hasSub = node.children && node.children.length > 0

    // Filtrar cursos de esta cuenta según búsqueda
    let visibleCourses = node.courses || []
    if (effectiveCanvasSearch) {
      const q = effectiveCanvasSearch
      visibleCourses = visibleCourses.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.courseCode && c.courseCode.toLowerCase().includes(q)) ||
          (c.sisCourseId && c.sisCourseId.toLowerCase().includes(q)) ||
          (c.sections &&
            c.sections.some((s) => s.name.toLowerCase().includes(q)))
      )
    }
    const hasCourses = visibleCourses.length > 0

    // Si hay búsqueda y este nodo no tiene cursos que coincidan ni hijos que coincidan, ocultar
    if (effectiveCanvasSearch && !hasCourses && (!hasSub || !hasMatchingDescendants(node, effectiveCanvasSearch))) {
      return null
    }

    return (
      <div key={node.canvasId} className="flex flex-col select-none text-xs">
        <div
          onClick={() => toggleCanvasNode(node.canvasId)}
          className={`flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 cursor-pointer transition-colors ${
            node.depth === 0
              ? 'bg-muted/30 font-semibold border border-border/60 my-0.5'
              : 'border-b border-border/20'
          }`}
          style={{ paddingLeft: `${node.depth * 1.2 + 0.5}rem` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasSub || hasCourses ? (
              isExpanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <Building className="size-3.5 text-emerald-600 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {node.name}
            </span>
            {node.sisAccountId && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 font-mono text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              >
                SIS: {node.sisAccountId}
              </Badge>
            )}
          </div>

          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {node.coursesCount} cursos
          </span>
        </div>

        {/* Hijos de la cuenta */}
        {isExpanded && (
          <div className="flex flex-col">
            {hasSub && node.children.map(renderCanvasAccount)}

            {/* Cursos en esta cuenta */}
            {hasCourses && (
              <div
                className="flex flex-col space-y-1.5 my-1 pl-2 border-l-2 border-emerald-500/30 ml-2"
                style={{ marginLeft: `${node.depth * 1.2 + 0.7}rem` }}
              >
                {visibleCourses.map((course) =>
                  renderCanvasCourse(course, node.depth + 1)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Verifica si algún nodo descendiente coincide con la búsqueda
  function hasMatchingDescendants(
    node: CanvasAccountTreeNode,
    query: string
  ): boolean {
    if (node.courses) {
      for (const c of node.courses) {
        if (
          c.name.toLowerCase().includes(query) ||
          (c.courseCode && c.courseCode.toLowerCase().includes(query)) ||
          (c.sisCourseId && c.sisCourseId.toLowerCase().includes(query))
        ) {
          return true
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        if (hasMatchingDescendants(child, query)) return true
      }
    }
    return false
  }

  // Renderizador de curso individual en Canvas
  const renderCanvasCourse = (
    course: CanvasCourseTreeNode,
    _depth?: number
  ): React.ReactNode => {
    const isExpanded =
      canvasExpandedCourses.has(course.canvasId) ||
      Boolean(effectiveCanvasSearch && effectiveCanvasSearch.length > 0)
    const roster = canvasRosters[course.canvasId]
    const isLoadingRoster = canvasLoadingRosters.has(course.canvasId)

    return (
      <div
        key={course.canvasId}
        className="rounded-lg border border-border/70 bg-card overflow-hidden my-1 shadow-2xs"
      >
        <div
          onClick={() => toggleCanvasCourse(course.canvasId)}
          className="flex items-center justify-between p-2 hover:bg-muted/30 cursor-pointer transition-colors bg-muted/10 gap-2"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <BookOpen className="size-3.5 text-emerald-600 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-mono font-bold text-xs text-foreground">
                {course.sisCourseId || course.courseCode || `#${course.canvasId}`}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold text-xs text-foreground truncate max-w-xs">
                {course.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {course.sections ? course.sections.length : 0} sec.
            </Badge>
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              {course.totalStudents} al.
            </Badge>
          </div>
        </div>

        {/* Desglose de Secciones y Roster en Canvas */}
        {isExpanded && (
          <div className="p-2.5 border-t border-border/60 bg-background space-y-2">
            {isLoadingRoster && (
              <div className="py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                <span>Cargando docentes y estudiantes desde Canvas API...</span>
              </div>
            )}

            {course.sections && course.sections.length > 0 ? (
              course.sections.map((sec) => {
                const secKey = `${course.canvasId}-${sec.id}`
                const isSecExpanded = canvasExpandedSections.has(secKey)

                // Filtrar matriculados de esta sección
                const secDocentes = roster?.docentes
                  ? roster.docentes.filter(
                      (d) => !d.sectionId || d.sectionId === sec.id
                    )
                  : []
                const secEstudiantes = roster?.estudiantes
                  ? roster.estudiantes.filter(
                      (e) => !e.sectionId || e.sectionId === sec.id
                    )
                  : []

                return (
                  <div
                    key={sec.id}
                    className="rounded border border-border/60 bg-card/60 p-2 space-y-1 text-xs"
                  >
                    <div
                      onClick={() =>
                        toggleCanvasSection(secKey, course.canvasId)
                      }
                      className="flex items-center justify-between cursor-pointer hover:text-foreground transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {isSecExpanded ? (
                          <ChevronDown className="size-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3 text-muted-foreground" />
                        )}
                        <span className="font-semibold text-foreground">
                          {sec.name}
                        </span>
                        {sec.sisSectionId && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (SIS: {sec.sisSectionId})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {sec.totalStudents} estudiantes
                      </span>
                    </div>

                    {isSecExpanded && (
                      <div className="pt-2 pl-3 border-l-2 border-emerald-500/30 ml-1 space-y-2">
                        {/* Docentes en Canvas */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                            Docentes ({secDocentes.length}):
                          </span>
                          {secDocentes.length > 0 ? (
                            <div className="space-y-1 font-mono text-[11px]">
                              {secDocentes.map((d, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 py-0.5 px-2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                >
                                  <span className="font-bold">
                                    (D) {d.dni ? `DNI:${d.dni}` : 'S/DNI'}
                                  </span>
                                  <span>-</span>
                                  <span className="font-sans font-medium truncate">
                                    {d.fullName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] italic text-muted-foreground">
                              (Sin docentes asignados en esta sección)
                            </p>
                          )}
                        </div>

                        {/* Alumnos en Canvas */}
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                            Alumnos ({secEstudiantes.length}):
                          </span>
                          {secEstudiantes.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto divide-y divide-border/20 border border-border/40 rounded bg-background p-1 font-mono text-[11px]">
                              {secEstudiantes.map((e, idx) => (
                                <div
                                  key={idx}
                                  className="py-0.5 px-1.5 flex items-center justify-between gap-1"
                                >
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                    (E) {e.codigo || `ID:${e.id}`} - {e.fullName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] italic text-muted-foreground">
                              (Sin alumnos matriculados cargados)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-muted-foreground italic py-1">
                (Este curso no tiene secciones configuradas en Canvas)
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  const selectedDbCase = dbCases.find((c) => c.id === selectedDbCaseId)
  const selectedCanvasCase = canvasCases.find(
    (c) => c.id === selectedCanvasCaseId
  )

  return (
    <div className="space-y-4">
      {/* 1. Barra Superior con Título y Búsqueda Sincronizada */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Comparativa de Casos Importados</span>
              <Badge variant="outline" className="text-xs font-normal">
                Inspección Manual Lado a Lado
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Explora y compara visualmente cualquier caso importado de base de datos contra cualquier snapshot de Canvas LMS
            </p>
          </div>

          {/* Campo de Búsqueda Compartida */}
          <div className="relative w-full sm:w-80">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              value={sharedSearch}
              onChange={(e) => setSharedSearch(e.target.value)}
              placeholder="Búsqueda sincronizada en ambos árboles..."
              className="text-xs h-8 pl-8 pr-7 bg-background"
            />
            {sharedSearch && (
              <button
                onClick={() => setSharedSearch('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {sharedSearch && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span>Filtrando ambos árboles por:</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              &quot;{sharedSearch}&quot;
            </Badge>
          </div>
        )}
      </div>

      {/* 2. Workspace Dividido Lado a Lado (50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ========================================= */}
        {/* PANEL IZQUIERDO: CASO IMPORTADO (SQL)     */}
        {/* ========================================= */}
        <div className="rounded-xl border border-blue-500/30 bg-card p-4 shadow-xs space-y-3">
          {/* Encabezado y Selector de Versión SQL */}
          <div className="space-y-2 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-foreground">
                  Caso Importado (SQL)
                </span>
              </div>
              {selectedDbCase && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedDbCase.id}
                </span>
              )}
            </div>

            <select
              value={selectedDbCaseId}
              onChange={(e) => setSelectedDbCaseId(e.target.value)}
              disabled={isLoadingCases || isLoadingDb}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none"
            >
              {dbCases.length === 0 ? (
                <option value="">No hay casos de importación SQL</option>
              ) : (
                dbCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({new Date(c.createdAt).toLocaleDateString()} -{' '}
                    {c.totalRows.toLocaleString()} reg.)
                  </option>
                ))
              )}
            </select>

            {/* Métricas y Controles de Plegado SQL */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  <strong>Sedes:</strong> {sqlTree.length}
                </span>
                <span>•</span>
                <span>
                  <strong>Secciones:</strong> {dbItems.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExpandCoursesSql}
                  className="h-6 text-[10px] px-1.5"
                >
                  <Maximize2 className="size-3 mr-1" />
                  Cursos
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCollapseAllSql}
                  className="h-6 text-[10px] px-1.5"
                >
                  <FoldVertical className="size-3 mr-1" />
                  Plegar
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCollapseRostersSql}
                  className="h-6 text-[10px] px-1.5"
                >
                  Plegar Alumnos
                </Button>
              </div>
            </div>

            {/* Buscador Local SQL si no hay búsqueda compartida */}
            {!sharedSearch && (
              <div className="relative pt-1">
                <Search className="size-3 absolute left-2 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  value={dbSearch}
                  onChange={(e) => setDbSearch(e.target.value)}
                  placeholder="Buscar en árbol SQL..."
                  className="text-xs h-7 pl-7 bg-background"
                />
              </div>
            )}
          </div>

          {/* Cuerpo del Árbol SQL */}
          <div className="min-h-[400px] max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 space-y-1">
            {isLoadingDb ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <span>Cargando jerarquía del caso importado SQL...</span>
              </div>
            ) : sqlTree.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No se encontraron elementos en este caso de BD para los filtros actuales.
              </div>
            ) : (
              sqlTree.map((sede) => {
                const sedeKey = `s-${sede.sedeId}`
                const isSedeOpen =
                  dbExpandedNodes.has(sedeKey) ||
                  Boolean(effectiveDbSearch && effectiveDbSearch.length > 0)

                return (
                  <div key={sede.sedeId} className="flex flex-col text-xs">
                    {/* Fila Sede */}
                    <div
                      onClick={() => toggleDbNode(sedeKey)}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/40 font-semibold border border-border/60 hover:bg-muted/60 cursor-pointer transition-colors my-0.5"
                    >
                      <div className="flex items-center gap-1.5">
                        {isSedeOpen ? (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        )}
                        <Building className="size-3.5 text-blue-600" />
                        <span className="text-foreground">{sede.sedeNombre}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                        {sede.carreras.length} carreras
                      </Badge>
                    </div>

                    {/* Carreras de la Sede */}
                    {isSedeOpen && (
                      <div className="pl-3 border-l-2 border-blue-500/30 ml-2 space-y-1 my-1">
                        {sede.carreras.map((car) => {
                          const carKey = `car-${sede.sedeId}-${car.carreraNombre}`
                          const isCarOpen =
                            dbExpandedNodes.has(carKey) ||
                            Boolean(effectiveDbSearch && effectiveDbSearch.length > 0)

                          return (
                            <div key={car.carreraNombre} className="space-y-1">
                              <div
                                onClick={() => toggleDbNode(carKey)}
                                className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30 cursor-pointer font-medium text-foreground transition-colors"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isCarOpen ? (
                                    <ChevronDown className="size-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="size-3 text-muted-foreground" />
                                  )}
                                  <GraduationCap className="size-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate">{car.carreraNombre}</span>
                                </div>
                              </div>

                              {/* Planes y Cursos */}
                              {isCarOpen && (
                                <div className="pl-3 border-l border-border/60 ml-2 space-y-1.5">
                                  {car.planes.map((p) =>
                                    p.cursos.map((curso) => {
                                      const curKey = `cur-${sede.sedeId}-${curso.cursoCodigo}`
                                      const isCurOpen =
                                        dbExpandedNodes.has(curKey) ||
                                        Boolean(
                                          effectiveDbSearch &&
                                            effectiveDbSearch.length > 0
                                        )

                                      return (
                                        <div
                                          key={curso.cursoCodigo}
                                          className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-2xs my-1"
                                        >
                                          {/* Encabezado del Curso SQL */}
                                          <div
                                            onClick={() => toggleDbNode(curKey)}
                                            className="flex items-center justify-between p-2 hover:bg-muted/30 cursor-pointer transition-colors bg-muted/10 gap-2"
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              {isCurOpen ? (
                                                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                                              ) : (
                                                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                                              )}
                                              <BookOpen className="size-3.5 text-blue-600 shrink-0" />
                                              <span className="font-mono font-bold text-xs text-foreground">
                                                {curso.cursoCodigo}
                                              </span>
                                              <span className="text-muted-foreground">•</span>
                                              <span className="font-semibold text-xs text-foreground truncate max-w-xs">
                                                {curso.cursoNombre}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] px-1 py-0 h-4"
                                              >
                                                {curso.secciones.length} sec.
                                              </Badge>
                                              <Badge
                                                variant="secondary"
                                                className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                              >
                                                {curso.totalStudents} al.
                                              </Badge>
                                            </div>
                                          </div>

                                          {/* Secciones del Curso SQL */}
                                          {isCurOpen && (
                                            <div className="p-2.5 border-t border-border/60 bg-background space-y-2">
                                              {curso.secciones.map((sec) => {
                                                const secKey = `sec-${sec.id}`
                                                const isSecOpen =
                                                  dbExpandedNodes.has(secKey)
                                                const loadedStudents =
                                                  dbLoadedStudents[sec.id] || []
                                                const isLoadingStudents =
                                                  dbLoadingSections.has(sec.id)

                                                return (
                                                  <div
                                                    key={sec.id}
                                                    className="rounded border border-border/60 bg-card/60 p-2 space-y-1 text-xs"
                                                  >
                                                    <div
                                                      onClick={() => {
                                                        toggleDbNode(secKey)
                                                        if (!isSecOpen) {
                                                          fetchDbSectionStudents(
                                                            sec.id
                                                          )
                                                        }
                                                      }}
                                                      className="flex items-center justify-between cursor-pointer hover:text-foreground transition-colors"
                                                    >
                                                      <div className="flex items-center gap-1.5">
                                                        {isSecOpen ? (
                                                          <ChevronDown className="size-3 text-muted-foreground" />
                                                        ) : (
                                                          <ChevronRight className="size-3 text-muted-foreground" />
                                                        )}
                                                        <span className="font-semibold text-foreground">
                                                          {sec.seccionNombre}
                                                        </span>
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[9px] px-1 py-0 h-4"
                                                        >
                                                          {sec.isNoHabilitado
                                                            ? 'NO HABILITADO'
                                                            : 'HABILITADO'}
                                                        </Badge>
                                                      </div>
                                                      <span className="text-[10px] text-muted-foreground font-mono">
                                                        {sec.estudiantesCount} alumnos
                                                      </span>
                                                    </div>

                                                    {/* Desglose de Docentes y Alumnos SQL */}
                                                    {isSecOpen && (
                                                      <div className="pt-2 pl-3 border-l-2 border-blue-500/30 ml-1 space-y-2">
                                                        {/* Docentes */}
                                                        <div>
                                                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                                                            Docentes ({sec.docentes.length}):
                          </span>
                                                          {sec.docentes.length > 0 ? (
                                                            <div className="space-y-1 font-mono text-[11px]">
                                                              {sec.docentes.map((d, dIdx) => (
                                                                <div
                                                                  key={dIdx}
                                                                  className="flex items-center gap-1.5 py-0.5 px-2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                                                >
                                                                  <span className="font-bold">
                                                                    (D) {d.dni ? `DNI:${d.dni}` : 'S/DNI'}
                                                                  </span>
                                                                  <span>-</span>
                                                                  <span className="font-sans font-medium truncate">
                                                                    {d.fullName}
                                                                  </span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <p className="text-[11px] italic text-muted-foreground">
                                                              (Sin docente asignado)
                                                            </p>
                                                          )}
                                                        </div>

                                                        {/* Alumnos */}
                                                        <div>
                                                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                                                            Alumnos ({sec.estudiantesCount}):
                                                          </span>
                                                          {isLoadingStudents ? (
                                                            <div className="py-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                                                              <Loader2 className="size-3 animate-spin text-blue-600" />
                                                              <span>Cargando lista de alumnos...</span>
                                                            </div>
                                                          ) : loadedStudents.length > 0 ? (
                                                            <div className="max-h-40 overflow-y-auto divide-y divide-border/20 border border-border/40 rounded bg-background p-1 font-mono text-[11px]">
                                                              {loadedStudents.map((e, eIdx) => (
                                                                <div
                                                                  key={eIdx}
                                                                  className="py-0.5 px-1.5 flex items-center justify-between gap-1"
                                                                >
                                                                  <span className="text-blue-700 dark:text-blue-400 font-semibold truncate">
                                                                    (E) {e.codigo} - {e.fullName}
                                                                  </span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <p className="text-[11px] italic text-muted-foreground">
                                                              (Sin alumnos matriculados cargados)
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* PANEL DERECHO: CASO IMPORTADO CANVAS LMS (API)    */}
        {/* ================================================= */}
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow-xs space-y-3">
          {/* Encabezado y Selector de Snapshot Canvas */}
          <div className="space-y-2 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  Caso Importado Canvas LMS (API)
                </span>
              </div>
              {selectedCanvasCase && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedCanvasCase.id}
                </span>
              )}
            </div>

            <select
              value={selectedCanvasCaseId}
              onChange={(e) => setSelectedCanvasCaseId(e.target.value)}
              disabled={isLoadingCases || isLoadingCanvas}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none"
            >
              {canvasCases.length === 0 ? (
                <option value="">No hay snapshots de Canvas LMS</option>
              ) : (
                canvasCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({new Date(c.createdAt).toLocaleDateString()} -{' '}
                    {c.totalCourses} cursos)
                  </option>
                ))
              )}
            </select>

            {/* Métricas y Controles de Plegado Canvas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  <strong>Cuentas:</strong> {canvasTree?.totalAccounts || 0}
                </span>
                <span>•</span>
                <span>
                  <strong>Cursos:</strong> {canvasTree?.totalCourses || 0}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExpandAllCanvasAccounts}
                  className="h-6 text-[10px] px-1.5"
                >
                  <Maximize2 className="size-3 mr-1" />
                  Cuentas
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCollapseAllCanvas}
                  className="h-6 text-[10px] px-1.5"
                >
                  <FoldVertical className="size-3 mr-1" />
                  Plegar
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCollapseCanvasRosters}
                  className="h-6 text-[10px] px-1.5"
                >
                  Plegar Alumnos
                </Button>
              </div>
            </div>

            {/* Buscador Local Canvas si no hay búsqueda compartida */}
            {!sharedSearch && (
              <div className="relative pt-1">
                <Search className="size-3 absolute left-2 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  value={canvasSearch}
                  onChange={(e) => setCanvasSearch(e.target.value)}
                  placeholder="Buscar en árbol Canvas..."
                  className="text-xs h-7 pl-7 bg-background"
                />
              </div>
            )}
          </div>

          {/* Cuerpo del Árbol Canvas */}
          <div className="min-h-[400px] max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 space-y-1">
            {isLoadingCanvas ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-emerald-600" />
                <span>Cargando cuentas y cursos del snapshot Canvas...</span>
              </div>
            ) : !canvasTree || canvasTree.rootNodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No hay cuentas registradas en este snapshot de Canvas.
              </div>
            ) : (
              canvasTree.rootNodes.map(renderCanvasAccount)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
