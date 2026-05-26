import type { SMEdge } from '@/lib/flow'
import type { EdgeProps } from '@xyflow/react'
import { EDGE_STYLE, FlowEdge } from './BaseEdge'

export function EventEdge(props: EdgeProps<SMEdge>) {
  return <FlowEdge {...props} resolved={EDGE_STYLE.event} markerId="sm-arrow-event" />
}
