import type { CategoryGroupData } from '@/lib/displayGraph'
import type { NodeProps } from '@xyflow/react'

export function CategoryGroupNode({ data }: NodeProps) {
  const { label, count } = data as CategoryGroupData
  return (
    <div className="h-full w-full rounded-[10px] border border-dashed border-border-strong bg-surface-2/40">
      <div className="flex items-center gap-1.5 px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        <span>{label}</span>
        <span className="text-ink-subtle/70">· {count}</span>
      </div>
    </div>
  )
}
