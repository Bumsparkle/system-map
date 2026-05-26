import { layoutNodes } from '@/lib/autoLayout'
import { makeVisibilityPredicate } from '@/lib/displayGraph'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import { useReactFlow } from '@xyflow/react'
import { Grid2x2, Map as MapIcon, Maximize, Minus, Plus, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

function CtrlButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void
  label: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-[5px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        active && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
      )}
    >
      {children}
    </button>
  )
}

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const dotGrid = useUiStore((s) => s.dotGrid)
  const toggleDotGrid = useUiStore((s) => s.toggleDotGrid)
  const showMinimap = useUiStore((s) => s.showMinimap)
  const toggleMinimap = useUiStore((s) => s.toggleMinimap)

  async function handleTidy() {
    try {
      const s = useDiagramStore.getState()
      const view = s.views.find((v) => v.id === s.activeViewId) ?? null
      const isVisible = makeVisibilityPredicate(s.layers, view)
      // Tidy lays out only visible, non-container nodes; hidden nodes keep positions.
      const layoutable = s.nodes.filter((n) => n.type !== 'group' && isVisible(n))
      if (layoutable.length < 2) return
      const ids = new Set(layoutable.map((n) => n.id))
      const edges = s.edges.filter((e) => ids.has(e.source) && ids.has(e.target))

      const positions = await layoutNodes(layoutable, edges)
      if (Object.keys(positions).length === 0) return

      const flowEl = document.querySelector('.react-flow')
      flowEl?.classList.add('sm-animate-nodes')
      useDiagramStore.getState().applyLayout(positions)
      window.setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 60)
      window.setTimeout(() => flowEl?.classList.remove('sm-animate-nodes'), 480)

      toast({
        message: 'Layout applied',
        action: { label: 'Undo', onClick: () => useDiagramStore.temporal.getState().undo() },
      })
    } catch {
      toast({ message: 'Auto-layout failed', variant: 'error' })
    }
  }

  return (
    <div className="nopan nodrag absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-[8px] border border-border bg-surface p-1 shadow-node">
      <CtrlButton onClick={() => zoomIn({ duration: 120 })} label="Zoom in">
        <Plus className="h-4 w-4" />
      </CtrlButton>
      <CtrlButton onClick={() => zoomOut({ duration: 120 })} label="Zoom out">
        <Minus className="h-4 w-4" />
      </CtrlButton>
      <CtrlButton onClick={() => fitView({ duration: 200, padding: 0.3 })} label="Fit view">
        <Maximize className="h-4 w-4" />
      </CtrlButton>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <CtrlButton onClick={toggleDotGrid} label="Toggle dot grid" active={dotGrid}>
        <Grid2x2 className="h-4 w-4" />
      </CtrlButton>
      <CtrlButton onClick={toggleMinimap} label="Toggle minimap" active={showMinimap}>
        <MapIcon className="h-4 w-4" />
      </CtrlButton>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <CtrlButton onClick={() => void handleTidy()} label="Tidy layout">
        <Sparkles className="h-4 w-4" />
      </CtrlButton>
    </div>
  )
}
