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
  ChevronsLeft,
  ChevronsRight,
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
import type {
  HierarchyItem,
  HierarchyFilterOptions,
  EnrolledStudent,
} from '#/server/services/hierarchy-service'
import type { ImportCase } from '#/db/schema'

interface HierarchySelectorProps {
  onNavigateToCases?: () => void
}

export function HierarchySelector({ onNavigateToCases }: HierarchySelectorProps) {
  // Case selection state
  const [cases, setCases] = React.useState<ImportCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>('')
  const [isLoadingCases, setIsLoadingCases] = React.useState(true)

  // Hierarchy data state
  const [hierarchyData, setHierarchyData] = React.useState<{
    items: HierarchyItem[]
    filters: HierarchyFilterOptions
  } | null>(null)
  const [isLoadingHierarchy, setIsLoadingHierarchy] = React.useState(false)

  // Filter states
  const [periodoFilter, setPeriodoFilter] = React.useState<string>('all')
  const [sedeFilter, setSedeFilter] = React.useState<string>('all')
  const [modalidadFilter, setModalidadFilter] = React.useState<string>('all')
  const [facultadFilter, setFacultadFilter] = React.useState<string>('all')
  const [carreraFilter, setCarreraFilter] = React.useState<string>('all')
  const [planFilter, setPlanFilter] = React.useState<string>('all')
  const [excludeNoHabilitado, setExcludeNoHabilitado] = React.useState<boolean>(true)
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})

  // Student dialog state
  const [inspectingItem, setInspectingItem] = React.useState<HierarchyItem | null>(null)
  const [students, setStudents] = React.useState<EnrolledStudent[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false)

  // Summary dialog state
  const [isSummaryOpen, setIsSummaryOpen] = React.useState(false)

  // 1. Fetch available cases
  const loadCases = React.useCallback(async () => {
    setIsLoadingCases(true)
    try {
      const data = await getCasesFn()
      setCases(data)
      // Pick first completed case by default if no case is selected
      if (!selectedCaseId && data.length > 0) {
        const firstCompleted = data.find((c) => c.status === 'completed') || data[0]
        setSelectedCaseId(firstCompleted.id)
      }
    } catch (err) {
      console.error('Failed to load cases:', err)
    } finally {
      setIsLoadingCases(false)
    }
  }, [selectedCaseId])

  React.useEffect(() => {
    loadCases()
  }, [loadCases])

  // 2. Load hierarchy data when selected case changes
  React.useEffect(() => {
    if (!selectedCaseId) {
      setHierarchyData(null)
      return
    }

    let isMounted = true
    setIsLoadingHierarchy(true)
    setRowSelection({}) // Reset selection on case switch

    getCaseHierarchyFn({ data: selectedCaseId })
      .then((res) => {
        if (isMounted) {
          setHierarchyData(res)
          setIsLoadingHierarchy(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load hierarchy data:', err)
        if (isMounted) setIsLoadingHierarchy(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCaseId])

  // 3. Inspect students handler
  const handleInspectStudents = async (item: HierarchyItem) => {
    setInspectingItem(item)
    setIsLoadingStudents(true)
    try {
      const list = await getSectionStudentsFn({
        data: { caseId: selectedCaseId, cargaCursoId: item.id },
      })
      setStudents(list)
    } catch (err) {
      console.error('Failed to fetch section students:', err)
      setStudents([])
    } finally {
      setIsLoadingStudents(false)
    }
  }

  // 4. Cascading filter logic
  const filteredItems = React.useMemo(() => {
    if (!hierarchyData?.items) return []

    return hierarchyData.items.filter((item) => {
      // Exclude No Habilitado filter
      if (excludeNoHabilitado && item.isNoHabilitado) {
        return false
      }

      // Periodo filter
      if (periodoFilter !== 'all' && String(item.periodoId) !== periodoFilter) {
        return false
      }

      // Sede filter
      if (sedeFilter !== 'all' && String(item.sedeId) !== sedeFilter) {
        return false
      }

      // Modalidad filter
      if (modalidadFilter !== 'all' && String(item.modalidadId) !== modalidadFilter) {
        return false
      }

      // Facultad filter
      if (facultadFilter !== 'all' && String(item.facultadId) !== facultadFilter) {
        return false
      }

      // Carrera filter
      if (carreraFilter !== 'all' && String(item.carreraId) !== carreraFilter) {
        return false
      }

      // Plan filter
      if (planFilter !== 'all' && String(item.planId) !== planFilter) {
        return false
      }

      // Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchCourseCode = item.cursoCodigo.toLowerCase().includes(query)
        const matchCourseName = item.cursoNombre.toLowerCase().includes(query)
        const matchSectionName = item.seccionNombre.toLowerCase().includes(query)
        const matchTeacher = item.docenteNombre.toLowerCase().includes(query)
        const matchDni = item.docenteDni.toLowerCase().includes(query)
        const matchCareer = item.carreraNombre.toLowerCase().includes(query)

        if (
          !matchCourseCode &&
          !matchCourseName &&
          !matchSectionName &&
          !matchTeacher &&
          !matchDni &&
          !matchCareer
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

  // Reset filters
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

  // 5. Columns definition for TanStack Table
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
              aria-label="Select all on page"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
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
            <span>Periodo & Sede</span>
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
            <span>Carrera & Facultad</span>
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
        header: 'Plan',
        accessorKey: 'planNombre',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">{row.original.planCodigo || 'N/A'}</span>
            <div className="truncate max-w-[120px] text-[11px]">{row.original.planNombre}</div>
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
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[200px]">
            <div className="text-xs font-medium text-foreground truncate">
              {row.original.docenteNombre}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {row.original.docenteDni ? (
                <span className="font-mono bg-muted px-1 rounded">
                  DNI: {row.original.docenteDni}
                </span>
              ) : (
                <span className="italic text-muted-foreground/60">Sin DNI</span>
              )}
            </div>
          </div>
        ),
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
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="xs"
              className="text-xs gap-1 hover:bg-accent"
              onClick={() => handleInspectStudents(row.original)}
              title="Ver estudiantes matriculados"
            >
              <Users className="size-3" />
              <span>Ver</span>
            </Button>
          </div>
        ),
        enableSorting: false,
        size: 50,
      },
    ],
    []
  )

  // 6. TanStack Table Instance
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

  // Selection computations
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

  // Calculate stats for active selection
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
      {/* 1. Header & Case Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-foreground/80" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Hierarchical Data Selection
            </h2>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              TanStack Table v8
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Filter academic structures, select sections for SIS export, and inspect enrolled students.
          </p>
        </div>

        {/* Case Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Active Case:
            </span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              disabled={isLoadingCases || cases.length === 0}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {cases.length === 0 && <option value="">No cases available</option>}
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalRows.toLocaleString()} rows)
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
            title="Refresh cases list"
          >
            <RefreshCw className={`size-3.5 ${isLoadingCases ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {onNavigateToCases && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToCases}
              className="h-9 px-3 text-xs gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              <span>Manage Cases</span>
            </Button>
          )}
        </div>
      </div>

      {/* Case Details Badge Strip */}
      {selectedCase && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1 flex-wrap">
          <span className="font-mono text-foreground">{selectedCase.id}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>{selectedCase.status}</span>
          </span>
          <span>•</span>
          <span>{selectedCase.totalTables} raw tables</span>
          <span>•</span>
          <span>{selectedCase.totalRows.toLocaleString()} total database rows</span>
          {selectedCase.createdAt && (
            <>
              <span>•</span>
              <span>Imported {new Date(selectedCase.createdAt).toLocaleString()}</span>
            </>
          )}
        </div>
      )}

      {/* 2. Hierarchical Filter Controls */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Hierarchical Filters
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={excludeNoHabilitado}
                onCheckedChange={(checked) => setExcludeNoHabilitado(!!checked)}
              />
              <span>Exclude &ldquo;NO HABILITADO&rdquo; sections</span>
            </label>

            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filters</span>
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Level 1: Periodo */}
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

          {/* Level 2: Sede */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="size-3" />
              <span>2. Sede</span>
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

          {/* Level 3: Modalidad */}
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

          {/* Level 4: Facultad */}
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

          {/* Level 5: Carrera */}
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

          {/* Level 6: Plan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="size-3" />
              <span>6. Plan</span>
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

        {/* Text Search Input Bar */}
        <div className="pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by Course Code, Course Name, Section, Teacher Name, DNI, Career..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Selection Control & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckSquare className="size-4 text-primary" />
            <span>
              <strong className="text-foreground">{selectedCount}</strong> sections selected
            </span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {filteredItems.length.toLocaleString()} matching filters (of{' '}
            {hierarchyData?.items.length.toLocaleString() || 0} total)
          </span>
          {selectedCount > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground font-mono">
                  {selectionStats.studentsTotal.toLocaleString()}
                </strong>{' '}
                enrolled students in selection
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
            <span>Select Filtered ({filteredItems.length})</span>
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={handleClearSelection}
            disabled={selectedCount === 0}
            className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Square className="size-3" />
            <span>Clear</span>
          </Button>

          {selectedCount > 0 && (
            <Button
              variant="default"
              size="xs"
              onClick={() => setIsSummaryOpen(true)}
              className="text-xs h-7 gap-1"
            >
              <span>View Selection Details</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. TanStack Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoadingHierarchy ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="size-6 text-muted-foreground animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">
              Loading and resolving academic hierarchy data from case snapshot...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="size-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No sections match the current filters</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your hierarchical filters, clearing the search query, or disabling the &ldquo;NO HABILITADO&rdquo; filter.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
              Reset Filters
            </Button>
          </div>
        ) : (
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-muted/40 data-[state=selected]:bg-muted/60 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Table Pagination Bar */}
        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
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
                Showing {table.getRowModel().rows.length} of {filteredItems.length.toLocaleString()} rows
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  title="First page"
                >
                  <ChevronsLeft className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  title="Previous page"
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  title="Next page"
                >
                  <ChevronRight className="size-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  title="Last page"
                >
                  <ChevronsRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Enrolled Students Inspection Dialog */}
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
                <div className="flex items-center gap-2 text-[11px]">
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
                    <TableHead className="text-xs py-2">Código</TableHead>
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
                      <TableCell className="text-xs py-2 font-mono font-medium">
                        {st.codigo}
                      </TableCell>
                      <TableCell className="text-xs py-2">{st.fullName}</TableCell>
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

      {/* 6. Active Selection Summary Dialog */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <span>Selection Details Summary</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Overview of the {selectedCount} sections currently marked for synchronization or export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {selectionStats.sectionsCount}
                </div>
                <div className="text-[11px] text-muted-foreground">Sections Selected</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {selectionStats.coursesCount}
                </div>
                <div className="text-[11px] text-muted-foreground">Unique Courses</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <div className="text-2xl font-bold font-mono text-primary">
                  {selectionStats.studentsTotal.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">Total Enrollments</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              These selected sections can be directly converted into Canvas SIS CSV imports or exported as differential archives in the next step.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSummaryOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
