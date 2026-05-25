import { useDiagramStore } from '@/stores/diagramStore'
import { DiagramInspector } from './DiagramInspector'
import { NodeInspector } from './NodeInspector'

export function Inspector() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)

  const selectedNodes = nodes.filter((n) => n.selected)
  const selectedEdges = edges.filter((e) => e.selected)
  const total = selectedNodes.length + selectedEdges.length
  const onlyNode =
    selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : undefined

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-border bg-surface">
      {onlyNode ? (
        <NodeInspector key={onlyNode.id} node={onlyNode} />
      ) : total > 1 ? (
        <div className="p-4 text-sm text-ink-muted">{total} items selected.</div>
      ) : (
        <DiagramInspector />
      )}
    </aside>
  )
}
