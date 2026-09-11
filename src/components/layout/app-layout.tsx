import * as React from "react"
import { Menu, Layers, Settings, FileText, Home } from "lucide-react"
import { Button } from "#/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "#/components/ui/sheet"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 w-full items-center px-4 gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menú lateral"
                className="text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:w-80 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
              <SheetHeader className="p-4 border-b border-sidebar-border text-left">
                <SheetTitle className="text-base font-semibold tracking-tight text-sidebar-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Menú Principal
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Navegación y módulos del sistema
                </SheetDescription>
              </SheetHeader>

              {/* Drawer Menu Items */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1 text-sm font-medium">
                <a
                  href="/#hierarchy"
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground transition-colors"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <Layers className="h-4 w-4" />
                  <span>Jerarquía y Selección</span>
                </a>
                <a
                  href="/#cases"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <FileText className="h-4 w-4" />
                  <span>Registro de Casos de Importación</span>
                </a>
              </nav>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
                <p>Canvas Migrate</p>
                <p className="text-[10px] text-muted-foreground/60">TanStack Start • SQLite</p>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 font-medium text-sm tracking-tight">
            <Layers className="h-4 w-4 text-foreground/80" />
            <span>Canvas Migrate</span>
          </div>
        </div>
      </header>

      {/* Central Panel Full Width */}
      <main className="w-full flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
