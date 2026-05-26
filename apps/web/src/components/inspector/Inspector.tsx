import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { DiagramInspector } from './DiagramInspector'
import { EdgeInspector } from './EdgeInspector'
import { NodeInspector } from './NodeInspector'

export function Inspector() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const collapsed = useUiStore((s) => s.inspectorCollapsed)
  const toggleInspector = useUiStore((s) => s.toggleInspector)

  const selectedNodes = nodes.filter((n) => n.selected)
  const selectedEdges = edges.filter((e) => e.selected)
  const total = selectedNodes.length + selectedEdges.length
  const onlyNode =
    selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : undefined
  const onlyEdge =
    selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : undefined

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-border bg-surface py-2">
        <button
          type="button"
          onClick={toggleInspector}
          aria-label="Expand inspector"
          title="Expand inspector"
          className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-end border-b border-border px-2">
        <button
          type="button"
          onClick={toggleInspector}
          aria-label="Collapse inspector"
          title="Collapse inspector"
          className="grid h-7 w-7 place-items-center rounded-[5px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {onlyNode ? (
          <NodeInspector key={onlyNode.id} node={onlyNode} />
        ) : onlyEdge ? (
          <EdgeInspector key={onlyEdge.id} edge={onlyEdge} />
        ) : total > 1 ? (
          <div className="p-4 text-sm text-ink-muted">{total} items selected.</div>
        ) : (
          <DiagramInspector />
        )}
      </div>
    </aside>
  )
}
