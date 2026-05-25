import { buttonVariants } from '@/components/ui/button'
import { useDiagram } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>()
  const diagram = useDiagram(diagramId ?? '')

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium">
          {diagram.data?.name ?? (diagram.isLoading ? 'Loading…' : 'Diagram')}
        </span>
      </header>

      <div className="grid flex-1 place-items-center bg-canvas">
        <p className="text-sm text-ink-subtle">Canvas arrives in Phase 2.</p>
      </div>
    </div>
  )
}
