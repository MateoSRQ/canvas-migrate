import * as React from 'react'
import { Users, Loader2, ExternalLink } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type {
  HierarchyItem,
  EnrolledTeacher,
  EnrolledStudent,
} from '#/server/services/hierarchy-service'

export interface TreeSectionNodeData {
  id: number
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

interface TreeSectionRosterProps {
  sec: TreeSectionNodeData
  loadedStudents?: EnrolledStudent[]
  isLoading: boolean
  onLoadStudents: (sectionId: number) => void
  onInspectStudents: (item: HierarchyItem) => void
}

export function TreeSectionRoster({
  sec,
  loadedStudents,
  isLoading,
  onLoadStudents,
  onInspectStudents,
}: TreeSectionRosterProps) {
  // Disparar carga bajo demanda al desplegar si la sección tiene estudiantes pero aún no han sido cargados
  React.useEffect(() => {
    if (
      sec.estudiantesCount > 0 &&
      !loadedStudents &&
      (!sec.estudiantes || sec.estudiantes.length === 0)
    ) {
      onLoadStudents(sec.id)
    }
  }, [sec.id, sec.estudiantesCount, loadedStudents, sec.estudiantes, onLoadStudents])

  const students = loadedStudents || sec.estudiantes || []
  const displayCount = isLoading ? sec.estudiantesCount : students.length

  const uniqueDocentes = React.useMemo(() => {
    const seen = new Set<string>()
    return (sec.docentes || []).filter((d) => {
      const key = d.dni ? `dni-${d.dni}` : `name-${d.fullName.toLowerCase().trim()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [sec.docentes])

  const uniqueCarreras = React.useMemo(() => {
    const seen = new Set<string>()
    for (const s of students) {
      if (s.carreraNombre) seen.add(s.carreraNombre)
    }
    return Array.from(seen)
  }, [students])

  return (
    <div className="space-y-2.5">
      {/* Encabezado del Desglose de Matriculados */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40 text-[11px]">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Users className="size-3.5 text-primary" />
          <span>Matriculados en Sección:</span>
          <span className="font-mono text-primary font-bold">{sec.seccionNombre}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          {uniqueCarreras.length > 1 && (
            <Badge
              variant="outline"
              className="px-1.5 py-0 h-4 bg-indigo-50/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-sans font-medium"
              title={`Estudiantes de ${uniqueCarreras.length} carreras distintas`}
            >
              {uniqueCarreras.length} Carreras
            </Badge>
          )}
          <Badge variant="outline" className="px-1.5 py-0 h-4">
            (D) {uniqueDocentes.length} {uniqueDocentes.length === 1 ? 'Docente' : 'Docentes'}
          </Badge>
          <Badge variant="outline" className="px-1.5 py-0 h-4">
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-2.5 animate-spin text-primary" />
                <span>(E) Cargando...</span>
              </span>
            ) : (
              <span>
                (E) {students.length} {students.length === 1 ? 'Estudiante' : 'Estudiantes'}
              </span>
            )}
          </Badge>
        </div>
      </div>

      {/* 1. Docentes asignados (D) */}
      <div className="space-y-1 pl-3 border-l-2 border-amber-500/40 ml-1">
        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
          <span>Docentes Asignados ({uniqueDocentes.length}):</span>
        </div>
        {uniqueDocentes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {uniqueDocentes.map((doc, dIdx) => (
              <div
                key={`doc-${sec.id}-${doc.dni || dIdx}`}
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
          <div className="text-[11px] italic text-muted-foreground pl-2 py-0.5">
            (Sin docente asignado)
          </div>
        )}
      </div>

      {/* 2. Estudiantes Matriculados (E) */}
      <div className="space-y-1 pt-1 pl-3 border-l-2 border-primary/30 ml-1">
        <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-between tracking-wider">
          <span>Alumnos Matriculados ({displayCount}):</span>
          {!isLoading && students.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal font-sans">
              Rol SIS: Student • Estado: Active
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 px-4 bg-background/50 border border-border/40 rounded text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary shrink-0" />
            <span>Cargando lista de alumnos matriculados ({sec.estudiantesCount})...</span>
          </div>
        ) : students.length > 0 ? (
          <div className="max-h-60 overflow-y-auto divide-y divide-border/20 border border-border/50 rounded bg-background/80 p-1">
            {students.slice(0, 30).map((est, eIdx) => (
              <div
                key={`est-${sec.id}-${est.id}-${eIdx}`}
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
                {est.carreraNombre && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 max-w-[170px] truncate text-muted-foreground hidden sm:inline-flex shrink-0 font-normal bg-muted/20"
                    title={`Carrera: ${est.carreraNombre}`}
                  >
                    {est.carreraNombre}
                  </Badge>
                )}
                {est.email && (
                  <span className="text-[10px] text-muted-foreground font-mono hidden md:inline truncate max-w-[180px]">
                    &lt;{est.email}&gt;
                  </span>
                )}
              </div>
            ))}
            {students.length > 30 && (
              <div className="p-1.5 text-center bg-muted/20 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onInspectStudents(sec.item)}
                  className="text-[11px] h-6 text-primary gap-1"
                >
                  <span>Ver los {students.length - 30} alumnos restantes en el modal</span>
                  <ExternalLink className="size-3" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] italic text-muted-foreground pl-2 py-0.5 font-sans">
            (Sin alumnos matriculados en esta sección)
          </div>
        )}
      </div>

      {!isLoading && sec.docentes.length === 0 && students.length === 0 && (
        <div className="text-[11px] italic text-muted-foreground pl-2 py-1 font-mono">
          (Sin alumnos ni docentes matriculados)
        </div>
      )}
    </div>
  )
}
