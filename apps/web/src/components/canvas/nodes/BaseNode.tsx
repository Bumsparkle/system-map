import { cn } from '@/lib/utils'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { Handle, Position } from '@xyflow/react'
import type { ReactNode } from 'react'

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
  className,
  children,
}: {
  id: string
  layerId: string
  selected?: boolean
  squared?: boolean
  dashed?: boolean
  className?: string
  children: ReactNode
}) {
  const layerColor = useDiagramStore((s) => s.layers.find((l) => l.id === layerId)?.color)
  const flashing = useUiStore((s) => s.justAddedNodeId === id)

  return (
    <div
      className={cn(
        'group/node relative flex min-w-[160px] flex-col gap-1 overflow-visible border border-border bg-surface px-3.5 py-3 shadow-node transition-[box-shadow,background-color] duration-[120ms] ease-out hover:shadow-node-hover',
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
        style={{ backgroundColor: layerColor ?? 'transparent' }}
      />
      <div className="pl-1">{children}</div>
      {SIDES.map(([side, position]) => (
        <Handle key={side} id={side} type="source" position={position} />
      ))}
    </div>
  )
}
