import { CommandPalette } from '@/components/CommandPalette'
import { Canvas } from '@/components/canvas/Canvas'
import { PresentationChrome } from '@/components/canvas/PresentationChrome'
import { Inspector } from '@/components/inspector/Inspector'
import { NodePalette } from '@/components/palette/NodePalette'
import { TopBar } from '@/components/toolbar/TopBar'
import { buttonVariants } from '@/components/ui/button'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useDiagram } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { ReactFlowProvider } from '@xyflow/react'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

function FullScreen({ message, withBack }: { message: string; withBack?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas">
      <p className="text-sm text-ink-muted">{message}</p>
      {withBack && (
        <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      )}
    </div>
  )
}

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>()
  const query = useDiagram(diagramId ?? '')
  const detail = query.data
  const hydrate = useDiagramStore((s) => s.hydrate)
  const reset = useDiagramStore((s) => s.reset)

  useEffect(() => {
    if (detail) {
      hydrate(detail)
      // Clear undo history so the user can't undo back past the loaded diagram.
      useDiagramStore.temporal.getState().clear()
    }
  }, [detail, hydrate])

  useEffect(() => () => reset(), [reset])

  useAutoSave()

  if (query.isLoading) return <FullScreen message="Loading diagram…" />
  if (query.isError || !detail) return <FullScreen message="Couldn't load this diagram." withBack />

  return <Editor />
}

function Editor() {
  const presenting = useUiStore((s) => s.presenting)

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        {!presenting && <TopBar />}
        <div className="flex min-h-0 flex-1">
          {!presenting && <NodePalette />}
          <div className="relative min-w-0 flex-1">
            <Canvas />
            {presenting && <PresentationChrome />}
          </div>
          {!presenting && <Inspector />}
        </div>
      </div>
      {!presenting && <CommandPalette />}
    </ReactFlowProvider>
  )
}
