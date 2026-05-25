import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export function AppNode({ id, data, selected }: NodeProps<SMNode>) {
  const initial = data.label.trim().charAt(0).toUpperCase() || 'A'
  return (
    <BaseNode id={id} layerId={data.layerId} selected={selected}>
      <div className="flex items-center gap-2.5">
        {data.iconUrl ? (
          <img src={data.iconUrl} alt="" className="h-7 w-7 rounded-[6px] object-cover" />
        ) : (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-xs font-semibold text-ink-muted">
            {initial}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium leading-tight text-ink">{data.label}</span>
          {data.category && (
            <span className="text-[11px] leading-tight text-ink-subtle">{data.category}</span>
          )}
        </div>
      </div>
    </BaseNode>
  )
}
