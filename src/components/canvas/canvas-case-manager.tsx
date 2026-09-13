import * as React from 'react'
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Layers,
  Table as TableIcon,
  Loader2,
  Search,
  FolderTree,
  Building,
  BookOpen,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import type { CanvasImportCase } from '#/db/schema'
import type { CanvasAccountTreeNode } from '#/server/services/canvas-importer'
import {
  getCanvasCasesFn,
  getCanvasCaseDetailFn,
  getCanvasCaseAccountsTreeFn,
  runCanvasImportCaseFn,
  deleteCanvasCaseFn,
  getCanvasEntitySampleFn,
  testCanvasConnectionFn,
} from '#/server/functions/canvas'

export function CanvasCaseManager() {
  const [cases, setCases] = React.useState<CanvasImportCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null)
  const [caseDetail, setCaseDetail] = React.useState<{
    caseItem: CanvasImportCase
    entities: { id: number; entityType: string; itemCount: number; extractedAt: Date }[]
  } | null>(null)
  const [treeData, setTreeData] = React.useState<{
    rootNodes: CanvasAccountTreeNode[]
    totalAccounts: number
    withSisCount: number
    withoutSisCount: number
    totalCourses: number
  } | null>(null)

  const [isLoadingCases, setIsLoadingCases] = React.useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'tree' | 'entities'>('tree')

  // Sample inspector modal
  const [selectedEntity, setSelectedEntity] = React.useState<string | null>(null)
  const [entitySample, setEntitySample] = React.useState<any[] | null>(null)
  const [isLoadingSample, setIsLoadingSample] = React.useState(false)

  // Tree filter and collapse states
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedNodes, setExpandedNodes] = React.useState<Set<number>>(new Set())

  // New Case Dialog states
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [importName, setImportName] = React.useState('')
  const [importDesc, setImportDesc] = React.useState('')
  const [includeCourses, setIncludeCourses] = React.useState(true)
  const [isTestingConn, setIsTestingConn] = React.useState(false)
  const [testConnResult, setTestConnResult] = React.useState<{
    success: boolean
    message?: string
  } | null>(null)

  const loadCases = React.useCallback(async () => {
    setIsLoadingCases(true)
    try {
      const data = await getCanvasCasesFn()
      setCases(data)
      if (data.length > 0 && !selectedCaseId) {
        handleSelectCase(data[0].id)
      }
    } catch (err) {
      console.error('Error al cargar casos de Canvas:', err)
    } finally {
      setIsLoadingCases(false)
    }
  }, [selectedCaseId])

  React.useEffect(() => {
    loadCases()
  }, [])

  const handleSelectCase = async (id: string) => {
    setSelectedCaseId(id)
    setSelectedEntity(null)
    setEntitySample(null)
    setIsLoadingDetail(true)
    try {
      const [detail, tree] = await Promise.all([
        getCanvasCaseDetailFn({ data: id }),
        getCanvasCaseAccountsTreeFn({ data: id }),
      ])
      setCaseDetail(detail)
      setTreeData(tree)

      // Por defecto, desplegar los primeros niveles del árbol
      const initialExpanded = new Set<number>()
      if (tree?.rootNodes) {
        for (const root of tree.rootNodes) {
          initialExpanded.add(root.canvasId)
          for (const child of root.children) {
            initialExpanded.add(child.canvasId)
          }
        }
      }
      setExpandedNodes(initialExpanded)
    } catch (err) {
      console.error('Error al cargar detalle del caso de Canvas:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleToggleNode = (canvasId: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(canvasId)) {
        next.delete(canvasId)
      } else {
        next.add(canvasId)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    if (!treeData) return
    const all = new Set<number>()
    function collect(nodes: CanvasAccountTreeNode[]) {
      for (const n of nodes) {
        all.add(n.canvasId)
        collect(n.children)
      }
    }
    collect(treeData.rootNodes)
    setExpandedNodes(all)
  }

  const handleCollapseAll = () => {
    setExpandedNodes(new Set())
  }

  const handleSelectEntity = async (entityType: string) => {
    if (!selectedCaseId) return
    setSelectedEntity(entityType)
    setIsLoadingSample(true)
    try {
      const sample = await getCanvasEntitySampleFn({
        data: { caseId: selectedCaseId, entityType },
      })
      setEntitySample(sample)
    } catch (err) {
      console.error('Error al cargar muestra de entidad Canvas:', err)
      setEntitySample([])
    } finally {
      setIsLoadingSample(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConn(true)
    setTestConnResult(null)
    try {
      const res = await testCanvasConnectionFn()
      if (res.success) {
        setTestConnResult({
          success: true,
          message: `Conectado a: ${res.rootAccountName} (ID: ${res.rootAccountId})`,
        })
      } else {
        setTestConnResult({
          success: false,
          message: res.error || 'No se pudo conectar con Canvas LMS',
        })
      }
    } catch (err: any) {
      setTestConnResult({
        success: false,
        message: err?.message || 'Error de red al verificar Canvas API',
      })
    } finally {
      setIsTestingConn(false)
    }
  }

  const handleCreateCase = async () => {
    setIsImporting(true)
    try {
      const newCase = await runCanvasImportCaseFn({
        data: {
          name: importName.trim() || undefined,
          description: importDesc.trim() || undefined,
          includeCourses,
        },
      })
      setIsDialogOpen(false)
      setImportName('')
      setImportDesc('')
      setTestConnResult(null)
      await loadCases()
      if (newCase?.id) {
        handleSelectCase(newCase.id)
      }
    } catch (err) {
      console.error('Error al ejecutar importación de Canvas:', err)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteCase = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Está seguro de eliminar este caso de importación de Canvas y todos sus registros?')) {
      return
    }
    try {
      await deleteCanvasCaseFn({ data: caseId })
      if (selectedCaseId === caseId) {
        setSelectedCaseId(null)
        setCaseDetail(null)
        setTreeData(null)
      }
      await loadCases()
    } catch (err) {
      console.error('Error al eliminar caso de Canvas:', err)
    }
  }

  // Filtrado recursivo del árbol por búsqueda
  const filterTreeNodes = React.useCallback(
    (nodes: CanvasAccountTreeNode[], query: string): CanvasAccountTreeNode[] => {
      if (!query) return nodes
      const q = query.toLowerCase()

      return nodes
        .map((node) => {
          const matchSelf =
            node.name.toLowerCase().includes(q) ||
            (node.sisAccountId && node.sisAccountId.toLowerCase().includes(q)) ||
            String(node.canvasId).includes(q)

          const filteredChildren = filterTreeNodes(node.children, query)

          if (matchSelf || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
            }
          }
          return null
        })
        .filter(Boolean) as CanvasAccountTreeNode[]
    },
    []
  )

  const filteredTree = React.useMemo(() => {
    if (!treeData) return []
    return filterTreeNodes(treeData.rootNodes, searchQuery)
  }, [treeData, searchQuery, filterTreeNodes])

  // Componente recursivo para renderizar nodos del árbol
  const renderAccountNode = (node: CanvasAccountTreeNode) => {
    const isExpanded = expandedNodes.has(node.canvasId) || searchQuery.trim().length > 0
    const hasChildren = node.children.length > 0

    return (
      <div key={node.canvasId} className="flex flex-col select-none">
        <div
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs hover:bg-muted/50 transition-colors ${
            node.depth === 0
              ? 'bg-muted/30 font-semibold border border-border/60 my-0.5'
              : 'border-b border-border/20'
          }`}
          style={{ paddingLeft: `${node.depth * 1.5 + 0.6}rem` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => handleToggleNode(node.canvasId)}
                className="p-0.5 hover:bg-muted rounded text-muted-foreground transition-transform shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <div className="w-4.5 shrink-0 flex items-center justify-center text-muted-foreground/40">
                •
              </div>
            )}

            {node.depth === 0 ? (
              <Building className="size-4 text-emerald-600 shrink-0" />
            ) : hasChildren ? (
              <Layers className="size-3.5 text-primary shrink-0" />
            ) : (
              <FolderTree className="size-3.5 text-muted-foreground shrink-0" />
            )}

            <span className="truncate font-medium text-foreground" title={node.name}>
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {node.sisAccountId ? (
              <Badge
                variant="outline"
                className="font-mono text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              >
                SIS: {node.sisAccountId}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground/60 border-dashed"
              >
                Sin SIS ID
              </Badge>
            )}

            <span className="font-mono text-[10px] text-muted-foreground">
              ID: {node.canvasId}
            </span>

            {node.coursesCount > 0 && (
              <Badge
                variant="secondary"
                className="font-mono text-[10px] gap-1 bg-primary/10 text-primary"
              >
                <BookOpen className="size-3" />
                <span>{node.coursesCount}</span>
              </Badge>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col">{node.children.map(renderAccountNode)}</div>
        )}
      </div>
    )
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId)

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
      {/* 1. Panel Izquierdo: Directorio de Casos Canvas */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="size-4 text-emerald-600" />
              <span>Casos Canvas LMS</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Instantáneas extraídas vía REST API
            </p>
          </div>
          <Button
            size="xs"
            onClick={() => {
              setImportName('')
              setImportDesc('')
              setTestConnResult(null)
              setIsDialogOpen(true)
            }}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-3.5" />
            <span>Nuevo</span>
          </Button>
        </div>

        {/* Lista de Casos */}
        <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
          {isLoadingCases ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="size-5 animate-spin mx-auto text-emerald-600" />
              <p>Cargando casos Canvas...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-2 bg-card">
              <Globe className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs font-medium text-foreground">No hay casos de Canvas</p>
              <p className="text-[11px] text-muted-foreground">
                Haga clic en &quot;Nuevo&quot; para importar datos en vivo desde Canvas API.
              </p>
            </div>
          ) : (
            cases.map((c) => {
              const isSelected = c.id === selectedCaseId
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-500/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground line-clamp-1">
                      {c.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        c.status === 'completed'
                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                          : c.status === 'in_progress'
                            ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                            : 'border-destructive/40 text-destructive bg-destructive/10'
                      }`}
                    >
                      {c.status === 'completed' ? 'Completado' : c.status === 'in_progress' ? 'En Progreso' : 'Fallido'}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 font-mono">
                    {c.endpoint}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <Layers className="size-3 text-emerald-600" />
                      {c.totalAccounts} cuentas
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <BookOpen className="size-3 text-primary" />
                      {c.totalCourses} cursos
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
                      onClick={(e) => handleDeleteCase(c.id, e)}
                      title="Eliminar caso"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 2. Panel Derecho: Inspector de Caso y Visualizador */}
      <div className="flex-1 w-full space-y-4">
        {isLoadingDetail ? (
          <div className="p-16 text-center border border-border rounded-xl bg-card space-y-3">
            <Loader2 className="size-8 animate-spin mx-auto text-emerald-600" />
            <h3 className="text-sm font-semibold text-foreground">Cargando caso de Canvas LMS...</h3>
            <p className="text-xs text-muted-foreground">
              Obteniendo árbol de cuentas, subcuentas, cursos y entidades raw.
            </p>
          </div>
        ) : !selectedCase ? (
          <div className="p-16 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
            <Globe className="size-10 mx-auto text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground">Ningún caso seleccionado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Seleccione un caso del panel lateral o cree uno nuevo para consultar la estructura en vivo de Canvas LMS.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Encabezado del caso seleccionado */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{selectedCase.name}</h2>
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedCase.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedCase.description || 'Sin descripción'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleSelectCase(selectedCase.id)}
                    className="gap-1.5 text-xs h-7"
                  >
                    <RefreshCw className="size-3" />
                    <span>Recargar</span>
                  </Button>
                </div>
              </div>

              {/* Métricas del Caso Canvas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-center">
                  <div className="text-base font-bold font-mono text-foreground">
                    {treeData?.totalAccounts ?? selectedCase.totalAccounts}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Total Cuentas</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-center">
                  <div className="text-base font-bold font-mono text-emerald-600">
                    {treeData?.withSisCount ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Cuentas con SIS ID</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-center">
                  <div className="text-base font-bold font-mono text-foreground">
                    {selectedCase.totalTerms}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Periodos (Terms)</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-center">
                  <div className="text-base font-bold font-mono text-primary">
                    {selectedCase.totalCourses}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Cursos en Canvas</div>
                </div>
              </div>
            </div>

            {/* Pestañas de Vista: Árbol vs Entidades */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('tree')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === 'tree'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <FolderTree className="size-3.5" />
                  <span>Árbol de Cuentas y Subcuentas</span>
                </button>

                <button
                  onClick={() => setActiveTab('entities')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === 'entities'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <TableIcon className="size-3.5" />
                  <span>Entidades Raw ({caseDetail?.entities.length || 0})</span>
                </button>
              </div>

              {activeTab === 'tree' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleExpandAll}
                    className="text-[11px] h-7 px-2"
                  >
                    Desplegar Todo
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleCollapseAll}
                    className="text-[11px] h-7 px-2"
                  >
                    Plegar Todo
                  </Button>
                </div>
              )}
            </div>

            {/* Vista 1: Visualizador Árbol de Cuentas */}
            {activeTab === 'tree' && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                {/* Barra de búsqueda */}
                <div className="relative">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nombre de cuenta o SIS ID (ej: SEDE, M-5, F-IN)..."
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>

                {/* Lista del Árbol */}
                <div className="border border-border/80 rounded-lg p-2 max-h-[580px] overflow-y-auto divide-y divide-border/20 bg-background/50">
                  {filteredTree.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No se encontraron cuentas que coincidan con la búsqueda.
                    </div>
                  ) : (
                    filteredTree.map(renderAccountNode)
                  )}
                </div>
              </div>
            )}

            {/* Vista 2: Inspector de Entidades Raw */}
            {activeTab === 'entities' && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs bg-muted/40">
                        <TableHead>Entidad Canvas</TableHead>
                        <TableHead>Total de Elementos</TableHead>
                        <TableHead>Fecha de Extracción</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caseDetail?.entities.map((ent) => (
                        <TableRow key={ent.entityType} className="text-xs hover:bg-muted/20">
                          <TableCell className="font-mono font-medium text-foreground">
                            {ent.entityType}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {ent.itemCount.toLocaleString()} registros
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(ent.extractedAt).toLocaleString('es-ES')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleSelectEntity(ent.entityType)}
                              className="text-xs h-7 gap-1"
                            >
                              <TableIcon className="size-3" />
                              <span>Ver Registros</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Muestra de Entidad Raw (Top 50) */}
      <Dialog open={!!selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="size-4 text-emerald-600" />
              <span>Registros de la Entidad: {selectedEntity}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Muestra de los primeros 50 registros extraídos desde la API de Canvas LMS.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border border-border rounded-lg p-2 font-mono text-[11px] bg-muted/20">
            {isLoadingSample ? (
              <div className="p-8 text-center text-xs space-y-2">
                <Loader2 className="size-5 animate-spin mx-auto text-emerald-600" />
                <p>Cargando registros...</p>
              </div>
            ) : !entitySample || entitySample.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay registros para mostrar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      {Object.keys(entitySample[0] || {}).map((k) => (
                        <TableHead key={k} className="py-1 px-2 whitespace-nowrap">
                          {k}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entitySample.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40">
                        {Object.keys(entitySample[0] || {}).map((k) => (
                          <TableCell key={k} className="py-1 px-2 whitespace-nowrap text-foreground/80">
                            {typeof row[k] === 'object' && row[k] !== null
                              ? JSON.stringify(row[k])
                              : String(row[k] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Nuevo Caso de Importación Canvas API */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="size-4 text-emerald-600" />
              <span>Nuevo Caso de Importación desde Canvas API</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Consulta en tiempo real el árbol de cuentas, subcuentas y cursos cargados en Canvas LMS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Nombre del Caso (Opcional)</label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Ej: Canvas Beta Snapshot Septiembre"
                className="h-8 text-xs"
                disabled={isImporting}
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Descripción (Opcional)</label>
              <Input
                value={importDesc}
                onChange={(e) => setImportDesc(e.target.value)}
                placeholder="Notas de auditoría o motivo de la extracción"
                className="h-8 text-xs"
                disabled={isImporting}
              />
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Verificación de Conexión</span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleTestConnection}
                  disabled={isTestingConn || isImporting}
                  className="h-6 text-[11px] gap-1"
                >
                  {isTestingConn && <Loader2 className="size-3 animate-spin" />}
                  <span>Probar Conexión</span>
                </Button>
              </div>

              {testConnResult && (
                <div
                  className={`p-2 rounded text-[11px] flex items-center gap-2 ${
                    testConnResult.success
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-destructive/10 text-destructive border border-destructive/30'
                  }`}
                >
                  {testConnResult.success ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{testConnResult.message}</span>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeCourses}
                onChange={(e) => setIncludeCourses(e.target.checked)}
                className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                disabled={isImporting}
              />
              <span className="text-xs text-foreground">
                Descargar cursos oficiales de Canvas LMS (~700 cursos)
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isImporting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateCase}
              disabled={isImporting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Extrayendo de Canvas...</span>
                </>
              ) : (
                <>
                  <Globe className="size-3.5" />
                  <span>Iniciar Extracción</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
