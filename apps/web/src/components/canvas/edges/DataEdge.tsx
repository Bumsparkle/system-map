import type { SMEdge } from '@/lib/flow'
import type { EdgeProps } from '@xyflow/react'
import { EDGE_STYLE, FlowEdge } from './BaseEdge'

export function DataEdge(props: EdgeProps<SMEdge>) {
  return <FlowEdge {...props} resolved={EDGE_STYLE.data} markerId="sm-arrow-data" />
}
