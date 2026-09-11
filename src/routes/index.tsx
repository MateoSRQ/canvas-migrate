import { createFileRoute } from '@tanstack/react-router'
import { CaseManager } from '#/components/cases/case-manager'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="w-full flex-1 p-6 md:p-8">
      <CaseManager />
    </div>
  )
}
