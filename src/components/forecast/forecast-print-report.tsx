import * as React from 'react'
import {
  GraduationCap,
  Calendar,
  Building2,
  Laptop,
  Clock,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Users,
  BookOpen,
} from 'lucide-react'
import type {
  ForecastResult,
  ForecastCareerRow,
  ForecastCourseItem,
} from '#/server/services/forecast-service'

export interface ForecastPrintReportProps {
  data: ForecastResult
  filteredCarreras: ForecastCareerRow[]
  visibleCycles: { nombre: string; orden: number }[]
  metricMode: 'alumnos' | 'matriculas'
  enablePrediction: boolean
  desercionRate: number
  retentionRate: number
  selectedPeriodoIds: number[]
  selectedSedeId: number | 'all'
  selectedModalidadId: number | 'all'
  selectedTurno: string | 'all'
  expandedCarreras?: Set<number>
  includeCourses?: boolean
  columnLayout?: 'compact' | 'expanded'
  getProjectedForCycle: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => number
  getProjectedBreakdownForCycle?: (
    carr: ForecastCareerRow,
    cy: { nombre: string; orden: number }
  ) => { projected: number; repitentes: number; promovidos: number; desercion: number }
}

export function ForecastPrintReport({
  data,
  filteredCarreras,
  visibleCycles,
  metricMode,
  enablePrediction,
  desercionRate,
  retentionRate,
  selectedPeriodoIds,
  selectedSedeId,
  selectedModalidadId,
  selectedTurno,
  expandedCarreras = new Set(),
  includeCourses = false,
  columnLayout = 'compact',
  getProjectedForCycle,
}: ForecastPrintReportProps) {
  // Timestamp de emisión
  const formattedDate = React.useMemo(() => {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'long',
      timeStyle: 'medium',
    }).format(new Date())
  }, [])

  // Etiquetas de filtros
  const periodoLabel = React.useMemo(() => {
    if (selectedPeriodoIds.length === 0) return 'Todos los periodos'
    if (selectedPeriodoIds.length === data.periodos.length) return 'Todos los periodos institucionales'
    const names = data.periodos
      .filter((p) => selectedPeriodoIds.includes(p.id))
      .map((p) => p.nombre)
    return names.join(', ')
  }, [data.periodos, selectedPeriodoIds])

  const sedeLabel = React.useMemo(() => {
    if (selectedSedeId === 'all') return 'Todas las Sedes'
    return data.sedes.find((s) => s.id === selectedSedeId)?.nombre || String(selectedSedeId)
  }, [data.sedes, selectedSedeId])

  const modalidadLabel = React.useMemo(() => {
    if (selectedModalidadId === 'all') return 'Todas las Modalidades'
    return data.modalidades.find((m) => m.id === selectedModalidadId)?.nombre || String(selectedModalidadId)
  }, [data.modalidades, selectedModalidadId])

  const turnoLabel = React.useMemo(() => {
    if (selectedTurno === 'all') return 'Todos los Turnos'
    return data.turnos.find((t) => t.codigo === selectedTurno)?.nombre || selectedTurno
  }, [data.turnos, selectedTurno])

  // Cálculo de totales generales
  const totalActualGeneral = React.useMemo(() => {
    return filteredCarreras.reduce(
      (acc, c) => acc + (metricMode === 'alumnos' ? c.totalAlumnos : c.totalMatriculas),
      0
    )
  }, [filteredCarreras, metricMode])

  const totalProyectadoGeneral = React.useMemo(() => {
    if (!enablePrediction) return totalActualGeneral
    return filteredCarreras.reduce((acc, c) => {
      const carrProj = visibleCycles.reduce(
        (cyAcc, cy) => cyAcc + getProjectedForCycle(c, cy),
        0
      )
      return acc + carrProj
    }, 0)
  }, [filteredCarreras, visibleCycles, enablePrediction, getProjectedForCycle, totalActualGeneral])

  const variacionNetaGeneral = totalProyectadoGeneral - totalActualGeneral
  const variacionPctGeneral =
    totalActualGeneral > 0
      ? ((variacionNetaGeneral / totalActualGeneral) * 100).toFixed(1) + '%'
      : '0.0%'

  // Totales por cada ciclo
  const cycleTotals = React.useMemo(() => {
    return visibleCycles.map((cy) => {
      const actual = filteredCarreras.reduce(
        (acc, c) =>
          acc +
          (metricMode === 'alumnos'
            ? c.byCycle[cy.nombre]?.alumnos || 0
            : c.byCycle[cy.nombre]?.matriculas || 0),
        0
      )
      const projected = enablePrediction
        ? filteredCarreras.reduce((acc, c) => acc + getProjectedForCycle(c, cy), 0)
        : actual
      return {
        ciclo: cy,
        actual,
        projected,
      }
    })
  }, [visibleCycles, filteredCarreras, metricMode, enablePrediction, getProjectedForCycle])

  return (
    <div className="forecast-print-document font-sans text-slate-900 bg-white p-4 max-w-[297mm] mx-auto">
      {/* -------------------------------------------------------------
          1. Encabezado Oficial Institucional
          ------------------------------------------------------------- */}
      <div className="border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-600 uppercase">
              <GraduationCap className="size-4 text-slate-800" />
              <span>Universidad Tecnológica del Perú • Vicerrectorado Académico</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              INFORME EJECUTIVO: PREVISIÓN Y PROYECCIÓN DE MATRÍCULA
            </h1>
            <p className="text-xs text-slate-600">
              Simulación de avance de cohortes, traslado inter-ciclo y estimación de vacantes
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-600 shrink-0 border-l border-slate-200 pl-4 space-y-0.5">
            <div>
              <span className="font-semibold text-slate-800">Fecha de emisión:</span> {formattedDate}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Caso de Origen:</span> {data.caseName}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Métrica:</span>{' '}
              <strong className="text-slate-900">
                {metricMode === 'alumnos' ? 'Alumnos Únicos' : 'Matrículas-Curso (Cupos)'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. Ficha Técnica de Filtros y Parámetros del Modelo
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded border border-slate-200 bg-slate-50/80 mb-3 text-[11px]">
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Periodo(s)</span>
          <span className="font-medium text-slate-800 line-clamp-1" title={periodoLabel}>
            {periodoLabel}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Sede / Modalidad</span>
          <span className="font-medium text-slate-800">
            {sedeLabel} • {modalidadLabel}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Turno</span>
          <span className="font-medium text-slate-800">{turnoLabel}</span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Parámetros de Simulación</span>
          {enablePrediction ? (
            <span className="font-medium text-slate-800">
              Deserción: <strong>{desercionRate}%</strong> | Traslado: <strong>{retentionRate}%</strong> | Repiten:{' '}
              <strong>{100 - retentionRate}%</strong>
            </span>
          ) : (
            <span className="font-medium text-slate-500 italic">Previsión actual sin proyección simulada</span>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. Tarjetas KPI de Resumen Ejecutivo
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="p-2.5 rounded border border-slate-200 bg-white">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Actual</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {totalActualGeneral.toLocaleString()}
            <span className="text-[10px] font-normal text-slate-500 ml-1">
              {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Total Proyectado</span>
          <div className="text-base font-bold text-emerald-800 mt-0.5">
            {totalProyectadoGeneral.toLocaleString()}
            <span className="text-[10px] font-normal text-emerald-600 ml-1">
              {metricMode === 'alumnos' ? 'alumnos' : 'cupos'}
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded border ${variacionNetaGeneral >= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}>
          <span className={`text-[10px] font-semibold uppercase block ${variacionNetaGeneral >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            Variación Estimada
          </span>
          <div className={`text-base font-bold mt-0.5 ${variacionNetaGeneral >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {variacionNetaGeneral > 0 ? `+${variacionNetaGeneral.toLocaleString()}` : variacionNetaGeneral.toLocaleString()}
            <span className="text-xs font-semibold ml-1">({variacionPctGeneral})</span>
          </div>
        </div>

        <div className="p-2.5 rounded border border-slate-200 bg-white">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Programas Académicos</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {filteredCarreras.length}
            <span className="text-[10px] font-normal text-slate-500 ml-1">carreras evaluadas</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. Matriz de Previsión por Carrera y Ciclo Curricular
          ------------------------------------------------------------- */}
      <div className="border border-slate-200 rounded overflow-hidden mb-4">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-semibold uppercase tracking-wider text-[9px]">
              <th className="py-2 px-2.5 w-16 border-r border-slate-200">Cód.</th>
              <th className="py-2 px-2.5 min-w-[140px] border-r border-slate-200">Carrera Profesional</th>
              <th className="py-2 px-2 w-28 border-r border-slate-200">Facultad</th>

              {columnLayout === 'compact' ? (
                // Modo Compacto: 1 columna por ciclo (Actual → Proyectado)
                visibleCycles.map((cy) => (
                  <th
                    key={cy.nombre}
                    className="py-2 px-1 text-center border-r border-slate-200 min-w-[54px]"
                  >
                    <div>{cy.nombre}</div>
                    {enablePrediction && (
                      <div className="text-[8px] font-normal text-slate-500 tracking-normal">
                        Act → Proy
                      </div>
                    )}
                  </th>
                ))
              ) : (
                // Modo Expandido: 2 columnas independientes por ciclo
                visibleCycles.map((cy) => (
                  <React.Fragment key={cy.nombre}>
                    <th className="py-2 px-1 text-center border-r border-slate-200 min-w-[36px]">
                      {cy.nombre} <span className="block text-[8px] font-normal text-slate-500">Act</span>
                    </th>
                    {enablePrediction && (
                      <th className="py-2 px-1 text-center border-r border-slate-200 min-w-[36px] bg-emerald-50/60 text-emerald-800">
                        {cy.nombre} <span className="block text-[8px] font-normal text-emerald-600">Proy</span>
                      </th>
                    )}
                  </React.Fragment>
                ))
              )}

              <th className="py-2 px-2 text-right border-r border-slate-200 w-16">Total Act.</th>
              {enablePrediction && (
                <>
                  <th className="py-2 px-2 text-right border-r border-slate-200 w-16 bg-emerald-50/60 text-emerald-800">
                    Total Proy.
                  </th>
                  <th className="py-2 px-2 text-right w-16">Var. (%)</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredCarreras.map((carr, idx) => {
              const totalActual = metricMode === 'alumnos' ? carr.totalAlumnos : carr.totalMatriculas
              const totalProj = visibleCycles.reduce(
                (acc, cy) => acc + getProjectedForCycle(carr, cy),
                0
              )
              const varNeta = totalProj - totalActual
              const varPct = totalActual > 0 ? ((varNeta / totalActual) * 100).toFixed(1) + '%' : '0.0%'
              const isExpanded = includeCourses || expandedCarreras.has(carr.carreraId)

              return (
                <React.Fragment key={carr.carreraId}>
                  <tr
                    className={`hover:bg-slate-50/60 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-mono text-slate-600 border-r border-slate-200">
                      {carr.carreraCodigo}
                    </td>
                    <td className="py-1.5 px-2.5 font-medium text-slate-900 border-r border-slate-200">
                      {carr.carreraNombre}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 text-[9px] border-r border-slate-200 truncate">
                      {carr.facultadNombre}
                    </td>

                    {columnLayout === 'compact'
                      ? visibleCycles.map((cy) => {
                          const act =
                            metricMode === 'alumnos'
                              ? carr.byCycle[cy.nombre]?.alumnos || 0
                              : carr.byCycle[cy.nombre]?.matriculas || 0
                          const prj = getProjectedForCycle(carr, cy)

                          return (
                            <td
                              key={cy.nombre}
                              className="py-1.5 px-1 text-center border-r border-slate-200 whitespace-nowrap"
                            >
                              {enablePrediction ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className={act > 0 ? 'text-slate-800' : 'text-slate-400'}>
                                    {act}
                                  </span>
                                  <span className="text-slate-400 text-[8px]">→</span>
                                  <span
                                    className={`font-semibold ${
                                      prj > 0 ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                  >
                                    {prj}
                                  </span>
                                </span>
                              ) : (
                                <span className={act > 0 ? 'font-medium text-slate-900' : 'text-slate-400'}>
                                  {act}
                                </span>
                              )}
                            </td>
                          )
                        })
                      : visibleCycles.map((cy) => {
                          const act =
                            metricMode === 'alumnos'
                              ? carr.byCycle[cy.nombre]?.alumnos || 0
                              : carr.byCycle[cy.nombre]?.matriculas || 0
                          const prj = getProjectedForCycle(carr, cy)

                          return (
                            <React.Fragment key={cy.nombre}>
                              <td className="py-1.5 px-1 text-center border-r border-slate-200">
                                <span className={act > 0 ? 'text-slate-800' : 'text-slate-400'}>
                                  {act}
                                </span>
                              </td>
                              {enablePrediction && (
                                <td className="py-1.5 px-1 text-center border-r border-slate-200 bg-emerald-50/30">
                                  <span
                                    className={`font-semibold ${
                                      prj > 0 ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                  >
                                    {prj}
                                  </span>
                                </td>
                              )}
                            </React.Fragment>
                          )
                        })}

                    <td className="py-1.5 px-2 text-right font-medium text-slate-800 border-r border-slate-200">
                      {totalActual.toLocaleString()}
                    </td>

                    {enablePrediction && (
                      <>
                        <td className="py-1.5 px-2 text-right font-bold text-emerald-800 bg-emerald-50/40 border-r border-slate-200">
                          {totalProj.toLocaleString()}
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-medium whitespace-nowrap ${
                            varNeta > 0
                              ? 'text-emerald-700'
                              : varNeta < 0
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {varNeta > 0 ? `+${varNeta}` : varNeta} ({varPct})
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Subtabla de asignaturas si la carrera está expandida o se incluyeron cursos */}
                  {isExpanded && carr.courses.length > 0 && (
                    <tr className="bg-slate-50/80 border-b border-slate-200 print-break-inside-avoid">
                      <td
                        colSpan={
                          columnLayout === 'compact'
                            ? 3 + visibleCycles.length + (enablePrediction ? 3 : 1)
                            : 3 + visibleCycles.length * (enablePrediction ? 2 : 1) + (enablePrediction ? 3 : 1)
                        }
                        className="py-2 px-4"
                      >
                        <div className="rounded border border-slate-200 bg-white p-2">
                          <div className="flex items-center justify-between mb-1.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wider">
                            <span>
                              Detalle de Asignaturas: {carr.carreraNombre} ({carr.courses.length} cursos)
                            </span>
                            <span>Métrica: {metricMode === 'alumnos' ? 'Alumnos' : 'Cupos'}</span>
                          </div>

                          <table className="w-full text-left border-collapse text-[9px]">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                                <th className="py-1 px-2 w-16">Cód.</th>
                                <th className="py-1 px-2">Asignatura</th>
                                <th className="py-1 px-1.5 w-16">Ciclo</th>
                                <th className="py-1 px-1.5 w-20">Plan</th>
                                <th className="py-1 px-1 text-center w-12">Créditos</th>
                                <th className="py-1 px-1 text-center w-12">Secciones</th>
                                <th className="py-1 px-2 text-right w-16">Matr. Actual</th>
                                {enablePrediction && (
                                  <>
                                    <th className="py-1 px-2 text-right w-16 text-emerald-700">Proy. Estimada</th>
                                    <th className="py-1 px-2 text-right w-14">Var.</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {carr.courses.map((cr) => {
                                const courseCyObj = data.ciclos.find((x) => x.orden === cr.cicloOrden)
                                const cycleActual = courseCyObj
                                  ? metricMode === 'alumnos'
                                    ? carr.byCycle[courseCyObj.nombre]?.alumnos || 0
                                    : carr.byCycle[courseCyObj.nombre]?.matriculas || 0
                                  : 0
                                const cycleProj = courseCyObj ? getProjectedForCycle(carr, courseCyObj) : 0
                                const courseProj =
                                  cycleActual > 0
                                    ? Math.round(cr.alumnosCount * (cycleProj / cycleActual))
                                    : cr.alumnosCount > 0
                                    ? Math.max(0, Math.round(cr.alumnosCount * ((100 - desercionRate) / 100)))
                                    : 0
                                const cVar = courseProj - cr.alumnosCount

                                return (
                                  <tr key={cr.cursoId} className="hover:bg-slate-50/50">
                                    <td className="py-1 px-2 font-mono text-slate-600">{cr.codCurso}</td>
                                    <td className="py-1 px-2 font-medium text-slate-800">{cr.nombre}</td>
                                    <td className="py-1 px-1.5 text-slate-600">{cr.cicloNombre}</td>
                                    <td className="py-1 px-1.5 text-slate-500 truncate max-w-[120px]">{cr.planNombre}</td>
                                    <td className="py-1 px-1 text-center text-slate-600">{cr.creditos}</td>
                                    <td className="py-1 px-1 text-center text-slate-600">{cr.seccionesCount}</td>
                                    <td className="py-1 px-2 text-right font-medium text-slate-900">{cr.alumnosCount}</td>
                                    {enablePrediction && (
                                      <>
                                        <td className="py-1 px-2 text-right font-bold text-emerald-700">{courseProj}</td>
                                        <td
                                          className={`py-1 px-2 text-right text-[8px] font-medium ${
                                            cVar > 0
                                              ? 'text-emerald-700'
                                              : cVar < 0
                                              ? 'text-rose-700'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {cVar > 0 ? `+${cVar}` : cVar}
                                        </td>
                                      </>
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

          {/* Fila de Totales Generales */}
          <tfoot>
            <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
              <td colSpan={3} className="py-2 px-2.5 border-r border-slate-200 uppercase text-[9px]">
                TOTAL GENERAL INSTITUCIONAL
              </td>

              {columnLayout === 'compact'
                ? cycleTotals.map((ct) => (
                    <td
                      key={ct.ciclo.nombre}
                      className="py-2 px-1 text-center border-r border-slate-200 whitespace-nowrap"
                    >
                      {enablePrediction ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px]">
                          <span>{ct.actual.toLocaleString()}</span>
                          <span className="text-slate-400 text-[8px]">→</span>
                          <span className="text-emerald-800 font-bold">
                            {ct.projected.toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span>{ct.actual.toLocaleString()}</span>
                      )}
                    </td>
                  ))
                : cycleTotals.map((ct) => (
                    <React.Fragment key={ct.ciclo.nombre}>
                      <td className="py-2 px-1 text-center border-r border-slate-200 text-[9px]">
                        {ct.actual.toLocaleString()}
                      </td>
                      {enablePrediction && (
                        <td className="py-2 px-1 text-center border-r border-slate-200 bg-emerald-50/60 text-emerald-800 text-[9px]">
                          {ct.projected.toLocaleString()}
                        </td>
                      )}
                    </React.Fragment>
                  ))}

              <td className="py-2 px-2 text-right border-r border-slate-200 text-[10px]">
                {totalActualGeneral.toLocaleString()}
              </td>

              {enablePrediction && (
                <>
                  <td className="py-2 px-2 text-right font-extrabold text-emerald-800 bg-emerald-50/60 border-r border-slate-200 text-[10px]">
                    {totalProyectadoGeneral.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 px-2 text-right text-[9px] font-bold whitespace-nowrap ${
                      variacionNetaGeneral >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {variacionNetaGeneral > 0 ? `+${variacionNetaGeneral.toLocaleString()}` : variacionNetaGeneral.toLocaleString()} ({variacionPctGeneral})
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* -------------------------------------------------------------
          5. Pie de Página Oficial del Informe
          ------------------------------------------------------------- */}
      <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500 flex items-center justify-between">
        <div>
          <span>Sistema de Previsión y Migración Canvas LMS • Confidencial - Uso Interno Institucional</span>
        </div>
        <div>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  )
}
