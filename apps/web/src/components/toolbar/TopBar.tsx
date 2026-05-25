import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DiagramTitle } from './DiagramTitle'

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-surface px-3">
      <Link
        to="/"
        aria-label="Back to dashboard"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <DiagramTitle />
      <div className="ml-auto flex items-center gap-2">
        {/* Phase 4: LayerPanel, ViewSelector — Phase 5: SaveIndicator */}
      </div>
    </header>
  )
}
