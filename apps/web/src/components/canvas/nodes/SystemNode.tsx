import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { Server } from 'lucide-react'
import { BaseNode } from './BaseNode'

export function SystemNode({ id, data, selected }: NodeProps<SMNode>) {
  return (
    <BaseNode id={id} layerId={data.layerId} selected={selected} squared>
      <div className="flex items-center gap-2.5">
        <Server className="h-4 w-4 shrink-0 text-ink-muted" />
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[13px] font-medium leading-tight text-ink">
            {data.label}
          </span>
          {data.category && (
            <span className="font-mono text-[11px] leading-tight text-ink-subtle">
              {data.category}
            </span>
          )}
        </div>
      </div>
    </BaseNode>
  )
}
