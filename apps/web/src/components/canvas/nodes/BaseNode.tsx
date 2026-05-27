import { type NodeSize, sizeStyle } from '@/lib/appearance'
import { LIFECYCLE_DELTA } from '@/lib/lifecycle'
import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { Handle, Position } from '@xyflow/react'
import { type ReactNode, useState } from 'react'

const SIDES = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
] as const

export function BaseNode({
  id,
  layerId,
  selected,
  squared,
  dashed,
  accentColor,
  size,
  className,
  children,
}: {
  id: string
  layerId: string
  selected?: boolean
  squared?: boolean
  dashed?: boolean
  accentColor?: string
  size?: NodeSize
  className?: string
  children: ReactNode
}) {
  const layerColor = useDiagramStore((s) => s.layers.find((l) => l.id === layerId)?.color)
  const flashing = useUiStore((s) => s.justAddedNodeId === id)
  const editing = useUiStore((s) => s.editingNodeId === id)
  // Delta view: re-skin the node by its lifecycle (spec v1.3 §3.3).
  const delta = useUiStore((s) => s.diagramState === 'delta')
  const lifecycle = useDiagramStore((s) => s.nodes.find((n) => n.id === id)?.data.lifecycle)
  const lc = delta ? LIFECYCLE_DELTA[lifecycle ?? 'existing'] : null
  const barColor = lc?.bar ?? accentColor ?? layerColor ?? 'transparent'

  return (
    <div
      style={{ ...sizeStyle(size), ...(lc ? { opacity: lc.opacity } : {}) }}
      className={cn(
        'sm-node-shell group/node relative flex flex-col gap-1 overflow-visible border border-border bg-surface px-3.5 py-3 shadow-node transition-[box-shadow,background-color] duration-[120ms] ease-out hover:shadow-node-hover',
        squared ? 'rounded-[5px]' : 'rounded-[8px]',
        dashed && 'border-dashed border-border-strong',
        selected && 'outline outline-2 outline-offset-2 outline-accent',
        flashing && 'bg-accent-soft',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-[3px]',
          squared ? 'rounded-l-[4px]' : 'rounded-l-[7px]',
        )}
        style={{ backgroundColor: barColor }}
      />
      {lc?.label && (
        <span
          className="absolute -top-2 right-1.5 rounded-[3px] bg-surface px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-node"
          style={{ color: lc.bar ?? 'var(--color-ink-muted)' }}
        >
          {lc.label}
        </span>
      )}
      <div className="pl-1">{editing ? <NodeLabelEditor id={id} /> : children}</div>
      {SIDES.map(([side, position]) => (
        <Handle key={side} id={side} type="source" position={position} />
      ))}
    </div>
  )
}

/** Inline label editor shown on double-click (spec v1.1 §8). Enter commits,
 *  Escape cancels, blur commits. */
function NodeLabelEditor({ id }: { id: string }) {
  const label = useDiagramStore((s) => s.nodes.find((n) => n.id === id)?.data.label ?? '')
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const setEditingNode = useUiStore((s) => s.setEditingNode)
  const [value, setValue] = useState(label)

  function commit() {
    const next = value.trim()
    if (next && next !== label) updateNodeData(id, { label: next })
    setEditingNode(null)
  }

  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: a double-click rename should focus immediately
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setEditingNode(null)
        }
      }}
      className="nodrag nopan w-full rounded-[4px] border border-accent bg-surface px-1.5 py-0.5 text-[1em] font-medium text-ink focus:outline-none"
    />
  )
}
