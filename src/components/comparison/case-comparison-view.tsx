import * as React from 'react'
import {
  Globe,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  BookOpen,
  Building,
  Layers,
  FoldVertical,
  Maximize2,
  X,
  PackageCheck,
  FolderArchive,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  listMigrationsFn,
  getMigrationTreeFn,
} from '#/server/functions/migrations'
import {
  getCanvasCasesFn,
  getCanvasCaseAccountsTreeFn,
  getCanvasCourseEnrollmentsFn,
} from '#/server/functions/canvas'
import type { CanvasImportCase } from '#/db/schema'
import type {
  MigrationSummary,
  MigrationTreeResult,
  MigrationAccountNode,
  MigrationCourseNode,
} from '#/server/services/migration-service'
import type {
  CanvasAccountTreeNode,
  CanvasCourseTreeNode,
} from '#/server/services/canvas-importer'

interface CaseComparisonViewProps {
  initialMigrationFolder?: string
  initialCanvasCaseId?: string
}

export function CaseComparisonView({
  initialMigrationFolder,
  initialCanvasCaseId,
}: CaseComparisonViewProps) {
  // 1. Listados de fuentes disponibles
  const [migrations, setMigrations] = React.useState<MigrationSummary[]>([])
  const [canvasCases, setCanvasCases] = React.useState<CanvasImportCase[]>([])
  const [isLoadingSources, setIsLoadingSources] = React.useState(true)

  // 2. Selección activa
  const [selectedMigrationFolder, setSelectedMigrationFolder] =
    React.useState<string>(initialMigrationFolder || '')
  const [selectedCanvasCaseId, setSelectedCanvasCaseId] =
    React.useState<string>(initialCanvasCaseId || '')

  // 3. Búsqueda compartida e independiente
  const [sharedSearch, setSharedSearch] = React.useState('')
  const [migrationSearch, setMigrationSearch] = React.useState('')
  const [canvasSearch, setCanvasSearch] = React.useState('')

  // 4. Datos de la Migración Seleccionada (Izquierda)
  const [migrationData, setMigrationData] =
    React.useState<MigrationTreeResult | null>(null)
  const [isLoadingMigration, setIsLoadingMigration] = React.useState(false)
  const [migrationExpandedNodes, setMigrationExpandedNodes] =
    React.useState<Set<string>>(new Set())
  const [migrationExpandedCourses, setMigrationExpandedCourses] =
    React.useState<Set<string>>(new Set())
  const [migrationExpandedSections, setMigrationExpandedSections] =
    React.useState<Set<string>>(new Set())

  // 5. Datos del Snapshot de Canvas LMS (Derecha)
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

  // Carga inicial de listas de migraciones y casos Canvas
  React.useEffect(() => {
    let isMounted = true
    async function loadSources() {
      setIsLoadingSources(true)
      try {
        const [migList, canvasList] = await Promise.all([
          listMigrationsFn(),
          getCanvasCasesFn(),
        ])
        if (!isMounted) return

        setMigrations(migList)
        setCanvasCases(canvasList)

        // Preseleccionar la migración más reciente
        let defMig = initialMigrationFolder
        if (!defMig && migList.length > 0) {
          defMig = migList[0].folderName
        }
        if (defMig) setSelectedMigrationFolder(defMig)

        // Preseleccionar el caso Canvas más reciente completado
        let defCanvasId = initialCanvasCaseId
        if (!defCanvasId && canvasList.length > 0) {
          const completed = canvasList.find((c) => c.status === 'completed')
          defCanvasId = completed ? completed.id : canvasList[0].id
        }
        if (defCanvasId) setSelectedCanvasCaseId(defCanvasId)
      } catch (err) {
        console.error('Error cargando fuentes de comparativa:', err)
      } finally {
        if (isMounted) setIsLoadingSources(false)
      }
    }

    loadSources()
    return () => {
      isMounted = false
    }
  }, [initialMigrationFolder, initialCanvasCaseId])

  // Cargar datos de la migración seleccionada
  React.useEffect(() => {
    if (!selectedMigrationFolder) {
      setMigrationData(null)
      return
    }
    let isMounted = true
    setIsLoadingMigration(true)
    setMigrationExpandedNodes(new Set())
    setMigrationExpandedCourses(new Set())
    setMigrationExpandedSections(new Set())

    getMigrationTreeFn({ data: selectedMigrationFolder })
      .then((tree) => {
        if (!isMounted) return
        setMigrationData(tree)
        // Auto-expandir cuentas raíz de la migración
        if (tree?.rootNodes) {
          const autoKeys = new Set<string>(tree.rootNodes.map((r) => r.accountId))
          setMigrationExpandedNodes(autoKeys)
        }
      })
      .catch((err) => {
        console.error('Error cargando registros de la migración:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingMigration(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedMigrationFolder])

  // Cargar árbol de Canvas cuando cambia el snapshot
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
        // Auto-expandir cuentas raíz de Canvas
        if (tree?.rootNodes) {
          const autoKeys = new Set<number>(tree.rootNodes.map((r) => r.canvasId))
          setCanvasExpandedNodes(autoKeys)
        }
      })
      .catch((err) => {
        console.error('Error cargando árbol de Canvas LMS:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingCanvas(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCanvasCaseId])

  // Carga bajo demanda de matrículas Canvas
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
        console.error('Error cargando matrículas Canvas:', err)
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

  // Alternancia en árbol de Migración
  const toggleMigrationAccount = (id: string) => {
    setMigrationExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleMigrationCourse = (courseId: string) => {
    setMigrationExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const toggleMigrationSection = (sectionId: string) => {
    setMigrationExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // Alternancia en árbol de Canvas
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

  // Controles masivos para Migración
  const handleExpandAllMigrationAccounts = () => {
    if (!migrationData) return
    const all = new Set<string>()
    function collect(nodes: MigrationAccountNode[]) {
      for (const n of nodes) {
        all.add(n.accountId)
        if (n.children) collect(n.children)
      }
    }
    collect(migrationData.rootNodes)
    setMigrationExpandedNodes(all)
  }

  const handleExpandAllMigrationCourses = () => {
    if (!migrationData) return
    handleExpandAllMigrationAccounts()
    const allCourses = new Set<string>()
    function collect(nodes: MigrationAccountNode[]) {
      for (const n of nodes) {
        for (const c of n.courses) allCourses.add(c.courseId)
        if (n.children) collect(n.children)
      }
    }
    collect(migrationData.rootNodes)
    setMigrationExpandedCourses(allCourses)
  }

  const handleCollapseAllMigration = () => {
    setMigrationExpandedNodes(new Set())
    setMigrationExpandedCourses(new Set())
    setMigrationExpandedSections(new Set())
  }

  // Controles masivos para Canvas
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

  const handleCollapseAllCanvas = () => {
    setCanvasExpandedNodes(new Set())
    setCanvasExpandedCourses(new Set())
    setCanvasExpandedSections(new Set())
  }

  // Búsquedas efectivas
  const effectiveMigSearch = (sharedSearch || migrationSearch).trim().toLowerCase()
  const effectiveCanvasSearch = (sharedSearch || canvasSearch).trim().toLowerCase()

  // 6. Renderizado de Nodos del Árbol de Migración
  const renderMigrationAccount = (
    node: MigrationAccountNode
  ): React.ReactNode => {
    const isExpanded =
      migrationExpandedNodes.has(node.accountId) ||
      Boolean(effectiveMigSearch && effectiveMigSearch.length > 0)
    const hasSub = node.children && node.children.length > 0

    // Filtrar cursos según búsqueda
    let visibleCourses = node.courses || []
    if (effectiveMigSearch) {
      const q = effectiveMigSearch
      visibleCourses = visibleCourses.filter(
        (c) =>
          c.courseId.toLowerCase().includes(q) ||
          c.longName.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q) ||
          c.sections.some(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.sectionId.toLowerCase().includes(q) ||
              s.teachers.some(
                (t) =>
                  t.fullName.toLowerCase().includes(q) ||
                  t.loginId.toLowerCase().includes(q)
              )
          )
      )
    }
    const hasCourses = visibleCourses.length > 0

    // Si hay búsqueda y no hay contenido coincidente en este nodo o descendientes, omitir
    if (
      effectiveMigSearch &&
      !hasCourses &&
      (!hasSub || !hasMatchingMigrationDescendants(node, effectiveMigSearch))
    ) {
      return null
    }

    return (
      <div key={node.accountId} className="flex flex-col select-none text-xs">
        <div
          onClick={() => toggleMigrationAccount(node.accountId)}
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
            <Building className="size-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {node.name}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 font-mono text-blue-700 dark:text-blue-300 border-blue-500/30"
            >
              SIS: {node.accountId}
            </Badge>
          </div>

          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {node.courses.length} cursos
          </span>
        </div>

        {isExpanded && (
          <div className="flex flex-col">
            {hasSub && node.children.map(renderMigrationAccount)}

            {hasCourses && (
              <div
                className="flex flex-col space-y-1.5 my-1 pl-2 border-l-2 border-blue-500/30 ml-2"
                style={{ marginLeft: `${node.depth * 1.2 + 0.7}rem` }}
              >
                {visibleCourses.map(renderMigrationCourse)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function hasMatchingMigrationDescendants(
    node: MigrationAccountNode,
    query: string
  ): boolean {
    for (const c of node.courses) {
      if (
        c.courseId.toLowerCase().includes(query) ||
        c.longName.toLowerCase().includes(query) ||
        c.sections.some((s) => s.name.toLowerCase().includes(query))
      ) {
        return true
      }
    }
    for (const child of node.children) {
      if (hasMatchingMigrationDescendants(child, query)) return true
    }
    return false
  }

  const renderMigrationCourse = (
    course: MigrationCourseNode
  ): React.ReactNode => {
    const isExpanded =
      migrationExpandedCourses.has(course.courseId) ||
      Boolean(effectiveMigSearch && effectiveMigSearch.length > 0)

    const totalStudents = course.sections.reduce(
      (acc, s) => acc + s.students.length,
      0
    )

    return (
      <div
        key={course.courseId}
        className="rounded-lg border border-border/70 bg-card overflow-hidden my-1 shadow-2xs"
      >
        <div
          onClick={() => toggleMigrationCourse(course.courseId)}
          className="flex items-center justify-between p-2 hover:bg-muted/30 cursor-pointer transition-colors bg-muted/10 gap-2"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            )}
            <BookOpen className="size-3.5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-mono font-bold text-xs text-foreground">
                {course.courseId}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold text-xs text-foreground truncate max-w-xs">
                {course.longName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {course.sections.length} sec.
            </Badge>
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-700 dark:text-blue-300"
            >
              {totalStudents} al.
            </Badge>
          </div>
        </div>

        {/* Secciones y Roster de la Migración */}
        {isExpanded && (
          <div className="p-2.5 border-t border-border/60 bg-background space-y-2">
            {course.sections.map((sec) => {
              const isSecExpanded = migrationExpandedSections.has(sec.sectionId)

              return (
                <div
                  key={sec.sectionId}
                  className="rounded border border-border/60 bg-card/60 p-2 space-y-1 text-xs"
                >
                  <div
                    onClick={() => toggleMigrationSection(sec.sectionId)}
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
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (SEC: {sec.sectionId})
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {sec.students.length} estudiantes
                    </span>
                  </div>

                  {isSecExpanded && (
                    <div className="pt-2 pl-3 border-l-2 border-blue-500/30 ml-1 space-y-2">
                      {/* Docentes en Migración */}
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                          Docentes ({sec.teachers.length}):
                        </span>
                        {sec.teachers.length > 0 ? (
                          <div className="space-y-1 font-mono text-[11px]">
                            {sec.teachers.map((d, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 py-0.5 px-2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300"
                              >
                                <span className="font-bold">
                                  (D) DNI:{d.loginId || d.userId}
                                </span>
                                <span>-</span>
                                <span className="font-sans font-medium truncate">
                                  {d.fullName}
                                </span>
                                {d.email && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                    &lt;{d.email}&gt;
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-muted-foreground">
                            (Sin docente asignado)
                          </p>
                        )}
                      </div>

                      {/* Alumnos en Migración */}
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                          Alumnos ({sec.students.length}):
                        </span>
                        {sec.students.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto divide-y divide-border/20 border border-border/40 rounded bg-background p-1 font-mono text-[11px]">
                            {sec.students.map((e, idx) => (
                              <div
                                key={idx}
                                className="py-0.5 px-1.5 flex items-center justify-between gap-1"
                              >
                                <span className="text-blue-700 dark:text-blue-400 font-semibold truncate">
                                  (E) {e.loginId || e.userId} - {e.fullName}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-muted-foreground">
                            (Sin alumnos matriculados en esta sección)
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
  }

  // 7. Renderizado de Nodos del Árbol de Canvas LMS
  const renderCanvasAccount = (node: CanvasAccountTreeNode): React.ReactNode => {
    const isExpanded =
      canvasExpandedNodes.has(node.canvasId) ||
      Boolean(effectiveCanvasSearch && effectiveCanvasSearch.length > 0)
    const hasSub = node.children && node.children.length > 0

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

    if (
      effectiveCanvasSearch &&
      !hasCourses &&
      (!hasSub || !hasMatchingCanvasDescendants(node, effectiveCanvasSearch))
    ) {
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

        {isExpanded && (
          <div className="flex flex-col">
            {hasSub && node.children.map(renderCanvasAccount)}

            {hasCourses && (
              <div
                className="flex flex-col space-y-1.5 my-1 pl-2 border-l-2 border-emerald-500/30 ml-2"
                style={{ marginLeft: `${node.depth * 1.2 + 0.7}rem` }}
              >
                {visibleCourses.map((c) => renderCanvasCourse(c))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function hasMatchingCanvasDescendants(
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
        if (hasMatchingCanvasDescendants(child, query)) return true
      }
    }
    return false
  }

  const renderCanvasCourse = (
    course: CanvasCourseTreeNode
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

        {/* Secciones y Roster de Canvas */}
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

  const selectedMigration = migrations.find(
    (m) => m.folderName === selectedMigrationFolder
  )
  const selectedCanvasCase = canvasCases.find(
    (c) => c.id === selectedCanvasCaseId
  )

  return (
    <div className="space-y-4">
      {/* 1. Encabezado y Búsqueda Sincronizada */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Comparativa: Migraciones vs Canvas LMS (API)</span>
              <Badge variant="outline" className="text-xs font-normal">
                Inspección Manual Lado a Lado
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Coteja visualmente los registros de cualquier paquete de migración exportado contra las cuentas y cursos reales de Canvas LMS
            </p>
          </div>

          {/* Buscador Sincronizado */}
          <div className="relative w-full sm:w-80">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              value={sharedSearch}
              onChange={(e) => setSharedSearch(e.target.value)}
              placeholder="Buscar en ambos árboles..."
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

      {/* 2. Workspace Dividido (50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ======================================================= */}
        {/* PANEL IZQUIERDO: REGISTRO DE MIGRACIÓN (EXPORTADO)      */}
        {/* ======================================================= */}
        <div className="rounded-xl border border-blue-500/30 bg-card p-4 shadow-xs space-y-3">
          {/* Selector de Migración */}
          <div className="space-y-2 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-foreground">
                  Registros de Migración (Exportados)
                </span>
              </div>
              {selectedMigration && (
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[180px]">
                  {selectedMigration.folderName}
                </span>
              )}
            </div>

            <select
              value={selectedMigrationFolder}
              onChange={(e) => setSelectedMigrationFolder(e.target.value)}
              disabled={isLoadingSources || isLoadingMigration}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none"
            >
              {migrations.length === 0 ? (
                <option value="">No hay paquetes de migración en /migraciones</option>
              ) : (
                migrations.map((m) => (
                  <option key={m.folderName} value={m.folderName}>
                    {m.periodName} ({m.createdAt} - {m.coursesCount} cursos, {m.sectionsCount} sec.)
                  </option>
                ))
              )}
            </select>

            {/* Resumen cuantitativo de la migración y controles */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  <strong>Cuentas:</strong> {migrationData?.totalAccounts || 0}
                </span>
                <span>•</span>
                <span>
                  <strong>Cursos:</strong> {migrationData?.totalCourses || 0}
                </span>
                <span>•</span>
                <span>
                  <strong>Secciones:</strong> {migrationData?.totalSections || 0}
                </span>
                {selectedMigration?.sandboxIsolated && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 font-mono ${
                      selectedMigration.sandboxPrefixMode === 'all'
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {selectedMigration.sandboxPrefixMode === 'all'
                      ? 'Aislamiento Total'
                      : 'Aislado Cuentas'}{' '}
                    ({selectedMigration.sandboxPrefix || 'Sandbox'})
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExpandAllMigrationCourses}
                  className="h-6 text-[10px] px-1.5"
                >
                  <Maximize2 className="size-3 mr-1" />
                  Cursos
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCollapseAllMigration}
                  className="h-6 text-[10px] px-1.5"
                >
                  <FoldVertical className="size-3 mr-1" />
                  Plegar
                </Button>
              </div>
            </div>

            {/* Buscador local de migración */}
            {!sharedSearch && (
              <div className="relative pt-1">
                <Search className="size-3 absolute left-2 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  value={migrationSearch}
                  onChange={(e) => setMigrationSearch(e.target.value)}
                  placeholder="Buscar en registros de migración..."
                  className="text-xs h-7 pl-7 bg-background"
                />
              </div>
            )}
          </div>

          {/* Contenedor del Árbol de la Migración */}
          <div className="min-h-[400px] max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 space-y-1">
            {isLoadingMigration ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <span>Cargando estructura de la migración exportada...</span>
              </div>
            ) : !migrationData || migrationData.rootNodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <FolderArchive className="size-8 mx-auto text-muted-foreground/40" />
                <p>No se encontraron registros en la migración seleccionada.</p>
              </div>
            ) : (
              migrationData.rootNodes.map(renderMigrationAccount)
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* PANEL DERECHO: SNAPSHOT CANVAS LMS (API)               */}
        {/* ======================================================= */}
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow-xs space-y-3">
          {/* Selector de Snapshot Canvas */}
          <div className="space-y-2 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  Snapshot Canvas LMS (REST API)
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
              disabled={isLoadingSources || isLoadingCanvas}
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

            {/* Resumen cuantitativo de Canvas y controles */}
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
              </div>
            </div>

            {/* Buscador local de Canvas */}
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

          {/* Contenedor del Árbol de Canvas */}
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
