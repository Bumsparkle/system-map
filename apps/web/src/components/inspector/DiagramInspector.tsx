import { Button } from '@/components/ui/button'
import { FLOW_TYPE_LABEL } from '@/lib/edgeRegistry'
import { NODE_TYPE_LABEL } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import type { FlowType, NodeType } from '@system-map/shared'
import { Unlink } from 'lucide-react'
import { useMemo } from 'react'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-[8px] border border-border bg-canvas py-2.5">
      <span className="text-base font-semibold text-ink">{value}</span>
      <span className="text-[11px] text-ink-subtle">{label}</span>
    </div>
  )
}

function Breakdown({ label, entries }: { label: string; entries: [string, number][] }) {
  if (entries.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <p className="text-[12px] leading-relaxed text-ink-subtle">
        {entries.map(([key, count], i) => (
          <span key={key}>
            {i > 0 && <span className="text-border"> · </span>}
            {key} {count}
          </span>
        ))}
      </p>
    </div>
  )
}

export function DiagramInspector() {
  const name = useDiagramStore((s) => s.name)
  const description = useDiagramStore((s) => s.description)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const layerCount = useDiagramStore((s) => s.layers.length)
  const viewCount = useDiagramStore((s) => s.views.length)
  const highlightOrphans = useUiStore((s) => s.highlightOrphans)
  const setHighlightOrphans = useUiStore((s) => s.setHighlightOrphans)

  const typeEntries = useMemo<[string, number][]>(() => {
    const counts = new Map<NodeType, number>()
    for (const n of nodes) {
      const t = (n.type ?? 'custom') as NodeType
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].map(([t, c]) => [NODE_TYPE_LABEL[t], c])
  }, [nodes])

  const flowEntries = useMemo<[string, number][]>(() => {
    const counts = new Map<FlowType, number>()
    for (const e of edges) {
      const t = (e.type ?? 'data') as FlowType
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].map(([t, c]) => [FLOW_TYPE_LABEL[t], c])
  }, [edges])

  function findOrphans() {
    if (highlightOrphans) {
      setHighlightOrphans(false)
      return
    }
    const connected = new Set<string>()
    for (const e of edges) {
      connected.add(e.source)
      connected.add(e.target)
    }
    const orphans = nodes.filter((n) => n.type !== 'group' && !connected.has(n.id))
    if (orphans.length === 0) {
      toast({ message: 'No orphans — every node is connected' })
      return
    }
    setHighlightOrphans(true)
    toast({ message: `${orphans.length} orphan${orphans.length > 1 ? 's' : ''} highlighted` })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Diagram
        </span>
        <h3 className="mt-1 text-sm font-medium text-ink">{name || 'Untitled'}</h3>
        {description && <p className="mt-1 text-sm leading-snug text-ink-muted">{description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat value={nodes.length} label="Nodes" />
        <Stat value={edges.length} label="Edges" />
        <Stat value={layerCount} label="Layers" />
        <Stat value={viewCount} label="Views" />
      </div>

      <Breakdown label="By type" entries={typeEntries} />
      <Breakdown label="By flow" entries={flowEntries} />

      <Button variant="outline" size="sm" onClick={findOrphans} className="justify-start">
        <Unlink className="h-4 w-4" />
        {highlightOrphans ? 'Clear orphan highlight' : 'Find orphans'}
      </Button>

      <p className="text-sm leading-snug text-ink-subtle">
        Select a node to edit it, or drag a new one from the palette.
      </p>
    </div>
  )
}
