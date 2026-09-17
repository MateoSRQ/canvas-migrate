import * as React from 'react'
import {
  Printer,
  FileText,
  Sliders,
  Sparkles,
  BookOpen,
  Info,
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
  const [paperSize, setPaperSize] = React.useState<'A3' | 'A4'>('A3')
  const [columnLayout, setColumnLayout] = React.useState<'compact' | 'expanded'>('compact')
  const [includeCourses, setIncludeCourses] = React.useState<boolean>(false)

  const handlePrint = () => {
    // Configurar dinámicamente la regla @page según el tamaño de hoja elegido (A3 o A4)
    let styleEl = document.getElementById('print-page-style') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'print-page-style'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `@media print { @page { size: ${paperSize} landscape; margin: ${
      paperSize === 'A3' ? '8mm 8mm 10mm 8mm' : '6mm 6mm 8mm 6mm'
    }; } }`

    // Cerrar el modal primero para que Radix no bloquee el DOM ni superponga el portal
    onOpenChange(false)
    setTimeout(() => {
      window.print()
    }, 280)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
        {/* Header con título y controles */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0">
                <Printer className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                  <span>Presentación y Exportación Ejecutiva en PDF</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-semibold">
                    Formato {paperSize} Horizontal ({paperSize === 'A3' ? '420 × 297 mm' : '297 × 210 mm'})
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Visualiza y configura el informe oficial en hoja <strong>A3 Horizontal</strong> para que todas las carreras, ciclos y cursos alcancen con máxima legibilidad.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Barra de opciones de formato y tamaño de hoja */}
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/60 flex-wrap text-xs">
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Selector de Tamaño de Hoja: A3 vs A4 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <FileText className="size-3 text-muted-foreground" />
                  <span>Hoja:</span>
                </span>
                <div className="flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A3')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      paperSize === 'A3'
                        ? 'bg-background text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    A3 (420 × 297 mm) • Recomendado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      paperSize === 'A4'
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    A4 (297 × 210 mm)
                  </button>
                </div>
              </div>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              {/* Selector de Formato de Columnas */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <Sliders className="size-3 text-muted-foreground" />
                  <span>Columnas:</span>
                </span>
                <div className="flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setColumnLayout('compact')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      columnLayout === 'compact'
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Compacto (Act → Proy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnLayout('expanded')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      columnLayout === 'expanded'
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Expandido (2 cols/ciclo)
                  </button>
                </div>
              </div>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={includeCourses}
                  onCheckedChange={(checked) => setIncludeCourses(!!checked)}
                />
                <span className="text-xs text-foreground font-medium flex items-center gap-1">
                  <BookOpen className="size-3 text-muted-foreground" />
                  Incluir desglose de asignaturas
                </span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded">
              <Info className="size-3 text-blue-500 shrink-0" />
              <span>En la ventana de impresión, selecciona <strong>"Guardar como PDF"</strong> y tamaño <strong>{paperSize}</strong></span>
            </div>
          </div>
        </DialogHeader>

        {/* Contenedor de Vista Previa con estilo de hoja A3/A4 */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80">
          <div className={`mx-auto bg-white rounded-lg shadow-md border border-slate-300 dark:border-slate-800 overflow-hidden ${
            paperSize === 'A3' ? 'max-w-[1360px]' : 'max-w-[1050px]'
          }`}>
            <ForecastPrintReport
              {...reportProps}
              paperSize={paperSize}
              columnLayout={columnLayout}
              includeCourses={includeCourses}
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <DialogFooter className="p-4 border-t border-border bg-muted/30 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-500" />
            <span>Formato {paperSize} horizontal configurado para entrar holgadamente con fidelidad vectorial nativa.</span>
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
              <span>Imprimir / Guardar en PDF ({paperSize})</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
