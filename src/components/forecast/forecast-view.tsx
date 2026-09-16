import * as React from 'react'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  UserMinus,
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
  Sparkles,
  ArrowRight,
  Sliders,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Checkbox } from '#/components/ui/checkbox'
import { Slider } from '#/components/ui/slider'
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
  const [isPeriodInitialized, setIsPeriodInitialized] = React.useState<boolean>(false)
  const [selectedSedeId, setSelectedSedeId] = React.useState<number | 'all'>('all')
  const [metricMode, setMetricMode] = React.useState<'alumnos' | 'matriculas'>('alumnos')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [periodFilterSearch, setPeriodFilterSearch] = React.useState<string>('')
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState<boolean>(false)
  const [expandedCarreras, setExpandedCarreras] = React.useState<Set<number>>(new Set())
  const [loading, setLoading] = React.useState<boolean>(true)
  const [data, setData] = React.useState<ForecastResult | null>(null)

  // Predicción del siguiente semestre:
  // 1. Tasa de Deserción: personas que abandonan y se restan primero (0% a 100%, nunca negativo)
  // 2. Tasa de Traslado: de los que quedan, % que pasa al siguiente ciclo (100% a 0%)
  // 3. Tasa de Repitencia: (100 - traslado)%, se suma al ciclo actual pues repiten
  const [enablePrediction, setEnablePrediction] = React.useState<boolean>(true)
  const [desercionRate, setDesercionRate] = React.useState<number>(0) // 0% a 100%
  const [retentionRate, setRetentionRate] = React.useState<number>(100) // 100% a 0%
  const [showEmptyCycles, setShowEmptyCycles] = React.useState<boolean>(false)

  const periodDropdownRef = React.useRef<HTMLDivElement>(null)

  // Click outside para cerrar el selector de periodos
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

  // Resetear inicialización de periodos cuando cambie el caso
  React.useEffect(() => {
    setIsPeriodInitialized(false)
    setSelectedPeriodoIds([])
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
            periodoIds: isPeriodInitialized ? selectedPeriodoIds : null,
            sedeId: selectedSedeId === 'all' ? null : selectedSedeId,
          },
        })
        if (active && res) {
          setData(res)
          // Al inicio se marca UN SOLO periodo (el principal con más matrículas)
          if (!isPeriodInitialized && res.selectedPeriodoIds.length > 0) {
            setSelectedPeriodoIds(res.selectedPeriodoIds)
            setIsPeriodInitialized(true)
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
  }, [selectedCaseId, selectedPeriodoIds, selectedSedeId, isPeriodInitialized])

  // Alternar selección de un periodo
  const togglePeriod = (periodId: number) => {
    setIsPeriodInitialized(true)
    setSelectedPeriodoIds((prev) => {
      if (prev.includes(periodId)) {
        return prev.filter((id) => id !== periodId)
      } else {
        return [...prev, periodId]
      }
    })
  }

  // Seleccionar únicamente un periodo
  const selectOnlyPeriod = (periodId: number) => {
    setIsPeriodInitialized(true)
    setSelectedPeriodoIds([periodId])
  }

  // Seleccionar todos los periodos
  const selectAllPeriods = () => {
    if (!data) return
    setIsPeriodInitialized(true)
    setSelectedPeriodoIds(data.periodos.map((p) => p.id))
  }

  // Limpiar / deseleccionar periodos
  const clearPeriods = () => {
    setIsPeriodInitialized(true)
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

  // Cálculo del desglose y valor proyectado para un ciclo dado de una carrera
  // Reglas:
  // 1. Deserción (desercionRate): Se restan primero los alumnos que abandonan (0% a 100%, nunca negativo).
  // 2. Traslado vs Repitencia:
  //    De los que quedan tras deserción:
  //    - Traslado (retentionRate): Pasan al siguiente ciclo (k + 1).
  //    - Repitencia (100 - retentionRate): No pasan; repiten y se quedan en el ciclo actual (k).
  // 3. Proyectado para el Ciclo k:
  //    Repitentes del Ciclo k + Promovidos del Ciclo anterior (k - 1)
  const getProjectedBreakdownForCycle = React.useCallback(
    (
      carr: ForecastCareerRow,
      cy: { nombre: string; orden: number }
    ): { projected: number; repitentes: number; promovidos: number; desercion: number } => {
      if (!data) return { projected: 0, repitentes: 0, promovidos: 0, desercion: 0 }

      const actualCurrent =
        metricMode === 'alumnos'
          ? carr.byCycle[cy.nombre]?.alumnos || 0
          : carr.byCycle[cy.nombre]?.matriculas || 0

      const dRate = Math.max(0, Math.min(100, desercionRate))
      const tRate = Math.max(0, Math.min(100, retentionRate))

      // 1. Deserción del ciclo actual (se resta primero antes de cualquier otro cálculo)
      const dCurrent = Math.round(actualCurrent * (dRate / 100))
      const remainCurrent = Math.max(0, actualCurrent - dCurrent)

      // 2. De los que quedan: el porcentaje que no pasa repite el ciclo actual
      const pasanSiguienteCurrent = Math.round(remainCurrent * (tRate / 100))
      const repitentesCurrent = Math.max(0, remainCurrent - pasanSiguienteCurrent)

      // 3. Alumnos que avanzan desde el ciclo anterior (k - 1)
      let promovidosFromPrev = 0
      if (cy.orden > 1) {
        const prevCycle = data.ciclos.find((c) => c.orden === cy.orden - 1)
        if (prevCycle) {
          const actualPrev =
            metricMode === 'alumnos'
              ? carr.byCycle[prevCycle.nombre]?.alumnos || 0
              : carr.byCycle[prevCycle.nombre]?.matriculas || 0

          const dPrev = Math.round(actualPrev * (dRate / 100))
          const remainPrev = Math.max(0, actualPrev - dPrev)
          promovidosFromPrev = Math.round(remainPrev * (tRate / 100))
        }
      }

      const projected = repitentesCurrent + promovidosFromPrev

      return {
        projected,
        repitentes: repitentesCurrent,
        promovidos: promovidosFromPrev,
        desercion: dCurrent,
      }
    },
    [data, metricMode, desercionRate, retentionRate]
  )

  const getProjectedForCycle = React.useCallback(
    (carr: ForecastCareerRow, cy: { nombre: string; orden: number }): number => {
      return getProjectedBreakdownForCycle(carr, cy).projected
    },
    [getProjectedBreakdownForCycle]
  )

  // Filtrado reactivo por texto
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

  // Ciclos visibles en la tabla (filtrados para que solo aparezcan ciclos con datos o proyecciones activas)
  const visibleCycles = React.useMemo(() => {
    if (!data) return []
    if (showEmptyCycles) return data.ciclos

    return data.ciclos.filter((cy) => {
      const hasActual = filteredCarreras.some((c) => {
        const val =
          metricMode === 'alumnos'
            ? c.byCycle[cy.nombre]?.alumnos || 0
            : c.byCycle[cy.nombre]?.matriculas || 0
        return val > 0
      })
      if (hasActual) return true

      if (enablePrediction) {
        const hasProjected = filteredCarreras.some(
          (c) => getProjectedForCycle(c, cy) > 0
        )
        if (hasProjected) return true
      }

      return false
    })
  }, [
    data,
    showEmptyCycles,
    filteredCarreras,
    metricMode,
    enablePrediction,
    getProjectedForCycle,
  ])

  // Totales de proyección por ciclo
  const projectedTotalsByCycle = React.useMemo(() => {
    const res: Record<string, number> = {}
    if (!data) return res
    for (const cy of data.ciclos) {
      res[cy.nombre] = filteredCarreras.reduce(
        (acc, c) => acc + getProjectedForCycle(c, cy),
        0
      )
    }
    return res
  }, [data, filteredCarreras, getProjectedForCycle])

  // Gran total proyectado (suma de todas las proyecciones de ciclos visibles)
  const projectedGrandTotal = React.useMemo(() => {
    return visibleCycles.reduce(
      (acc, cy) => acc + (projectedTotalsByCycle[cy.nombre] || 0),
      0
    )
  }, [visibleCycles, projectedTotalsByCycle])

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
    if (selectedPeriodoIds.length === 0) {
      return 'Sin periodos seleccionados'
    }
    if (selectedPeriodoIds.length === data.periodos.length) {
      return `Todos los Periodos (${data.periodos.length})`
    }
    if (selectedPeriodoIds.length === 1) {
      const found = data.periodos.find((p) => p.id === selectedPeriodoIds[0])
      return found ? found.nombre : `Periodo ${selectedPeriodoIds[0]}`
    }
    return `${selectedPeriodoIds.length} periodos seleccionados`
  }, [data, selectedPeriodoIds])

  // Exportar matriz a archivo CSV con soporte para Proyección
  const handleExportCsv = () => {
    if (!data) return

    let periodLabel = 'PERIODOS'
    if (selectedPeriodoIds.length === 0) {
      periodLabel = 'SIN_PERIODOS'
    } else if (selectedPeriodoIds.length === data.periodos.length) {
      periodLabel = 'TODOS_LOS_PERIODOS'
    } else if (selectedPeriodoIds.length === 1) {
      const p = data.periodos.find((x) => x.id === selectedPeriodoIds[0])
      periodLabel = p
        ? p.nombre.replace(/\s+/g, '_')
        : String(selectedPeriodoIds[0])
    } else {
      periodLabel = `${selectedPeriodoIds.length}_PERIODOS`
    }

    const metricLabel = metricMode === 'alumnos' ? 'ALUMNOS' : 'CUPOS'

    let headerRow = ''
    if (enablePrediction) {
      const cycleCols: string[] = []
      visibleCycles.forEach((cy) => {
        cycleCols.push(`"${cy.nombre} Actual"`, `"${cy.nombre} Proyectado"`)
      })
      headerRow = `"CÓDIGO","CARRERA","FACULTAD",${cycleCols.join(',')},"TOTAL ACTUAL","TOTAL PROYECTADO"`
    } else {
      const cyclesHeaders = visibleCycles.map((c) => `"${c.nombre}"`).join(',')
      headerRow = `"CÓDIGO","CARRERA","FACULTAD",${cyclesHeaders},"TOTAL GENERAL"`
    }

    const rows = filteredCarreras.map((c) => {
      const totalActual =
        metricMode === 'alumnos' ? c.totalAlumnos : c.totalMatriculas
      const totalProj = visibleCycles.reduce(
        (acc, cy) => acc + getProjectedForCycle(c, cy),
        0
      )

      if (enablePrediction) {
        const cycleValues: (number | string)[] = []
        visibleCycles.forEach((cy) => {
          const act =
            metricMode === 'alumnos'
              ? c.byCycle[cy.nombre]?.alumnos || 0
              : c.byCycle[cy.nombre]?.matriculas || 0
          const prj = getProjectedForCycle(c, cy)
          cycleValues.push(act, prj)
        })
        return `"${c.carreraCodigo}","${c.carreraNombre}","${c.facultadNombre}",${cycleValues.join(',')},${totalActual},${totalProj}`
      } else {
        const cycleValues = visibleCycles.map((cy) => {
          return metricMode === 'alumnos'
            ? c.byCycle[cy.nombre]?.alumnos || 0
            : c.byCycle[cy.nombre]?.matriculas || 0
        })
        return `"${c.carreraCodigo}","${c.carreraNombre}","${c.facultadNombre}",${cycleValues.join(',')},${totalActual}`
      }
    })

    // Fila de totales
    let totalRow = ''
    if (enablePrediction) {
      const totalCycleValues: (number | string)[] = []
      visibleCycles.forEach((cy) => {
        const act =
          metricMode === 'alumnos'
            ? data.totals.byCycle[cy.nombre]?.alumnos || 0
            : data.totals.byCycle[cy.nombre]?.matriculas || 0
        const prj = projectedTotalsByCycle[cy.nombre] || 0
        totalCycleValues.push(act, prj)
      })
      const grandActual =
        metricMode === 'alumnos'
          ? data.totals.totalAlumnosGeneral
          : data.totals.totalMatriculasGeneral
      totalRow = `"TOTAL","TOTAL GENERAL","",${totalCycleValues.join(',')},${grandActual},${projectedGrandTotal}`
    } else {
      const totalCycleValues = visibleCycles.map((cy) => {
        return metricMode === 'alumnos'
          ? data.totals.byCycle[cy.nombre]?.alumnos || 0
          : data.totals.byCycle[cy.nombre]?.matriculas || 0
      })
      const grandActual =
        metricMode === 'alumnos'
          ? data.totals.totalAlumnosGeneral
          : data.totals.totalMatriculasGeneral
      totalRow = `"TOTAL","TOTAL GENERAL","",${totalCycleValues.join(',')},${grandActual}`
    }

    // Detalle de cursos
    const coursesHeader = `\n\n"DETALLE DE CURSOS POR CARRERA Y CICLO (MÉTRICA: ${metricLabel})"\n"CARRERA","CICLO","CÓDIGO CURSO","ASIGNATURA","PLAN","CRÉDITOS","SECCIONES","MATRICULADOS ACTUALES"${enablePrediction ? ',"PROYECCIÓN ESTIMADA"' : ''}`
    const courseRows: string[] = []
    for (const c of filteredCarreras) {
      for (const cr of c.courses) {
        if (enablePrediction) {
          const cyObj = data.ciclos.find((x) => x.orden === cr.cicloOrden)
          const cycleActual = cyObj
            ? metricMode === 'alumnos'
              ? c.byCycle[cyObj.nombre]?.alumnos || 0
              : c.byCycle[cyObj.nombre]?.matriculas || 0
            : 0
          const cycleProj = cyObj ? getProjectedForCycle(c, cyObj) : 0
          const courseProjected =
            cycleActual > 0
              ? Math.round(cr.alumnosCount * (cycleProj / cycleActual))
              : (cr.alumnosCount > 0 ? Math.max(0, Math.round(cr.alumnosCount * ((100 - desercionRate) / 100))) : 0)

          courseRows.push(
            `"${c.carreraNombre}","${cr.cicloNombre}","${cr.codCurso}","${cr.nombre}","${cr.planNombre}",${cr.creditos},${cr.seccionesCount},${cr.alumnosCount},${courseProjected}`
          )
        } else {
          courseRows.push(
            `"${c.carreraNombre}","${cr.cicloNombre}","${cr.codCurso}","${cr.nombre}","${cr.planNombre}",${cr.creditos},${cr.seccionesCount},${cr.alumnosCount}`
          )
        }
      }
    }

    const metadataHeader = `"PREVISIÓN DE MATRÍCULA Y PROYECCIÓN DE COHORTES"\n"CASO","${data.caseName}"\n"PERIODOS","${periodLabel}"\n"TASA DESERCIÓN","${enablePrediction ? `${desercionRate}%` : 'N/A'}"\n"TASA TRASLADO","${enablePrediction ? `${retentionRate}%` : 'N/A'}"\n"TASA REPITENCIA","${enablePrediction ? `${100 - retentionRate}%` : 'N/A'}"\n\n`

    const csvContent = [metadataHeader, headerRow, ...rows, totalRow, coursesHeader, ...courseRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `prevision_matricula_${data.caseId}_${periodLabel}_${enablePrediction ? `prediccion_t${retentionRate}_d${desercionRate}` : 'actual'}.csv`
    )
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
              Matriz comparativa de matriculados por carrera y ciclo con motor de predicción del siguiente semestre por avance de cohortes.
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
                setSelectedPeriodoIds([])
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
                  {selectedPeriodoIds.length === 0
                    ? 'Ninguno seleccionado'
                    : selectedPeriodoIds.length === data.periodos.length
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
                {selectedPeriodoIds.length > 1 &&
                  selectedPeriodoIds.length < (data?.periodos.length || 0) && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                    >
                      {selectedPeriodoIds.length}
                    </Badge>
                  )}
                <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-60" />
              </div>
            </button>

            {/* Dropdown Popover Card */}
            {isPeriodDropdownOpen && data && (
              <div className="absolute z-50 left-0 top-full mt-1 w-full sm:w-[360px] rounded-xl border border-border bg-popover text-popover-foreground p-3 shadow-xl space-y-2.5">
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
                                isChecked
                                  ? 'text-primary font-semibold'
                                  : 'text-foreground'
                              }`}
                            >
                              {p.nombre}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {p.totalAlumnos.toLocaleString()} alumnos •{' '}
                              {p.totalMatriculas.toLocaleString()} matrículas
                            </span>
                          </div>
                        </div>

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

        {/* Dedicated Cohort Advancement Forecast Card with Slider */}
        <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-500/[0.04] via-emerald-500/[0.04] to-transparent p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">
                    Predicción del Siguiente Semestre (Avance de Cohortes)
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-2 font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  >
                    Activa
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Proyección: <span className="font-semibold text-foreground">Ciclo 2 ← Ciclo 1</span>,{' '}
                  <span className="font-semibold text-foreground">Ciclo 3 ← Ciclo 2</span>,{' '}
                  <span className="font-semibold text-foreground">Ciclo 4 ← Ciclo 3</span>... aplicando la tasa de traslado.
                </p>
              </div>
            </div>

            {/* Toggle button to enable/disable projection view */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                size="sm"
                variant={enablePrediction ? 'default' : 'outline'}
                onClick={() => setEnablePrediction((prev) => !prev)}
                className={`h-7 px-3 text-xs gap-1.5 ${
                  enablePrediction
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'text-muted-foreground'
                }`}
              >
                <Sparkles className="size-3" />
                <span>{enablePrediction ? 'Ocultar Proyección' : 'Mostrar Proyección'}</span>
              </Button>
            </div>
          </div>

          {enablePrediction && (
            <div className="pt-3 border-t border-border/40 space-y-3">
              {/* Dual Sliders Grid: Deserción (Abandono) y Traslado (Pase de Ciclo) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Slider Deserción (Rose accent) */}
                <div className="rounded-lg border border-rose-200 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />
                      <span>1. Tasa de Deserción (Abandono):</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md shadow-2xs">
                        {desercionRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">se restan primero</span>
                    </div>
                  </div>

                  {/* Slider component from 0% to 100% */}
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">0%</span>
                    <Slider
                      value={[desercionRate]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) => setDesercionRate(Math.max(0, Math.min(100, val[0])))}
                      rangeClassName="bg-rose-500 dark:bg-rose-600"
                      thumbClassName="border-rose-500 focus-visible:ring-rose-500/50"
                      className="flex-1"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">100%</span>
                  </div>

                  {/* Preset Chips */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1">Preajustes:</span>
                    {[
                      { label: '0% (Sin deserción)', val: 0 },
                      { label: '5%', val: 5 },
                      { label: '10%', val: 10 },
                      { label: '15%', val: 15 },
                      { label: '20%', val: 20 },
                      { label: '30%', val: 30 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setDesercionRate(p.val)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          desercionRate === p.val
                            ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Slider Traslado / Retención (Purple accent) */}
                <div className="rounded-lg border border-purple-200 dark:border-purple-950/60 bg-purple-50/40 dark:bg-purple-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <ArrowRight className="size-3.5 text-purple-600 dark:text-purple-400" />
                      <span>2. Tasa de Traslado (Pase de Ciclo):</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 px-2 py-0.5 rounded-md shadow-2xs">
                        {retentionRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">pasan de ciclo</span>
                    </div>
                  </div>

                  {/* Slider component from 0% to 100% */}
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">0%</span>
                    <Slider
                      value={[retentionRate]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) => setRetentionRate(Math.max(0, Math.min(100, val[0])))}
                      rangeClassName="bg-purple-600 dark:bg-purple-500"
                      thumbClassName="border-purple-600 dark:border-purple-500 focus-visible:ring-purple-500/50"
                      className="flex-1"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">100%</span>
                  </div>

                  {/* Preset Chips */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1">Preajustes:</span>
                    {[
                      { label: '100% (Pasan todos)', val: 100 },
                      { label: '90%', val: 90 },
                      { label: '85%', val: 85 },
                      { label: '75%', val: 75 },
                      { label: '50%', val: 50 },
                      { label: '0% (Todos repiten)', val: 0 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setRetentionRate(p.val)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          retentionRate === p.val
                            ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Explanatory Pipeline Flow and Visual Legend Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/70 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-foreground">Regla de simulación:</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 gap-1 font-medium">
                    <TrendingDown className="size-2.5" />
                    Deserción: {desercionRate}% (abandonan)
                  </Badge>
                  <span className="text-muted-foreground/40 font-mono text-[10px]">→</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 gap-1 font-medium">
                    <RefreshCw className="size-2.5" />
                    Repiten mismo ciclo: {100 - retentionRate}%
                  </Badge>
                  <span className="text-muted-foreground/40 font-mono text-[10px]">+</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 gap-1 font-medium">
                    <ArrowRight className="size-2.5" />
                    Pasan a sgte. ciclo: {retentionRate}%
                  </Badge>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-background border border-border px-2 py-0.5 rounded text-[11px]">
                    <span className="size-2 rounded-full bg-muted-foreground/60" />
                    <span className="font-semibold text-foreground">Actual</span>
                  </div>
                  <span className="text-muted-foreground/40 text-[10px]">→</span>
                  <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Proyectado</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                Actual General:{' '}
                <strong className="text-foreground">
                  {data.totals.totalAlumnosGeneral.toLocaleString()} alumnos
                </strong>{' '}
                ({data.totals.totalMatriculasGeneral.toLocaleString()} matrículas)
              </span>

              {enablePrediction && (
                <>
                  <span>•</span>
                  <span>
                    Proyectado General:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {projectedGrandTotal.toLocaleString()} {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
                    </strong>
                  </span>
                </>
              )}

              <span>•</span>
              <span>
                Ciclos Visibles:{' '}
                <strong className="text-foreground">{visibleCycles.length}</strong>
              </span>

              {/* Active period badges with removal option */}
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
            <p className="text-sm font-medium text-foreground">Calculando previsión y proyección de matrícula...</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Procesando avance de cohortes para {selectedPeriodoIds.length === 0 ? 'todos los periodos' : `${selectedPeriodoIds.length} periodos seleccionados`}.
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
                  {visibleCycles.map((cy) => (
                    <th
                      key={cy.nombre}
                      className="py-2.5 px-3 font-semibold text-foreground text-center min-w-[105px]"
                    >
                      <span className="block font-bold">{cy.nombre}</span>
                      {enablePrediction && (
                        <span className="text-[10px] font-normal text-muted-foreground block whitespace-nowrap">
                          Actual <span className="text-emerald-600 dark:text-emerald-400 font-medium">| Proy</span>
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-foreground text-right min-w-[130px] bg-muted/60">
                    {enablePrediction ? (
                      <div>
                        <span className="block font-bold">Total {metricMode === 'alumnos' ? 'Alumnos' : 'Cupos'}</span>
                        <span className="text-[10px] font-normal text-muted-foreground block">
                          Actual <span className="text-emerald-600 dark:text-emerald-400 font-medium">| Proy</span>
                        </span>
                      </div>
                    ) : (
                      <span>Total {metricMode === 'alumnos' ? 'Alumnos' : 'Cupos'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCarreras.map((carr) => {
                  const isExpanded = expandedCarreras.has(carr.carreraId)
                  const totalActual =
                    metricMode === 'alumnos' ? carr.totalAlumnos : carr.totalMatriculas
                  const totalProjected = visibleCycles.reduce(
                    (acc, cy) => acc + getProjectedForCycle(carr, cy),
                    0
                  )

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

                        {/* Cycles columns: Actual next to Projected in Emerald Color */}
                        {visibleCycles.map((cy) => {
                          const cycleData = carr.byCycle[cy.nombre]
                          const actualVal =
                            metricMode === 'alumnos'
                              ? cycleData?.alumnos || 0
                              : cycleData?.matriculas || 0
                          const breakdown = getProjectedBreakdownForCycle(carr, cy)
                          const projectedVal = breakdown.projected

                          return (
                            <td
                              key={cy.nombre}
                              className="py-2.5 px-3 text-center font-medium"
                            >
                              {enablePrediction ? (
                                <div className="inline-flex items-center justify-center gap-1">
                                  {/* Actual Value */}
                                  <span
                                    className={`text-xs font-medium ${
                                      actualVal > 0 ? 'text-foreground' : 'text-muted-foreground/30'
                                    }`}
                                  >
                                    {actualVal > 0 ? actualVal : '—'}
                                  </span>

                                  {/* Transition arrow */}
                                  <span className="text-[10px] text-muted-foreground/40 select-none">
                                    →
                                  </span>

                                  {/* Projected Value in Emerald Green */}
                                  <span
                                    title={`Proyección ${cy.nombre}: ${projectedVal} (${breakdown.promovidos} promovidos de Ciclo anterior + ${breakdown.repitentes} repitentes de ${cy.nombre} | ${breakdown.desercion} desertores)`}
                                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold transition-colors cursor-help ${
                                      projectedVal > 0
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs'
                                        : 'text-muted-foreground/30 font-light'
                                    }`}
                                  >
                                    {projectedVal > 0 ? projectedVal : '—'}
                                  </span>
                                </div>
                              ) : (
                                /* Normal mode without projection */
                                actualVal > 0 ? (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                                    {actualVal}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30 font-light">—</span>
                                )
                              )}
                            </td>
                          )
                        })}

                        {/* Total column */}
                        <td className="py-2.5 px-4 text-right bg-card/60 group-hover:bg-muted/40">
                          {enablePrediction ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Actual Total */}
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-foreground">
                                {totalActual.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground/40">→</span>
                              {/* Projected Total */}
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white dark:bg-emerald-500 dark:text-gray-950 shadow-2xs">
                                {totalProjected.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                              {totalActual.toLocaleString()}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Courses Nested Table */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b border-border/80">
                          <td colSpan={visibleCycles.length + 2} className="p-3 pl-8 sm:pl-10">
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
                                      Matriculados Actuales
                                    </th>
                                    {enablePrediction && (
                                      <th className="py-1.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                                        Proyección Estimada
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {carr.courses.map((cr) => {
                                    const courseCyObj = data.ciclos.find(
                                      (x) => x.orden === cr.cicloOrden
                                    )
                                    const cycleActual = courseCyObj
                                      ? metricMode === 'alumnos'
                                        ? carr.byCycle[courseCyObj.nombre]?.alumnos || 0
                                        : carr.byCycle[courseCyObj.nombre]?.matriculas || 0
                                      : 0
                                    const cycleProj = courseCyObj ? getProjectedForCycle(carr, courseCyObj) : 0
                                    const courseProjected =
                                      cycleActual > 0
                                        ? Math.round(cr.alumnosCount * (cycleProj / cycleActual))
                                        : (cr.alumnosCount > 0 ? Math.max(0, Math.round(cr.alumnosCount * ((100 - desercionRate) / 100))) : 0)

                                    return (
                                      <tr
                                        key={cr.cursoId}
                                        className="hover:bg-muted/30 transition-colors"
                                      >
                                        <td className="py-1.5 px-3 font-medium whitespace-nowrap">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] py-0 px-1.5 font-normal"
                                          >
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
                                        {enablePrediction && (
                                          <td className="py-1.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            {cr.cicloOrden <= 1 ? '—' : courseProjected}
                                          </td>
                                        )}
                                      </tr>
                                    )
                                  })}
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
                  {visibleCycles.map((cy) => {
                    const sumActual =
                      metricMode === 'alumnos'
                        ? data.totals.byCycle[cy.nombre]?.alumnos || 0
                        : data.totals.byCycle[cy.nombre]?.matriculas || 0
                    const sumProjected = projectedTotalsByCycle[cy.nombre] || 0

                    return (
                      <td key={cy.nombre} className="py-3 px-3 text-center">
                        {enablePrediction ? (
                          <div className="inline-flex items-center justify-center gap-1">
                            <span className="font-bold text-xs text-foreground">
                              {sumActual.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40 select-none">
                              →
                            </span>
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800">
                              {sumProjected.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-xs">
                            {sumActual.toLocaleString()}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-3 px-4 text-right bg-muted/80">
                    {enablePrediction ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground">
                          {(metricMode === 'alumnos'
                            ? data.totals.totalAlumnosGeneral
                            : data.totals.totalMatriculasGeneral
                          ).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">→</span>
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black bg-emerald-600 text-white shadow-xs">
                          {projectedGrandTotal.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black bg-primary text-primary-foreground shadow-xs">
                        {(metricMode === 'alumnos'
                          ? data.totals.totalAlumnosGeneral
                          : data.totals.totalMatriculasGeneral
                        ).toLocaleString()}
                      </span>
                    )}
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
