import * as React from "react"
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Layers,
  Table as TableIcon,
  Loader2,
} from "lucide-react"
import { Button } from "#/components/ui/button"
import { Badge } from "#/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog"
import type { ImportCase } from "#/db/schema"
import {
  getCasesFn,
  getCaseDetailFn,
  runImportCaseFn,
  deleteCaseFn,
  getTableSampleFn,
} from "#/server/functions/cases"

interface CaseManagerProps {
  onExploreHierarchy?: (caseId: string) => void
}

export function CaseManager({ onExploreHierarchy }: CaseManagerProps) {
  const [cases, setCases] = React.useState<ImportCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null)
  const [caseDetail, setCaseDetail] = React.useState<{
    caseItem: ImportCase
    tables: { id: number; tableName: string; schemaName: string; rowCount: number; extractedAt: Date }[]
  } | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)

  const [selectedTable, setSelectedTable] = React.useState<string | null>(null)
  const [tableSample, setTableSample] = React.useState<any[] | null>(null)
  const [isLoadingSample, setIsLoadingSample] = React.useState(false)

  const [isLoadingCases, setIsLoadingCases] = React.useState(true)
  const [isImporting, setIsImporting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [importName, setImportName] = React.useState("")
  const [importDesc, setImportDesc] = React.useState("")

  const loadCases = React.useCallback(async () => {
    setIsLoadingCases(true)
    try {
      const data = await getCasesFn()
      setCases(data)
    } catch (err) {
      console.error("Error al cargar casos:", err)
    } finally {
      setIsLoadingCases(false)
    }
  }, [])

  React.useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleSelectCase = async (id: string) => {
    setSelectedCaseId(id)
    setSelectedTable(null)
    setTableSample(null)
    setIsLoadingDetail(true)
    try {
      const detail = await getCaseDetailFn({ data: id })
      setCaseDetail(detail)
    } catch (err) {
      console.error("Error al cargar detalle del caso:", err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleSelectTable = async (tableName: string) => {
    if (!selectedCaseId) return
    setSelectedTable(tableName)
    setIsLoadingSample(true)
    try {
      const sample = await getTableSampleFn({ data: { caseId: selectedCaseId, tableName } })
      setTableSample(sample)
    } catch (err) {
      console.error("Error al cargar muestra de la tabla:", err)
    } finally {
      setIsLoadingSample(false)
    }
  }

  const handleTriggerImport = async () => {
    setIsImporting(true)
    setIsDialogOpen(false)
    try {
      await runImportCaseFn({
        data: {
          name: importName || undefined,
          description: importDesc || undefined,
        },
      })
      setImportName("")
      setImportDesc("")
      await loadCases()
    } catch (err) {
      console.error("Error al ejecutar caso de importación:", err)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Está seguro de que desea eliminar este caso de importación y todas sus tablas extraídas? Esta acción no se puede deshacer.")) {
      return
    }
    try {
      await deleteCaseFn({ data: id })
      if (selectedCaseId === id) {
        setSelectedCaseId(null)
        setCaseDetail(null)
        setSelectedTable(null)
      }
      await loadCases()
    } catch (err) {
      console.error("Error al eliminar caso:", err)
    }
  }

  // Vista: Cargando Detalle del Caso
  if (selectedCaseId && isLoadingDetail) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-20 space-y-3 rounded-xl border border-border bg-card shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Cargando detalles del caso...</p>
        <p className="text-xs text-muted-foreground font-mono">{selectedCaseId}</p>
      </div>
    )
  }

  // Vista: Detalle del Caso e Inspector de Tablas
  if (selectedCaseId && caseDetail) {
    const { caseItem, tables } = caseDetail

    return (
      <div className="w-full flex-1 flex flex-col space-y-6">
        {/* Navegación Superior */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCaseId(null)
                setCaseDetail(null)
                setSelectedTable(null)
                loadCases()
              }}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Casos
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{caseItem.name}</h2>
                <Badge
                  variant={
                    caseItem.status === "completed"
                      ? "default"
                      : caseItem.status === "in_progress"
                      ? "secondary"
                      : "destructive"
                  }
                  className="capitalize text-xs"
                >
                  {caseItem.status === "completed"
                    ? "Completado"
                    : caseItem.status === "in_progress"
                    ? "En Progreso"
                    : "Fallido"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ID del Caso: <span className="font-mono">{caseItem.id}</span> • Servidor:{" "}
                <span className="font-mono">{caseItem.sourceServer}</span> ({caseItem.sourceAcademicDb} /{" "}
                {caseItem.sourceAuthDb})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Extraído:{" "}
              <strong>{caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleString("es-ES") : "N/A"}</strong>
            </span>
            {onExploreHierarchy && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onExploreHierarchy(caseItem.id)}
                className="gap-1.5 text-xs h-8"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Explorar Jerarquía</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tarjetas de Estadísticas Globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Tablas Extraídas</p>
            <p className="text-2xl font-bold mt-1 font-mono">{caseItem.totalTables}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Registros Totales en BD</p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {caseItem.totalRows.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">BD Académica Origen</p>
            <p className="text-sm font-semibold mt-2 truncate font-mono">{caseItem.sourceAcademicDb}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">BD Autenticación Origen</p>
            <p className="text-sm font-semibold mt-2 truncate font-mono">{caseItem.sourceAuthDb}</p>
          </div>
        </div>

        {/* División Maestro-Detalle: Lista de Tablas y Previsualización de Datos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Lista de Tablas (5 Columnas) */}
          <div className="lg:col-span-5 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TableIcon className="h-3.5 w-3.5" />
                Tablas Fuente Almacenadas ({tables.length})
              </span>
            </div>
            <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
              {tables.map((t) => {
                const isSelected = selectedTable === t.tableName
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTable(t.tableName)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors text-sm ${
                      isSelected
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-xs">{t.tableName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {t.rowCount.toLocaleString()} registros
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Visor de Muestra de Datos (7 Columnas) */}
          <div className="lg:col-span-7 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedTable ? `Muestra de Datos: ${selectedTable} (Primeros 50)` : "Seleccione una tabla para previsualizar registros"}
              </span>
              {tableSample && (
                <span className="text-xs text-muted-foreground">
                  Mostrando {tableSample.length} filas
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2 max-h-[500px]">
              {isLoadingSample ? (
                <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando muestra de la tabla...
                </div>
              ) : selectedTable && tableSample && tableSample.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        {Object.keys(tableSample[0]).map((col) => (
                          <TableHead key={col} className="font-mono whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableSample.map((row, rIdx) => (
                        <TableRow key={rIdx}>
                          {Object.keys(row).map((col) => (
                            <TableCell key={col} className="whitespace-nowrap font-mono max-w-[200px] truncate">
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : <span className="text-muted-foreground/40 italic">null</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedTable ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No hay registros almacenados en esta tabla.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-1">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mb-1" />
                  <p>Haga clic en cualquier tabla de la izquierda para ver los registros extraídos.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista: Lista Principal de Casos de Importación
  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      {/* Barra de Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registro de Casos de Importación</h1>
          <p className="text-sm text-muted-foreground">
            Instantáneas independientes extraídas desde Microsoft SQL Server (<span className="font-mono">BDACADEMICO5</span> y{" "}
            <span className="font-mono">BDAUTENTICACION5</span>) hacia SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCases}
            disabled={isImporting}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isImporting ? "animate-spin" : ""}`} />
            Refrescar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-xs" disabled={isImporting}>
                <Plus className="h-4 w-4" />
                Nuevo Caso de Importación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ejecutar Nueva Importación de SQL Server</DialogTitle>
                <DialogDescription className="text-xs">
                  Extrae las 20 tablas académicas y personales en un nuevo caso independiente en SQLite. Las importaciones posteriores no sobrescriben este caso.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <label htmlFor="import-case-name" className="text-xs font-medium text-foreground block mb-1">
                    Nombre del Caso (Opcional)
                  </label>
                  <input
                    id="import-case-name"
                    type="text"
                    placeholder="Ej. BDACADEMICO5 - Instantánea 2026-09"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label htmlFor="import-case-desc" className="text-xs font-medium text-foreground block mb-1">
                    Descripción / Notas
                  </label>
                  <input
                    id="import-case-desc"
                    type="text"
                    placeholder="Ej. Verificación previa a matrícula"
                    value={importDesc}
                    onChange={(e) => setImportDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm outline-none focus:border-ring"
                  />
                </div>
                <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground space-y-1 font-mono">
                  <p>Servidor Origen: localhost:1433</p>
                  <p>BD Académica: BDACADEMICO5 (19 tablas)</p>
                  <p>BD Autenticación: BDAUTENTICACION5 (Personal.Utb_Persona)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button onClick={handleTriggerImport} className="gap-2 text-xs">
                  <Database className="h-4 w-4" />
                  Iniciar Caso de Importación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Banner de progreso de importación */}
      {isImporting && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Importación en Progreso...</p>
            <p className="text-xs text-muted-foreground">
              Conectando a SQL Server y transfiriendo 20 tablas a SQLite en lotes de 500 registros. Esto toma aproximadamente 8–10 segundos.
            </p>
          </div>
        </div>
      )}

      {/* Tabla de Casos */}
      {isLoadingCases ? (
        <div className="p-16 border border-border rounded-lg text-center flex flex-col items-center justify-center space-y-3 bg-card shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Cargando registro de casos...</p>
          <p className="text-xs text-muted-foreground">Consultando base de datos local SQLite</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-lg text-center flex flex-col items-center justify-center space-y-3">
          <Database className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Sin Casos de Importación Aún</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Haga clic en «Nuevo Caso de Importación» para ejecutar su primera extracción desde Microsoft SQL Server hacia SQLite.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2 text-xs">
            <Plus className="h-4 w-4" />
            Crear Primer Caso
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Nombre e ID del Caso</TableHead>
                <TableHead>Bases de Datos Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Tablas</TableHead>
                <TableHead className="text-right">Registros Extraídos</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelectCase(c.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{c.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs font-mono">
                      <span>{c.sourceAcademicDb}</span>
                      <span className="text-muted-foreground">{c.sourceAuthDb}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "completed"
                          ? "default"
                          : c.status === "in_progress"
                          ? "secondary"
                          : "destructive"
                      }
                      className="capitalize text-[11px] gap-1"
                    >
                      {c.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                      {c.status === "in_progress" && <Clock className="h-3 w-3" />}
                      {c.status === "failed" && <AlertCircle className="h-3 w-3" />}
                      {c.status === "completed"
                        ? "Completado"
                        : c.status === "in_progress"
                        ? "En Progreso"
                        : "Fallido"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.totalTables}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.totalRows ? c.totalRows.toLocaleString() : "0"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString("es-ES") : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {onExploreHierarchy && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExploreHierarchy(c.id)}
                          className="text-xs h-8 gap-1.5"
                          title="Ver jerarquía académica de este caso"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>Ver Jerarquía</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectCase(c.id)}
                        className="text-xs h-8"
                      >
                        Inspeccionar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteCase(c.id, e)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Eliminar caso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
