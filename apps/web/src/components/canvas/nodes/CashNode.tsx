import type { SMNode } from '@/lib/flow'
import { cn } from '@/lib/utils'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export function CashNode({ id, data, selected }: NodeProps<SMNode>) {
  // Heuristic: a cash node reads as an expense if its label/category says so, else revenue.
  const isCost = /\b(cost|expense|spend|payout|fee)\b/i.test(`${data.category ?? ''} ${data.label}`)
  return (
    <BaseNode id={id} layerId={data.layerId} selected={selected}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-sm font-semibold',
            isCost ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-flow-cash',
          )}
        >
          £
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium leading-tight text-ink">{data.label}</span>
          <span className="text-[11px] leading-tight text-ink-subtle">
            {data.category ?? (isCost ? 'Expense' : 'Revenue')}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
