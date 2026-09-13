import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CaseManager } from '#/components/cases/case-manager'
import { CanvasCaseManager } from '#/components/canvas/canvas-case-manager'
import { HierarchySelector } from '#/components/hierarchy/hierarchy-selector'
import { CaseComparisonView } from '#/components/comparison/case-comparison-view'
import { Layers, Database, Globe, GitCompare } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [activeTab, setActiveTab] = React.useState<
    'cases' | 'visualization' | 'comparison' | 'canvas'
  >('cases')
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>('')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHashChange = () => {
        const hash = window.location.hash
        if (
          hash === '#visualization' ||
          hash === '#visualizacion' ||
          hash === '#hierarchy'
        ) {
          setActiveTab('visualization')
        } else if (hash === '#comparison' || hash === '#comparativa') {
          setActiveTab('comparison')
        } else if (hash === '#canvas') {
          setActiveTab('canvas')
        } else {
          setActiveTab('cases')
        }
      }
      handleHashChange()
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleExploreHierarchy = (caseId: string) => {
    setSelectedCaseId(caseId)
    setActiveTab('visualization')
    if (typeof window !== 'undefined') {
      window.location.hash = 'visualization'
    }
  }

  const handleNavigateToCases = () => {
    setActiveTab('cases')
    if (typeof window !== 'undefined') {
      window.location.hash = 'cases'
    }
  }

  const handleNavigateToComparison = () => {
    setActiveTab('comparison')
    if (typeof window !== 'undefined') {
      window.location.hash = 'comparison'
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
      <div className="flex items-center gap-1 border-b border-border pb-3 flex-wrap">
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
          onClick={() => {
            setActiveTab('visualization')
            if (typeof window !== 'undefined') window.location.hash = 'visualization'
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'visualization'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Layers className="size-3.5" />
          <span>Visualización y Selección</span>
        </button>

        <button
          onClick={handleNavigateToComparison}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'comparison'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <GitCompare className="size-3.5 text-blue-500" />
          <span>Comparativa Lado a Lado (BD vs Canvas)</span>
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
      {activeTab === 'cases' ? (
        <CaseManager onExploreHierarchy={handleExploreHierarchy} />
      ) : activeTab === 'visualization' ? (
        <HierarchySelector
          onNavigateToCases={handleNavigateToCases}
          selectedCaseId={selectedCaseId}
          onSelectCaseId={setSelectedCaseId}
        />
      ) : activeTab === 'comparison' ? (
        <CaseComparisonView initialDbCaseId={selectedCaseId} />
      ) : (
        <CanvasCaseManager />
      )}
    </div>
  )
}

