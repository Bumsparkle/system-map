import { StateToggle } from '@/components/toolbar/StateToggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SMNode } from '@/lib/flow'
import { NODE_TYPE_LABEL } from '@/lib/nodeRegistry'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import type { Layer } from '@system-map/shared'
import { useReactFlow } from '@xyflow/react'
import { Check, ChevronUp, Eye, Maximize, Minus, Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

/** Read-only chrome shown over the canvas in presentation mode (spec v1.1 §7):
 *  an exit pill, a minimal zoom/fit/view toolbar, and a details card on select. */
export function PresentationChrome() {
  const setPresenting = useUiStore((s) => s.setPresenting)
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const nodes = useDiagramStore((s) => s.nodes)
  const layers = useDiagramStore((s) => s.layers)
  const views = useDiagramStore((s) => s.views)
  const activeViewId = useDiagramStore((s) => s.activeViewId)
  const setActiveView = useDiagramStore((s) => s.setActiveView)

  const selected = useMemo(() => {
    const sel = nodes.filter((n) => n.selected)
    return sel.length === 1 ? (sel[0] ?? null) : null
  }, [nodes])

  const activeView = views.find((v) => v.id === activeViewId) ?? null

  return (
    <>
      <button
        type="button"
        onClick={() => setPresenting(false)}
        className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-muted shadow-node transition-colors duration-[120ms] ease-out hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
        Exit presentation <span className="text-ink-subtle">· Esc</span>
      </button>

      {selected && <NodeCard node={selected} layers={layers} />}

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-[8px] border border-border bg-surface p-1 shadow-node">
        <ToolButton onClick={() => zoomOut({ duration: 120 })} label="Zoom out">
          <Minus className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => zoomIn({ duration: 120 })} label="Zoom in">
          <Plus className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => fitView({ duration: 200, padding: 0.3 })} label="Fit view">
          <Maximize className="h-4 w-4" />
        </ToolButton>
        <div className="mx-0.5 h-5 w-px bg-border" />
        {/* Current / Future / Delta — switch state while presenting. */}
        <StateToggle />
        <div className="mx-0.5 h-5 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink"
            >
              <Eye className="h-4 w-4" />
              <span className="max-w-[10rem] truncate">{activeView?.name ?? 'All layers'}</span>
              <ChevronUp className="h-3.5 w-3.5 text-ink-subtle" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-56 p-1.5">
            <ViewItem onClick={() => setActiveView(null)} active={activeViewId === null}>
              All layers
            </ViewItem>
            {views.map((v) => (
              <ViewItem
                key={v.id}
                onClick={() => setActiveView(v.id)}
                active={activeViewId === v.id}
              >
                {v.name}
              </ViewItem>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}

function ToolButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-[5px] text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  )
}

function ViewItem({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm text-ink transition-colors duration-[120ms] ease-out hover:bg-surface-2"
    >
      <span className="flex-1 truncate text-left">{children}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
    </button>
  )
}

function NodeCard({ node, layers }: { node: SMNode; layers: Layer[] }) {
  const { data } = node
  const layerColor = layers.find((l) => l.id === data.layerId)?.color
  const fields = Object.entries(data.fields ?? {})

  return (
    <div className="absolute left-4 top-4 z-20 w-72 rounded-[10px] border border-border bg-surface p-4 shadow-node">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: layerColor ?? 'var(--color-ink-subtle)' }}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          {NODE_TYPE_LABEL[node.type ?? 'custom']}
        </span>
      </div>
      <h3 className="mt-1.5 text-[15px] font-medium leading-tight text-ink">{data.label}</h3>
      {data.category && <p className="mt-0.5 text-[12px] text-ink-subtle">{data.category}</p>}
      {data.description && (
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
          {data.description}
        </p>
      )}
      {fields.length > 0 && (
        <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {fields.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3 text-[12px]">
              <dt className="shrink-0 text-ink-subtle">{key}</dt>
              <dd className="truncate text-right text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
