import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import { BaseNode } from './BaseNode'

export function DataSourceNode({ id, data, selected }: NodeProps<SMNode>) {
  return (
    <BaseNode id={id} layerId={data.layerId} selected={selected}>
      <div className="flex items-center gap-2.5">
        <Database className="h-4 w-4 shrink-0 text-ink-muted" />
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
