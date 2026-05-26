import type { SMNode } from '@/lib/flow'
import { type NodeProps, NodeResizer } from '@xyflow/react'

// A translucent, resizable container you place behind related nodes (spec §5).
export function GroupNode({ data, selected }: NodeProps<SMNode>) {
  return (
    <div className="h-full w-full rounded-[10px] border border-border-strong bg-surface-2/40">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={100}
        lineClassName="!border-accent"
        handleClassName="!h-2 !w-2 !rounded-[2px] !border-accent !bg-surface"
      />
      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {data.label}
      </div>
    </div>
  )
}
