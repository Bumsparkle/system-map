import type { SMEdge } from '@/lib/flow'
import type { EdgeRouting, FlowType } from '@system-map/shared'
import {
  EdgeLabelRenderer,
  type EdgeProps,
  BaseEdge as RFBaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react'
import type { CSSProperties, ReactNode } from 'react'

export type ResolvedEdgeStyle = {
  color: string
  width: number
  /** Default path routing for this flow type; overridable per-edge via data.routing. */
  routing: EdgeRouting
  dasharray?: string
  dotted?: boolean
  animated?: boolean
}

type PathParams = Parameters<typeof getSmoothStepPath>[0]

/** Resolve an edge's SVG path for the given routing. Returns [path, labelX, labelY, ...]. */
function routedPath(routing: EdgeRouting, p: PathParams): ReturnType<typeof getSmoothStepPath> {
  switch (routing) {
    case 'straight':
      return getStraightPath({
        sourceX: p.sourceX,
        sourceY: p.sourceY,
        targetX: p.targetX,
        targetY: p.targetY,
      })
    case 'smoothstep':
      return getSmoothStepPath(p)
    case 'step':
      return getSmoothStepPath({ ...p, borderRadius: 0 })
    default:
      return getBezierPath(p)
  }
}

// Per-flow visual style (spec §6). Colors are CSS variables (spec §10) so the
// palette can be swapped without touching components.
// Right-angled `smoothstep` reads best for system/data/api/event flows; curvy
// `bezier` suits the informal, people-driven cash & manual flows (spec v1.1 §6).
export const EDGE_STYLE: Record<Exclude<FlowType, 'custom'>, ResolvedEdgeStyle> = {
  data: { color: 'var(--color-flow-data)', width: 2, routing: 'smoothstep' },
  cash: { color: 'var(--color-flow-cash)', width: 2.5, routing: 'bezier' },
  api: {
    color: 'var(--color-flow-api)',
    width: 2,
    routing: 'smoothstep',
    dasharray: '8 4',
    animated: true,
  },
  manual: { color: 'var(--color-flow-manual)', width: 2, routing: 'bezier', dasharray: '4 4' },
  event: {
    color: 'var(--color-flow-event)',
    width: 2,
    routing: 'smoothstep',
    dasharray: '1.5 4.5',
    dotted: true,
    animated: true,
  },
}

const ARROW_KEYS = Object.keys(EDGE_STYLE) as (keyof typeof EDGE_STYLE)[]

/** One <marker> per flow color, shared by all edges. orient auto-start-reverse
 *  lets the same marker serve start (two-way) and end. Rendered once in Canvas. */
export function EdgeMarkers() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
      <title>Edge arrow markers</title>
      <defs>
        {ARROW_KEYS.map((key) => (
          <marker
            key={key}
            id={`sm-arrow-${key}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={EDGE_STYLE[key].color} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
  resolved,
  markerId,
  children,
}: EdgeProps<SMEdge> & {
  resolved: ResolvedEdgeStyle
  markerId: string
  children?: ReactNode
}) {
  const routing = data?.routing ?? resolved.routing
  const [edgePath, labelX, labelY] = routedPath(routing, {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const twoWay = (data?.direction ?? 'one_way') === 'two_way'
  const markerEnd = `url(#${markerId})`
  const markerStart = twoWay ? `url(#${markerId})` : undefined

  const pathStyle: CSSProperties = {
    stroke: resolved.color,
    strokeWidth: resolved.width,
    strokeDasharray: resolved.dasharray,
    strokeLinecap: resolved.dotted ? 'round' : undefined,
    animation: resolved.animated ? 'sm-dash 0.6s linear infinite' : undefined,
  }

  return (
    <>
      {children}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={resolved.width + 6}
          strokeOpacity={0.22}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      <RFBaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={24}
        style={pathStyle}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-[5px] border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-node"
            style={{ left: labelX, top: labelY }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
