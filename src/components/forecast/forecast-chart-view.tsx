import * as React from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Filter,
  Sliders,
  GraduationCap,
} from 'lucide-react'
import { defineChart, barY, barX, group, colorLegend } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type {
  ForecastCareerRow,
  ForecastCourseItem,
  ForecastResult,
} from '#/server/services/forecast-service'

interface ForecastChartViewProps {
  data: ForecastResult | null
  filteredCarreras: ForecastCareerRow[]
  visibleCycles: { nombre: string; orden: number }[]
  metricMode: 'alumnos' | 'matriculas'
  enablePrediction: boolean
  desercionRate: number
  retentionRate: number
  expandedCarreras: Set<number>
  toggleCarreraExpand: (carrId: number) => void
  expandAllCarreras: () => void
  collapseAllCarreras: () => void
  getProjectedForCycle: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => number
}

type ChartSubView = 'hierarchical' | 'cycles' | 'careers'

// Cálculo estándar de proyección para un curso individual proporcional a su ciclo
function computeCourseProjected(
  cr: ForecastCourseItem,
  carr: ForecastCareerRow,
  data: ForecastResult,
  metricMode: 'alumnos' | 'matriculas',
  desercionRate: number,
  getProjectedForCycle: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => number
): number {
  const courseCyObj = data.ciclos.find((x) => x.orden === cr.cicloOrden)
  const cycleActual = courseCyObj
    ? metricMode === 'alumnos'
      ? carr.byCycle[courseCyObj.nombre]?.alumnos || 0
      : carr.byCycle[courseCyObj.nombre]?.matriculas || 0
    : 0
  const cycleProj = courseCyObj ? getProjectedForCycle(carr, courseCyObj) : 0

  if (cycleActual > 0) {
    return Math.round(cr.alumnosCount * (cycleProj / cycleActual))
  }
  return cr.alumnosCount > 0
    ? Math.max(0, Math.round(cr.alumnosCount * ((100 - desercionRate) / 100)))
    : 0
}

