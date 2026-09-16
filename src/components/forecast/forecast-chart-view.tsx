import * as React from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Sliders,
} from 'lucide-react'
import { defineChart, barY, barX, group, colorLegend } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import { Badge } from '#/components/ui/badge'
import type {
  ForecastCareerRow,
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
  getProjectedForCycle: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => number
}

type ChartSubView = 'cycles' | 'careers' | 'both'

export function ForecastChartView({
  data,
  filteredCarreras,
  visibleCycles,
  metricMode,
  enablePrediction,
  desercionRate,
  retentionRate,
  getProjectedForCycle,
}: ForecastChartViewProps) {
  const [subView, setSubView] = React.useState<ChartSubView>('both')
  const [careerLimit, setCareerLimit] = React.useState<number>(10)
  const [careerSortBy, setCareerSortBy] = React.useState<'total' | 'alpha'>('total')

  // Color scale fija para Actual vs Proyectado
  const colorScale = React.useMemo(() => {
    return scaleOrdinal<string, string>()
      .domain(['Actual', 'Proyectado'])
      .range(['#64748b', '#10b981']) // slate-500 para Actual, emerald-500 para Proyectado
  }, [])

  // 1. Preparar datos para el Gráfico por Ciclo
  const cycleChartData = React.useMemo(() => {
    if (!data || visibleCycles.length === 0) return []

    const rows: Array<{
      ciclo: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
      orden: number
    }> = []

    for (const cy of visibleCycles) {
      // Sumar actual para todas las carreras filtradas
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

  // Definición del gráfico por Ciclo (TanStack Charts)
  const cycleChartDefinition = React.useMemo(() => {
    return defineChart({
      marks: [
        barY(cycleChartData, {
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
          axis: {
            label: 'Ciclo Académico',
          },
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
  }, [cycleChartData, colorScale, metricMode])

  // 2. Preparar datos para el Gráfico por Carrera
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

  // Carreras ordenadas y limitadas para visualización
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

  // Datos para TanStack Charts barX
  const careerChartData = React.useMemo(() => {
    const rows: Array<{
      carrera: string
      tipo: 'Actual' | 'Proyectado'
      valor: number
    }> = []

    // Para gráficos horizontales (barX), invertimos para que el primer puesto aparezca en la parte superior
    const ordered = [...displayedCareers].reverse()

    for (const item of ordered) {
      // Formato compacto para la etiqueta de carrera: nombre truncado si es excesivamente largo
      const label = item.carreraNombre.length > 32 ? `${item.carreraNombre.slice(0, 30)}...` : item.carreraNombre

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

  // Definición del gráfico por Carrera (TanStack Charts barX)
  const careerChartDefinition = React.useMemo(() => {
    return defineChart({
      marks: [
        barX(careerChartData, {
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
          axis: {
            label: 'Programa / Carrera',
          },
        },
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            label: metricMode === 'alumnos' ? 'Alumnos' : 'Cupos',
          },
        },
      },
      color: {
        scale: colorScale,
        legend: colorLegend({ label: 'Métrica' }),
      },
      tooltip,
    })
  }, [careerChartData, colorScale, metricMode])

  // Totales globales para las métricas resumen
  const globalActualTotal = React.useMemo(() => {
    return cycleChartData
      .filter((r) => r.tipo === 'Actual')
      .reduce((sum, r) => sum + r.valor, 0)
  }, [cycleChartData])

  const globalProjectedTotal = React.useMemo(() => {
    return cycleChartData
      .filter((r) => r.tipo === 'Proyectado')
      .reduce((sum, r) => sum + r.valor, 0)
  }, [cycleChartData])

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

  // Altura adaptativa para el gráfico por carrera horizontal
  const careerChartHeight = Math.max(340, displayedCareers.length * 38 + 90)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Chart View Header & Controls Toolbar */}
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
              Visualización comparativa de barras lado a lado: Actual ({metricMode === 'alumnos' ? 'Alumnos' : 'Cupos'}) vs
              Proyectado según tasas de deserción y traslado.
            </p>
          </div>
        </div>

        {/* Subview Selector: Por Ciclo / Por Carrera / Ambos */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 text-xs font-medium">
            <button
              type="button"
              onClick={() => setSubView('cycles')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                subView === 'cycles'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Por Ciclo
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
              Por Carrera
            </button>
            <button
              type="button"
              onClick={() => setSubView('both')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                subView === 'both'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ambos
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

      {/* Legend Card */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-sm bg-slate-500" />
            <span className="font-medium text-foreground">Actual:</span>
            <span className="text-muted-foreground">Matrículas registradas en base de datos</span>
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

      {/* SECTION 1: Gráfico por Ciclo Académico */}
      {(subView === 'cycles' || subView === 'both') && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <span>Distribución y Previsión por Ciclo Académico</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                  {visibleCycles.length} Ciclos
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground">
                Comparativa de barras verticales agrupadas por ciclo curricular (Ciclo 1 al 12).
              </p>
            </div>
          </div>

          {/* TanStack Chart Component */}
          <div className="w-full h-[360px] pt-2">
            <Chart
              definition={cycleChartDefinition}
              height={340}
              idPrefix="forecast-cycle-chart"
              ariaLabel="Gráfico de Previsión por Ciclo Académico"
              className="w-full text-xs text-foreground"
            />
          </div>

          {/* Quick Cycle Metrics Table */}
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
                  const actualVal = cycleChartData.find(
                    (r) => r.ciclo === cy.nombre && r.tipo === 'Actual'
                  )?.valor || 0
                  const projectedVal = cycleChartData.find(
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

      {/* SECTION 2: Gráfico por Carrera / Programa */}
      {(subView === 'careers' || subView === 'both') && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <span>Comparativa por Carrera Académica</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                  {displayedCareers.length} de {careerAggregates.length} Carreras
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground">
                Barras horizontales agrupadas comparando volumen actual y proyectado por programa académico.
              </p>
            </div>

            {/* Career Controls: Limit and Sorting */}
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

          {/* TanStack Chart Component for Careers */}
          <div className="w-full pt-2" style={{ height: careerChartHeight }}>
            <Chart
              definition={careerChartDefinition}
              height={careerChartHeight - 20}
              idPrefix="forecast-career-chart"
              ariaLabel="Gráfico de Previsión por Carrera"
              className="w-full text-xs text-foreground"
            />
          </div>
        </div>
      )}
    </div>
  )
}
