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

export function CaseManager() {
  const [cases, setCases] = React.useState<ImportCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null)
  const [caseDetail, setCaseDetail] = React.useState<{
    caseItem: ImportCase
    tables: { id: number; tableName: string; schemaName: string; rowCount: number; extractedAt: Date }[]
  } | null>(null)

  const [selectedTable, setSelectedTable] = React.useState<string | null>(null)
  const [tableSample, setTableSample] = React.useState<any[] | null>(null)
  const [isLoadingSample, setIsLoadingSample] = React.useState(false)

  const [isImporting, setIsImporting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [importName, setImportName] = React.useState("")
  const [importDesc, setImportDesc] = React.useState("")

  const loadCases = React.useCallback(async () => {
    try {
      const data = await getCasesFn()
      setCases(data)
    } catch (err) {
      console.error("Error loading cases:", err)
    }
  }, [])

  React.useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleSelectCase = async (id: string) => {
    setSelectedCaseId(id)
    setSelectedTable(null)
    setTableSample(null)
    try {
      const detail = await getCaseDetailFn({ data: id })
      setCaseDetail(detail)
    } catch (err) {
      console.error("Error loading case detail:", err)
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
      console.error("Error loading table sample:", err)
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
      console.error("Error running import case:", err)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this import case and all its extracted tables?")) {
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
      console.error("Error deleting case:", err)
    }
  }

  // View: Case Detail & Tables Inspector
  if (selectedCaseId && caseDetail) {
    const { caseItem, tables } = caseDetail

    return (
      <div className="w-full flex-1 flex flex-col space-y-6">
        {/* Top Navigation */}
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
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
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
                  className="capitalize"
                >
                  {caseItem.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Case ID: <span className="font-mono">{caseItem.id}</span> • Server:{" "}
                <span className="font-mono">{caseItem.sourceServer}</span> ({caseItem.sourceAcademicDb} /{" "}
                {caseItem.sourceAuthDb})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Extracted:{" "}
              <strong>{caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleString() : "N/A"}</strong>
            </span>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Extracted Tables</p>
            <p className="text-2xl font-bold mt-1">{caseItem.totalTables}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Total Records Stored</p>
            <p className="text-2xl font-bold mt-1">
              {caseItem.totalRows.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Academic Source</p>
            <p className="text-sm font-semibold mt-2 truncate font-mono">{caseItem.sourceAcademicDb}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground font-medium">Auth Source</p>
            <p className="text-sm font-semibold mt-2 truncate font-mono">{caseItem.sourceAuthDb}</p>
          </div>
        </div>

        {/* Master-Detail Split: Tables List & Sample Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Table List (Left 5 Cols) */}
          <div className="lg:col-span-5 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TableIcon className="h-3.5 w-3.5" />
                Raw Database Tables ({tables.length})
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
                        {t.rowCount.toLocaleString()} rows
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sample Viewer (Right 7 Cols) */}
          <div className="lg:col-span-7 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedTable ? `Sample Data: ${selectedTable} (Top 50)` : "Select a table to preview records"}
              </span>
              {tableSample && (
                <span className="text-xs text-muted-foreground">
                  Showing {tableSample.length} rows
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2 max-h-[500px]">
              {isLoadingSample ? (
                <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading table sample...
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
                  No records stored in this table.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-1">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mb-1" />
                  <p>Click on any table on the left to preview extracted records.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // View: Main List of Cases
  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SQL Server Import Cases</h1>
          <p className="text-sm text-muted-foreground">
            Independent snapshots extracted from Microsoft SQL Server (<span className="font-mono">BDACADEMICO5</span> &{" "}
            <span className="font-mono">BDAUTENTICACION5</span>) into SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCases}
            disabled={isImporting}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isImporting ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={isImporting}>
                <Plus className="h-4 w-4" />
                New Import Case
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Execute New SQL Server Import</DialogTitle>
                <DialogDescription>
                  Extracts all 20 academic and personal tables into a new, independent case in SQLite. Subsequent imports do not overwrite this case.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <label htmlFor="import-case-name" className="text-xs font-medium text-foreground block mb-1">
                    Case Name (Optional)
                  </label>
                  <input
                    id="import-case-name"
                    type="text"
                    placeholder="e.g. BDACADEMICO5 - Snapshot 2026-09"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label htmlFor="import-case-desc" className="text-xs font-medium text-foreground block mb-1">
                    Description / Notes
                  </label>
                  <input
                    id="import-case-desc"
                    type="text"
                    placeholder="e.g. Pre-semester sync verification"
                    value={importDesc}
                    onChange={(e) => setImportDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm outline-none focus:border-ring"
                  />
                </div>
                <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground space-y-1 font-mono">
                  <p>Source Server: localhost:1433</p>
                  <p>Academic DB: BDACADEMICO5 (19 tables)</p>
                  <p>Auth DB: BDAUTENTICACION5 (Personal.Utb_Persona)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTriggerImport} className="gap-2">
                  <Database className="h-4 w-4" />
                  Start Import Case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Importing progress banner */}
      {isImporting && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Import Case in Progress...</p>
            <p className="text-xs text-muted-foreground">
              Connecting to SQL Server and streaming 20 tables into SQLite. This takes approximately 8–10 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Cases Table */}
      {cases.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-lg text-center flex flex-col items-center justify-center space-y-3">
          <Database className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">No Import Cases Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Click &quot;New Import Case&quot; to execute your first extraction from the SQL Server database into SQLite.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            Create First Case
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Case Name & ID</TableHead>
                <TableHead>Databases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tables</TableHead>
                <TableHead className="text-right">Records Stored</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.totalTables}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {c.totalRows ? c.totalRows.toLocaleString() : "0"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectCase(c.id)}
                        className="text-xs h-8"
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteCase(c.id, e)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete case"
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
