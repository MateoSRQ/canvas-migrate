import { Users, Loader2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { getModalidadCode } from '#/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { HierarchyItem, EnrolledStudent } from '#/server/services/hierarchy-service'

interface StudentInspectorDialogProps {
  isOpen: boolean
  onClose: () => void
  item: HierarchyItem | null
  students: EnrolledStudent[]
  isLoading: boolean
}

export function StudentInspectorDialog({
  isOpen,
  onClose,
  item,
  students,
  isLoading,
}: StudentInspectorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span>Estudiantes Matriculados</span>
          </DialogTitle>
          {item && (() => {
            const modCode = getModalidadCode(item.modalidadId, item.modalidadNombre)
            const v2CourseCode = `${modCode}-${item.cursoCodigo.trim()}-${item.seccionNombre.trim()}`
            return (
              <DialogDescription className="text-xs text-muted-foreground space-y-1 pt-1">
                <div className="text-foreground font-medium flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-mono font-bold ${
                      modCode === 'MP'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        : modCode === 'MN'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    [{modCode}]
                  </Badge>
                  <span className="font-mono text-primary font-semibold">{v2CourseCode}</span>
                  <span>•</span>
                  <span className="font-medium text-foreground">[{modCode}] - {item.cursoCodigo.trim()} - {item.cursoNombre.trim()} - {item.seccionNombre.trim()}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <span>Docente: {item.docenteNombre || 'Sin docente asignado'}</span>
                  {item.docenteDni && <span>(DNI: {item.docenteDni})</span>}
                  <span>•</span>
                  <span>
                    Total: {isLoading ? '...' : students.length}{' '}
                    {students.length === 1 ? 'matriculado' : 'matriculados'}
                  </span>
                </div>
              </DialogDescription>
            )
          })()}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto border border-border rounded-lg">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="size-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Cargando lista de estudiantes matriculados...
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
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
  )
}