export function ForecastChartView({
  data,
  filteredCarreras,
  visibleCycles,
  metricMode,
  enablePrediction,
  desercionRate,
  retentionRate,
  expandedCarreras,
  toggleCarreraExpand,
  expandAllCarreras,
  collapseAllCarreras,
  getProjectedForCycle,
}: ForecastChartViewProps) {
  const [subView, setSubView] = React.useState<ChartSubView>('hierarchical')
  const [careerLimit, setCareerLimit] = React.useState<number>(10)
  const [careerSortBy, setCareerSortBy] = React.useState<'total' | 'alpha'>('total')

  // Color scale fija para Actual vs Proyectado
  const colorScale = React.useMemo(() => {
    return scaleOrdinal<string, string>()
      .domain(['Actual', 'Proyectado'])
      .range(['#64748b', '#10b981']) // slate-500 (Actual), emerald-500 (Proyectado)
  }, [])

  // 1. Datos para el Gráfico Consolidado General por Ciclo
  const globalCycleChartData = React.useMemo(() => {
    if (!data || visibleCycles.length === 0) return []

    const rows: Array<{
      ciclo: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
      orden: number
    }> = []

    for (const cy of visibleCycles) {
      const actualTotal = filteredCarreras.reduce((sum, c) => {
        const val =
          metricMode === 'alumnos'
            ? c.byCycle[cy.nombre]?.alumnos || 0
            : c.byCycle[cy.nombre]?.matriculas || 0
        return sum + val
      }, 0)

      rows.push({
        ciclo: cy.nombre,
        tipo: 'Actual',
        valor: actualTotal,
        orden: cy.orden,
      })

      if (enablePrediction) {
        const projectedTotal = filteredCarreras.reduce((sum, c) => {
          return sum + getProjectedForCycle(c, cy)
        }, 0)

        rows.push({
          ciclo: cy.nombre,
          tipo: 'Proyectado',
          valor: projectedTotal,
          orden: cy.orden,
        })
      }
    }

    return rows
  }, [data, visibleCycles, filteredCarreras, metricMode, enablePrediction, getProjectedForCycle])

  // Definición del gráfico consolidado por Ciclo (TanStack Charts barY)
  const globalCycleChartDefinition = React.useMemo(() => {
    return defineChart({
      marks: [
        barY(globalCycleChartData, {
          x: 'ciclo',
          y: 'valor',
          color: 'tipo',
          layout: group({ padding: 0.18 }),
          radius: { end: 4 },
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand().padding(0.24),
          grid: false,
          axis: { label: 'Ciclo Académico' },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            label: metricMode === 'alumnos' ? 'Alumnos Únicos' : 'Matrículas-Curso (Cupos)',
          },
        },
      },
      color: {
        scale: colorScale,
        legend: colorLegend({ label: 'Métrica' }),
      },
      tooltip,
    })
  }, [globalCycleChartData, colorScale, metricMode])

  // 2. Datos agregados por Carrera (para vista comparativa de carreras)
  const careerAggregates = React.useMemo(() => {
    return filteredCarreras.map((c) => {
      const actualTotal = visibleCycles.reduce((sum, cy) => {
        const val =
          metricMode === 'alumnos'
            ? c.byCycle[cy.nombre]?.alumnos || 0
            : c.byCycle[cy.nombre]?.matriculas || 0
        return sum + val
      }, 0)

      const projectedTotal = visibleCycles.reduce((sum, cy) => {
        return sum + getProjectedForCycle(c, cy)
      }, 0)

      return {
        carreraId: c.carreraId,
        carreraNombre: c.carreraNombre,
        carreraCodigo: c.carreraCodigo,
        facultadNombre: c.facultadNombre,
        actualTotal,
        projectedTotal,
      }
    })
  }, [filteredCarreras, visibleCycles, metricMode, getProjectedForCycle])

  // Carreras ordenadas y limitadas para la vista comparativa global
  const displayedCareers = React.useMemo(() => {
    let sorted = [...careerAggregates]
    if (careerSortBy === 'total') {
      sorted.sort((a, b) => {
        const valA = enablePrediction ? Math.max(a.actualTotal, a.projectedTotal) : a.actualTotal
        const valB = enablePrediction ? Math.max(b.actualTotal, b.projectedTotal) : b.actualTotal
        return valB - valA
      })
    } else {
      sorted.sort((a, b) => a.carreraNombre.localeCompare(b.carreraNombre))
    }

    if (careerLimit > 0 && sorted.length > careerLimit) {
      return sorted.slice(0, careerLimit)
    }
    return sorted
  }, [careerAggregates, careerSortBy, careerLimit, enablePrediction])

  // Datos para TanStack Charts barX de la comparativa global
  const globalCareerChartData = React.useMemo(() => {
    const rows: Array<{
      carrera: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
    }> = []

    const ordered = [...displayedCareers].reverse()

    for (const item of ordered) {
      const label =
        item.carreraNombre.length > 32
          ? `${item.carreraNombre.slice(0, 30)}...`
          : item.carreraNombre

      rows.push({
        carrera: label,
        tipo: 'Actual',
        valor: item.actualTotal,
      })

      if (enablePrediction) {
        rows.push({
          carrera: label,
          tipo: 'Proyectado',
          valor: item.projectedTotal,
        })
      }
    }

    return rows
  }, [displayedCareers, enablePrediction])

  // Definición de gráfico comparativo de carreras (TanStack Charts barX)
  const globalCareerChartDefinition = React.useMemo(() => {
    return defineChart({
      marks: [
        barX(globalCareerChartData, {
          y: 'carrera',
          x: 'valor',
          color: 'tipo',
          layout: group({ padding: 0.16 }),
          radius: { end: 4 },
        }),
      ],
      scales: {
        y: {
          scale: () => scaleBand().padding(0.22),
          grid: false,
          axis: { label: 'Carrera' },
        },
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: metricMode === 'alumnos' ? 'Alumnos' : 'Cupos' },
        },
      },
      color: {
        scale: colorScale,
        legend: colorLegend({ label: 'Métrica' }),
      },
      tooltip,
    })
  }, [globalCareerChartData, colorScale, metricMode])

  // Totales globales para KPIs
  const globalActualTotal = React.useMemo(() => {
    return globalCycleChartData
      .filter((r) => r.tipo === 'Actual')
      .reduce((sum, r) => sum + r.valor, 0)
  }, [globalCycleChartData])

  const globalProjectedTotal = React.useMemo(() => {
    return globalCycleChartData
      .filter((r) => r.tipo === 'Proyectado')
      .reduce((sum, r) => sum + r.valor, 0)
  }, [globalCycleChartData])

  const diffNet = globalProjectedTotal - globalActualTotal
  const pctChange =
    globalActualTotal > 0 ? ((diffNet / globalActualTotal) * 100).toFixed(1) : '0.0'

  if (filteredCarreras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
        <Filter className="size-10 text-muted-foreground/40 stroke-1" />
        <p className="text-sm font-medium text-foreground">
          No se encontraron carreras con los filtros seleccionados
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          Ajusta los filtros de texto, campus o periodos para visualizar los gráficos de barras.
        </p>
      </div>
    )
  }

  const globalCareerChartHeight = Math.max(340, displayedCareers.length * 38 + 90)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Chart View Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>Gráficos de Previsión de Matrícula (TanStack Charts)</span>
              {enablePrediction && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-2 font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                >
                  Simulación Activa
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Misma información que en la tabla pero en forma de barras: agregado por ciclo/carrera y desplegable en detalle a nivel de asignaturas.
            </p>
          </div>
        </div>

        {/* Subview Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 text-xs font-medium">
            <button
              type="button"
              onClick={() => setSubView('hierarchical')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                subView === 'hierarchical'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Por Carreras y Cursos (Expandible)
            </button>
            <button
              type="button"
              onClick={() => setSubView('cycles')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                subView === 'cycles'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Consolidado por Ciclos
            </button>
            <button
              type="button"
              onClick={() => setSubView('careers')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                subView === 'careers'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Comparativa de Carreras
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Actual */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Actual</span>
            <div className="size-2.5 rounded-full bg-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {globalActualTotal.toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
            </span>
          </div>
        </div>

        {/* Total Proyectado */}
        {enablePrediction && (
          <>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-medium">Total Proyectado</span>
                <div className="size-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {globalProjectedTotal.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                  {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
                </span>
              </div>
            </div>

            {/* Variación Neta */}
            <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Variación Neta</span>
                {diffNet >= 0 ? (
                  <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-xl font-bold font-mono ${
                    diffNet >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {diffNet > 0 ? `+${diffNet.toLocaleString()}` : diffNet.toLocaleString()}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    diffNet >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ({diffNet >= 0 ? `+${pctChange}%` : `${pctChange}%`})
                </span>
              </div>
            </div>
          </>
        )}

        {/* Parámetros Activos */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Parámetros Simulación</span>
            <Sliders className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {enablePrediction ? (
              <>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 font-mono text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40"
                >
                  Deserción: {desercionRate}%
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 font-mono text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40"
                >
                  Traslado: {retentionRate}%
                </Badge>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Solo valores actuales</span>
            )}
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-sm bg-slate-500" />
            <span className="font-medium text-foreground">Actual:</span>
            <span className="text-muted-foreground">Matrículas en base de datos</span>
          </div>
          {enablePrediction && (
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-emerald-500" />
              <span className="font-medium text-foreground">Proyectado:</span>
              <span className="text-muted-foreground">
                Siguiente semestre ({desercionRate}% deserción, {retentionRate}% traslado a ciclo siguiente)
              </span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground hidden md:block font-mono">
          Powered by TanStack Charts
        </div>
      </div>

      {/* SUBVIEW 1: VISTA JERÁRQUICA POR CARRERAS Y CURSOS (EXPANDIBLE EN DETALLE) */}
      {subView === 'hierarchical' && (
        <div className="space-y-4">
          {/* Controls Bar for Careers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Programas Académicos ({filteredCarreras.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Haz clic en cualquier carrera para desplegar el gráfico de barras por asignatura
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllCarreras}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <ChevronDown className="size-3" />
                <span>Expandir Todos los Cursos</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllCarreras}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <ChevronRight className="size-3" />
                <span>Plegar Todos</span>
              </Button>
            </div>
          </div>

          {/* Careers List with Aggregated and Expandable Detail Bar Charts */}
          <div className="space-y-4">
            {filteredCarreras.map((carr) => (
              <CareerExpandableBarCard
                key={carr.carreraId}
                carr={carr}
                data={data!}
                visibleCycles={visibleCycles}
                metricMode={metricMode}
                enablePrediction={enablePrediction}
                desercionRate={desercionRate}
                isExpanded={expandedCarreras.has(carr.carreraId)}
                onToggleExpand={() => toggleCarreraExpand(carr.carreraId)}
                getProjectedForCycle={getProjectedForCycle}
                colorScale={colorScale}
              />
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: CONSOLIDADO GENERAL POR CICLO */}
      {subView === 'cycles' && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>Distribución y Previsión por Ciclo Académico (Consolidado Institucional)</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                {visibleCycles.length} Ciclos
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Barras verticales agrupadas sumando todas las carreras filtradas por ciclo curricular.
            </p>
          </div>

          <div className="w-full h-[360px] pt-2">
            <Chart
              definition={globalCycleChartDefinition}
              height={340}
              idPrefix="global-cycle-chart"
              ariaLabel="Gráfico Consolidado por Ciclo Académico"
              className="w-full text-xs text-foreground"
            />
          </div>

          {/* Quick Metrics Table */}
          <div className="pt-3 border-t border-border/50 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[11px] text-muted-foreground uppercase">
                  <th className="py-1.5 px-2 font-medium">Ciclo</th>
                  <th className="py-1.5 px-2 font-medium text-right">Actual</th>
                  {enablePrediction && (
                    <>
                      <th className="py-1.5 px-2 font-medium text-right text-emerald-700 dark:text-emerald-400">
                        Proyectado
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right">Diferencia</th>
                      <th className="py-1.5 px-2 font-medium text-right">% Cambio</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visibleCycles.map((cy) => {
                  const actualVal =
                    globalCycleChartData.find(
                      (r) => r.ciclo === cy.nombre && r.tipo === 'Actual'
                    )?.valor || 0
                  const projectedVal =
                    globalCycleChartData.find(
                      (r) => r.ciclo === cy.nombre && r.tipo === 'Proyectado'
                    )?.valor || 0
                  const diff = projectedVal - actualVal
                  const pct =
                    actualVal > 0 ? ((diff / actualVal) * 100).toFixed(1) : '0.0'

                  return (
                    <tr key={cy.nombre} className="hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 px-2 font-semibold text-foreground">{cy.nombre}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-foreground">
                        {actualVal.toLocaleString()}
                      </td>
                      {enablePrediction && (
                        <>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {projectedVal.toLocaleString()}
                          </td>
                          <td
                            className={`py-1.5 px-2 text-right font-mono font-medium ${
                              diff >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                          </td>
                          <td
                            className={`py-1.5 px-2 text-right font-mono text-[11px] ${
                              diff >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {diff >= 0 ? `+${pct}%` : `${pct}%`}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: COMPARATIVA GLOBAL DE CARRERAS */}
      {subView === 'careers' && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <span>Comparativa Global por Carrera Académica</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                  {displayedCareers.length} de {careerAggregates.length} Carreras
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground">
                Barras horizontales agrupadas comparando volumen total actual vs proyectado por carrera.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>Mostrar:</span>
                <select
                  value={careerLimit}
                  onChange={(e) => setCareerLimit(Number(e.target.value))}
                  className="h-7 text-xs rounded border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                  <option value={0}>Todas ({careerAggregates.length})</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <span>Ordenar:</span>
                <select
                  value={careerSortBy}
                  onChange={(e) => setCareerSortBy(e.target.value as 'total' | 'alpha')}
                  className="h-7 text-xs rounded border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="total">Mayor Volumen</option>
                  <option value="alpha">Alfabético</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full pt-2" style={{ height: globalCareerChartHeight }}>
            <Chart
              definition={globalCareerChartDefinition}
              height={globalCareerChartHeight - 20}
              idPrefix="global-career-chart"
              ariaLabel="Gráfico Comparativo de Carreras"
              className="w-full text-xs text-foreground"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------------------
// Componente de Tarjeta de Carrera con Gráfico Agregado y Detalle Desplegable en Barras
// -------------------------------------------------------------------------------------
interface CareerExpandableBarCardProps {
  carr: ForecastCareerRow
  data: ForecastResult
  visibleCycles: { nombre: string; orden: number }[]
  metricMode: 'alumnos' | 'matriculas'
  enablePrediction: boolean
  desercionRate: number
  isExpanded: boolean
  onToggleExpand: () => void
  getProjectedForCycle: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => number
  colorScale: any
}

function CareerExpandableBarCard({
  carr,
  data,
  visibleCycles,
  metricMode,
  enablePrediction,
  desercionRate,
  isExpanded,
  onToggleExpand,
  getProjectedForCycle,
  colorScale,
}: CareerExpandableBarCardProps) {
  // Totales de la carrera
  const careerActualTotal = React.useMemo(() => {
    return visibleCycles.reduce((sum, cy) => {
      const val =
        metricMode === 'alumnos'
          ? carr.byCycle[cy.nombre]?.alumnos || 0
          : carr.byCycle[cy.nombre]?.matriculas || 0
      return sum + val
    }, 0)
  }, [carr, visibleCycles, metricMode])

  const careerProjectedTotal = React.useMemo(() => {
    return visibleCycles.reduce((sum, cy) => {
      return sum + getProjectedForCycle(carr, cy)
    }, 0)
  }, [carr, visibleCycles, getProjectedForCycle])

  const diff = careerProjectedTotal - careerActualTotal

  // 1. Datos para el Gráfico Agregado por Ciclo de esta Carrera (barY)
  const careerCycleChartData = React.useMemo(() => {
    const rows: Array<{
      ciclo: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
    }> = []

    for (const cy of visibleCycles) {
      const actualVal =
        metricMode === 'alumnos'
          ? carr.byCycle[cy.nombre]?.alumnos || 0
          : carr.byCycle[cy.nombre]?.matriculas || 0

      rows.push({
        ciclo: cy.nombre,
        tipo: 'Actual',
        valor: actualVal,
      })

      if (enablePrediction) {
        const projectedVal = getProjectedForCycle(carr, cy)
        rows.push({
          ciclo: cy.nombre,
          tipo: 'Proyectado',
          valor: projectedVal,
        })
      }
    }

    return rows
  }, [carr, visibleCycles, metricMode, enablePrediction, getProjectedForCycle])

  const careerCycleChartDefinition = React.useMemo(() => {
    return defineChart({
      marks: [
        barY(careerCycleChartData, {
          x: 'ciclo',
          y: 'valor',
          color: 'tipo',
          layout: group({ padding: 0.16 }),
          radius: { end: 4 },
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand().padding(0.24),
          grid: false,
          axis: { label: 'Ciclo' },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: metricMode === 'alumnos' ? 'Alumnos' : 'Cupos' },
        },
      },
      color: {
        scale: colorScale,
      },
      tooltip,
    })
  }, [careerCycleChartData, colorScale, metricMode])

  // 2. Datos para el Gráfico Detallado por Asignatura / Curso (barX horizontal)
  const coursesDetailData = React.useMemo(() => {
    if (!isExpanded || carr.courses.length === 0) return []

    const rows: Array<{
      curso: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
    }> = []

    // Invertir para que el primer ciclo y curso aparezca arriba
    const orderedCourses = [...carr.courses].reverse()

    for (const cr of orderedCourses) {
      const projVal = computeCourseProjected(
        cr,
        carr,
        data,
        metricMode,
        desercionRate,
        getProjectedForCycle
      )

      const label = `[${cr.cicloNombre}] ${cr.codCurso} - ${
        cr.nombre.length > 28 ? `${cr.nombre.slice(0, 26)}...` : cr.nombre
      }`

      rows.push({
        curso: label,
        tipo: 'Actual',
        valor: cr.alumnosCount,
      })

      if (enablePrediction) {
        rows.push({
          curso: label,
          tipo: 'Proyectado',
          valor: projVal,
        })
      }
    }

    return rows
  }, [
    isExpanded,
    carr,
    data,
    metricMode,
    desercionRate,
    enablePrediction,
    getProjectedForCycle,
  ])

  const courseDetailChartDefinition = React.useMemo(() => {
    if (coursesDetailData.length === 0) return null

    return defineChart({
      marks: [
        barX(coursesDetailData, {
          y: 'curso',
          x: 'valor',
          color: 'tipo',
          layout: group({ padding: 0.16 }),
          radius: { end: 4 },
        }),
      ],
      scales: {
        y: {
          scale: () => scaleBand().padding(0.2),
          grid: false,
          axis: { label: 'Asignatura / Curso' },
        },
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: metricMode === 'alumnos' ? 'Alumnos' : 'Cupos' },
        },
      },
      color: {
        scale: colorScale,
      },
      tooltip,
    })
  }, [coursesDetailData, colorScale, metricMode])

  const coursesChartHeight = Math.max(240, carr.courses.length * 36 + 70)

  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all">
      {/* Header Bar of the Career Card */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 sm:p-4 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label={isExpanded ? 'Plegar cursos' : 'Desplegar cursos'}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 text-primary" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">
                {carr.carreraNombre}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 text-muted-foreground">
                {carr.carreraCodigo}
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {carr.courses.length} cursos
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {carr.facultadNombre}
            </p>
          </div>
        </div>

        {/* Totals & Toggle Button */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-muted text-foreground">
              {careerActualTotal.toLocaleString()} {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
            </span>
            {enablePrediction && (
              <>
                <span className="text-[10px] text-muted-foreground/40">→</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-emerald-600 text-white shadow-2xs">
                  {careerProjectedTotal.toLocaleString()}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ({diff >= 0 ? `+${diff}` : diff})
                </span>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <span>{isExpanded ? 'Plegar Detalle' : 'Desplegar Detalle'}</span>
            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Aggregated Cycle Bar Chart (Always Visible for this Career) */}
      <div className="p-3.5 sm:p-4 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium flex items-center gap-1.5">
            <BarChart3 className="size-3.5 text-muted-foreground" />
            <span>Distribución Agregada por Ciclo Académico (Ciclo 1 al 12)</span>
          </span>
          <span className="text-[11px] font-mono">
            {metricMode === 'alumnos' ? 'Alumnos Únicos' : 'Cupos Matriculados'}
          </span>
        </div>

        <div className="w-full h-[220px]">
          <Chart
            definition={careerCycleChartDefinition}
            height={210}
            idPrefix={`carr-cycle-${carr.carreraId}`}
            ariaLabel={`Gráfico de Ciclos de ${carr.carreraNombre}`}
            className="w-full text-xs text-foreground"
          />
        </div>

        {/* Quick Cycle Badges Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-[11px]">
          {visibleCycles.map((cy) => {
            const act =
              metricMode === 'alumnos'
                ? carr.byCycle[cy.nombre]?.alumnos || 0
                : carr.byCycle[cy.nombre]?.matriculas || 0
            const proj = getProjectedForCycle(carr, cy)
            if (act === 0 && proj === 0) return null

            return (
              <div
                key={cy.nombre}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 shrink-0 font-mono text-[10px]"
              >
                <span className="font-medium text-foreground">{cy.nombre}:</span>
                <span className="text-foreground">{act}</span>
                {enablePrediction && (
                  <>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {proj}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded Detailed Courses Bar Chart & Table */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 bg-muted/15 border-t border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" />
                <span>
                  Detalle Desplegado de Asignaturas ({carr.courses.length} cursos) — {carr.carreraNombre}
                </span>
              </h5>
              <p className="text-[11px] text-muted-foreground">
                Gráfico de barras horizontales comparando alumnos matriculados actuales y proyección estimada por curso.
              </p>
            </div>
          </div>

          {/* TanStack Course Bar Chart (barX) */}
          {courseDetailChartDefinition && (
            <div className="w-full pt-1" style={{ height: coursesChartHeight }}>
              <Chart
                definition={courseDetailChartDefinition}
                height={coursesChartHeight - 20}
                idPrefix={`carr-courses-${carr.carreraId}`}
                ariaLabel={`Gráfico de Cursos de ${carr.carreraNombre}`}
                className="w-full text-xs text-foreground"
              />
            </div>
          )}

          {/* Granular Course Table */}
          <div className="rounded-lg border border-border bg-background overflow-hidden shadow-2xs">
            <div className="py-2 px-3 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>Tabla de Cursos y Asignaturas Aperturadas</span>
              <span>{carr.courses.length} asignaturas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] divide-y divide-border/40">
                <thead>
                  <tr className="bg-muted/20 text-muted-foreground font-semibold">
                    <th className="py-1.5 px-3">Ciclo</th>
                    <th className="py-1.5 px-3">Código</th>
                    <th className="py-1.5 px-3">Asignatura / Curso</th>
                    <th className="py-1.5 px-3 text-center">Créditos</th>
                    <th className="py-1.5 px-3 text-center">Secciones</th>
                    <th className="py-1.5 px-3 text-right">Matriculados Actuales</th>
                    {enablePrediction && (
                      <>
                        <th className="py-1.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                          Proyección Estimada
                        </th>
                        <th className="py-1.5 px-3 text-right">Diferencia</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {carr.courses.map((cr) => {
                    const courseProj = computeCourseProjected(
                      cr,
                      carr,
                      data,
                      metricMode,
                      desercionRate,
                      getProjectedForCycle
                    )
                    const cDiff = courseProj - cr.alumnosCount

                    return (
                      <tr key={cr.cursoId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 px-3 font-medium whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            {cr.cicloNombre}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {cr.codCurso}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-foreground max-w-xs truncate">
                          {cr.nombre}
                        </td>
                        <td className="py-1.5 px-3 text-center text-muted-foreground font-mono">
                          {cr.creditos}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono">
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                            {cr.seccionesCount}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-foreground">
                          {cr.alumnosCount.toLocaleString()}
                        </td>
                        {enablePrediction && (
                          <>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {courseProj.toLocaleString()}
                            </td>
                            <td
                              className={`py-1.5 px-3 text-right font-mono font-medium ${
                                cDiff >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {cDiff > 0 ? `+${cDiff}` : cDiff}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
