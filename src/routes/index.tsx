import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="w-full flex-1 p-6 md:p-8 flex flex-col items-center justify-center text-center">
      <div className="max-w-md mx-auto space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Canvas Migrate</h1>
        <p className="text-sm text-muted-foreground">
          TanStack Start workspace ready with Drizzle, SQLite, and shadcn/ui. Open the left drawer menu to access navigation.
        </p>
      </div>
    </div>
  )
}
