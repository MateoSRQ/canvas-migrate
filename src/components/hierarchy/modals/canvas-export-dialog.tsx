import * as React from 'react'
import {
  FileSpreadsheet,
  FolderArchive,
  CheckCircle2,
  FolderCheck,
  Check,
  Copy,
  FileText,
  AlertCircle,
  Layers,
  Loader2,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import type { ExportCanvasResult } from '#/server/services/canvas-exporter'

interface CanvasExportDialogProps {
  isOpen: boolean
  onClose: () => void
  isExporting: boolean
  exportResult: ExportCanvasResult | null
  exportError: string | null
  copiedPath: boolean
  selectedCount: number
  selectionStats: {
    sectionsCount: number
    coursesCount: number
    studentsTotal: number
  }
  selectedPeriodName: string
  rootAccountId: string
  onRootAccountIdChange: (value: string) => void
  onCopyPath: (targetPath: string) => void
  onResetExport: () => void
  onExecuteExport: () => void
}

export function CanvasExportDialog({
  isOpen,
  onClose,
  isExporting,
  exportResult,
  exportError,
  copiedPath,
  selectedCount,
  selectionStats,
  selectedPeriodName,
  rootAccountId,
  onRootAccountIdChange,
  onCopyPath,
  onResetExport,
  onExecuteExport,
}: CanvasExportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            <span>Exportar a Archivos CSV para Canvas LMS</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Generación automática del paquete de migración SIS Canvas (6 archivos CSV estándar, árbol
            jerárquico y paquete ZIP) en el directorio de migraciones.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="size-10 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Generando archivos CSV para Canvas LMS...
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Estructurando jerarquía de cuentas, términos, cursos, secciones, docentes (DNI oficial),
                estudiantes y matrículas. Empaquetando archivo ZIP para Canvas SIS Import.
              </p>
            </div>
          </div>
        ) : exportResult ? (
          <div className="space-y-5">
            {/* Banner de éxito */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  ¡Exportación completada exitosamente!
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Se han generado los 6 archivos CSV estándar de Canvas LMS, el árbol jerárquico visual
                  en texto y el archivo comprimido{' '}
                  <code className="font-semibold">canvas_migration.zip</code> listo para importar en
                  Canvas.
                </p>
              </div>
            </div>

            {/* Directorio de destino */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FolderCheck className="size-4 text-emerald-600" />
                  <span>Directorio de Destino Creado</span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onCopyPath(exportResult.destinationDir)}
                  className="text-xs h-7 px-2.5 gap-1.5 hover:bg-muted"
                >
                  {copiedPath ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">¡Ruta Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar Ruta Absoluta</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-xs select-all break-all text-foreground">
                {exportResult.destinationDir}
              </div>

              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Carpeta: <strong className="text-foreground">{exportResult.folderName}</strong>
                </span>
                <span>•</span>
                <span>
                  Periodo: <strong className="text-foreground">{exportResult.periodName}</strong>
                </span>
                <span>•</span>
                <span>
                  Timestamp: <strong className="text-foreground">{exportResult.timestamp}</strong>
                </span>
                <span>•</span>
                <span>
                  Subcuenta Raíz:{' '}
                  {exportResult.rootAccountId ? (
                    <strong className="text-emerald-600 font-mono">
                      {exportResult.rootAccountId}
                    </strong>
                  ) : (
                    <strong className="text-muted-foreground italic font-normal">
                      Raíz institucional por defecto
                    </strong>
                  )}
                </span>
              </div>
            </div>

            {/* Métricas de la migración */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-foreground">
                  {exportResult.stats.accountsCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Cuentas</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-foreground">
                  {exportResult.stats.termsCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Periodos</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-foreground">
                  {exportResult.stats.coursesCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Cursos</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-foreground">
                  {exportResult.stats.sectionsCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Secciones</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-foreground">
                  {exportResult.stats.usersCount}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Usuarios ({exportResult.stats.teachersCount} D / {exportResult.stats.studentsCount} E)
                </div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-card text-center">
                <div className="text-base font-bold font-mono text-emerald-600">
                  {exportResult.stats.enrollmentsCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Matrículas</div>
              </div>
            </div>

            {/* Archivos generados */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Archivos Generados en este Directorio</span>
                <Badge variant="outline" className="text-[10px]">
                  {exportResult.files.length} archivos
                </Badge>
              </div>
              <div className="divide-y divide-border text-xs">
                {exportResult.files.map((file) => {
                  const isZip = file.name.endsWith('.zip')
                  const isDoc = file.name.endsWith('.txt') || file.name.endsWith('.md')
                  return (
                    <div
                      key={file.name}
                      className="px-3 py-2 flex items-center justify-between hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-2">
                        {isZip ? (
                          <FolderArchive className="size-4 text-emerald-600" />
                        ) : isDoc ? (
                          <FileText className="size-4 text-muted-foreground" />
                        ) : (
                          <FileSpreadsheet className="size-4 text-primary" />
                        )}
                        <span className="font-mono font-medium text-foreground">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                        {file.rowsCount > 0 && (
                          <span>{file.rowsCount.toLocaleString()} filas</span>
                        )}
                        <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Instrucciones de uso */}
            <div className="p-3 rounded-lg border border-border bg-muted/10 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p className="font-medium text-foreground">Instrucciones para Canvas LMS:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                <li>
                  Vaya a Canvas LMS &gt; <strong>Configuración de la Cuenta</strong> &gt;{' '}
                  <strong>Importación de SIS</strong>.
                </li>
                <li>
                  Seleccione y cargue el archivo{' '}
                  <strong className="text-foreground font-mono">canvas_migration.zip</strong> generado en
                  esta carpeta.
                </li>
                <li>
                  Seleccione formato <strong>CSV estándar de Instructure</strong> y procese los datos.
                </li>
              </ol>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetExport}
                className="text-xs"
              >
                Generar Otra Vez
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {exportError && (
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Alcance de la Migración a Exportar</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/20 border border-border">
                  <div className="text-base font-bold font-mono text-foreground">{selectedCount}</div>
                  <div className="text-[10px] text-muted-foreground">Secciones Seleccionadas</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border">
                  <div className="text-base font-bold font-mono text-foreground">
                    {selectionStats.coursesCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Cursos Únicos</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border">
                  <div className="text-base font-bold font-mono text-primary">
                    {selectionStats.studentsTotal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Matrículas Totales</div>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border">
                  <div
                    className="text-xs font-semibold font-mono text-foreground truncate"
                    title={selectedPeriodName}
                  >
                    {selectedPeriodName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Periodo Académico</div>
                </div>
              </div>
            </div>

            {/* Configuración de Subcuenta Inicial / Raíz en Canvas */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-4 text-emerald-600" />
                  <span>Subcuenta Inicial / Raíz en Canvas (Opcional)</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                  parent_account_id
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Ingrese el SIS ID de la subcuenta en Canvas donde colgarán las sedes. Si se deja en
                blanco, las sedes se crearán directamente en la raíz institucional de Canvas.
              </p>
              <Input
                type="text"
                value={rootAccountId}
                onChange={(e) => onRootAccountIdChange(e.target.value)}
                placeholder="Ej: PREGRADO_2026, FACULTAD_CENTRAL (o dejar vacío)"
                className="font-mono text-xs h-8 bg-background"
                disabled={isExporting}
              />
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <FolderArchive className="size-4 text-primary" />
                <span>Destino y Archivos Requeridos</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Se creará automáticamente la carpeta en el proyecto con el periodo y marca temporal
                YYYYMMDDHHMMSS:
              </p>
              <div className="p-2 rounded bg-background border border-border font-mono text-[11px] text-foreground select-all">
                migraciones/{selectedPeriodName.replace(/[/\\?%*:|"<>]/g, '-').trim()} - [YYYYMMDDHHMMSS]/
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Archivos SIS CSV Estándar:</span>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    <li>
                      <code>accounts.csv</code> (Cuentas y subcuentas)
                    </li>
                    <li>
                      <code>terms.csv</code> (Periodo académico)
                    </li>
                    <li>
                      <code>courses.csv</code> (Cursos oficiales)
                    </li>
                    <li>
                      <code>sections.csv</code> (Secciones de clases)
                    </li>
                    <li>
                      <code>users.csv</code> (Docentes DNI y alumnos)
                    </li>
                    <li>
                      <code>enrollments.csv</code> (Matrículas activas)
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-foreground">Documentación y Paquete:</span>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    <li>
                      <code>hierarchy.txt</code> (Árbol visual formateado)
                    </li>
                    <li>
                      <code>RESUMEN.md</code> (Ficha técnica y métricas)
                    </li>
                    <li>
                      <code>canvas_migration.zip</code> (Archivo ZIP para SIS)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onExecuteExport}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-sm"
              >
                <FileSpreadsheet className="size-4" />
                <span>Iniciar Exportación para Canvas ({selectedCount})</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
