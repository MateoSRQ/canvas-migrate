import * as React from 'react'
import {
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  Calendar,
  BookOpen,
  Layers,
  Users,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  FoldVertical,
  ChevronsUpDown,
  UserCheck,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type {
  HierarchyItem,
  EnrolledTeacher,
  EnrolledStudent,
} from '#/server/services/hierarchy-service'

interface HierarchyTreeTableProps {
  items: HierarchyItem[]
  selectedRowIds: Record<string, boolean>
  onToggleSelect: (sectionIds: number[], forceValue?: boolean) => void
  onInspectStudents: (item: HierarchyItem) => void
}

interface TreeSectionNode {
  id: number // item.id (carga_curso_id)
  seccionId: number
  seccionNombre: string
  isNoHabilitado: boolean
  docenteNombre: string
  docenteDni: string
  docenteEmail: string
  docentes: EnrolledTeacher[]
  estudiantes: EnrolledStudent[]
  estudiantesCount: number
  item: HierarchyItem
}

interface TreeCourseNode {
  cursoId: number
  cursoCodigo: string
  cursoNombre: string
  secciones: TreeSectionNode[]
  sectionIds: number[]
  totalStudents: number
}

interface TreePlanNode {
  planId: number
  planCodigo: string
  planNombre: string
  cursos: Map<number, TreeCourseNode>
  sectionIds: number[]
  totalStudents: number
}

interface TreeCarreraNode {
  carreraId: number
  carreraNombre: string
  planes: Map<number, TreePlanNode>
  sectionIds: number[]
  totalStudents: number
}

interface TreeFacultadNode {
  facultadId: number
  facultadNombre: string
  carreras: Map<number, TreeCarreraNode>
  sectionIds: number[]
  totalStudents: number
}

interface TreeModalidadNode {
  modalidadId: number
  modalidadNombre: string
  facultades: Map<number, TreeFacultadNode>
  sectionIds: number[]
  totalStudents: number
}

interface TreeSedeNode {
  sedeId: number
  sedeNombre: string
  modalidades: Map<number, TreeModalidadNode>
  sectionIds: number[]
  totalStudents: number
}

interface TreePeriodoNode {
  periodoId: number
  periodoNombre: string
  periodoSufijo: string
  sedes: Map<number, TreeSedeNode>
  sectionIds: number[]
  totalStudents: number
}

export function HierarchyTreeTable({
  items,
  selectedRowIds,
  onToggleSelect,
  onInspectStudents,
}: HierarchyTreeTableProps) {
  // Expansion state: Set of open node keys
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())

  // 1. Build nested hierarchy tree from items
  const tree = React.useMemo<TreePeriodoNode[]>(() => {
    const periodosMap = new Map<number, TreePeriodoNode>()

    for (const it of items) {
      // 1. Periodo
      let pNode = periodosMap.get(it.periodoId)
      if (!pNode) {
        pNode = {
          periodoId: it.periodoId,
          periodoNombre: it.periodoNombre,
          periodoSufijo: it.periodoSufijo,
          sedes: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        periodosMap.set(it.periodoId, pNode)
      }
      pNode.sectionIds.push(it.id)
      pNode.totalStudents += it.estudiantesCount

      // 2. Sede (Cuenta)
      let sNode = pNode.sedes.get(it.sedeId)
      if (!sNode) {
        sNode = {
          sedeId: it.sedeId,
          sedeNombre: it.sedeNombre,
          modalidades: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        pNode.sedes.set(it.sedeId, sNode)
      }
      sNode.sectionIds.push(it.id)
      sNode.totalStudents += it.estudiantesCount

      // 3. Modalidad (Subcuenta)
      let mNode = sNode.modalidades.get(it.modalidadId)
      if (!mNode) {
        mNode = {
          modalidadId: it.modalidadId,
          modalidadNombre: it.modalidadNombre,
          facultades: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        sNode.modalidades.set(it.modalidadId, mNode)
      }
      mNode.sectionIds.push(it.id)
      mNode.totalStudents += it.estudiantesCount

      // 4. Facultad (Subcuenta)
      let fNode = mNode.facultades.get(it.facultadId)
      if (!fNode) {
        fNode = {
          facultadId: it.facultadId,
          facultadNombre: it.facultadNombre,
          carreras: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        mNode.facultades.set(it.facultadId, fNode)
      }
      fNode.sectionIds.push(it.id)
      fNode.totalStudents += it.estudiantesCount

      // 5. Carrera (Subcuenta)
      let cNode = fNode.carreras.get(it.carreraId)
      if (!cNode) {
        cNode = {
          carreraId: it.carreraId,
          carreraNombre: it.carreraNombre,
          planes: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        fNode.carreras.set(it.carreraId, cNode)
      }
      cNode.sectionIds.push(it.id)
      cNode.totalStudents += it.estudiantesCount

      // 6. Plan (Subcuenta)
      let plNode = cNode.planes.get(it.planId)
      if (!plNode) {
        plNode = {
          planId: it.planId,
          planCodigo: it.planCodigo,
          planNombre: it.planNombre,
          cursos: new Map(),
          sectionIds: [],
          totalStudents: 0,
        }
        cNode.planes.set(it.planId, plNode)
      }
      plNode.sectionIds.push(it.id)
      plNode.totalStudents += it.estudiantesCount

      // 7. Curso
      let curNode = plNode.cursos.get(it.cursoId)
      if (!curNode) {
        curNode = {
          cursoId: it.cursoId,
          cursoCodigo: it.cursoCodigo,
          cursoNombre: it.cursoNombre,
          secciones: [],
          sectionIds: [],
          totalStudents: 0,
        }
        plNode.cursos.set(it.cursoId, curNode)
      }
      curNode.sectionIds.push(it.id)
      curNode.totalStudents += it.estudiantesCount

      // 8. Sección
      curNode.secciones.push({
        id: it.id,
        seccionId: it.seccionId,
        seccionNombre: it.seccionNombre,
        isNoHabilitado: it.isNoHabilitado,
        docenteNombre: it.docenteNombre,
        docenteDni: it.docenteDni,
        docenteEmail: it.docenteEmail,
        docentes: it.docentes || [],
        estudiantes: it.estudiantes || [],
        estudiantesCount: it.estudiantesCount,
        item: it,
      })
    }

    return Array.from(periodosMap.values())
  }, [items])

  // Auto-expand first period and its branches only on initial load (does not re-trigger on user collapse)
  const isInitialLoadRef = React.useRef(true)

  React.useEffect(() => {
    if (tree.length > 0 && isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      const initialSet = new Set<string>()
      const firstPeriodo = tree[0]
      initialSet.add(`periodo-${firstPeriodo.periodoId}`)

      // Also expand first sede
      const firstSede = Array.from(firstPeriodo.sedes.values())[0]
      if (firstSede) {
        initialSet.add(`sede-${firstPeriodo.periodoId}-${firstSede.sedeId}`)
        // Expand first modality
        const firstMod = Array.from(firstSede.modalidades.values())[0]
        if (firstMod) {
          initialSet.add(`mod-${firstPeriodo.periodoId}-${firstSede.sedeId}-${firstMod.modalidadId}`)
        }
      }
      setExpandedNodes(initialSet)
    }
  }, [tree])

  // Helper to toggle a single node manually
  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeKey)) {
        next.delete(nodeKey)
      } else {
        next.add(nodeKey)
      }
      return next
    })
  }

  // Branch-level key collectors
  const getPeriodoBranchKeys = React.useCallback(
    (p: TreePeriodoNode, includeMatriculados = false): string[] => {
      const keys: string[] = [`periodo-${p.periodoId}`]
      for (const s of p.sedes.values()) {
        keys.push(`sede-${p.periodoId}-${s.sedeId}`)
        for (const m of s.modalidades.values()) {
          keys.push(`mod-${p.periodoId}-${s.sedeId}-${m.modalidadId}`)
          for (const f of m.facultades.values()) {
            keys.push(`fac-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}`)
            for (const c of f.carreras.values()) {
              keys.push(`carr-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}`)
              for (const pl of c.planes.values()) {
                keys.push(
                  `plan-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}`
                )
                for (const cur of pl.cursos.values()) {
                  keys.push(
                    `curso-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}`
                  )
                  if (includeMatriculados) {
                    for (const sec of cur.secciones) {
                      keys.push(
                        `sec-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}-${sec.id}`
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }
      return keys
    },
    []
  )

  const getSedeBranchKeys = React.useCallback(
    (pId: number, s: TreeSedeNode, includeMatriculados = false): string[] => {
      const keys: string[] = [`sede-${pId}-${s.sedeId}`]
      for (const m of s.modalidades.values()) {
        keys.push(`mod-${pId}-${s.sedeId}-${m.modalidadId}`)
        for (const f of m.facultades.values()) {
          keys.push(`fac-${pId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}`)
          for (const c of f.carreras.values()) {
            keys.push(`carr-${pId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}`)
            for (const pl of c.planes.values()) {
              keys.push(
                `plan-${pId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}`
              )
              for (const cur of pl.cursos.values()) {
                keys.push(
                  `curso-${pId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}`
                )
                if (includeMatriculados) {
                  for (const sec of cur.secciones) {
                    keys.push(
                      `sec-${pId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}-${sec.id}`
                    )
                  }
                }
              }
            }
          }
        }
      }
      return keys
    },
    []
  )

  const getCarreraBranchKeys = React.useCallback(
    (
      pId: number,
      sId: number,
      mId: number,
      fId: number,
      c: TreeCarreraNode,
      includeMatriculados = false
    ): string[] => {
      const keys: string[] = [`carr-${pId}-${sId}-${mId}-${fId}-${c.carreraId}`]
      for (const pl of c.planes.values()) {
        keys.push(`plan-${pId}-${sId}-${mId}-${fId}-${c.carreraId}-${pl.planId}`)
        for (const cur of pl.cursos.values()) {
          keys.push(
            `curso-${pId}-${sId}-${mId}-${fId}-${c.carreraId}-${pl.planId}-${cur.cursoId}`
          )
          if (includeMatriculados) {
            for (const sec of cur.secciones) {
              keys.push(
                `sec-${pId}-${sId}-${mId}-${fId}-${c.carreraId}-${pl.planId}-${cur.cursoId}-${sec.id}`
              )
            }
          }
        }
      }
      return keys
    },
    []
  )

  const getPlanBranchKeys = React.useCallback(
    (
      pId: number,
      sId: number,
      mId: number,
      fId: number,
      cId: number,
      pl: TreePlanNode,
      includeMatriculados = false
    ): string[] => {
      const keys: string[] = [`plan-${pId}-${sId}-${mId}-${fId}-${cId}-${pl.planId}`]
      for (const cur of pl.cursos.values()) {
        keys.push(`curso-${pId}-${sId}-${mId}-${fId}-${cId}-${pl.planId}-${cur.cursoId}`)
        if (includeMatriculados) {
          for (const sec of cur.secciones) {
            keys.push(
              `sec-${pId}-${sId}-${mId}-${fId}-${cId}-${pl.planId}-${cur.cursoId}-${sec.id}`
            )
          }
        }
      }
      return keys
    },
    []
  )

  const getCursoSecKeys = React.useCallback(
    (
      pId: number,
      sId: number,
      mId: number,
      fId: number,
      cId: number,
      plId: number,
      cur: TreeCursoNode
    ): string[] => {
      return cur.secciones.map(
        (sec) => `sec-${pId}-${sId}-${mId}-${fId}-${cId}-${plId}-${cur.cursoId}-${sec.id}`
      )
    },
    []
  )

  // Toggle all keys in a branch (Alt+Click or Rama button)
  const toggleBranchKeys = (keys: string[], forceExpand?: boolean) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      const shouldExpand =
        forceExpand !== undefined ? forceExpand : !keys.every((k) => prev.has(k))
      if (shouldExpand) {
        for (const k of keys) next.add(k)
      } else {
        for (const k of keys) next.delete(k)
      }
      return next
    })
  }

  // Batch expand to specific level
  const handleExpandToLevel = (level: 'sedes' | 'carreras' | 'cursos' | 'all') => {
    const allKeys = new Set<string>()
    for (const p of tree) {
      allKeys.add(`periodo-${p.periodoId}`)
      for (const s of p.sedes.values()) {
        allKeys.add(`sede-${p.periodoId}-${s.sedeId}`)
        if (level === 'sedes') continue

        for (const m of s.modalidades.values()) {
          allKeys.add(`mod-${p.periodoId}-${s.sedeId}-${m.modalidadId}`)
          for (const f of m.facultades.values()) {
            allKeys.add(`fac-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}`)
            for (const c of f.carreras.values()) {
              allKeys.add(
                `carr-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}`
              )
              if (level === 'carreras') continue

              for (const pl of c.planes.values()) {
                allKeys.add(
                  `plan-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}`
                )
                for (const cur of pl.cursos.values()) {
                  allKeys.add(
                    `curso-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}`
                  )
                  if (level === 'all') {
                    for (const sec of cur.secciones) {
                      allKeys.add(
                        `sec-${p.periodoId}-${s.sedeId}-${m.modalidadId}-${f.facultadId}-${c.carreraId}-${pl.planId}-${cur.cursoId}-${sec.id}`
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    setExpandedNodes(allKeys)
  }

  // Batch collapse everything to 0 open nodes cleanly
  const handleCollapseAll = () => {
    setExpandedNodes(new Set())
  }

  // Helper to evaluate checkbox state for a group of section IDs
  const getNodeCheckState = (sectionIds: number[]): boolean | 'indeterminate' => {
    if (sectionIds.length === 0) return false
    let selected = 0
    for (const id of sectionIds) {
      if (selectedRowIds[String(id)]) selected++
    }
    if (selected === sectionIds.length) return true
    if (selected > 0) return 'indeterminate'
    return false
  }

  const handleToggleNodeSelection = (sectionIds: number[]) => {
    const currentState = getNodeCheckState(sectionIds)
    // If all are checked, uncheck all; otherwise check all
    const shouldCheck = currentState !== true
    onToggleSelect(sectionIds, shouldCheck)
  }

  if (tree.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        No hay registros en la jerarquía que coincidan con los filtros actuales.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Acciones de Jerarquía */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-border pb-2.5">
        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
          <span className="font-semibold text-foreground">Jerarquía Académica Canvas LMS:</span>
          <span className="hidden md:inline">
            Periodo &gt; Cuenta (Sede) &gt; Subcuentas &gt; Curso &gt; Sección &gt; Matriculados [(D) Docentes / (E) Estudiantes]
          </span>
          <Badge variant="outline" className="text-[10px] font-mono ml-1 bg-background">
            {expandedNodes.size === 0
              ? 'Todo plegado'
              : `${expandedNodes.size} ramas desplegadas`}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="xs"
            onClick={handleCollapseAll}
            className="text-xs h-7 gap-1"
            title="Plegar todos los niveles del árbol jerárquico"
          >
            <FoldVertical className="size-3 text-muted-foreground" />
            <span>Plegar Todo</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handleExpandToLevel('sedes')}
            className="text-xs h-7 gap-1"
            title="Desplegar hasta Cuentas Principales (Sedes)"
          >
            <Building2 className="size-3 text-muted-foreground" />
            <span>Nivel Sedes</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handleExpandToLevel('carreras')}
            className="text-xs h-7 gap-1"
            title="Desplegar hasta Subcuentas de Carreras"
          >
            <BookOpen className="size-3 text-muted-foreground" />
            <span>Nivel Carreras</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handleExpandToLevel('cursos')}
            className="text-xs h-7 gap-1"
            title="Desplegar todas las cuentas, subcuentas y tablas de cursos con sus secciones"
          >
            <Maximize2 className="size-3 text-muted-foreground" />
            <span>Nivel Cursos</span>
          </Button>

          <Button
            variant="default"
            size="xs"
            onClick={() => handleExpandToLevel('all')}
            className="text-xs h-7 gap-1"
            title="Desplegar todo el árbol incluyendo docentes y alumnos matriculados"
          >
            <Users className="size-3" />
            <span>Todo (+ Matriculados)</span>
          </Button>
        </div>
      </div>

      {/* Árbol Jerárquico Principal */}
      <div className="space-y-3">
        {tree.map((periodo) => {
          const pKey = `periodo-${periodo.periodoId}`
          const isPExpanded = expandedNodes.has(pKey)
          const pCheckState = getNodeCheckState(periodo.sectionIds)

          return (
            <div
              key={pKey}
              className="border border-border rounded-xl bg-card overflow-hidden shadow-xs"
            >
              {/* Encabezado Nivel 0: Periodo Académico */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      if (e.altKey) {
                        toggleBranchKeys(getPeriodoBranchKeys(periodo))
                      } else {
                        toggleNode(pKey)
                      }
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Clic para alternar periodo. Alt+Clic para desplegar/plegar toda la rama del periodo"
                  >
                    {isPExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>

                  <Checkbox
                    checked={pCheckState}
                    onCheckedChange={() => handleToggleNodeSelection(periodo.sectionIds)}
                  />

                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-background">
                    Periodo SIS
                  </Badge>

                  <div className="font-semibold text-sm text-foreground flex items-center gap-2 truncate">
                    <span>{periodo.periodoNombre}</span>
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      (ID: T-{periodo.periodoId})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
                  <span>{periodo.sedes.size} Sedes</span>
                  <span>•</span>
                  <span>{periodo.sectionIds.length} Secciones</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs font-mono font-normal">
                    {periodo.totalStudents.toLocaleString()} Matriculados
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => toggleBranchKeys(getPeriodoBranchKeys(periodo))}
                    className="h-6 text-[11px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                    title="Desplegar o plegar toda la rama de este periodo"
                  >
                    <ChevronsUpDown className="size-3" />
                    <span className="hidden sm:inline">Rama Periodo</span>
                  </Button>
                </div>
              </div>

              {/* Hijos de Periodo: Sedes (Cuentas) */}
              {isPExpanded && (
                <div className="p-3 pl-6 space-y-3 bg-background/50">
                  {Array.from(periodo.sedes.values()).map((sede) => {
                    const sKey = `sede-${periodo.periodoId}-${sede.sedeId}`
                    const isSExpanded = expandedNodes.has(sKey)
                    const sCheckState = getNodeCheckState(sede.sectionIds)

                    return (
                      <div
                        key={sKey}
                        className="border border-border/80 rounded-lg bg-card overflow-hidden"
                      >
                        {/* Nivel 1: Cuenta / Sede */}
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-muted/20 border-b border-border/60">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              onClick={(e) => {
                                if (e.altKey) {
                                  toggleBranchKeys(getSedeBranchKeys(periodo.periodoId, sede))
                                } else {
                                  toggleNode(sKey)
                                }
                              }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Clic para alternar sede. Alt+Clic para desplegar/plegar toda la rama de la sede"
                            >
                              {isSExpanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </button>

                            <Checkbox
                              checked={sCheckState}
                              onCheckedChange={() => handleToggleNodeSelection(sede.sectionIds)}
                            />

                            <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                              [Cuenta] Sede
                            </Badge>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate">
                              <Building2 className="size-3.5 text-muted-foreground" />
                              <span>{sede.sedeNombre}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                (S-{sede.sedeId})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
                            <span>{sede.sectionIds.length} secciones</span>
                            <span>•</span>
                            <span className="font-mono text-foreground font-medium">
                              {sede.totalStudents} matriculados
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                toggleBranchKeys(getSedeBranchKeys(periodo.periodoId, sede))
                              }
                              className="h-6 text-[11px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                              title="Desplegar o plegar toda la rama de esta sede"
                            >
                              <ChevronsUpDown className="size-3" />
                              <span className="hidden sm:inline">Rama Sede</span>
                            </Button>
                          </div>
                        </div>

                        {/* Hijos de Sede: Modalidades (Subcuentas) */}
                        {isSExpanded && (
                          <div className="p-2.5 pl-6 space-y-2.5 bg-muted/5">
                            {Array.from(sede.modalidades.values()).map((modalidad) => {
                              const mKey = `mod-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}`
                              const isMExpanded = expandedNodes.has(mKey)
                              const mCheckState = getNodeCheckState(modalidad.sectionIds)

                              return (
                                <div
                                  key={mKey}
                                  className="border border-border/60 rounded-md bg-card overflow-hidden"
                                >
                                  {/* Nivel 2: Subcuenta Modalidad */}
                                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/15 border-b border-border/40">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <button
                                        onClick={() => toggleNode(mKey)}
                                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                      >
                                        {isMExpanded ? (
                                          <ChevronDown className="size-3" />
                                        ) : (
                                          <ChevronRight className="size-3" />
                                        )}
                                      </button>

                                      <Checkbox
                                        checked={mCheckState}
                                        onCheckedChange={() =>
                                          handleToggleNodeSelection(modalidad.sectionIds)
                                        }
                                      />

                                      <Badge
                                        variant="outline"
                                        className="text-[9px] px-1 py-0 font-mono"
                                      >
                                        [Subcuenta] Modalidad
                                      </Badge>

                                      <span className="text-xs font-medium text-foreground truncate">
                                        {modalidad.modalidadNombre}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-muted-foreground shrink-0">
                                      <span>{modalidad.sectionIds.length} secciones</span>
                                    </div>
                                  </div>

                                  {/* Hijos de Modalidad: Facultades */}
                                  {isMExpanded && (
                                    <div className="p-2 pl-5 space-y-2">
                                      {Array.from(modalidad.facultades.values()).map(
                                        (facultad) => {
                                          const fKey = `fac-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}`
                                          const isFExpanded = expandedNodes.has(fKey)
                                          const fCheckState = getNodeCheckState(
                                            facultad.sectionIds
                                          )

                                          return (
                                            <div
                                              key={fKey}
                                              className="border border-border/50 rounded bg-background overflow-hidden"
                                            >
                                              {/* Nivel 3: Subcuenta Facultad */}
                                              <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-muted/20 border-b border-border/30">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <button
                                                    onClick={() => toggleNode(fKey)}
                                                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                  >
                                                    {isFExpanded ? (
                                                      <ChevronDown className="size-3" />
                                                    ) : (
                                                      <ChevronRight className="size-3" />
                                                    )}
                                                  </button>

                                                  <Checkbox
                                                    checked={fCheckState}
                                                    onCheckedChange={() =>
                                                      handleToggleNodeSelection(
                                                        facultad.sectionIds
                                                      )
                                                    }
                                                  />

                                                  <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1 py-0 font-mono"
                                                  >
                                                    [Subcuenta] Facultad
                                                  </Badge>

                                                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate">
                                                    <GraduationCap className="size-3 text-muted-foreground" />
                                                    <span>{facultad.facultadNombre}</span>
                                                  </div>
                                                </div>

                                                <div className="text-[11px] text-muted-foreground shrink-0">
                                                  <span>{facultad.carreras.size} Carreras</span>
                                                </div>
                                              </div>

                                              {/* Hijos de Facultad: Carreras */}
                                              {isFExpanded && (
                                                <div className="p-2 pl-4 space-y-2">
                                                  {Array.from(facultad.carreras.values()).map(
                                                    (carrera) => {
                                                      const cKey = `carr-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}-${carrera.carreraId}`
                                                      const isCExpanded = expandedNodes.has(cKey)
                                                      const cCheckState = getNodeCheckState(
                                                        carrera.sectionIds
                                                      )

                                                      return (
                                                        <div
                                                          key={cKey}
                                                          className="border border-border/40 rounded bg-card overflow-hidden"
                                                        >
                                                          {/* Nivel 4: Subcuenta Carrera */}
                                                          <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-muted/10 border-b border-border/30">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                              <button
                                                                onClick={(e) => {
                                                                  if (e.altKey) {
                                                                    toggleBranchKeys(
                                                                      getCarreraBranchKeys(
                                                                        periodo.periodoId,
                                                                        sede.sedeId,
                                                                        modalidad.modalidadId,
                                                                        facultad.facultadId,
                                                                        carrera
                                                                      )
                                                                    )
                                                                  } else {
                                                                    toggleNode(cKey)
                                                                  }
                                                                }}
                                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                title="Clic para alternar carrera. Alt+Clic para desplegar/plegar todos los cursos de la carrera"
                                                              >
                                                                {isCExpanded ? (
                                                                  <ChevronDown className="size-3" />
                                                                ) : (
                                                                  <ChevronRight className="size-3" />
                                                                )}
                                                              </button>

                                                              <Checkbox
                                                                checked={cCheckState}
                                                                onCheckedChange={() =>
                                                                  handleToggleNodeSelection(
                                                                    carrera.sectionIds
                                                                  )
                                                                }
                                                              />

                                                              <Badge
                                                                variant="outline"
                                                                className="text-[9px] px-1 py-0 font-mono"
                                                              >
                                                                [Subcuenta] Carrera
                                                              </Badge>

                                                              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                                                                <BookOpen className="size-3 text-muted-foreground" />
                                                                <span>{carrera.carreraNombre}</span>
                                                                <span className="font-mono text-[10px] text-muted-foreground font-normal">
                                                                  (C-{carrera.carreraId})
                                                                </span>
                                                              </div>
                                                            </div>

                                                            <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1.5">
                                                              <span>{carrera.sectionIds.length} secciones</span>
                                                              <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() =>
                                                                  toggleBranchKeys(
                                                                    getCarreraBranchKeys(
                                                                      periodo.periodoId,
                                                                      sede.sedeId,
                                                                      modalidad.modalidadId,
                                                                      facultad.facultadId,
                                                                      carrera
                                                                    )
                                                                  )
                                                                }
                                                                className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                                                title="Desplegar o plegar todos los planes y cursos de esta carrera"
                                                              >
                                                                <ChevronsUpDown className="size-2.5" />
                                                                <span className="hidden sm:inline">Rama Carrera</span>
                                                              </Button>
                                                            </div>
                                                          </div>

                                                          {/* Hijos de Carrera: Planes de Estudio */}
                                                          {isCExpanded && (
                                                            <div className="p-2 pl-4 space-y-2">
                                                              {Array.from(
                                                                carrera.planes.values()
                                                              ).map((plan) => {
                                                                const plKey = `plan-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}-${carrera.carreraId}-${plan.planId}`
                                                                const isPlExpanded =
                                                                  expandedNodes.has(plKey)
                                                                const plCheckState =
                                                                  getNodeCheckState(plan.sectionIds)

                                                                return (
                                                                  <div
                                                                    key={plKey}
                                                                    className="border border-border/40 rounded bg-background overflow-hidden"
                                                                  >
                                                                    {/* Nivel 5: Subcuenta Plan Curricular */}
                                                                    <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-muted/20 border-b border-border/30">
                                                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <button
                                                                          onClick={(e) => {
                                                                            if (e.altKey) {
                                                                              toggleBranchKeys(
                                                                                getPlanBranchKeys(
                                                                                  periodo.periodoId,
                                                                                  sede.sedeId,
                                                                                  modalidad.modalidadId,
                                                                                  facultad.facultadId,
                                                                                  carrera.carreraId,
                                                                                  plan
                                                                                )
                                                                              )
                                                                            } else {
                                                                              toggleNode(plKey)
                                                                            }
                                                                          }}
                                                                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                          title="Clic para alternar plan. Alt+Clic para desplegar/plegar todos los cursos del plan"
                                                                        >
                                                                          {isPlExpanded ? (
                                                                            <ChevronDown className="size-3" />
                                                                          ) : (
                                                                            <ChevronRight className="size-3" />
                                                                          )}
                                                                        </button>

                                                                        <Checkbox
                                                                          checked={plCheckState}
                                                                          onCheckedChange={() =>
                                                                            handleToggleNodeSelection(
                                                                              plan.sectionIds
                                                                            )
                                                                          }
                                                                        />

                                                                        <Badge
                                                                          variant="outline"
                                                                          className="text-[9px] px-1 py-0 font-mono"
                                                                        >
                                                                          [Subcuenta] Plan
                                                                        </Badge>

                                                                        <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                                                                          <span className="font-mono text-primary font-semibold">
                                                                            {plan.planCodigo}
                                                                          </span>
                                                                          <span>-</span>
                                                                          <span>{plan.planNombre}</span>
                                                                        </div>
                                                                      </div>

                                                                      <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1.5">
                                                                        <span>
                                                                          {plan.cursos.size} Cursos
                                                                        </span>
                                                                        <span> • </span>
                                                                        <span>
                                                                          {plan.sectionIds.length}{' '}
                                                                          Secciones
                                                                        </span>
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="xs"
                                                                          onClick={() =>
                                                                            toggleBranchKeys(
                                                                              getPlanBranchKeys(
                                                                                periodo.periodoId,
                                                                                sede.sedeId,
                                                                                modalidad.modalidadId,
                                                                                facultad.facultadId,
                                                                                carrera.carreraId,
                                                                                plan
                                                                              )
                                                                            )
                                                                          }
                                                                          className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                                                          title="Desplegar o plegar todos los cursos de este plan"
                                                                        >
                                                                          <ChevronsUpDown className="size-2.5" />
                                                                          <span className="hidden sm:inline">Rama Plan</span>
                                                                        </Button>
                                                                      </div>
                                                                    </div>

                                                                    {/* Hijos de Plan: Cursos y Tabla Anidada de Secciones */}
                                                                    {isPlExpanded && (
                                                                      <div className="p-2 pl-4 space-y-2 bg-muted/5">
                                                                        {Array.from(
                                                                          plan.cursos.values()
                                                                        ).map((curso) => {
                                                                          const curKey = `curso-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}-${carrera.carreraId}-${plan.planId}-${curso.cursoId}`
                                                                          const isCurExpanded =
                                                                            expandedNodes.has(curKey)
                                                                          const curCheckState =
                                                                            getNodeCheckState(
                                                                              curso.sectionIds
                                                                            )

                                                                          return (
                                                                            <div
                                                                              key={curKey}
                                                                              className="border border-border/50 rounded-md bg-card overflow-hidden"
                                                                            >
                                                                              {/* Encabezado Curso */}
                                                                              <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-muted/15 border-b border-border/30">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                  <button
                                                                                    onClick={(e) => {
                                                                                      if (e.altKey) {
                                                                                        const secKeys = getCursoSecKeys(
                                                                                          periodo.periodoId,
                                                                                          sede.sedeId,
                                                                                          modalidad.modalidadId,
                                                                                          facultad.facultadId,
                                                                                          carrera.carreraId,
                                                                                          plan.planId,
                                                                                          curso
                                                                                        )
                                                                                        toggleBranchKeys([curKey, ...secKeys])
                                                                                      } else {
                                                                                        toggleNode(curKey)
                                                                                      }
                                                                                    }}
                                                                                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                                    title="Clic para ver secciones. Alt+Clic para desplegar curso con todos sus matriculados"
                                                                                  >
                                                                                    {isCurExpanded ? (
                                                                                      <ChevronDown className="size-3" />
                                                                                    ) : (
                                                                                      <ChevronRight className="size-3" />
                                                                                    )}
                                                                                  </button>

                                                                                  <Checkbox
                                                                                    checked={
                                                                                      curCheckState
                                                                                    }
                                                                                    onCheckedChange={() =>
                                                                                      handleToggleNodeSelection(
                                                                                        curso.sectionIds
                                                                                      )
                                                                                    }
                                                                                  />

                                                                                  <Badge
                                                                                    variant="secondary"
                                                                                    className="text-[9px] px-1 py-0 font-mono"
                                                                                  >
                                                                                    [Curso]
                                                                                  </Badge>

                                                                                  <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                                                                    <span className="font-mono text-primary font-bold">
                                                                                      {
                                                                                        curso.cursoCodigo
                                                                                      }
                                                                                    </span>
                                                                                    <span>-</span>
                                                                                    <span>
                                                                                      {
                                                                                        curso.cursoNombre
                                                                                      }
                                                                                    </span>
                                                                                  </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                                                                                  <span>
                                                                                    {
                                                                                      curso.secciones
                                                                                        .length
                                                                                    }{' '}
                                                                                    secciones
                                                                                  </span>
                                                                                  <span>•</span>
                                                                                  <Badge
                                                                                    variant="outline"
                                                                                    className="text-[10px] font-mono px-1 py-0"
                                                                                  >
                                                                                    {
                                                                                      curso.totalStudents
                                                                                    }{' '}
                                                                                    alumnos
                                                                                  </Badge>
                                                                                  {curso.secciones.length > 0 && (
                                                                                    <Button
                                                                                      variant="ghost"
                                                                                      size="xs"
                                                                                      onClick={() => {
                                                                                        const secKeys = getCursoSecKeys(
                                                                                          periodo.periodoId,
                                                                                          sede.sedeId,
                                                                                          modalidad.modalidadId,
                                                                                          facultad.facultadId,
                                                                                          carrera.carreraId,
                                                                                          plan.planId,
                                                                                          curso
                                                                                        )
                                                                                        const allSecExpanded = secKeys.every((k) =>
                                                                                          expandedNodes.has(k)
                                                                                        )
                                                                                        setExpandedNodes((prev) => {
                                                                                          const next = new Set(prev)
                                                                                          next.add(curKey)
                                                                                          for (const k of secKeys) {
                                                                                            if (allSecExpanded) {
                                                                                              next.delete(k)
                                                                                            } else {
                                                                                              next.add(k)
                                                                                            }
                                                                                          }
                                                                                          return next
                                                                                        })
                                                                                      }}
                                                                                      className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                                                                      title="Desplegar o plegar docentes y alumnos de todas las secciones de este curso"
                                                                                    >
                                                                                      <Users className="size-2.5" />
                                                                                      <span>
                                                                                        {curso.secciones.every((s) =>
                                                                                          expandedNodes.has(
                                                                                            `sec-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}-${carrera.carreraId}-${plan.planId}-${curso.cursoId}-${s.id}`
                                                                                          )
                                                                                        )
                                                                                          ? 'Plegar Alumnos'
                                                                                          : 'Ver Alumnos'}
                                                                                      </span>
                                                                                    </Button>
                                                                                  )}
                                                                                </div>
                                                                              </div>

                                                                              {/* Tabla Anidada de Secciones del Curso */}
                                                                              {isCurExpanded && (
                                                                                <div className="p-0 overflow-x-auto">
                                                                                  <Table>
                                                                                    <TableHeader>
                                                                                      <TableRow className="bg-muted/10 hover:bg-muted/10 text-[11px]">
                                                                                        <TableHead className="w-8 text-center py-2"></TableHead>
                                                                                        <TableHead className="w-10 text-center py-2">
                                                                                          Sel.
                                                                                        </TableHead>
                                                                                        <TableHead className="py-2">
                                                                                          Sección Canvas
                                                                                        </TableHead>
                                                                                        <TableHead className="py-2">
                                                                                          Docente(s) Asignado(s)
                                                                                        </TableHead>
                                                                                        <TableHead className="py-2 text-right">
                                                                                          Matriculados
                                                                                        </TableHead>
                                                                                        <TableHead className="w-28 text-right py-2">
                                                                                          Acciones
                                                                                        </TableHead>
                                                                                      </TableRow>
                                                                                    </TableHeader>
                                                                                    <TableBody>
                                                                                      {curso.secciones.map(
                                                                                        (sec) => {
                                                                                          const isSecSelected =
                                                                                            !!selectedRowIds[
                                                                                              String(
                                                                                                sec.id
                                                                                              )
                                                                                            ]
                                                                                          const secKey = `sec-${periodo.periodoId}-${sede.sedeId}-${modalidad.modalidadId}-${facultad.facultadId}-${carrera.carreraId}-${plan.planId}-${curso.cursoId}-${sec.id}`
                                                                                          const isSecExpanded =
                                                                                            expandedNodes.has(secKey)

                                                                                          return (
                                                                                            <React.Fragment key={sec.id}>
                                                                                              <TableRow
                                                                                                data-state={
                                                                                                  isSecSelected &&
                                                                                                  'selected'
                                                                                                }
                                                                                                className="hover:bg-muted/30 data-[state=selected]:bg-muted/50 text-xs"
                                                                                              >
                                                                                                <TableCell className="w-8 text-center py-2">
                                                                                                  <button
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                      toggleNode(secKey)
                                                                                                    }
                                                                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                                                                    title={
                                                                                                      isSecExpanded
                                                                                                        ? 'Plegar matriculados'
                                                                                                        : 'Desplegar docentes y alumnos matriculados'
                                                                                                    }
                                                                                                  >
                                                                                                    {isSecExpanded ? (
                                                                                                      <ChevronDown className="size-3 text-primary font-bold" />
                                                                                                    ) : (
                                                                                                      <ChevronRight className="size-3" />
                                                                                                    )}
                                                                                                  </button>
                                                                                                </TableCell>
                                                                                                <TableCell className="text-center py-2">
                                                                                                  <Checkbox
                                                                                                    checked={
                                                                                                      isSecSelected
                                                                                                    }
                                                                                                    onCheckedChange={(
                                                                                                      val
                                                                                                    ) =>
                                                                                                      onToggleSelect(
                                                                                                        [
                                                                                                          sec.id,
                                                                                                        ],
                                                                                                        !!val
                                                                                                      )
                                                                                                    }
                                                                                                  />
                                                                                                </TableCell>
                                                                                                <TableCell className="py-2">
                                                                                                  <div className="flex items-center gap-2">
                                                                                                    <span className="font-semibold text-foreground">
                                                                                                      {
                                                                                                        sec.seccionNombre
                                                                                                      }
                                                                                                    </span>
                                                                                                    {sec.isNoHabilitado && (
                                                                                                      <Badge
                                                                                                        variant="destructive"
                                                                                                        className="text-[9px] px-1 py-0 h-4"
                                                                                                      >
                                                                                                        NO
                                                                                                        HABILITADO
                                                                                                      </Badge>
                                                                                                    )}
                                                                                                  </div>
                                                                                                </TableCell>
                                                                                                <TableCell className="py-2">
                                                                                                  {sec.docentes.length > 0 ? (
                                                                                                    <div className="space-y-0.5">
                                                                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                                                                        <span className="font-medium text-foreground">
                                                                                                          {sec.docentes[0].fullName}
                                                                                                        </span>
                                                                                                        {sec.docentes.length > 1 && (
                                                                                                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                                                                                            +{sec.docentes.length - 1} más
                                                                                                          </Badge>
                                                                                                        )}
                                                                                                      </div>
                                                                                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                                                        {sec.docentes[0].dni && (
                                                                                                          <span className="font-mono bg-muted px-1 rounded">
                                                                                                            DNI: {sec.docentes[0].dni}
                                                                                                          </span>
                                                                                                        )}
                                                                                                        {sec.docentes[0].email && (
                                                                                                          <span className="truncate max-w-[180px]">
                                                                                                            {sec.docentes[0].email}
                                                                                                          </span>
                                                                                                        )}
                                                                                                      </div>
                                                                                                    </div>
                                                                                                  ) : (
                                                                                                    <span className="text-muted-foreground/60 italic text-[11px]">
                                                                                                      Sin docente asignado
                                                                                                    </span>
                                                                                                  )}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-right py-2 font-mono">
                                                                                                  <Badge
                                                                                                    variant={
                                                                                                      sec.estudiantesCount >
                                                                                                      0
                                                                                                        ? 'secondary'
                                                                                                        : 'outline'
                                                                                                    }
                                                                                                    className="text-xs px-2 py-0.5"
                                                                                                  >
                                                                                                    {
                                                                                                      sec.estudiantesCount
                                                                                                    }
                                                                                                  </Badge>
                                                                                                </TableCell>
                                                                                                <TableCell className="text-right py-2">
                                                                                                  <div className="flex items-center justify-end gap-1">
                                                                                                    <Button
                                                                                                      variant={isSecExpanded ? 'secondary' : 'ghost'}
                                                                                                      size="xs"
                                                                                                      onClick={() => toggleNode(secKey)}
                                                                                                      className="h-6 text-[11px] gap-1 px-1.5"
                                                                                                      title="Desplegar docentes y alumnos matriculados en este árbol"
                                                                                                    >
                                                                                                      <Users className="size-3" />
                                                                                                      <span>{isSecExpanded ? 'Plegar' : 'Ver'}</span>
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                      variant="ghost"
                                                                                                      size="icon"
                                                                                                      onClick={() =>
                                                                                                        onInspectStudents(
                                                                                                          sec.item
                                                                                                        )
                                                                                                      }
                                                                                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                                                      title="Abrir modal detallado de estudiantes"
                                                                                                    >
                                                                                                      <UserCheck className="size-3" />
                                                                                                    </Button>
                                                                                                  </div>
                                                                                                </TableCell>
                                                                                              </TableRow>

                                                                                              {/* Rama Nivel 8: Matriculados [(D) Docentes / (E) Estudiantes] */}
                                                                                              {isSecExpanded && (
                                                                                                <TableRow className="bg-muted/10 border-b border-border/40 hover:bg-muted/15">
                                                                                                  <TableCell colSpan={6} className="py-2.5 px-4 pl-10">
                                                                                                    <div className="space-y-2.5">
                                                                                                      {/* Encabezado del Desglose de Matriculados */}
                                                                                                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40 text-[11px]">
                                                                                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                                                                                          <Users className="size-3.5 text-primary" />
                                                                                                          <span>Matriculados en Sección:</span>
                                                                                                          <span className="font-mono text-primary font-bold">{sec.seccionNombre}</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                                                                                          <Badge variant="outline" className="px-1.5 py-0 h-4">
                                                                                                            (D) {sec.docentes.length} {sec.docentes.length === 1 ? 'Docente' : 'Docentes'}
                                                                                                          </Badge>
                                                                                                          <Badge variant="outline" className="px-1.5 py-0 h-4">
                                                                                                            (E) {sec.estudiantes.length} {sec.estudiantes.length === 1 ? 'Estudiante' : 'Estudiantes'}
                                                                                                          </Badge>
                                                                                                        </div>
                                                                                                      </div>

                                                                                                      {/* 1. Docentes asignados (D) */}
                                                                                                      <div className="space-y-1">
                                                                                                        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                                                                                          Docentes Asignados:
                                                                                                        </div>
                                                                                                        {sec.docentes.length > 0 ? (
                                                                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                                                                            {sec.docentes.map((doc, dIdx) => (
                                                                                                              <div
                                                                                                                key={`doc-${sec.id}-${doc.dni || dIdx}`}
                                                                                                                className="flex items-center gap-2 py-1 px-2.5 rounded bg-background border border-border/60 text-xs shadow-2xs"
                                                                                                              >
                                                                                                                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold tracking-tight">
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
                                                                                                          <div className="text-[11px] italic text-muted-foreground pl-2 py-0.5">
                                                                                                            (Sin docente asignado)
                                                                                                          </div>
                                                                                                        )}
                                                                                                      </div>

                                                                                                      {/* 2. Estudiantes Matriculados (E) */}
                                                                                                      <div className="space-y-1 pt-1">
                                                                                                        <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-between tracking-wider">
                                                                                                          <span>Alumnos Matriculados ({sec.estudiantes.length}):</span>
                                                                                                          {sec.estudiantes.length > 0 && (
                                                                                                            <span className="text-[10px] text-muted-foreground font-normal font-sans">
                                                                                                              Rol SIS: Student • Estado: Active
                                                                                                            </span>
                                                                                                          )}
                                                                                                        </div>

                                                                                                        {sec.estudiantes.length > 0 ? (
                                                                                                          <div className="max-h-60 overflow-y-auto divide-y divide-border/20 border border-border/50 rounded bg-background/80 p-1">
                                                                                                            {sec.estudiantes.map((est, eIdx) => (
                                                                                                              <div
                                                                                                                key={`est-${sec.id}-${est.id}-${eIdx}`}
                                                                                                                className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded text-xs transition-colors"
                                                                                                              >
                                                                                                                <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">
                                                                                                                  {eIdx + 1}.
                                                                                                                </span>
                                                                                                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono text-muted-foreground">
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
                                                                                                                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline truncate max-w-[200px]">
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

                                                                                                      {sec.docentes.length === 0 && sec.estudiantes.length === 0 && (
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
                                                                                        }
                                                                                      )}
                                                                                    </TableBody>
                                                                                  </Table>
                                                                                </div>
                                                                              )}
                                                                            </div>
                                                                          )
                                                                        })}
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                )
                                                              })}
                                                            </div>
                                                          )}
                                                        </div>
                                                      )
                                                    }
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
