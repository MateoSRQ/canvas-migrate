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
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import type { ExportCanvasResult, SandboxPrefixMode } from '#/server/services/canvas-exporter'

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
  createRootAccount: boolean
  onCreateRootAccountChange: (value: boolean) => void
  rootAccountName: string
  onRootAccountNameChange: (value: string) => void
  prefixMode: SandboxPrefixMode
  onPrefixModeChange: (mode: SandboxPrefixMode) => void
  enableCrossListing: boolean
  onEnableCrossListingChange: (value: boolean) => void
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
  createRootAccount,
  onCreateRootAccountChange,
  rootAccountName,
  onRootAccountNameChange,
  prefixMode,
  onPrefixModeChange,
  enableCrossListing,
  onEnableCrossListingChange,
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
                  <code className="font-semibold font-mono">canvas_migration.zip</code> listo para importar en
                  Canvas.
                </p>
                {exportResult.prefixMode !== 'none' && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-emerald-950 dark:text-emerald-100 bg-emerald-600/15 border border-emerald-600/25 px-2.5 py-1.5 rounded-md flex-wrap">
                    <span className="font-bold">
                      {exportResult.prefixMode === 'all'
                        ? 'Aislamiento Total Activo:'
                        : 'Aislamiento de Cuentas Activo:'}
                    </span>
                    <span>
                      Prefijo ({exportResult.prefixMode === 'all' ? 'cuentas, cursos y secciones' : 'solo subcuentas'}):{' '}
                      <strong>{exportResult.accountPrefix}</strong>
                    </span>
                  </div>
                )}
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
                    <>
                      <strong className="text-emerald-600 font-mono">
                        {exportResult.rootAccountId}
                      </strong>{' '}
                      <span className="text-[10px] text-muted-foreground">
                        ({exportResult.rootAccountCreated ? 'Creada en la migración' : 'Existente en Canvas'})
                      </span>
                    </>
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

            {/* Banner de Cross-listing Activo */}
            {exportResult.stats.xlistsCount > 0 && (
              <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                  <Layers className="size-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Cross-listing Activo:</strong> Se combinaron{' '}
                    <strong>{exportResult.stats.xlistsCount} secciones</strong> bajo{' '}
                    <strong>{exportResult.stats.xlistGroupsCount} cursos contenedores maestros</strong> (GRP_&lt;grupo&gt;).
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 shrink-0"
                >
                  xlists.csv ({exportResult.stats.xlistsCount})
                </Badge>
              </div>
            )}

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

            {/* Alcance de la Migración a Exportar (Con Números Clave) */}
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

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>
                  Filtro de exclusión activo: Las secciones <strong>«NO HABILITADO»</strong> han sido automáticamente omitidas de este alcance.
                </span>
              </div>
            </div>

            {/* Configuración de Cross-listing por Grupos (Aulas Compartidas) */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-4 text-indigo-600" />
                  <span>Cross-listing de Cursos Compartidos (Grupos)</span>
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                >
                  xlists.csv
                </Badge>
              </div>

              <div className="flex items-start gap-2.5 pt-0.5">
                <Checkbox
                  id="enable-cross-listing"
                  checked={enableCrossListing}
                  onCheckedChange={(checked) => onEnableCrossListingChange(Boolean(checked))}
                  disabled={isExporting}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="enable-cross-listing"
                    className="text-xs font-medium text-foreground cursor-pointer select-none flex items-center gap-2 flex-wrap"
                  >
                    <span>Activar creación de cursos con Cross-listing usando grupos</span>
                    {enableCrossListing && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 font-medium"
                      >
                        Recomendado para Docentes
                      </Badge>
                    )}
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {enableCrossListing
                      ? 'Crea cursos contenedores maestros (GRP_<grupo>) y genera el archivo xlists.csv. Los docentes verán a todos los alumnos de las distintas carreras en un solo curso unificado de Canvas, compartiendo tareas, anuncios y calificaciones.'
                      : 'Crea cursos 1:1 independientes para cada combinación curso-sección. El docente verá un curso separado por cada carrera, sin unificación de aula.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuración de Subcuenta Inicial / Raíz en Canvas */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 text-xs">
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
                Si desea que las Sedes cuelguen de una subcuenta específica en lugar de la raíz institucional de Canvas, ingrese su SIS ID o código (ej: <code className="font-semibold text-foreground">TEST-POSGRADO-2026-2</code> o <code className="font-semibold text-foreground">S-001</code>). Si lo deja en blanco, colgarán directamente de la raíz de Canvas.
              </p>
              <Input
                type="text"
                value={rootAccountId}
                onChange={(e) => onRootAccountIdChange(e.target.value)}
                placeholder="Dejar en blanco para raíz principal, o SIS ID de la subcuenta padre"
                className="font-mono text-xs h-8 bg-background"
                disabled={isExporting}
              />

              {rootAccountId.trim().length > 0 && (
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="create-root-account"
                      checked={createRootAccount}
                      onCheckedChange={(checked) => onCreateRootAccountChange(Boolean(checked))}
                      disabled={isExporting}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="create-root-account"
                        className="text-xs font-medium text-foreground cursor-pointer select-none"
                      >
                        Crear esta subcuenta en Canvas LMS (se incluirá en accounts.csv como cuenta padre)
                      </label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {createRootAccount
                          ? 'Se generará una primera fila en accounts.csv para dar de alta esta subcuenta en la raíz institucional y colgar las sedes bajo ella en la misma importación SIS.'
                          : 'La subcuenta ya debe existir previamente en Canvas LMS con este SIS ID o ID numérico.'}
                      </p>
                    </div>
                  </div>

                  {createRootAccount && (
                    <div className="pl-6 space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Nombre visible de la subcuenta en Canvas (Opcional):
                      </label>
                      <Input
                        type="text"
                        value={rootAccountName}
                        onChange={(e) => onRootAccountNameChange(e.target.value)}
                        placeholder={`Por defecto: ${rootAccountId.trim()}`}
                        className="font-mono text-xs h-8 bg-background"
                        disabled={isExporting}
                      />
                    </div>
                  )}

                  {/* Opción de Aislamiento Sandbox: 3 Modos (sin prefijo, cuentas, todos) */}
                  <div className="pt-2.5 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>Aislamiento Sandbox / Prefijo SIS:</span>
                      </label>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        Prefijo: {rootAccountId.trim()}_
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* 1. Sin prefijo */}
                      <div
                        onClick={() => !isExporting && onPrefixModeChange('none')}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                          prefixMode === 'none'
                            ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-card/50 hover:bg-muted/30'
                        }`}
                      >
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            prefixMode === 'none'
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/50'
                          }`}
                        >
                          {prefixMode === 'none' && (
                            <div className="size-1.5 rounded-full bg-background" />
                          )}
                        </div>
                        <div className="space-y-0.5 text-left">
                          <div className="text-xs font-medium text-foreground">
                            Sin prefijo (Estándar / Producción)
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Mantiene los SIS IDs globales (<code className="text-foreground">S-001</code>, <code className="text-foreground">MP-CUR006380-01-D</code>). Si la sede ya existe en Canvas, Canvas la reubicará bajo esta subcuenta arrastrando todas sus ramas y cursos preexistentes.
                          </p>
                        </div>
                      </div>

                      {/* 2. Aplicar prefijo a cuentas */}
                      <div
                        onClick={() => !isExporting && onPrefixModeChange('accounts')}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                          prefixMode === 'accounts'
                            ? 'border-emerald-600/60 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                            : 'border-border bg-card/50 hover:bg-muted/30'
                        }`}
                      >
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            prefixMode === 'accounts'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-muted-foreground/50'
                          }`}
                        >
                          {prefixMode === 'accounts' && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="space-y-0.5 text-left">
                          <div className="text-xs font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Aplicar prefijo a cuentas</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-normal"
                            >
                              Recomendado en Sandbox
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Prefija únicamente la estructura de subcuentas (<code className="text-foreground">{rootAccountId.trim()}_S-001</code>, <code className="text-foreground">{rootAccountId.trim()}_P004084</code>). Los cursos conservan su código v2 (<code className="text-foreground">MP-CUR006380-01-D</code>). Evita mover la Sede Lima real ni arrastrar carreras de salud.
                          </p>
                        </div>
                      </div>

                      {/* 3. Aplicar prefijo a todos */}
                      <div
                        onClick={() => !isExporting && onPrefixModeChange('all')}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                          prefixMode === 'all'
                            ? 'border-blue-600/60 bg-blue-500/10 ring-1 ring-blue-500/20'
                            : 'border-border bg-card/50 hover:bg-muted/30'
                        }`}
                      >
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            prefixMode === 'all'
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-muted-foreground/50'
                          }`}
                        >
                          {prefixMode === 'all' && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="space-y-0.5 text-left">
                          <div className="text-xs font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Aplicar prefijo a todos (Cuentas, Cursos y Secciones)</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-normal"
                            >
                              Aislamiento Total
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Prefija cuentas (<code className="text-foreground">{rootAccountId.trim()}_S-001</code>), cursos (<code className="text-foreground">{rootAccountId.trim()}_MP-CUR006380-01-D</code>) y secciones (<code className="text-foreground">{rootAccountId.trim()}_7115-MP-CUR006380-01-D</code>). Genera un entorno de prueba 100% aislado sin afectar ni colisionar con ningún curso real en Canvas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones de exportación */}
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
