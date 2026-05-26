import { useDiagramStore } from '@/stores/diagramStore'
import { useNodesInitialized, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Two-way sync between the URL and selection/view (spec v1.1 §8):
 * - On first load, `?node=` selects + centers a node and `?view=` applies a view.
 * - Afterwards, changing the selection or active view updates the URL (debounced,
 *   history-replacing so it doesn't spam the back button).
 */
export function useUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fitView } = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const nodes = useDiagramStore((s) => s.nodes)
  const views = useDiagramStore((s) => s.views)
  const selectNode = useDiagramStore((s) => s.selectNode)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const setActiveView = useDiagramStore((s) => s.setActiveView)

  const selectedNodeId = useMemo(() => {
    const sel = nodes.filter((n) => n.selected)
    return sel.length === 1 ? (sel[0]?.id ?? null) : null
  }, [nodes])

  const applied = useRef(false)

  // Apply ?node / ?view once, after React Flow has measured the nodes (so our
  // node-centering runs after — and isn't clobbered by — RF's initial fit-to-all).
  useEffect(() => {
    if (applied.current || !nodesInitialized) return
    applied.current = true
    const viewParam = searchParams.get('view')
    if (viewParam && views.some((v) => v.id === viewParam)) setActiveView(viewParam)
    const nodeParam = searchParams.get('node')
    if (nodeParam && nodes.some((n) => n.id === nodeParam)) {
      selectNode(nodeParam)
      requestAnimationFrame(() =>
        fitView({ nodes: [{ id: nodeParam }], duration: 400, maxZoom: 1.4, padding: 0.4 }),
      )
    }
  }, [nodesInitialized, nodes, views, searchParams, selectNode, setActiveView, fitView])

  // Reflect the current selection + active view back into the URL (debounced 200ms).
  useEffect(() => {
    if (!applied.current) return
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (selectedNodeId) next.set('node', selectedNodeId)
          else next.delete('node')
          if (activeViewId) next.set('view', activeViewId)
          else next.delete('view')
          return next
        },
        { replace: true },
      )
    }, 200)
    return () => clearTimeout(t)
  }, [selectedNodeId, activeViewId, setSearchParams])
}
