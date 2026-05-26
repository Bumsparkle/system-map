import type { SMEdge } from '@/lib/flow'
import type { EdgeProps } from '@xyflow/react'
import { EDGE_STYLE, FlowEdge } from './BaseEdge'

export function ApiEdge(props: EdgeProps<SMEdge>) {
  return <FlowEdge {...props} resolved={EDGE_STYLE.api} markerId="sm-arrow-api" />
}
