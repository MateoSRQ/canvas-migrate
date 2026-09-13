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
  Globe,
  RefreshCw,
  Search,
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
import type { ExportCanvasResult } from '#/server/services/canvas-exporter'
import { auditCanvasExportFn } from '#/server/functions/canvas'
import type { CanvasAuditReport } from '#/server/services/canvas-audit-service'

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
  onCopyPath: (targetPath: string) => void
  onResetExport: () => void
  onExecuteExport: () => void
  caseId?: string
  selectedSectionIds?: number[]
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
  onCopyPath,
  onResetExport,
  onExecuteExport,
  caseId,
  selectedSectionIds,
}: CanvasExportDialogProps) {
  // Estados para la auditoría de variaciones con Canvas API
  const [isAuditing, setIsAuditing] = React.useState(false)
  const [auditResult, setAuditResult] = React.useState<CanvasAuditReport | null>(null)
  const [auditError, setAuditError] = React.useState<string | null>(null)
  const [auditFilter, setAuditFilter] = React.useState<
    'all' | 'variations' | 'matches' | 'courses' | 'sections' | 'teachers' | 'students'
  >('all')
  const [auditSearchQuery, setAuditSearchQuery] = React.useState('')

  const handleReset = () => {
    setAuditResult(null)
    setAuditError(null)
    onResetExport()
  }

  const handleRunAudit = async () => {
    if (!caseId || !selectedSectionIds || selectedSectionIds.length === 0) {
      setAuditError('No hay secciones seleccionadas o identificador de caso para auditar.')
      return
    }

    setIsAuditing(true)
    setAuditError(null)
    try {
      const res = await auditCanvasExportFn({
        data: {
          caseId,
          selectedSectionIds,
          rootAccountId: exportResult?.rootAccountId || rootAccountId,
        },
      })
      if (!res.success) {
        setAuditError(res.error || 'Error al conectar con Canvas REST API.')
      } else {
        setAuditResult(res)
      }
    } catch (err: any) {
      setAuditError(err?.message || 'Error inesperado al auditar contra Canvas LMS API.')
    } finally {
      setIsAuditing(false)
    }
  }

  // Filtrado de variaciones para la vista
  const displayedVariations = React.useMemo(() => {
    if (!auditResult) return []
    return auditResult.variations.filter((v) => {
      // Filtro de pestaña
      if (auditFilter === 'variations' && v.status === 'match') return false
      if (auditFilter === 'matches' && v.status !== 'match') return false
      if (auditFilter === 'courses' && v.entityType !== 'course') return false
      if (auditFilter === 'sections' && v.entityType !== 'section') return false
      if (auditFilter === 'teachers' && v.entityType !== 'teacher') return false
      if (auditFilter === 'students' && v.entityType !== 'student') return false

      // Búsqueda textual
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim()
        const matchName = v.name.toLowerCase().includes(q)
        const matchSis = v.sisId.toLowerCase().includes(q)
        const matchCourse = v.courseCode.toLowerCase().includes(q) || v.courseName.toLowerCase().includes(q)
        const matchDesc = v.description.toLowerCase().includes(q)
        return matchName || matchSis || matchCourse || matchDesc
      }

      return true
    })
  }, [auditResult, auditFilter, auditSearchQuery])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
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

            {/* SECCIÓN NUEVA: Revisión y Auditoría de Variaciones con Canvas LMS (API) */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Revisión de Exportación contra Canvas LMS (API)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Coteja en vivo contra Canvas REST API si los cursos, secciones, docentes y alumnos ya existen o identifica variaciones.
                    </p>
                  </div>
                </div>

                <Button
                  variant={auditResult ? 'outline' : 'default'}
                  size="xs"
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className={`text-xs h-7 gap-1.5 font-medium ${
                    !auditResult
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : ''
                  }`}
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>Auditando con Canvas API...</span>
                    </>
                  ) : auditResult ? (
                    <>
                      <RefreshCw className="size-3" />
                      <span>Volver a Auditar</span>
                    </>
                  ) : (
                    <>
                      <Globe className="size-3" />
                      <span>Auditar con Canvas API</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Estado de carga de auditoría */}
              {isAuditing && (
                <div className="p-6 text-center space-y-2 rounded-lg bg-card border border-border">
                  <Loader2 className="size-6 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    Consultando Canvas REST API en vivo...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Verificando existencia de cursos, secciones creadas, asignación oficial de docentes (DNI) y matrículas de estudiantes.
                  </p>
                </div>
              )}

              {/* Error en auditoría */}
              {auditError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{auditError}</span>
                </div>
              )}

              {/* Resultado de auditoría */}
              {auditResult && !isAuditing && (
                <div className="space-y-3 pt-1">
                  {/* Banner de estado */}
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                      auditResult.variationsCount === 0
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {auditResult.variationsCount === 0 ? (
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        {auditResult.variationsCount === 0
                          ? '¡Coincidencia completa con Canvas LMS!'
                          : `Se detectaron ${auditResult.variationsCount} variaciones o elementos pendientes de creación`}
                      </div>
                      <div className="text-[11px] opacity-90">
                        Endpoint: <span className="font-mono">{auditResult.endpoint}</span> • Auditado: {new Date(auditResult.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* 4 Métricas de cotejo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border">
                      <div className="font-mono font-bold text-foreground">
                        <span className="text-emerald-600">{auditResult.matchedCourses}</span> / {auditResult.totalCourses}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Cursos en Canvas ({auditResult.missingCourses} pendientes)
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border">
                      <div className="font-mono font-bold text-foreground">
                        <span className="text-emerald-600">{auditResult.matchedSections}</span> / {auditResult.totalSections}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Secciones ({auditResult.missingSections} pendientes)
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border">
                      <div className="font-mono font-bold text-foreground">
                        <span className="text-emerald-600">{auditResult.matchedTeachers}</span> / {auditResult.totalTeachers}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Docentes Asignados ({auditResult.missingTeachers} pendientes)
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border">
                      <div className="font-mono font-bold text-foreground">
                        <span className="text-emerald-600">{auditResult.matchedStudents}</span> / {auditResult.totalStudents}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Alumnos Matriculados ({auditResult.missingStudents} pendientes)
                      </div>
                    </div>
                  </div>

                  {/* Filtros y Buscador de Variaciones */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                      <button
                        onClick={() => setAuditFilter('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Todas ({auditResult.variations.length})
                      </button>
                      <button
                        onClick={() => setAuditFilter('variations')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'variations'
                            ? 'bg-amber-600 text-white'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Variaciones ({auditResult.variationsCount})
                      </button>
                      <button
                        onClick={() => setAuditFilter('matches')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'matches'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Coincidentes ({auditResult.variations.length - auditResult.variationsCount})
                      </button>
                      <button
                        onClick={() => setAuditFilter('courses')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'courses'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Cursos
                      </button>
                      <button
                        onClick={() => setAuditFilter('teachers')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'teachers'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Docentes
                      </button>
                      <button
                        onClick={() => setAuditFilter('students')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          auditFilter === 'students'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Alumnos
                      </button>
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search className="size-3.5 absolute left-2 top-2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={auditSearchQuery}
                        onChange={(e) => setAuditSearchQuery(e.target.value)}
                        placeholder="Filtrar por código/nombre..."
                        className="text-xs h-7 pl-7 bg-background"
                      />
                    </div>
                  </div>

                  {/* Lista de Variaciones */}
                  <div className="rounded-lg border border-border divide-y divide-border overflow-y-auto max-h-64 text-xs font-mono bg-card">
                    {displayedVariations.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-xs italic">
                        No hay elementos que coincidan con los filtros seleccionados.
                      </div>
                    ) : (
                      displayedVariations.map((v) => (
                        <div key={v.id} className="p-2.5 hover:bg-muted/20 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-semibold px-1 py-0 h-4"
                              >
                                {v.entityType === 'course'
                                  ? 'Curso'
                                  : v.entityType === 'section'
                                  ? 'Sección'
                                  : v.entityType === 'teacher'
                                  ? 'Docente'
                                  : 'Alumno'}
                              </Badge>

                              <Badge
                                variant={
                                  v.status === 'match'
                                    ? 'secondary'
                                    : v.status === 'missing'
                                    ? 'destructive'
                                    : 'outline'
                                }
                                className={`text-[10px] px-1.5 py-0 h-4 ${
                                  v.status === 'match'
                                    ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                    : v.status === 'missing'
                                    ? 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                    : 'border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                                }`}
                              >
                                {v.status === 'match'
                                  ? 'Coincide en Canvas'
                                  : v.status === 'missing'
                                  ? 'Pendiente en Canvas'
                                  : 'Variación de Datos'}
                              </Badge>

                              <span className="font-semibold text-foreground truncate max-w-xs">
                                {v.name}
                              </span>
                            </div>

                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              SIS: {v.sisId}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground font-sans pl-1">
                            {v.description}
                          </div>

                          {v.status !== 'match' && v.canvasValue && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 pl-1 font-mono">
                              <span>
                                <strong>Exportado:</strong> {v.exportedValue}
                              </span>
                              <span>•</span>
                              <span>
                                <strong>Canvas:</strong> {v.canvasValue}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
                onClick={handleReset}
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
