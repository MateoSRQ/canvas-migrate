import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CaseManager } from '#/components/cases/case-manager'
import { CanvasCaseManager } from '#/components/canvas/canvas-case-manager'
import { HierarchySelector } from '#/components/hierarchy/hierarchy-selector'
import { Layers, Database, Globe } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [activeTab, setActiveTab] = React.useState<'hierarchy' | 'cases' | 'canvas'>('hierarchy')
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>('')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        if (window.location.hash === '#cases') {
          setActiveTab('cases')
        } else if (window.location.hash === '#canvas') {
          setActiveTab('canvas')
        } else if (window.location.hash === '#hierarchy' || !window.location.hash) {
          setActiveTab('hierarchy')
        }
      }
      handleHashChange()
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleExploreHierarchy = (caseId: string) => {
    setSelectedCaseId(caseId)
    setActiveTab('hierarchy')
    if (typeof window !== 'undefined') {
      window.location.hash = 'hierarchy'
    }
  }

  const handleNavigateToCases = () => {
    setActiveTab('cases')
    if (typeof window !== 'undefined') {
      window.location.hash = 'cases'
    }
  }

  const handleNavigateToCanvas = () => {
    setActiveTab('canvas')
    if (typeof window !== 'undefined') {
      window.location.hash = 'canvas'
    }
  }

  return (
    <div className="w-full flex-1 p-6 md:p-8 space-y-6">
      {/* Top Workspace Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-border pb-3">
        <button
          onClick={() => {
            setActiveTab('hierarchy')
            if (typeof window !== 'undefined') window.location.hash = 'hierarchy'
          }}
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
          onClick={handleNavigateToCases}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'cases'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Database className="size-3.5" />
          <span>Registro de Casos SQL</span>
        </button>

        <button
          onClick={handleNavigateToCanvas}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'canvas'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Globe className="size-3.5 text-emerald-500" />
          <span>Casos Canvas LMS (API)</span>
        </button>
      </div>

      {/* Main Workspace Panels */}
      {activeTab === 'hierarchy' ? (
        <HierarchySelector
          onNavigateToCases={handleNavigateToCases}
          selectedCaseId={selectedCaseId}
          onSelectCaseId={setSelectedCaseId}
        />
      ) : activeTab === 'cases' ? (
        <CaseManager onExploreHierarchy={handleExploreHierarchy} />
      ) : (
        <CanvasCaseManager />
      )}
    </div>
  )
}
