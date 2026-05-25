import { useDiagramStore } from '@/stores/diagramStore'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-[8px] border border-border bg-canvas py-2.5">
      <span className="text-base font-semibold text-ink">{value}</span>
      <span className="text-[11px] text-ink-subtle">{label}</span>
    </div>
  )
}

export function DiagramInspector() {
  const name = useDiagramStore((s) => s.name)
  const description = useDiagramStore((s) => s.description)
  const nodeCount = useDiagramStore((s) => s.nodes.length)
  const edgeCount = useDiagramStore((s) => s.edges.length)
  const layerCount = useDiagramStore((s) => s.layers.length)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Diagram
        </span>
        <h3 className="mt-1 text-sm font-medium text-ink">{name || 'Untitled'}</h3>
        {description && <p className="mt-1 text-sm leading-snug text-ink-muted">{description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={nodeCount} label="Nodes" />
        <Stat value={edgeCount} label="Edges" />
        <Stat value={layerCount} label="Layers" />
      </div>

      <p className="text-sm leading-snug text-ink-subtle">
        Select a node to edit it, or drag a new one from the palette.
      </p>
    </div>
  )
}
