import { ApiEdge } from '@/components/canvas/edges/ApiEdge'
import { CashEdge } from '@/components/canvas/edges/CashEdge'
import { CustomEdge } from '@/components/canvas/edges/CustomEdge'
import { DataEdge } from '@/components/canvas/edges/DataEdge'
import { EventEdge } from '@/components/canvas/edges/EventEdge'
import { ManualEdge } from '@/components/canvas/edges/ManualEdge'
import type { FlowType } from '@system-map/shared'
import type { EdgeTypes } from '@xyflow/react'

export const edgeTypes: EdgeTypes = {
  data: DataEdge,
  cash: CashEdge,
  api: ApiEdge,
  manual: ManualEdge,
  event: EventEdge,
  custom: CustomEdge,
}

export type FlowTypeMeta = { type: FlowType; label: string; color: string }

// Ordered list for the inspector chips + right-click switcher.
export const FLOW_TYPES: FlowTypeMeta[] = [
  { type: 'data', label: 'Data', color: 'var(--color-flow-data)' },
  { type: 'cash', label: 'Cash', color: 'var(--color-flow-cash)' },
  { type: 'api', label: 'API', color: 'var(--color-flow-api)' },
  { type: 'manual', label: 'Manual', color: 'var(--color-flow-manual)' },
  { type: 'event', label: 'Event', color: 'var(--color-flow-event)' },
  { type: 'custom', label: 'Custom', color: 'var(--color-ink-subtle)' },
]

export const FLOW_TYPE_LABEL = Object.fromEntries(
  FLOW_TYPES.map((f) => [f.type, f.label]),
) as Record<FlowType, string>
