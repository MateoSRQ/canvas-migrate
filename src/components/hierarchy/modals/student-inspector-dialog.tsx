import { Users, Loader2 } from 'lucide-react'
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
          {item && (
            <DialogDescription className="text-xs text-muted-foreground space-y-1 pt-1">
              <div className="text-foreground font-medium">
                {item.cursoCodigo} - {item.cursoNombre} ({item.seccionNombre})
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
          )}
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
