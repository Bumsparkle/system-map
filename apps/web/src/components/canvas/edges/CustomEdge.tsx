import type { SMEdge } from '@/lib/flow'
import type { EdgeProps } from '@xyflow/react'
import { FlowEdge, type ResolvedEdgeStyle } from './BaseEdge'

export function CustomEdge(props: EdgeProps<SMEdge>) {
  const color = props.data?.color ?? 'var(--color-ink-subtle)'
  const stroke = props.data?.strokeStyle ?? 'solid'
  const resolved: ResolvedEdgeStyle = {
    color,
    width: 2,
    routing: 'bezier',
    dasharray: stroke === 'dashed' ? '6 4' : stroke === 'dotted' ? '1.5 4.5' : undefined,
    dotted: stroke === 'dotted',
    animated: props.data?.animated,
  }
  const markerId = `sm-arrow-custom-${props.id}`
  return (
    <FlowEdge {...props} resolved={resolved} markerId={markerId}>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      </defs>
    </FlowEdge>
  )
}
