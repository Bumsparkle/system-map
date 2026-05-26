import { resolveNodeIcon } from '@/lib/appearance'
import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { Users } from 'lucide-react'
import { BaseNode } from './BaseNode'

export function ExternalEntityNode({ id, data, selected }: NodeProps<SMNode>) {
  const custom = resolveNodeIcon(data)
  return (
    <BaseNode
      id={id}
      layerId={data.layerId}
      selected={selected}
      dashed
      accentColor={data.appearance?.accentColor}
      size={data.appearance?.size}
    >
      <div className="flex items-center gap-2.5">
        {custom ?? <Users className="h-4 w-4 shrink-0 text-ink-muted" />}
        <div className="flex min-w-0 flex-col">
          <span className="text-[1em] font-medium leading-tight text-ink">{data.label}</span>
          {data.category && (
            <span className="text-[11px] leading-tight text-ink-subtle">{data.category}</span>
          )}
        </div>
      </div>
    </BaseNode>
  )
}
