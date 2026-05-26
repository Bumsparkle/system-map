import { layoutNodes } from '@/lib/autoLayout'
import { makeVisibilityPredicate } from '@/lib/displayGraph'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'

/** One-click ELK auto-layout of the visible, non-container nodes (spec v1.1 §2). */
export function useTidy() {
  const { fitView } = useReactFlow()

  return useCallback(async () => {
    try {
      const s = useDiagramStore.getState()
      const view = s.views.find((v) => v.id === s.activeViewId) ?? null
      const isVisible = makeVisibilityPredicate(s.layers, view)
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
  }, [fitView])
}
