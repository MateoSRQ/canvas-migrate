import * as React from 'react'
import {
  GitCompare,
  Database,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { getCasesFn } from '#/server/functions/cases'
import { getCanvasCasesFn } from '#/server/functions/canvas'
import { compareCasesFn } from '#/server/functions/cases'
import type {
  CaseComparisonReport,
  CaseComparisonItem,
  ComparisonStatus,
} from '#/server/services/case-comparison-service'

interface CaseComparisonViewProps {
  initialDbCaseId?: string
  initialCanvasCaseId?: string
}

export function CaseComparisonView({
  initialDbCaseId,
  initialCanvasCaseId,
}: CaseComparisonViewProps) {
  // 1. Estados de selección de casos
  const [dbCases, setDbCases] = React.useState<any[]>([])
  const [canvasCases, setCanvasCases] = React.useState<any[]>([])
  const [selectedDbCaseId, setSelectedDbCaseId] = React.useState<string>(
    initialDbCaseId || ''
  )
  const [selectedCanvasCaseId, setSelectedCanvasCaseId] = React.useState<string>(
    initialCanvasCaseId || ''
  )

  const [isLoadingCases, setIsLoadingCases] = React.useState<boolean>(true)
  const [isComparing, setIsComparing] = React.useState<boolean>(false)
  const [comparisonReport, setComparisonReport] =
    React.useState<CaseComparisonReport | null>(null)
  const [comparisonError, setComparisonError] = React.useState<string | null>(
    null
  )

  // 2. Filtros y búsqueda
  const [filterStatus, setFilterStatus] = React.useState<
    'all' | ComparisonStatus
  >('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(25)

  // 3. Estado de expansión de cursos
  const [expandedCourseIds, setExpandedCourseIds] = React.useState<Set<string>>(
    new Set()
  )

  // Cargar listas de casos al montar
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

        // Seleccionar por defecto el caso más reciente si no fue provisto
        let dbId = initialDbCaseId
        if (!dbId && dbList.length > 0) {
          const completedDb = dbList.find((c: any) => c.status === 'completed')
          dbId = completedDb ? completedDb.id : dbList[0].id
        }
        if (dbId) setSelectedDbCaseId(dbId)

        let canvasId = initialCanvasCaseId
        if (!canvasId && canvasList.length > 0) {
          const completedCanvas = canvasList.find(
            (c: any) => c.status === 'completed'
          )
          canvasId = completedCanvas ? completedCanvas.id : canvasList[0].id
        }
        if (canvasId) setSelectedCanvasCaseId(canvasId)
      } catch (err: any) {
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

  // Ejecutar comparativa cuando ambos casos están seleccionados
  const handleExecuteComparison = React.useCallback(
    async (dbIdToUse?: string, canvasIdToUse?: string) => {
      const dbId = dbIdToUse || selectedDbCaseId
      const canvasId = canvasIdToUse || selectedCanvasCaseId

      if (!dbId || !canvasId) return

      setIsComparing(true)
      setComparisonError(null)
      try {
        const report = await compareCasesFn({
          data: { dbCaseId: dbId, canvasCaseId: canvasId },
        })
        setComparisonReport(report)
        setCurrentPage(1)
        setExpandedCourseIds(new Set())
      } catch (err: any) {
        console.error('Error en comparación de casos:', err)
        setComparisonError(
          err?.message || 'Ocurrió un error al procesar la comparativa entre los casos seleccionados.'
        )
      } finally {
        setIsComparing(false)
      }
    },
    [selectedDbCaseId, selectedCanvasCaseId]
  )

  // Auto-ejecutar cuando ambos casos están disponibles por primera vez
  React.useEffect(() => {
    if (selectedDbCaseId && selectedCanvasCaseId && !comparisonReport && !isComparing) {
      handleExecuteComparison(selectedDbCaseId, selectedCanvasCaseId)
    }
  }, [selectedDbCaseId, selectedCanvasCaseId, comparisonReport, isComparing, handleExecuteComparison])

  const toggleCourseExpand = (id: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    if (!comparisonReport) return
    const all = new Set(comparisonReport.items.map((i) => i.id))
    setExpandedCourseIds(all)
  }

  const handleCollapseAll = () => {
    setExpandedCourseIds(new Set())
  }

  // Filtrado de cursos
  const filteredItems = React.useMemo(() => {
    if (!comparisonReport) return []
    let list = comparisonReport.items

    // Filtro por estado
    if (filterStatus !== 'all') {
      list = list.filter((it) => it.status === filterStatus)
    }

    // Filtro por búsqueda de texto
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((it) => {
        const matchCode = it.courseCode.toLowerCase().includes(q)
        const matchName = it.courseName.toLowerCase().includes(q)
        const matchDbName =
          it.dbCourse?.name.toLowerCase().includes(q) || false
        const matchCanvasName =
          it.canvasCourse?.name.toLowerCase().includes(q) || false
        const matchSede =
          it.dbCourse?.sede.toLowerCase().includes(q) || false
        const matchCarrera =
          it.dbCourse?.carrera.toLowerCase().includes(q) || false
        const matchTeacher =
          it.dbCourse?.teacherNames.some((t) => t.toLowerCase().includes(q)) ||
          it.canvasCourse?.teacherNames.some((t) =>
            t.toLowerCase().includes(q)
          ) ||
          false
        const matchSection =
          it.dbCourse?.sections.some((s) => s.name.toLowerCase().includes(q)) ||
          it.canvasCourse?.sections.some((s) =>
            s.name.toLowerCase().includes(q)
          ) ||
          false

        return (
          matchCode ||
          matchName ||
          matchDbName ||
          matchCanvasName ||
          matchSede ||
          matchCarrera ||
          matchTeacher ||
          matchSection
        )
      })
    }

    return list
  }, [comparisonReport, filterStatus, searchQuery])

  // Paginación
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / itemsPerPage)
  )
  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  return (
    <div className="space-y-6">
      {/* 1. Barra Superior: Selectores de Caso Lado a Lado */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <GitCompare className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                Comparativa Lado a Lado
                <Badge variant="outline" className="text-xs font-normal">
                  BD vs Canvas LMS API
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Coteja en tiempo real cualquier caso de base de datos SQL contra una instantánea de Canvas API
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleExecuteComparison()}
            disabled={!selectedDbCaseId || !selectedCanvasCaseId || isComparing}
            className="text-xs h-8 gap-1.5"
          >
            {isComparing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            <span>Recalcular Comparativa</span>
          </Button>
        </div>

        {/* Rejilla de Selectores Dual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lado Izquierdo: Caso de Base de Datos */}
          <div className="p-3.5 rounded-lg border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Database className="size-3.5 text-blue-500" />
                <span>Caso Base de Datos (SQL Server)</span>
              </label>
              {selectedDbCaseId && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedDbCaseId}
                </span>
              )}
            </div>

            <select
              value={selectedDbCaseId}
              onChange={(e) => {
                const newId = e.target.value
                setSelectedDbCaseId(newId)
                if (newId && selectedCanvasCaseId) {
                  handleExecuteComparison(newId, selectedCanvasCaseId)
                }
              }}
              disabled={isLoadingCases || isComparing}
              className="w-full h-8 text-xs rounded-md border border-input bg-card px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {dbCases.length === 0 ? (
                <option value="">No hay casos de BD disponibles</option>
              ) : (
                dbCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({new Date(c.createdAt).toLocaleDateString()} -{' '}
                    {c.totalRows.toLocaleString()} reg.)
                  </option>
                ))
              )}
            </select>

            {comparisonReport?.dbCase && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                <span>
                  <strong>Cursos:</strong>{' '}
                  {comparisonReport.dbCase.totalCourses.toLocaleString()}
                </span>
                <span>•</span>
                <span>
                  <strong>Secciones:</strong>{' '}
                  {comparisonReport.dbCase.totalSections.toLocaleString()}
                </span>
                <span>•</span>
                <span>
                  <strong>Registros:</strong>{' '}
                  {comparisonReport.dbCase.totalRows.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Lado Derecho: Snapshot de Canvas LMS */}
          <div className="p-3.5 rounded-lg border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-emerald-500" />
                <span>Snapshot Canvas LMS (REST API)</span>
              </label>
              {selectedCanvasCaseId && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedCanvasCaseId}
                </span>
              )}
            </div>

            <select
              value={selectedCanvasCaseId}
              onChange={(e) => {
                const newId = e.target.value
                setSelectedCanvasCaseId(newId)
                if (selectedDbCaseId && newId) {
                  handleExecuteComparison(selectedDbCaseId, newId)
                }
              }}
              disabled={isLoadingCases || isComparing}
              className="w-full h-8 text-xs rounded-md border border-input bg-card px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {canvasCases.length === 0 ? (
                <option value="">No hay snapshots de Canvas disponibles</option>
              ) : (
                canvasCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({new Date(c.createdAt).toLocaleDateString()} -{' '}
                    {c.totalCourses} cursos)
                  </option>
                ))
              )}
            </select>

            {comparisonReport?.canvasCase && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                <span>
                  <strong>Cursos:</strong>{' '}
                  {comparisonReport.canvasCase.totalCourses.toLocaleString()}
                </span>
                <span>•</span>
                <span>
                  <strong>Cuentas:</strong>{' '}
                  {comparisonReport.canvasCase.totalAccounts.toLocaleString()}
                </span>
                <span>•</span>
                <span className="truncate max-w-[180px]">
                  <strong>Endpoint:</strong> {comparisonReport.canvasCase.endpoint}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mensaje de Error si existiese */}
      {comparisonError && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{comparisonError}</span>
        </div>
      )}

      {/* 3. Spinner de Carga de Comparativa */}
      {isComparing && (
        <div className="rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Comparando caso de BD con snapshot de Canvas LMS...
          </p>
          <p className="text-xs text-muted-foreground">
            Cotejando códigos SIS, nombres de cursos, secciones, docentes asignados y matrículas
          </p>
        </div>
      )}

      {/* 4. Tarjetas KPI de Resumen */}
      {comparisonReport && !isComparing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tarjeta Coincidentes */}
          <div
            onClick={() =>
              setFilterStatus((prev) => (prev === 'matched' ? 'all' : 'matched'))
            }
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'matched'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Coincidentes (100%)
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {comparisonReport.stats.matchedCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                (
                {comparisonReport.stats.totalItems > 0
                  ? Math.round(
                      (comparisonReport.stats.matchedCount /
                        comparisonReport.stats.totalItems) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Coinciden en BD y Canvas LMS
            </p>
          </div>

          {/* Tarjeta Con Diferencias */}
          <div
            onClick={() =>
              setFilterStatus((prev) => (prev === 'diff' ? 'all' : 'diff'))
            }
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'diff'
                ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Con Variaciones
              </span>
              <AlertTriangle className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {comparisonReport.stats.diffCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                (
                {comparisonReport.stats.totalItems > 0
                  ? Math.round(
                      (comparisonReport.stats.diffCount /
                        comparisonReport.stats.totalItems) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Difieren en nombre, secciones o cupos
            </p>
          </div>

          {/* Tarjeta Solo en BD */}
          <div
            onClick={() =>
              setFilterStatus((prev) => (prev === 'only_db' ? 'all' : 'only_db'))
            }
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'only_db'
                ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Solo en Base de Datos
              </span>
              <Database className="size-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {comparisonReport.stats.onlyDbCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                (Pendientes SIS)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Pendientes de exportar o migrar
            </p>
          </div>

          {/* Tarjeta Solo en Canvas */}
          <div
            onClick={() =>
              setFilterStatus((prev) =>
                prev === 'only_canvas' ? 'all' : 'only_canvas'
              )
            }
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'only_canvas'
                ? 'border-purple-500 bg-purple-500/10 shadow-xs'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Solo en Canvas LMS
              </span>
              <Globe className="size-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {comparisonReport.stats.onlyCanvasCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                (Externos)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cursos fuera del periodo o plantillas
            </p>
          </div>
        </div>
      )}

      {/* 5. Barra de Herramientas: Filtros, Buscador y Plegado */}
      {comparisonReport && !isComparing && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
          {/* Botones de Filtro por Categoría */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Todos ({comparisonReport.stats.totalItems})
            </button>
            <button
              onClick={() => setFilterStatus('diff')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filterStatus === 'diff'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Con Variaciones ({comparisonReport.stats.diffCount})
            </button>
            <button
              onClick={() => setFilterStatus('matched')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filterStatus === 'matched'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Coincidentes ({comparisonReport.stats.matchedCount})
            </button>
            <button
              onClick={() => setFilterStatus('only_db')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filterStatus === 'only_db'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Solo en BD ({comparisonReport.stats.onlyDbCount})
            </button>
            <button
              onClick={() => setFilterStatus('only_canvas')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filterStatus === 'only_canvas'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              Solo en Canvas ({comparisonReport.stats.onlyCanvasCount})
            </button>
          </div>

          {/* Buscador de Texto y Controles de Despliegue */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar código, nombre, docente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="text-xs h-8 pl-8 bg-background"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="text-xs h-8 whitespace-nowrap"
              title="Desplegar todas las secciones y detalles"
            >
              Desplegar Todo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="text-xs h-8 whitespace-nowrap"
              title="Plegar todos los detalles"
            >
              Plegar Todo
            </Button>
          </div>
        </div>
      )}

      {/* 6. Listado de Cursos Comparados Lado a Lado */}
      {comparisonReport && !isComparing && (
        <div className="space-y-4">
          {paginatedItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                No se encontraron cursos que coincidan con los filtros aplicados.
              </p>
              <p className="text-xs text-muted-foreground">
                Prueba cambiando el filtro de estado o limpiando la búsqueda.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus('all')
                  setSearchQuery('')
                }}
                className="text-xs mt-2"
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            paginatedItems.map((item) => (
              <ComparisonCourseRow
                key={item.id}
                item={item}
                isExpanded={expandedCourseIds.has(item.id)}
                onToggleExpand={() => toggleCourseExpand(item.id)}
              />
            ))
          )}

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 px-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)} de{' '}
                  {filteredItems.length} cursos
                </span>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Por pág:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-7 text-xs rounded border border-input bg-card px-1.5 text-foreground focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-xs h-8"
                >
                  Anterior
                </Button>
                <span className="text-xs font-medium px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="text-xs h-8"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Fila de Comparación de un Curso Individual Lado a Lado
 */
function ComparisonCourseRow({
  item,
  isExpanded,
  onToggleExpand,
}: {
  item: CaseComparisonItem
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const isMatched = item.status === 'matched'
  const isDiff = item.status === 'diff'
  const isOnlyDb = item.status === 'only_db'
  const isOnlyCanvas = item.status === 'only_canvas'

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden bg-card ${
        isMatched
          ? 'border-emerald-500/30'
          : isDiff
          ? 'border-amber-500/40 shadow-xs'
          : isOnlyDb
          ? 'border-blue-500/30'
          : 'border-purple-500/30'
      }`}
    >
      {/* Barra de Encabezado y Estado de la Comparativa */}
      <div className="p-3.5 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge de Estado Principal */}
          {isMatched && (
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1"
            >
              <CheckCircle2 className="size-3" />
              <span>Coincide 100%</span>
            </Badge>
          )}
          {isDiff && (
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1"
            >
              <AlertTriangle className="size-3" />
              <span>Variación de Datos</span>
            </Badge>
          )}
          {isOnlyDb && (
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 gap-1"
            >
              <Database className="size-3" />
              <span>Solo en Base de Datos</span>
            </Badge>
          )}
          {isOnlyCanvas && (
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 gap-1"
            >
              <Globe className="size-3" />
              <span>Solo en Canvas LMS</span>
            </Badge>
          )}

          <span className="font-mono text-xs font-bold text-foreground">
            {item.courseCode}
          </span>
          <span className="text-xs font-semibold text-foreground truncate max-w-md">
            {item.courseName}
          </span>
        </div>

        {/* Botón de Alternancia de Detalles */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <span>Ocultar Detalle</span>
                <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                <span>Ver Detalle</span>
                <ChevronDown className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Razón de Variación / Alertas si difieren */}
      {isDiff && item.variationReasons.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Discrepancias detectadas:</span>
          {item.variationReasons.map((reason, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-amber-500/20 text-[11px] font-medium"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Panel Dual Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Columna Izquierda: Caso de Base de Datos */}
        <div className="p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Database className="size-3.5" />
              <span>Base de Datos (SQL)</span>
            </span>
            {item.dbCourse && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {item.dbCourse.sectionsCount} sec. • {item.dbCourse.totalStudents} al. • {item.dbCourse.totalTeachers} doc.
              </span>
            )}
          </div>

          {item.dbCourse ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-foreground">
                  {item.dbCourse.name}
                </span>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {[item.dbCourse.sede, item.dbCourse.carrera, item.dbCourse.plan]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </div>

              {/* Docentes en BD */}
              {item.dbCourse.teacherNames.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Docentes asignados ({item.dbCourse.teacherNames.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.dbCourse.teacherNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-medium"
                      >
                        (D) {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose Expandido de Secciones en BD */}
              {isExpanded && item.dbCourse.sections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[11px] font-semibold text-foreground block">
                    Secciones Registradas ({item.dbCourse.sections.length}):
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {item.dbCourse.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-2 rounded border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-foreground">
                            {sec.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-2">
                            (ID: {sec.id})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {sec.studentsCount} alumnos
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {sec.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-border text-center space-y-1 bg-muted/5">
              <p className="text-xs font-medium text-muted-foreground">
                No existe en el caso de Base de Datos seleccionado
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                Este curso está registrado en Canvas pero no en la extracción SQL
              </p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Snapshot de Canvas LMS */}
        <div className="p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Globe className="size-3.5" />
              <span>Canvas LMS (Snapshot API)</span>
            </span>
            {item.canvasCourse && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {item.canvasCourse.sectionsCount} sec. • {item.canvasCourse.totalStudents} al. • {item.canvasCourse.totalTeachers} doc.
              </span>
            )}
          </div>

          {item.canvasCourse ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-foreground">
                  {item.canvasCourse.name}
                </span>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 font-mono">
                  <span>ID Canvas: #{item.canvasCourse.canvasId}</span>
                  {item.canvasCourse.sisCourseId && (
                    <span>• SIS: {item.canvasCourse.sisCourseId}</span>
                  )}
                  {item.canvasCourse.accountName && (
                    <span className="font-sans">
                      • {item.canvasCourse.accountName}
                    </span>
                  )}
                </div>
              </div>

              {/* Docentes en Canvas */}
              {item.canvasCourse.teacherNames.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Docentes asignados ({item.canvasCourse.teacherNames.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.canvasCourse.teacherNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium"
                      >
                        (D) {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose Expandido de Secciones en Canvas */}
              {isExpanded && item.canvasCourse.sections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[11px] font-semibold text-foreground block">
                    Secciones en Canvas ({item.canvasCourse.sections.length}):
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {item.canvasCourse.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-2 rounded border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-foreground">
                            {sec.name}
                          </span>
                          {sec.sisSectionId && (
                            <span className="text-[10px] text-muted-foreground ml-2">
                              (SIS: {sec.sisSectionId})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-sans">
                          {sec.totalStudents} alumnos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-border text-center space-y-1 bg-muted/5">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                No existe en este Snapshot de Canvas LMS
              </p>
              <p className="text-[10px] text-muted-foreground">
                Pendiente de exportación e importación SIS en Canvas LMS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
