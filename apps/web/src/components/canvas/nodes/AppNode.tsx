import { resolveNodeIcon } from '@/lib/appearance'
import type { SMNode } from '@/lib/flow'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export function AppNode({ id, data, selected }: NodeProps<SMNode>) {
  const initial = data.label.trim().charAt(0).toUpperCase() || 'A'
  const custom = resolveNodeIcon(data)
  return (
    <BaseNode
      id={id}
      layerId={data.layerId}
      selected={selected}
      accentColor={data.appearance?.accentColor}
      size={data.appearance?.size}
    >
      <div className="flex items-center gap-2.5">
        {custom ??
          (data.iconUrl ? (
            <img src={data.iconUrl} alt="" className="h-7 w-7 rounded-[6px] object-cover" />
          ) : (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-xs font-semibold text-ink-muted">
              {initial}
            </div>
          ))}
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
