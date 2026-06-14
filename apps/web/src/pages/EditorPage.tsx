import { CommandPalette } from '@/components/CommandPalette'
import { Canvas } from '@/components/canvas/Canvas'
import { PresentationChrome } from '@/components/canvas/PresentationChrome'
import { PreviewBanner } from '@/components/canvas/PreviewBanner'
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
  const setPreviewDelta = useUiStore((s) => s.setPreviewDelta)

  useEffect(() => {
    if (detail) {
      hydrate(detail)
      // Clear undo history so the user can't undo back past the loaded diagram.
      useDiagramStore.temporal.getState().clear()
    }
  }, [detail, hydrate])

  // Drop any in-flight suggestion preview when leaving the editor.
  useEffect(
    () => () => {
      reset()
      setPreviewDelta(null)
    },
    [reset, setPreviewDelta],
  )

  useAutoSave()

  if (query.isLoading) return <FullScreen message="Loading diagram…" />
  if (query.isError || !detail) return <FullScreen message="Couldn't load this diagram." withBack />

  return <Editor />
}

function Editor() {
  const presenting = useUiStore((s) => s.presenting)
  // While a suggestion preview is on the canvas the editor is in read-only
  // "review mode": hide the mutation surfaces so the preview can't go stale and
  // Apply stays a single, clean undo step.
  const previewing = useUiStore((s) => s.previewDelta !== null)

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        {!presenting && <TopBar />}
        <div className="flex min-h-0 flex-1">
          {!presenting && <NodePalette />}
          <div className="relative min-w-0 flex-1">
            <Canvas />
            {!presenting && <PreviewBanner />}
            {presenting && <PresentationChrome />}
          </div>
          {!presenting && !previewing && <Inspector />}
        </div>
      </div>
      {!presenting && !previewing && <CommandPalette />}
    </ReactFlowProvider>
  )
}
