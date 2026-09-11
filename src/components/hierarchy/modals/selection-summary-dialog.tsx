import * as React from 'react'
import { CheckSquare, FileSpreadsheet } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'

interface SelectionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  selectionStats: {
    sectionsCount: number
    coursesCount: number
    studentsTotal: number
  }
  onOpenExport: () => void
}

export function SelectionSummaryDialog({
  isOpen,
  onClose,
  selectedCount,
  selectionStats,
  onOpenExport,
}: SelectionSummaryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            <span>Resumen de Selección Activa</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Detalle cuantitativo de las {selectedCount} secciones marcadas para sincronización o
            exportación a Canvas LMS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold font-mono text-foreground">
                {selectionStats.sectionsCount}
              </div>
              <div className="text-[11px] text-muted-foreground">Secciones Seleccionadas</div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold font-mono text-foreground">
                {selectionStats.coursesCount}
              </div>
              <div className="text-[11px] text-muted-foreground">Cursos Únicos</div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold font-mono text-primary">
                {selectionStats.studentsTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground">Matrículas Totales</div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Estas secciones seleccionadas conservan su jerarquía completa (Cuenta Sede &gt;
            Subcuentas &gt; Curso &gt; Sección) y están listas para ser exportadas a formato
            estándar SIS CSV o sincronizadas vía API a Canvas LMS.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onClose()
                onOpenExport()
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <FileSpreadsheet className="size-4" />
              <span>Exportar para Canvas ({selectedCount})</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
