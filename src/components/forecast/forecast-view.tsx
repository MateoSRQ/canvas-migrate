import * as React from 'react'
import {
  TrendingUp,
  Users,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Download,
  Search,
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  Loader2,
  ChevronsUpDown,
  Check,
  X,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Checkbox } from '#/components/ui/checkbox'
import { getCasesFn } from '#/server/functions/cases'
import { getForecastDataFn } from '#/server/functions/forecast'
import type {
  ForecastResult,
  ForecastCareerRow,
  ForecastCourseItem,
} from '#/server/services/forecast-service'

interface ForecastViewProps {
  initialCaseId?: string
}

export function ForecastView({ initialCaseId }: ForecastViewProps) {
  const [cases, setCases] = React.useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>(initialCaseId || '')
  const [selectedPeriodoIds, setSelectedPeriodoIds] = React.useState<number[]>([])
  const [selectedSedeId, setSelectedSedeId] = React.useState<number | 'all'>('all')
  const [metricMode, setMetricMode] = React.useState<'alumnos' | 'matriculas'>('alumnos')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [periodFilterSearch, setPeriodFilterSearch] = React.useState<string>('')
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState<boolean>(false)
  const [expandedCarreras, setExpandedCarreras] = React.useState<Set<number>>(new Set())
  const [loading, setLoading] = React.useState<boolean>(true)
  const [data, setData] = React.useState<ForecastResult | null>(null)

  const periodDropdownRef = React.useRef<HTMLDivElement>(null)

  // Click outside to close period dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        periodDropdownRef.current &&
        !periodDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPeriodDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 1. Cargar lista de casos al montar
  React.useEffect(() => {
    let mounted = true
    const loadCases = async () => {
      try {
        const list = await getCasesFn()
        if (mounted) {
          setCases(list)
          if (!selectedCaseId && list.length > 0) {
            // Seleccionar el caso más reciente completado o el primero
            const completed = list.find((c: any) => c.status === 'completed') || list[0]
            setSelectedCaseId(completed.id)
          }
        }
      } catch (err) {
        console.error('Error al cargar casos:', err)
      }
    }
    loadCases()
    return () => {
      mounted = false
    }
  }, [selectedCaseId])

  // 2. Cargar datos de previsión para el caso y filtros seleccionados
  React.useEffect(() => {
    if (!selectedCaseId) return
    let active = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const res = await getForecastDataFn({
          data: {
            caseId: selectedCaseId,
            periodoIds: selectedPeriodoIds.length === 0 ? null : selectedPeriodoIds,
            sedeId: selectedSedeId === 'all' ? null : selectedSedeId,
          },
        })
        if (active && res) {
          setData(res)
          // Si no había periodos seleccionados, inicializar con los asignados por el backend
          if (selectedPeriodoIds.length === 0 && res.selectedPeriodoIds.length > 0) {
            setSelectedPeriodoIds(res.selectedPeriodoIds)
          }
        }
      } catch (err) {
        console.error('Error al cargar previsión:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [selectedCaseId, selectedPeriodoIds, selectedSedeId])

  // Alternar selección de un periodo
  const togglePeriod = (periodId: number) => {
    setSelectedPeriodoIds((prev) => {
      if (prev.includes(periodId)) {
        // Evitar deseleccionar todos si se desea mantener al menos uno, o permitir vacío para "todos"
        const next = prev.filter((id) => id !== periodId)
        return next
      } else {
        return [...prev, periodId]
      }
    })
  }

  // Seleccionar únicamente un periodo
  const selectOnlyPeriod = (periodId: number) => {
    setSelectedPeriodoIds([periodId])
  }

  // Seleccionar todos los periodos
  const selectAllPeriods = () => {
    if (!data) return
    setSelectedPeriodoIds(data.periodos.map((p) => p.id))
  }

  // Limpiar / deseleccionar periodos
  const clearPeriods = () => {
    setSelectedPeriodoIds([])
  }

  // Alternar expansión de carrera individual
  const toggleCarreraExpand = (carrId: number) => {
    setExpandedCarreras((prev) => {
      const next = new Set(prev)
      if (next.has(carrId)) next.delete(carrId)
      else next.add(carrId)
      return next
    })
  }

  // Expandir todas las carreras
  const expandAllCarreras = () => {
    if (!data) return
    setExpandedCarreras(new Set(data.carreras.map((c) => c.carreraId)))
  }

  // Plegar todas las carreras
  const collapseAllCarreras = () => {
    setExpandedCarreras(new Set())
  }

  // Filtrado reactivo por texto (nombre de carrera, código de curso o nombre de curso)
  const filteredCarreras = React.useMemo(() => {
    if (!data) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return data.carreras

    return data.carreras
      .map((c) => {
        const matchesCarrera =
          c.carreraNombre.toLowerCase().includes(q) ||
          c.carreraCodigo.toLowerCase().includes(q) ||
          c.facultadNombre.toLowerCase().includes(q)

        const matchingCourses = c.courses.filter(
          (cr) =>
            cr.nombre.toLowerCase().includes(q) ||
            cr.codCurso.toLowerCase().includes(q) ||
            cr.planNombre.toLowerCase().includes(q)
        )

        if (matchesCarrera) {
          return c
        } else if (matchingCourses.length > 0) {
          return {
            ...c,
            courses: matchingCourses,
          }
        }
        return null
      })
      .filter((c): c is ForecastCareerRow => c !== null)
  }, [data, searchQuery])

  // Filtrar periodos para el selector modal
  const filteredPeriodsForDropdown = React.useMemo(() => {
    if (!data) return []
    const q = periodFilterSearch.trim().toLowerCase()
    if (!q) return data.periodos
    return data.periodos.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [data, periodFilterSearch])

  // Texto amigable para el selector de periodos
  const periodSelectorLabel = React.useMemo(() => {
    if (!data || data.periodos.length === 0) return 'Sin periodos'
    if (selectedPeriodoIds.length === 0 || selectedPeriodoIds.length === data.periodos.length) {
      return `Todos los Periodos (${data.periodos.length})`
    }
    if (selectedPeriodoIds.length === 1) {
      const found = data.periodos.find((p) => p.id === selectedPeriodoIds[0])
      return found ? found.nombre : `Periodo ${selectedPeriodoIds[0]}`
    }
    return `${selectedPeriodoIds.length} periodos seleccionados`
  }, [data, selectedPeriodoIds])

  // Exportar matriz a archivo CSV
  const handleExportCsv = () => {
    if (!data) return

    let periodLabel = 'PERIODOS'
    if (selectedPeriodoIds.length === 0 || selectedPeriodoIds.length === data.periodos.length) {
      periodLabel = 'TODOS_LOS_PERIODOS'
    } else if (selectedPeriodoIds.length === 1) {
      const p = data.periodos.find((x) => x.id === selectedPeriodoIds[0])
      periodLabel = p ? p.nombre.replace(/\s+/g, '_') : String(selectedPeriodoIds[0])
    } else {
      periodLabel = `${selectedPeriodoIds.length}_PERIODOS`
    }

    const cyclesHeaders = data.ciclos.map((c) => `"${c.nombre}"`).join(',')
    const headerRow = `"CÓDIGO","CARRERA","FACULTAD",${cyclesHeaders},"TOTAL GENERAL"`

    const rows = filteredCarreras.map((c) => {
      const cycleValues = data.ciclos.map((cy) => {
        const val = metricMode === 'alumnos' ? c.byCycle[cy.nombre]?.alumnos || 0 : c.byCycle[cy.nombre]?.matriculas || 0
        return val
      })
      const total = metricMode === 'alumnos' ? c.totalAlumnos : c.totalMatriculas
      return `"${c.carreraCodigo}","${c.carreraNombre}","${c.facultadNombre}",${cycleValues.join(',')},${total}`
    })

    // Fila de totales
    const totalCycleValues = data.ciclos.map((cy) => {
      return metricMode === 'alumnos' ? data.totals.byCycle[cy.nombre]?.alumnos || 0 : data.totals.byCycle[cy.nombre]?.matriculas || 0
    })
    const grandTotal = metricMode === 'alumnos' ? data.totals.totalAlumnosGeneral : data.totals.totalMatriculasGeneral
    const totalRow = `"TOTAL","TOTAL GENERAL","",${totalCycleValues.join(',')},${grandTotal}`

    // Sección de cursos detallados
    const coursesHeader = `\n\n"DETALLE DE CURSOS POR CARRERA Y CICLO"\n"CARRERA","CICLO","CÓDIGO CURSO","ASIGNATURA","PLAN","CRÉDITOS","SECCIONES","MATRICULADOS"`
    const courseRows: string[] = []
    for (const c of filteredCarreras) {
      for (const cr of c.courses) {
        courseRows.push(
          `"${c.carreraNombre}","${cr.cicloNombre}","${cr.codCurso}","${cr.nombre}","${cr.planNombre}",${cr.creditos},${cr.seccionesCount},${cr.alumnosCount}`
        )
      }
    }

    const csvContent = [headerRow, ...rows, totalRow, coursesHeader, ...courseRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `prevision_matricula_${data.caseId}_${periodLabel}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-5">
      {/* Top Filter & Command Bar */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUp className="size-4" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                Previsión de Matrícula (Forecast)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Matriz consolidada de alumnos matriculados por carrera, ciclo y desglose curricular con soporte multi-periodo.
            </p>
          </div>

          {/* Action buttons: Metric switcher & CSV export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMetricMode('alumnos')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  metricMode === 'alumnos'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="size-3.5" />
                <span>Alumnos Únicos</span>
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('matriculas')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  metricMode === 'matriculas'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="size-3.5" />
                <span>Matrículas-Curso (Cupos)</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!data || loading}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          {/* Case Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3 text-muted-foreground" />
              <span>Caso de Base de Datos</span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value)
                setSelectedPeriodoIds([]) // Resetear para que el nuevo caso use su periodo por defecto
              }}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalRows?.toLocaleString() || 0} filas)
                </option>
              ))}
            </select>
          </div>

          {/* Academic Period Multi-Selector Popover */}
          <div className="space-y-1 relative" ref={periodDropdownRef}>
            <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3 text-muted-foreground" />
                <span>Periodos Académicos</span>
              </span>
              {data && (
                <span className="text-[10px] text-muted-foreground">
                  {selectedPeriodoIds.length === 0 || selectedPeriodoIds.length === data.periodos.length
                    ? 'Todos activos'
                    : `${selectedPeriodoIds.length} de ${data.periodos.length}`}
                </span>
              )}
            </label>

            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
              disabled={!data || loading}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 text-foreground flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="truncate">{periodSelectorLabel}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedPeriodoIds.length > 1 && selectedPeriodoIds.length < (data?.periodos.length || 0) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                    {selectedPeriodoIds.length}
                  </Badge>
                )}
                <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-60" />
              </div>
            </button>

            {/* Dropdown Popover Card */}
            {isPeriodDropdownOpen && data && (
              <div className="absolute z-50 left-0 top-full mt-1 w-full sm:w-[360px] rounded-xl border border-border bg-popover text-popover-foreground p-3 shadow-xl space-y-2.5">
                {/* Search in periods */}
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar periodos..."
                    value={periodFilterSearch}
                    onChange={(e) => setPeriodFilterSearch(e.target.value)}
                    className="h-8 text-xs pl-8 pr-7"
                  />
                  {periodFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setPeriodFilterSearch('')}
                      className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Batch controls */}
                <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {filteredPeriodsForDropdown.length} periodos disponibles
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={selectAllPeriods}
                      className="text-[11px] text-primary hover:underline px-1.5 py-0.5 font-medium rounded hover:bg-muted/50"
                    >
                      Todos
                    </button>
                    <span className="text-muted-foreground/40">•</span>
                    <button
                      type="button"
                      onClick={clearPeriods}
                      className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 font-medium rounded hover:bg-muted/50"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Checkbox list */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 divide-y divide-border/30">
                  {filteredPeriodsForDropdown.map((p) => {
                    const isChecked = selectedPeriodoIds.includes(p.id)

                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePeriod(p.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group ${
                          isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => togglePeriod(p.id)}
                            className="shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs font-medium truncate ${
                                isChecked ? 'text-primary font-semibold' : 'text-foreground'
                              }`}
                            >
                              {p.nombre}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {p.totalAlumnos.toLocaleString()} alumnos • {p.totalMatriculas.toLocaleString()} matrículas
                            </span>
                          </div>
                        </div>

                        {/* Solo button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectOnlyPeriod(p.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-opacity whitespace-nowrap"
                        >
                          Solo este
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {selectedPeriodoIds.length} seleccionados
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsPeriodDropdownOpen(false)}
                    className="h-7 text-xs px-3"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Campus / Sede Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3 text-muted-foreground" />
              <span>Sede Institucional</span>
            </label>
            <select
              value={selectedSedeId}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSedeId(val === 'all' ? 'all' : Number(val))
              }}
              disabled={!data || loading}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Todas las Sedes ({data?.sedes.length || 0})</option>
              {data?.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Search text input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Search className="size-3 text-muted-foreground" />
              <span>Filtrar Carrera o Asignatura</span>
            </label>
            <div className="relative">
              <Input
                placeholder="Buscar carrera, curso o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs pr-7"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Key Metrics Summary Bar & Active Filter Badges */}
        {data && !loading && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-foreground">
                {filteredCarreras.length} {filteredCarreras.length === 1 ? 'Carrera' : 'Carreras'}
              </span>
              <span>•</span>
              <span>
                Total Alumnos:{' '}
                <strong className="text-foreground">
                  {data.totals.totalAlumnosGeneral.toLocaleString()}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total Matrículas:{' '}
                <strong className="text-foreground">
                  {data.totals.totalMatriculasGeneral.toLocaleString()}
                </strong>
              </span>
              <span>•</span>
              <span>
                Ciclos Activos:{' '}
                <strong className="text-foreground">{data.ciclos.length}</strong>
              </span>

              {/* Active period badges */}
              {selectedPeriodoIds.length > 0 && selectedPeriodoIds.length < data.periodos.length && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedPeriodoIds.map((pid) => {
                      const p = data.periodos.find((x) => x.id === pid)
                      if (!p) return null
                      return (
                        <Badge
                          key={pid}
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        >
                          <span>{p.nombre}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePeriod(pid)
                            }}
                            className="hover:text-destructive transition-colors ml-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAllCarreras}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Expandir Todo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAllCarreras}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Plegar Todo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Content Panel */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col min-h-[420px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Calculando previsión de matrícula...</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Procesando matriz consolidada para {selectedPeriodoIds.length === 0 ? 'todos los periodos' : `${selectedPeriodoIds.length} periodos seleccionados`}.
            </p>
          </div>
        ) : !data || filteredCarreras.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2">
            <GraduationCap className="size-10 text-muted-foreground/50" />
            <h3 className="text-sm font-semibold">No se encontraron matrículas para los periodos o filtros seleccionados</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery
                ? `No hay carreras o cursos que coincidan con "${searchQuery}".`
                : 'Intenta seleccionar otro conjunto de periodos o sede institucional.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="py-3 px-4 font-semibold text-foreground min-w-[280px] sticky left-0 z-20 bg-muted/95 backdrop-blur">
                    Carrera / Programa Académico
                  </th>
                  {data.ciclos.map((cy) => (
                    <th
                      key={cy.nombre}
                      className="py-3 px-3 font-semibold text-foreground text-center min-w-[84px]"
                    >
                      {cy.nombre}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-foreground text-right min-w-[110px] bg-muted/60">
                    Total {metricMode === 'alumnos' ? 'Alumnos' : 'Cupos'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCarreras.map((carr) => {
                  const isExpanded = expandedCarreras.has(carr.carreraId)
                  const totalValue =
                    metricMode === 'alumnos' ? carr.totalAlumnos : carr.totalMatriculas

                  return (
                    <React.Fragment key={carr.carreraId}>
                      <tr
                        className={`group transition-colors hover:bg-muted/40 ${
                          isExpanded ? 'bg-muted/20' : ''
                        }`}
                      >
                        {/* Career title column (sticky left) */}
                        <td className="py-2.5 px-4 sticky left-0 z-10 bg-card group-hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCarreraExpand(carr.carreraId)}
                              aria-label={isExpanded ? 'Plegar cursos' : 'Expandir cursos'}
                              className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-3.5 text-primary" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </button>

                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground tracking-tight truncate">
                                {carr.carreraNombre}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className="font-mono text-muted-foreground/80">
                                  {carr.carreraCodigo}
                                </span>
                                <span>•</span>
                                <span className="truncate">{carr.facultadNombre}</span>
                                <span>•</span>
                                <span>{carr.courses.length} asignaturas</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cycles columns */}
                        {data.ciclos.map((cy) => {
                          const cycleData = carr.byCycle[cy.nombre]
                          const value =
                            metricMode === 'alumnos'
                              ? cycleData?.alumnos || 0
                              : cycleData?.matriculas || 0

                          return (
                            <td
                              key={cy.nombre}
                              className="py-2.5 px-3 text-center font-medium"
                            >
                              {value > 0 ? (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                                  {value}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30 font-light">—</span>
                              )}
                            </td>
                          )
                        })}

                        {/* Total column */}
                        <td className="py-2.5 px-4 text-right bg-card/60 group-hover:bg-muted/40">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                            {totalValue.toLocaleString()}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Courses Nested Table */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b border-border/80">
                          <td colSpan={data.ciclos.length + 2} className="p-3 pl-8 sm:pl-10">
                            <div className="rounded-lg border border-border/80 bg-background overflow-hidden shadow-2xs">
                              <div className="py-2 px-3 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                <span>
                                  Asignaturas y Cursos Aperturados ({carr.courses.length})
                                </span>
                                <span>{carr.carreraNombre}</span>
                              </div>

                              <table className="w-full text-left text-[11px] divide-y divide-border/40">
                                <thead>
                                  <tr className="bg-muted/20 text-muted-foreground font-semibold">
                                    <th className="py-1.5 px-3">Ciclo</th>
                                    <th className="py-1.5 px-3">Código</th>
                                    <th className="py-1.5 px-3">Asignatura / Curso</th>
                                    <th className="py-1.5 px-3">Plan Curricular</th>
                                    <th className="py-1.5 px-3 text-center">Créditos</th>
                                    <th className="py-1.5 px-3 text-center">Secciones</th>
                                    <th className="py-1.5 px-3 text-right">
                                      Matriculados
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {carr.courses.map((cr) => (
                                    <tr
                                      key={cr.cursoId}
                                      className="hover:bg-muted/30 transition-colors"
                                    >
                                      <td className="py-1.5 px-3 font-medium whitespace-nowrap">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                          {cr.cicloNombre}
                                        </Badge>
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                                        {cr.codCurso}
                                      </td>
                                      <td className="py-1.5 px-3 font-medium text-foreground">
                                        {cr.nombre}
                                      </td>
                                      <td className="py-1.5 px-3 text-muted-foreground truncate max-w-[200px]">
                                        {cr.planNombre}
                                      </td>
                                      <td className="py-1.5 px-3 text-center text-muted-foreground">
                                        {cr.creditos} cr
                                      </td>
                                      <td className="py-1.5 px-3 text-center text-muted-foreground">
                                        {cr.seccionesCount} sec
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-bold text-foreground">
                                        {cr.alumnosCount}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>

              {/* Totals Summary Footer */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-semibold text-foreground">
                  <td className="py-3 px-4 sticky left-0 z-10 bg-muted/95 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span>TOTAL GENERAL</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                        {filteredCarreras.length} Carreras
                      </Badge>
                    </div>
                  </td>
                  {data.ciclos.map((cy) => {
                    const sum =
                      metricMode === 'alumnos'
                        ? data.totals.byCycle[cy.nombre]?.alumnos || 0
                        : data.totals.byCycle[cy.nombre]?.matriculas || 0

                    return (
                      <td key={cy.nombre} className="py-3 px-3 text-center">
                        <span className="font-bold text-xs">{sum.toLocaleString()}</span>
                      </td>
                    )
                  })}
                  <td className="py-3 px-4 text-right bg-muted/80">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black bg-primary text-primary-foreground shadow-xs">
                      {(metricMode === 'alumnos'
                        ? data.totals.totalAlumnosGeneral
                        : data.totals.totalMatriculasGeneral
                      ).toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
