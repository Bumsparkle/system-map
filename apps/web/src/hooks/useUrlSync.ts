import { useDiagramStore } from '@/stores/diagramStore'
import { type DiagramStateView, useUiStore } from '@/stores/uiStore'
import { useNodesInitialized, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

function isState(v: string | null): v is DiagramStateView {
  return v === 'current' || v === 'future' || v === 'delta'
}

/**
 * Two-way sync between the URL and selection/view/state (spec v1.1 §8, v1.3 §3.4):
 * - On first load, `?node=` selects + centers a node, `?view=` applies a view, and
 *   `?state=` (or per-diagram localStorage) applies the current/future/delta toggle.
 * - Afterwards, changing the selection / active view / state updates the URL
 *   (debounced, history-replacing) and persists the state to localStorage.
 */
export function useUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fitView } = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const nodes = useDiagramStore((s) => s.nodes)
  const views = useDiagramStore((s) => s.views)
  const diagramId = useDiagramStore((s) => s.diagramId)
  const selectNode = useDiagramStore((s) => s.selectNode)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const setActiveView = useDiagramStore((s) => s.setActiveView)
  const diagramState = useUiStore((s) => s.diagramState)
  const setDiagramState = useUiStore((s) => s.setDiagramState)

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
    // State toggle: URL ?state wins, else per-diagram localStorage, else Current.
    const stateParam = searchParams.get('state')
    const stored = diagramId ? localStorage.getItem(`sysmap:state:${diagramId}`) : null
    setDiagramState(isState(stateParam) ? stateParam : isState(stored) ? stored : 'current')
    const viewParam = searchParams.get('view')
    if (viewParam && views.some((v) => v.id === viewParam)) setActiveView(viewParam)
    const nodeParam = searchParams.get('node')
    if (nodeParam && nodes.some((n) => n.id === nodeParam)) {
      selectNode(nodeParam)
      requestAnimationFrame(() =>
        fitView({ nodes: [{ id: nodeParam }], duration: 400, maxZoom: 1.4, padding: 0.4 }),
      )
    }
  }, [
    nodesInitialized,
    nodes,
    views,
    diagramId,
    searchParams,
    selectNode,
    setActiveView,
    setDiagramState,
    fitView,
  ])

  // Persist the state toggle per-diagram in localStorage as soon as it changes.
  useEffect(() => {
    if (!applied.current || !diagramId) return
    localStorage.setItem(`sysmap:state:${diagramId}`, diagramState)
  }, [diagramId, diagramState])

  // Reflect the current selection + active view + state back into the URL (debounced 200ms).
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
          // Keep the default (current) out of the URL; only surface non-default.
          if (diagramState !== 'current') next.set('state', diagramState)
          else next.delete('state')
          return next
        },
        { replace: true },
      )
    }, 200)
    return () => clearTimeout(t)
  }, [selectedNodeId, activeViewId, diagramState, setSearchParams])
}
