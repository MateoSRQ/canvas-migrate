import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import {
  Search,
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  Users,
  Building2,
  GraduationCap,
  Calendar,
  BookOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ListTree,
  Table as TableIcon,
  Eye,
  UserCheck,
  FoldVertical,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Checkbox } from '#/components/ui/checkbox'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { getCasesFn } from '#/server/functions/cases'
import { getCaseHierarchyFn, getSectionStudentsFn } from '#/server/functions/hierarchy'
import { HierarchyTreeTable } from '#/components/hierarchy/hierarchy-tree-table'
import type {
  HierarchyItem,
  HierarchyFilterOptions,
  EnrolledStudent,
} from '#/server/services/hierarchy-service'
import type { ImportCase } from '#/db/schema'

interface HierarchySelectorProps {
  onNavigateToCases?: () => void
  selectedCaseId?: string
  onSelectCaseId?: (caseId: string) => void
}

export function HierarchySelector({
  onNavigateToCases,
  selectedCaseId: externalCaseId,
  onSelectCaseId,
}: HierarchySelectorProps) {
  // Modo de vista: Jerárquica Anidada (Árbol) vs Tabla Detallada (TanStack Table)
  const [viewMode, setViewMode] = React.useState<'tree' | 'table'>('tree')

  // Estado de casos
  const [cases, setCases] = React.useState<ImportCase[]>([])
  const [internalCaseId, setInternalCaseId] = React.useState<string>('')
  const selectedCaseId = externalCaseId || internalCaseId

  const handleSelectCaseId = React.useCallback(
    (newId: string) => {
      setInternalCaseId(newId)
      onSelectCaseId?.(newId)
    },
    [onSelectCaseId]
  )

  const [isLoadingCases, setIsLoadingCases] = React.useState(true)

  // Estado de datos jerárquicos
  const [hierarchyData, setHierarchyData] = React.useState<{
    items: HierarchyItem[]
    filters: HierarchyFilterOptions
  } | null>(null)
  const [isLoadingHierarchy, setIsLoadingHierarchy] = React.useState(false)

  // Estados de filtros jerárquicos en cascada
  const [periodoFilter, setPeriodoFilter] = React.useState<string>('all')
  const [sedeFilter, setSedeFilter] = React.useState<string>('all')
  const [modalidadFilter, setModalidadFilter] = React.useState<string>('all')
  const [facultadFilter, setFacultadFilter] = React.useState<string>('all')
  const [carreraFilter, setCarreraFilter] = React.useState<string>('all')
  const [planFilter, setPlanFilter] = React.useState<string>('all')
  const [excludeNoHabilitado, setExcludeNoHabilitado] = React.useState<boolean>(true)
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  // Estado de la tabla TanStack
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [tableExpandedRows, setTableExpandedRows] = React.useState<Set<number>>(new Set())
  const toggleTableRow = React.useCallback((id: number) => {
    setTableExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Diálogo de estudiantes matriculados
  const [inspectingItem, setInspectingItem] = React.useState<HierarchyItem | null>(null)
  const [students, setStudents] = React.useState<EnrolledStudent[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false)

  // Diálogo de resumen de selección
  const [isSummaryOpen, setIsSummaryOpen] = React.useState(false)

  // 1. Cargar lista de casos disponibles
  const loadCases = React.useCallback(async () => {
    setIsLoadingCases(true)
    try {
      const data = await getCasesFn()
      setCases(data)
      if (!selectedCaseId && data.length > 0) {
        const firstCompleted = data.find((c) => c.status === 'completed') || data[0]
        handleSelectCaseId(firstCompleted.id)
      }
    } catch (err) {
      console.error('Error al cargar casos:', err)
    } finally {
      setIsLoadingCases(false)
    }
  }, [selectedCaseId, handleSelectCaseId])

  React.useEffect(() => {
    loadCases()
  }, [loadCases])

  // 2. Cargar datos jerárquicos al cambiar el caso seleccionado
  React.useEffect(() => {
    if (!selectedCaseId) {
      setHierarchyData(null)
      return
    }

    let isMounted = true
    setIsLoadingHierarchy(true)
    setRowSelection({})

    getCaseHierarchyFn({ data: selectedCaseId })
      .then((res) => {
        if (isMounted) {
          setHierarchyData(res)
          setIsLoadingHierarchy(false)
        }
      })
      .catch((err) => {
        console.error('Error al cargar datos jerárquicos:', err)
        if (isMounted) setIsLoadingHierarchy(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCaseId])

  // 3. Inspeccionar estudiantes de una sección
  const handleInspectStudents = async (item: HierarchyItem) => {
    setInspectingItem(item)
    setIsLoadingStudents(true)
    try {
      const list = await getSectionStudentsFn({
        data: { caseId: selectedCaseId, cargaCursoId: item.id },
      })
      setStudents(list)
    } catch (err) {
      console.error('Error al obtener estudiantes matriculados:', err)
      setStudents([])
    } finally {
      setIsLoadingStudents(false)
    }
  }

  // 4. Lógica de filtrado en cascada
  const filteredItems = React.useMemo(() => {
    if (!hierarchyData?.items) return []

    return hierarchyData.items.filter((item) => {
      if (excludeNoHabilitado && item.isNoHabilitado) {
        return false
      }
      if (periodoFilter !== 'all' && String(item.periodoId) !== periodoFilter) {
        return false
      }
      if (sedeFilter !== 'all' && String(item.sedeId) !== sedeFilter) {
        return false
      }
      if (modalidadFilter !== 'all' && String(item.modalidadId) !== modalidadFilter) {
        return false
      }
      if (facultadFilter !== 'all' && String(item.facultadId) !== facultadFilter) {
        return false
      }
      if (carreraFilter !== 'all' && String(item.carreraId) !== carreraFilter) {
        return false
      }
      if (planFilter !== 'all' && String(item.planId) !== planFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchCourseCode = item.cursoCodigo.toLowerCase().includes(query)
        const matchCourseName = item.cursoNombre.toLowerCase().includes(query)
        const matchSectionName = item.seccionNombre.toLowerCase().includes(query)
        const matchTeacher = item.docenteNombre.toLowerCase().includes(query)
        const matchDni = item.docenteDni.toLowerCase().includes(query)
        const matchCareer = item.carreraNombre.toLowerCase().includes(query)
        const matchStudent = item.estudiantes?.some(
          (s) => s.codigo.toLowerCase().includes(query) || s.fullName.toLowerCase().includes(query)
        )
        const matchAnyTeacher = item.docentes?.some(
          (t) => t.dni.toLowerCase().includes(query) || t.fullName.toLowerCase().includes(query)
        )

        if (
          !matchCourseCode &&
          !matchCourseName &&
          !matchSectionName &&
          !matchTeacher &&
          !matchDni &&
          !matchCareer &&
          !matchStudent &&
          !matchAnyTeacher
        ) {
          return false
        }
      }
      return true
    })
  }, [
    hierarchyData,
    excludeNoHabilitado,
    periodoFilter,
    sedeFilter,
    modalidadFilter,
    facultadFilter,
    carreraFilter,
    planFilter,
    searchQuery,
  ])

  // Restablecer filtros
  const handleResetFilters = () => {
    setPeriodoFilter('all')
    setSedeFilter('all')
    setModalidadFilter('all')
    setFacultadFilter('all')
    setCarreraFilter('all')
    setPlanFilter('all')
    setExcludeNoHabilitado(true)
    setSearchQuery('')
  }

  // 5. Manejo de selección en lote (utilizado tanto por la tabla como por el árbol)
  const handleToggleBatchSelection = (sectionIds: number[], forceValue?: boolean) => {
    setRowSelection((prev) => {
      const next = { ...prev }
      const targetState = forceValue !== undefined ? forceValue : true
      for (const id of sectionIds) {
        if (targetState) {
          next[String(id)] = true
        } else {
          delete next[String(id)]
        }
      }
      return next
    })
  }

  // Columnas para TanStack Table
  const columns = React.useMemo<ColumnDef<HierarchyItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Seleccionar todos en la página"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Seleccionar fila"
            />
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'periodoSede',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium hover:text-foreground text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Periodo y Sede</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
            )}
          </button>
        ),
        accessorFn: (row) => `${row.periodoNombre} ${row.sedeNombre}`,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-xs text-foreground flex items-center gap-1.5 flex-wrap">
              <span>{row.original.periodoNombre}</span>
              {row.original.periodoSufijo && (
                <span className="text-[10px] px-1 py-0.2 bg-muted text-muted-foreground rounded font-mono">
                  {row.original.periodoSufijo}
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Building2 className="size-3 text-muted-foreground/70" />
              <span>{row.original.sedeNombre}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'carreraModalidad',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium hover:text-foreground text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Carrera y Facultad</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
            )}
          </button>
        ),
        accessorFn: (row) => `${row.carreraNombre} ${row.facultadNombre}`,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium text-xs text-foreground line-clamp-1">
              {row.original.carreraNombre}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="truncate max-w-[180px]">{row.original.facultadNombre}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {row.original.modalidadNombre}
              </Badge>
            </div>
          </div>
        ),
      },
      {
        id: 'plan',
        header: 'Plan Curricular',
        accessorKey: 'planNombre',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono text-[11px] font-medium text-foreground">
              {row.original.planCodigo || 'S/P'}
            </span>
            <div className="truncate max-w-[130px] text-[11px]">{row.original.planNombre}</div>
          </div>
        ),
      },
      {
        id: 'curso',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium hover:text-foreground text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Curso</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
            )}
          </button>
        ),
        accessorKey: 'cursoNombre',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-mono text-[11px] font-semibold text-primary">
              {row.original.cursoCodigo}
            </div>
            <div className="font-medium text-xs text-foreground line-clamp-2 max-w-[280px]">
              {row.original.cursoNombre}
            </div>
          </div>
        ),
      },
      {
        id: 'seccion',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium hover:text-foreground text-left"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Sección</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
            )}
          </button>
        ),
        accessorKey: 'seccionNombre',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-xs">{row.original.seccionNombre}</div>
            {row.original.isNoHabilitado && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                NO HABILITADO
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'docente',
        header: 'Docente Asignado',
        accessorKey: 'docenteNombre',
        cell: ({ row }) => {
          const docs = row.original.docentes || []
          return (
            <div className="space-y-0.5 max-w-[200px]">
              <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                <span className="truncate">{row.original.docenteNombre}</span>
                {docs.length > 1 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-mono shrink-0">
                    +{docs.length - 1}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {row.original.docenteDni ? (
                  <span className="font-mono bg-muted px-1 rounded">
                    DNI: {row.original.docenteDni}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/60">Sin DNI</span>
                )}
                {row.original.docenteEmail && (
                  <span className="truncate max-w-[110px] font-mono">
                    {row.original.docenteEmail}
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'estudiantes',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium hover:text-foreground text-left justify-end w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Alumnos</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
            )}
          </button>
        ),
        accessorKey: 'estudiantesCount',
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Badge
              variant={row.original.estudiantesCount > 0 ? 'secondary' : 'outline'}
              className="text-xs font-mono px-2 py-0.5"
            >
              {row.original.estudiantesCount}
            </Badge>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Matriculados',
        cell: ({ row }) => {
          const isExpanded = tableExpandedRows.has(row.original.id)
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant={isExpanded ? 'secondary' : 'outline'}
                size="xs"
                className="text-xs h-7 gap-1 px-2"
                onClick={() => toggleTableRow(row.original.id)}
                title="Desplegar docentes y alumnos matriculados en esta fila"
              >
                <Users className="size-3" />
                <span>{isExpanded ? 'Plegar' : 'Detalle'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => handleInspectStudents(row.original)}
                title="Abrir ventana modal con lista de alumnos"
              >
                <Eye className="size-3.5" />
              </Button>
            </div>
          )
        },
        enableSorting: false,
        size: 110,
      },
    ],
    [tableExpandedRows, toggleTableRow]
  )

  // 6. Instancia de TanStack Table
  const table = useReactTable({
    data: filteredItems,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  // Cálculos de selección activa
  const selectedRowIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const selectedCount = selectedRowIds.length

  const handleSelectAllFiltered = () => {
    const newSelection: Record<string, boolean> = { ...rowSelection }
    for (const item of filteredItems) {
      newSelection[String(item.id)] = true
    }
    setRowSelection(newSelection)
  }

  const handleClearSelection = () => {
    setRowSelection({})
  }

  const selectionStats = React.useMemo(() => {
    if (!hierarchyData?.items || selectedCount === 0) {
      return { sectionsCount: 0, coursesCount: 0, studentsTotal: 0 }
    }

    const selectedSet = new Set(selectedRowIds)
    const selectedItems = hierarchyData.items.filter((item) => selectedSet.has(String(item.id)))
    const uniqueCourses = new Set(selectedItems.map((item) => item.cursoId))
    const totalStudents = selectedItems.reduce((acc, item) => acc + item.estudiantesCount, 0)

    return {
      sectionsCount: selectedItems.length,
      coursesCount: uniqueCourses.size,
      studentsTotal: totalStudents,
      items: selectedItems,
    }
  }, [hierarchyData, selectedRowIds, selectedCount])

  const selectedCase = cases.find((c) => c.id === selectedCaseId)

  return (
    <div className="space-y-6 w-full">
      {/* 1. Encabezado y Selector de Caso Activo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-foreground/80" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Jerarquía y Selección de Datos Canvas LMS
            </h2>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              TanStack Table v8
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Explore la jerarquía oficial de Cuentas, Subcuentas, Cursos y Secciones, aplique filtros y seleccione entidades para exportación o migración SIS.
          </p>
        </div>

        {/* Selector de Casos */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Caso Activo:
            </span>
            <select
              value={selectedCaseId}
              onChange={(e) => handleSelectCaseId(e.target.value)}
              disabled={isLoadingCases || cases.length === 0}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {cases.length === 0 && <option value="">Sin casos registrados</option>}
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalRows.toLocaleString()} registros)
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadCases}
            disabled={isLoadingCases}
            className="h-9 px-2.5 text-xs gap-1.5"
            title="Refrescar lista de casos"
          >
            <RefreshCw className={`size-3.5 ${isLoadingCases ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </Button>

          {onNavigateToCases && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToCases}
              className="h-9 px-3 text-xs gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              <span>Gestionar Casos</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tira de información del Caso Activo */}
      {selectedCase && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1 flex-wrap">
          <span className="font-mono text-foreground">{selectedCase.id}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-3.5" />
            <span>Completado</span>
          </span>
          <span>•</span>
          <span>{selectedCase.totalTables} tablas fuente</span>
          <span>•</span>
          <span>{selectedCase.totalRows.toLocaleString()} registros totales en BD</span>
          {selectedCase.createdAt && (
            <>
              <span>•</span>
              <span>Extraído el {new Date(selectedCase.createdAt).toLocaleString('es-ES')}</span>
            </>
          )}
        </div>
      )}

      {/* 2. Filtros Jerárquicos en Cascada */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Filtros Jerárquicos en Cascada
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={excludeNoHabilitado}
                onCheckedChange={(checked) => setExcludeNoHabilitado(!!checked)}
              />
              <span>Excluir secciones «NO HABILITADO»</span>
            </label>

            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <RotateCcw className="size-3" />
              <span>Restablecer Filtros</span>
            </Button>
          </div>
        </div>

        {/* Desplegables de los 6 Niveles Jerárquicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Nivel 1: Periodo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              <span>1. Periodo</span>
            </label>
            <select
              value={periodoFilter}
              onChange={(e) => {
                setPeriodoFilter(e.target.value)
                setSedeFilter('all')
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todos los Periodos</option>
              {hierarchyData?.filters.periodos.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 2: Sede (Cuenta) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="size-3" />
              <span>2. Sede (Cuenta)</span>
            </label>
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las Sedes</option>
              {hierarchyData?.filters.sedes
                .filter(
                  (s) =>
                    periodoFilter === 'all' ||
                    s.periodoIds.includes(Number(periodoFilter))
                )
                .map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* Nivel 3: Modalidad (Subcuenta) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="size-3" />
              <span>3. Modalidad</span>
            </label>
            <select
              value={modalidadFilter}
              onChange={(e) => setModalidadFilter(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las Modalidades</option>
              {hierarchyData?.filters.modalidades.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 4: Facultad (Subcuenta) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <GraduationCap className="size-3" />
              <span>4. Facultad</span>
            </label>
            <select
              value={facultadFilter}
              onChange={(e) => {
                setFacultadFilter(e.target.value)
                setCarreraFilter('all')
                setPlanFilter('all')
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las Facultades</option>
              {hierarchyData?.filters.facultades.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 5: Carrera (Subcuenta) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <BookOpen className="size-3" />
              <span>5. Carrera</span>
            </label>
            <select
              value={carreraFilter}
              onChange={(e) => {
                setCarreraFilter(e.target.value)
                setPlanFilter('all')
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las Carreras</option>
              {hierarchyData?.filters.carreras
                .filter(
                  (c) =>
                    facultadFilter === 'all' ||
                    String(c.facultadId) === facultadFilter
                )
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* Nivel 6: Plan Curricular (Subcuenta) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="size-3" />
              <span>6. Plan de Estudios</span>
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todos los Planes</option>
              {hierarchyData?.filters.planes
                .filter(
                  (p) =>
                    carreraFilter === 'all' ||
                    String(p.carreraId) === carreraFilter
                )
                .map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Buscador libre de texto */}
        <div className="pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por código de curso, nombre, sección, docente, DNI, carrera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Barra de Control de Selección y Selector de Vista */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Selector de modo de vista: Árbol Anidado vs Tabla */}
          <div className="flex items-center bg-background border border-border rounded-md p-0.5">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTree className="size-3.5" />
              <span>Vista Jerárquica Anidada (Árbol)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="size-3.5" />
              <span>Vista Tabla Detallada</span>
            </button>
          </div>

          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckSquare className="size-4 text-primary" />
            <span>
              <strong className="text-foreground">{selectedCount}</strong> secciones seleccionadas
            </span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {filteredItems.length.toLocaleString()} coincidentes (de{' '}
            {hierarchyData?.items.length.toLocaleString() || 0} en total)
          </span>
          {selectedCount > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground font-mono">
                  {selectionStats.studentsTotal.toLocaleString()}
                </strong>{' '}
                estudiantes matriculados
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="xs"
            onClick={handleSelectAllFiltered}
            disabled={filteredItems.length === 0}
            className="text-xs h-7 gap-1"
          >
            <CheckSquare className="size-3" />
            <span>Seleccionar Filtrados ({filteredItems.length})</span>
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={handleClearSelection}
            disabled={selectedCount === 0}
            className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Square className="size-3" />
            <span>Limpiar</span>
          </Button>

          {selectedCount > 0 && (
            <Button
              variant="default"
              size="xs"
              onClick={() => setIsSummaryOpen(true)}
              className="text-xs h-7 gap-1"
            >
              <span>Ver Detalle de Selección</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. Contenido Principal: Árbol Jerárquico Anidado O Tabla TanStack */}
      {isLoadingHierarchy ? (
        <div className="p-12 text-center space-y-3 rounded-xl border border-border bg-card">
          <RefreshCw className="size-6 text-muted-foreground animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">
            Construyendo jerarquía académica y resolviendo cuentas, subcuentas, cursos y secciones...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center space-y-2 rounded-xl border border-border bg-card">
          <AlertCircle className="size-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">
            Ninguna sección coincide con los filtros aplicados
          </p>
          <p className="text-xs text-muted-foreground">
            Pruebe ajustando los filtros jerárquicos o desactivando el filtro de &ldquo;NO HABILITADO&rdquo;.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
            Restablecer Filtros
          </Button>
        </div>
      ) : viewMode === 'tree' ? (
        /* VISTA 1: Árbol Jerárquico Anidado (Cuentas > Subcuentas > Cursos > Secciones) */
        <HierarchyTreeTable
          items={filteredItems}
          selectedRowIds={rowSelection}
          onToggleSelect={handleToggleBatchSelection}
          onInspectStudents={handleInspectStudents}
        />
      ) : (
        /* VISTA 2: Tabla Plana Detallada (TanStack Table) */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs space-y-0">
          {/* Sub-barra de herramientas de plegado/desplegado por lote en tabla */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-muted/20 border-b border-border text-xs">
            <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
              <span className="font-semibold text-foreground">Detalle de Secciones en Tabla:</span>
              <span>
                Mostrando {table.getRowModel().rows.length} secciones en página
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-background">
                {tableExpandedRows.size === 0
                  ? 'Matriculados plegados'
                  : `${tableExpandedRows.size} secciones con detalle`}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  const next = new Set(tableExpandedRows)
                  for (const row of table.getRowModel().rows) {
                    next.add(row.original.id)
                  }
                  setTableExpandedRows(next)
                }}
                className="text-xs h-7 gap-1"
                title="Desplegar docentes y alumnos de todas las secciones en la página actual"
              >
                <Users className="size-3 text-muted-foreground" />
                <span>Desplegar Página ({table.getRowModel().rows.length})</span>
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setTableExpandedRows(new Set())}
                disabled={tableExpandedRows.size === 0}
                className="text-xs h-7 gap-1"
                title="Plegar el detalle de todas las secciones desplegadas"
              >
                <FoldVertical className="size-3 text-muted-foreground" />
                <span>Plegar Todo</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/20 hover:bg-muted/20">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-semibold text-muted-foreground py-3"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isRowExpanded = tableExpandedRows.has(row.original.id)
                  const item = row.original
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        className="hover:bg-muted/40 data-[state=selected]:bg-muted/60 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5 text-xs">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Fila expandida con desglose de Matriculados (Docentes y Alumnos) */}
                      {isRowExpanded && (
                        <TableRow className="bg-muted/15 border-b border-border/50 hover:bg-muted/20">
                          <TableCell colSpan={row.getVisibleCells().length} className="py-3 px-6">
                            <div className="space-y-2.5">
                              {/* Encabezado del Desglose */}
                              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40 text-[11px]">
                                <div className="flex items-center gap-2 font-medium text-foreground">
                                  <Users className="size-3.5 text-primary" />
                                  <span>Matriculados en Sección:</span>
                                  <span className="font-mono text-primary font-bold">
                                    {item.seccionNombre}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({item.cursoCodigo} - {item.cursoNombre})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                  <Badge variant="outline" className="px-1.5 py-0 h-4">
                                    (D) {item.docentes?.length || 0} {item.docentes?.length === 1 ? 'Docente' : 'Docentes'}
                                  </Badge>
                                  <Badge variant="outline" className="px-1.5 py-0 h-4">
                                    (E) {item.estudiantes?.length || 0} {item.estudiantes?.length === 1 ? 'Estudiante' : 'Estudiantes'}
                                  </Badge>
                                </div>
                              </div>

                              {/* 1. Docentes asignados (D) */}
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                  Docentes Asignados:
                                </div>
                                {item.docentes && item.docentes.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {item.docentes.map((doc, dIdx) => (
                                      <div
                                        key={`table-doc-${item.id}-${doc.dni || dIdx}`}
                                        className="flex items-center gap-2 py-1 px-2.5 rounded bg-background border border-border/60 text-xs shadow-2xs"
                                      >
                                        <Badge
                                          variant="default"
                                          className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold tracking-tight"
                                        >
                                          (D) [DOCENTE]
                                        </Badge>
                                        <span className="font-mono font-bold text-primary text-[11px]">
                                          {doc.dni || 'S/DNI'}
                                        </span>
                                        <span className="text-muted-foreground">-</span>
                                        <span className="font-sans font-medium text-foreground truncate flex-1">
                                          {doc.fullName}
                                        </span>
                                        {doc.email && (
                                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[170px]">
                                            &lt;{doc.email}&gt;
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] italic text-muted-foreground pl-2 py-0.5 font-sans">
                                    (Sin docente asignado)
                                  </div>
                                )}
                              </div>

                              {/* 2. Estudiantes Matriculados (E) */}
                              <div className="space-y-1 pt-1">
                                <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-between tracking-wider">
                                  <span>Alumnos Matriculados ({item.estudiantes?.length || 0}):</span>
                                  {item.estudiantes && item.estudiantes.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground font-normal font-sans">
                                      Rol SIS: Student • Estado: Active
                                    </span>
                                  )}
                                </div>

                                {item.estudiantes && item.estudiantes.length > 0 ? (
                                  <div className="max-h-60 overflow-y-auto divide-y divide-border/20 border border-border/50 rounded bg-background/80 p-1">
                                    {item.estudiantes.map((est, eIdx) => (
                                      <div
                                        key={`table-est-${item.id}-${est.id}-${eIdx}`}
                                        className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded text-xs transition-colors"
                                      >
                                        <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">
                                          {eIdx + 1}.
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] px-1 py-0 h-4 font-mono text-muted-foreground"
                                        >
                                          (E) [ESTUDIANTE]
                                        </Badge>
                                        <span className="font-semibold text-primary font-mono text-[11px]">
                                          {est.codigo}
                                        </span>
                                        <span className="text-muted-foreground">-</span>
                                        <span className="text-foreground flex-1 truncate font-sans">
                                          {est.fullName}
                                        </span>
                                        {est.email && (
                                          <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline truncate max-w-[220px]">
                                            &lt;{est.email}&gt;
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] italic text-muted-foreground pl-2 py-0.5 font-sans">
                                    (Sin alumnos matriculados en esta sección)
                                  </div>
                                )}
                              </div>

                              {(!item.docentes || item.docentes.length === 0) &&
                                (!item.estudiantes || item.estudiantes.length === 0) && (
                                  <div className="text-[11px] italic text-muted-foreground pl-2 py-1 font-mono">
                                    (Sin alumnos ni docentes matriculados)
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginación de la Tabla */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Filas por página:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground outline-none"
              >
                {[10, 25, 50, 100].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
              <span>
                Mostrando {table.getRowModel().rows.length} de {filteredItems.length.toLocaleString()} filas
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
              </span>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  title="Primera página"
                >
                  <ChevronsLeft className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  title="Página anterior"
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  title="Página siguiente"
                >
                  <ChevronRight className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  title="Última página"
                >
                  <ChevronsRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Inspección de Estudiantes Matriculados */}
      <Dialog open={!!inspectingItem} onOpenChange={(open) => !open && setInspectingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span>Estudiantes Matriculados</span>
            </DialogTitle>
            {inspectingItem && (
              <DialogDescription className="text-xs text-muted-foreground space-y-1 pt-1">
                <div className="text-foreground font-medium">
                  {inspectingItem.cursoCodigo} - {inspectingItem.cursoNombre} ({inspectingItem.seccionNombre})
                </div>
                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <span>Docente: {inspectingItem.docenteNombre}</span>
                  {inspectingItem.docenteDni && <span>(DNI: {inspectingItem.docenteDni})</span>}
                  <span>•</span>
                  <span>Total: {students.length} matriculados</span>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto border border-border rounded-lg">
            {isLoadingStudents ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="size-5 animate-spin mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Cargando lista de estudiantes...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay estudiantes registrados en esta sección.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs py-2 w-12">#</TableHead>
                    <TableHead className="text-xs py-2">Código Alumno</TableHead>
                    <TableHead className="text-xs py-2">Nombre Completo</TableHead>
                    <TableHead className="text-xs py-2">Correo Institucional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((st, idx) => (
                    <TableRow key={st.id || idx} className="hover:bg-muted/20">
                      <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-xs py-2 font-mono font-medium text-foreground">
                        {st.codigo}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-foreground font-medium">
                        {st.fullName}
                      </TableCell>
                      <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                        {st.email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Modal de Resumen de Selección Activa */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <span>Resumen de Selección Activa</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detalle cuantitativo de las {selectedCount} secciones marcadas para sincronización o exportación a Canvas LMS.
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
              Estas secciones seleccionadas conservan su jerarquía completa (Cuenta Sede &gt; Subcuentas &gt; Curso &gt; Sección) y están listas para ser exportadas a formato estándar SIS CSV o sincronizadas vía API a Canvas LMS.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSummaryOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
