import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { ArrowLeft, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AiSuggestions } from './AiSuggestions'
import { DiagramTitle } from './DiagramTitle'
import { ExportMenu } from './ExportMenu'
import { LayerPanel } from './LayerPanel'
import { SaveIndicator } from './SaveIndicator'
import { StateToggle } from './StateToggle'
import { ViewSelector } from './ViewSelector'

export function TopBar() {
  const setPresenting = useUiStore((s) => s.setPresenting)

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
      <div className="ml-3 shrink-0">
        <StateToggle />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <SaveIndicator />
        <ViewSelector />
        <AiSuggestions />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresenting(true)}
          title="Present (⌘⇧P)"
        >
          <Play className="h-4 w-4" />
          Present
        </Button>
        <ExportMenu />
        <LayerPanel />
      </div>
    </header>
  )
}
