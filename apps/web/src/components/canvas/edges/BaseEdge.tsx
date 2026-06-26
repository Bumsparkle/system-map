import type { SMEdge } from '@/lib/flow'
import { useUiStore } from '@/stores/uiStore'
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
import { EdgeWaypoints } from './EdgeWaypoints'

type Pt = { x: number; y: number }

/** Smooth Catmull-Rom spline through source → waypoints → target. Returns
 *  [svgPath, labelX, labelY]. */
function buildSpline(points: Pt[]): [string, number, number] {
  const first = points[0]
  if (!first || points.length < 2) {
    return [first ? `M ${first.x},${first.y}` : '', first?.x ?? 0, first?.y ?? 0]
  }
  let d = `M ${first.x},${first.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    if (!p1 || !p2) continue
    const p0 = points[i - 1] ?? p1
    const p3 = points[i + 2] ?? p2
    d += ` C ${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`
  }
  const a = points[Math.floor((points.length - 1) / 2)] ?? first
  const b = points[Math.ceil((points.length - 1) / 2)] ?? a
  return [d, (a.x + b.x) / 2, (a.y + b.y) / 2]
}

export type ResolvedEdgeStyle = {
  color: string
  width: number
  dasharray?: string
  dotted?: boolean
  animated?: boolean
}

/** Smooth bezier is the default for every flow; a per-edge data.routing override
 *  (set in the edge inspector) can switch an individual edge to another style. */
const DEFAULT_ROUTING: EdgeRouting = 'bezier'

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

// Per-flow visual style: color (CSS vars, spec §10) + stroke treatment. Path
// routing is no longer per-flow — every edge defaults to smooth bezier.
export const EDGE_STYLE: Record<Exclude<FlowType, 'custom'>, ResolvedEdgeStyle> = {
  data: { color: 'var(--color-flow-data)', width: 2 },
  cash: { color: 'var(--color-flow-cash)', width: 2.5 },
  api: { color: 'var(--color-flow-api)', width: 2, dasharray: '8 4', animated: true },
  manual: { color: 'var(--color-flow-manual)', width: 2, dasharray: '4 4' },
  event: {
    color: 'var(--color-flow-event)',
    width: 2,
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
  // Live draft (while a bend is being dragged) wins over the stored waypoints, so
  // the path follows the cursor without writing to undo history every frame.
  const draftWaypoints = useUiStore((s) =>
    s.edgeWaypointDraft?.edgeId === id ? s.edgeWaypointDraft.waypoints : null,
  )
  const waypoints = draftWaypoints ?? data?.waypoints ?? []

  const routing = data?.routing ?? DEFAULT_ROUTING
  const [edgePath, labelX, labelY] = waypoints.length
    ? buildSpline([{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }])
    : routedPath(routing, {
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
      {selected && (
        <EdgeWaypoints
          edgeId={id}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          waypoints={waypoints}
        />
      )}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan absolute -translate-x-1/2 -translate-y-1/2 rounded-[5px] border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-node ${
              // While selected, don't let the label cover/block the bend handles.
              selected ? 'pointer-events-none opacity-70' : 'pointer-events-auto'
            }`}
            style={{ left: labelX, top: labelY }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
