import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CaseManager } from '#/components/cases/case-manager'
import { HierarchySelector } from '#/components/hierarchy/hierarchy-selector'
import { Layers, Database } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [activeTab, setActiveTab] = React.useState<'hierarchy' | 'cases'>('hierarchy')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        if (window.location.hash === '#cases') {
          setActiveTab('cases')
        } else if (window.location.hash === '#hierarchy' || !window.location.hash) {
          setActiveTab('hierarchy')
        }
      }
      handleHashChange()
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return (
    <div className="w-full flex-1 p-6 md:p-8 space-y-6">
      {/* Top Workspace Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'hierarchy'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Layers className="size-3.5" />
          <span>Jerarquía y Selección</span>
        </button>

        <button
          onClick={() => setActiveTab('cases')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'cases'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Database className="size-3.5" />
          <span>Registro de Casos de Importación</span>
        </button>
      </div>

      {/* Main Workspace Panels */}
      {activeTab === 'hierarchy' ? (
        <HierarchySelector onNavigateToCases={() => setActiveTab('cases')} />
      ) : (
        <CaseManager />
      )}
    </div>
  )
}
