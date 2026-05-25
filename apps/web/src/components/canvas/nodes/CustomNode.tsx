import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export function CustomNode({ id, data, selected }: NodeProps<SMNode>) {
  return (
    <BaseNode id={id} layerId={data.layerId} selected={selected}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: data.color ?? 'var(--color-ink-subtle)' }}
        />
        <span className="text-sm font-medium leading-tight text-ink">{data.label}</span>
      </div>
    </BaseNode>
  )
}
