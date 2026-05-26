import { DND_MIME } from '@/lib/dnd'
import type { NodeTypeMeta } from '@/lib/nodeRegistry'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { type DragEvent, useRef, useState } from 'react'

export function DraggableNodeItem({ meta, compact }: { meta: NodeTypeMeta; compact?: boolean }) {
  const [dragging, setDragging] = useState(false)
  const ghostRef = useRef<HTMLDivElement>(null)
  const setPaletteDragType = useUiStore((s) => s.setPaletteDragType)
  const Icon = meta.icon

  function onDragStart(event: DragEvent) {
    event.dataTransfer.setData(DND_MIME, meta.type)
    event.dataTransfer.effectAllowed = 'move'
    // Use a node-like ghost instead of the default tiny element screenshot.
    if (ghostRef.current) event.dataTransfer.setDragImage(ghostRef.current, 90, 24)
    setDragging(true)
    setPaletteDragType(meta.type)
  }

  function onDragEnd() {
    setDragging(false)
    setPaletteDragType(null)
  }

  return (
    <>
      {compact ? (
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title={`${meta.label} — ${meta.hint}`}
          className={cn(
            'grid h-9 w-9 cursor-grab place-items-center rounded-[6px] border border-transparent text-ink-muted transition-[background-color,border-color,opacity] duration-[120ms] ease-out hover:border-border hover:bg-surface-2 active:cursor-grabbing',
            dragging && 'opacity-40',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : (
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
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
      )}

      {/* Off-screen node-shaped drag image. */}
      <div
        ref={ghostRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-2.5 rounded-[8px] border border-border bg-surface px-3.5 py-3 shadow-node"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-ink-muted">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-ink">{meta.label}</span>
      </div>
    </>
  )
}
