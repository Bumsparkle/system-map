import { DND_MIME } from '@/lib/dnd'
import type { NodeTypeMeta } from '@/lib/nodeRegistry'
import { cn } from '@/lib/utils'
import { type DragEvent, useState } from 'react'

export function DraggableNodeItem({ meta, compact }: { meta: NodeTypeMeta; compact?: boolean }) {
  const [dragging, setDragging] = useState(false)
  const Icon = meta.icon

  function onDragStart(event: DragEvent) {
    event.dataTransfer.setData(DND_MIME, meta.type)
    event.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  if (compact) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={() => setDragging(false)}
        title={`${meta.label} — ${meta.hint}`}
        className={cn(
          'grid h-9 w-9 cursor-grab place-items-center rounded-[6px] border border-transparent text-ink-muted transition-[background-color,border-color,opacity] duration-[120ms] ease-out hover:border-border hover:bg-surface-2 active:cursor-grabbing',
          dragging && 'opacity-40',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDragging(false)}
      title={meta.hint}
      className={cn(
        'flex cursor-grab items-center gap-2.5 rounded-[6px] border border-transparent px-2 py-1.5 transition-[background-color,border-color,opacity] duration-[120ms] ease-out hover:border-border hover:bg-surface-2 active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-ink-muted">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium leading-tight text-ink">{meta.label}</span>
        <span className="truncate text-[11px] leading-tight text-ink-subtle">{meta.hint}</span>
      </div>
    </div>
  )
}
