import * as React from 'react'
import {
  Printer,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  BookOpen,
  Info,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Badge } from '#/components/ui/badge'
import {
  ForecastPrintReport,
  type ForecastPrintReportProps,
} from '#/components/forecast/forecast-print-report'

interface ForecastPrintDialogProps extends ForecastPrintReportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForecastPrintDialog({
  open,
  onOpenChange,
  ...reportProps
}: ForecastPrintDialogProps) {
  const [columnLayout, setColumnLayout] = React.useState<'compact' | 'expanded'>('compact')
  const [includeCourses, setIncludeCourses] = React.useState<boolean>(false)

  const handlePrint = () => {
    // Cerrar el modal primero para que Radix no bloquee el DOM ni superponga el portal
    onOpenChange(false)
    setTimeout(() => {
      window.print()
    }, 280)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
        {/* Header con título y controles */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0">
                <Printer className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>Presentación y Exportación Ejecutiva en PDF</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                    Landscape A4
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Visualiza el documento oficial apaisado con membrete institucional, ficha técnica y métricas para imprimir o guardar como PDF vectorial.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Barra de opciones de formato */}
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/60 flex-wrap text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Sliders className="size-3 text-muted-foreground" />
                <span>Formato de Columnas:</span>
              </span>

              <div className="flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setColumnLayout('compact')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    columnLayout === 'compact'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Compacto (Act → Proy) • Recomendado A4
                </button>
                <button
                  type="button"
                  onClick={() => setColumnLayout('expanded')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    columnLayout === 'expanded'
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Expandido (Cols independientes)
                </button>
              </div>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={includeCourses}
                  onCheckedChange={(checked) => setIncludeCourses(!!checked)}
                />
                <span className="text-xs text-foreground font-medium flex items-center gap-1">
                  <BookOpen className="size-3 text-muted-foreground" />
                  Incluir desglose de asignaturas / cursos
                </span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded">
              <Info className="size-3 text-blue-500 shrink-0" />
              <span>En la ventana de impresión, selecciona destino <strong>"Guardar como PDF"</strong></span>
            </div>
          </div>
        </DialogHeader>

        {/* Contenedor de Vista Previa con estilo de hoja de papel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80">
          <div className="max-w-[1050px] mx-auto bg-white rounded-lg shadow-md border border-slate-300 dark:border-slate-800 overflow-hidden">
            <ForecastPrintReport
              {...reportProps}
              columnLayout={columnLayout}
              includeCourses={includeCourses}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <DialogFooter className="p-4 border-t border-border bg-muted/30 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-500" />
            <span>Fidelidad vectorial al 100% con Geist Sans y soporte para márgenes A4 / Letter.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cerrar
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-2 text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              <Printer className="size-3.5" />
              <span>Imprimir / Guardar en PDF</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
