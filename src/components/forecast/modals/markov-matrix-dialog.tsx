import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { GitBranch, Search, TrendingDown, ArrowRight, RefreshCw, Info } from 'lucide-react'
import type { MarkovForecastData } from '#/server/services/forecast-service'

interface MarkovMatrixDialogProps {
  isOpen: boolean
  onClose: () => void
  markovData?: MarkovForecastData
}

export function MarkovMatrixDialog({
  isOpen,
  onClose,
  markovData,
}: MarkovMatrixDialogProps) {
  const [carreraSearch, setCarreraSearch] = React.useState('')
  const [selectedCiclo, setSelectedCiclo] = React.useState<number | 'all'>('all')

  if (!markovData) return null

  const cycleSummaries = Object.values(markovData.byCycle).sort((a, b) => a.cicloOrden - b.cicloOrden)
  const careerRates = Object.values(markovData.byCareerCycle).filter((item) => {
    const matchesSearch = carreraSearch.trim() === '' ||
      item.carreraNombre.toLowerCase().includes(carreraSearch.toLowerCase())
    const matchesCiclo = selectedCiclo === 'all' || item.cicloOrden === selectedCiclo
    return matchesSearch && matchesCiclo
  }).sort((a, b) => {
    if (a.cicloOrden !== b.cicloOrden) return a.cicloOrden - b.cicloOrden
    return b.totalBase - a.totalBase
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>Matriz de Transición de Markov Empírica</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Probabilidades condicionales de transición observadas entre periodos académicos reales{' '}
            <strong className="text-foreground">({markovData.basePeriodLabel} → {markovData.targetPeriodLabel})</strong>{' '}
            a partir del seguimiento longitudinal de <strong>{markovData.totalTrackedStudents.toLocaleString()}</strong> estudiantes.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen Institucional Macro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="p-2.5 rounded-lg border border-border bg-muted/30">
            <span className="text-[10px] text-muted-foreground block">Muestra Trazada</span>
            <span className="text-base font-bold font-mono text-foreground">
              {markovData.totalTrackedStudents.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block">estudiantes únicos</span>
          </div>

          <div className="p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">Promoción (k → k+1)</span>
              <ArrowRight className="size-3 text-purple-600" />
            </div>
            <span className="text-base font-bold font-mono text-purple-700 dark:text-purple-300">
              {markovData.overallPromocionRate}%
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {markovData.promotedStudents.toLocaleString()} pasaron de ciclo
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Repitencia (k → k)</span>
              <RefreshCw className="size-3 text-amber-600" />
            </div>
            <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-300">
              {markovData.overallRepitenciaRate}%
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {markovData.retainedStudents.toLocaleString()} repiten ciclo
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">Deserción Observada</span>
              <TrendingDown className="size-3 text-rose-600" />
            </div>
            <span className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
              {markovData.overallDesercionRate}%
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {markovData.droppedStudents.toLocaleString()} no se matricularon
            </span>
          </div>
        </div>

        {/* Tabla 1: Resumen por Ciclo Curricular */}
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Tasas Consolidadas por Ciclo Curricular</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">Consolidado General</Badge>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {'Probabilidad de transición P(S_{t+1} | S_t)'}
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px]">
                  <TableHead className="py-2">Ciclo de Origen ($S_t$)</TableHead>
                  <TableHead className="py-2 text-right">Alumnos Base ($N$)</TableHead>
                  <TableHead className="py-2 text-right text-purple-700 dark:text-purple-300">Promovidos ($P$)</TableHead>
                  <TableHead className="py-2 text-right text-purple-700 dark:text-purple-300">Tasa Promoción</TableHead>
                  <TableHead className="py-2 text-right text-amber-700 dark:text-amber-300">Repiten ($M$)</TableHead>
                  <TableHead className="py-2 text-right text-amber-700 dark:text-amber-300">Tasa Repitencia</TableHead>
                  <TableHead className="py-2 text-right text-rose-700 dark:text-rose-300">Deserción ($D$)</TableHead>
                  <TableHead className="py-2 text-right text-rose-700 dark:text-rose-300">Tasa Deserción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleSummaries.map((cyc) => (
                  <TableRow key={cyc.cicloOrden} className="text-xs hover:bg-muted/20">
                    <TableCell className="py-1.5 font-bold font-sans">
                      Ciclo {cyc.cicloOrden}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono font-medium">
                      {cyc.totalBase.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-purple-700 dark:text-purple-300">
                      {cyc.promovidos.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                      {cyc.tasaPromocion}%
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-amber-700 dark:text-amber-300">
                      {cyc.repitentes.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                      {cyc.tasaRepitencia}%
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-rose-700 dark:text-rose-300">
                      {cyc.desercion.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono font-bold text-rose-700 dark:text-rose-300">
                      {cyc.tasaDesercion}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Tabla 2: Detalle por Carrera y Ciclo */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2 pt-1 border-t border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Desglose por Carrera y Ciclo ({careerRates.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCiclo('all')}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    selectedCiclo === 'all'
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {cycleSummaries.map((cyc) => (
                  <button
                    key={cyc.cicloOrden}
                    type="button"
                    onClick={() => setSelectedCiclo(cyc.cicloOrden)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      selectedCiclo === cyc.cicloOrden
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    C{cyc.cicloOrden}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar carrera..."
                value={carreraSearch}
                onChange={(e) => setCarreraSearch(e.target.value)}
                className="h-7 pl-8 text-xs bg-muted/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-border rounded-lg min-h-[160px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px] sticky top-0 z-10 backdrop-blur">
                  <TableHead className="py-2">Carrera Profesional</TableHead>
                  <TableHead className="py-2 text-center w-20">Ciclo Origen</TableHead>
                  <TableHead className="py-2 text-right">Alumnos Base ($N$)</TableHead>
                  <TableHead className="py-2 text-right text-purple-700 dark:text-purple-300">Tasa Promoción</TableHead>
                  <TableHead className="py-2 text-right text-amber-700 dark:text-amber-300">Tasa Repitencia</TableHead>
                  <TableHead className="py-2 text-right text-rose-700 dark:text-rose-300">Tasa Deserción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {careerRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      No hay transiciones registradas con el criterio de búsqueda seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  careerRates.map((item, idx) => (
                    <TableRow key={`${item.carreraId}_${item.cicloOrden}_${idx}`} className="text-xs hover:bg-muted/20">
                      <TableCell className="py-1.5 font-medium text-foreground">
                        {item.carreraNombre}
                      </TableCell>
                      <TableCell className="py-1.5 text-center font-mono">
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                          Ciclo {item.cicloOrden}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono font-medium">
                        {item.totalBase}
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                        {item.tasaPromocion}%
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                        {item.tasaRepitencia}%
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono font-bold text-rose-700 dark:text-rose-300">
                        {item.tasaDesercion}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Explicación Técnica al Pie */}
        <div className="shrink-0 flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
          <Info className="size-3.5 text-indigo-500 shrink-0" />
          <span>
            <strong>Fórmula de Proyección Markov:</strong> Proyectado(Ciclo $k$) = Repitentes($k$) + Promovidos($k-1 \to k$). Para Ciclo 1 se incorpora la cohorte de ingresantes.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
