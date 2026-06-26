import { useDiagramStore } from '@/stores/diagramStore'
import { useUiStore } from '@/stores/uiStore'
import { useReactFlow } from '@xyflow/react'
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from 'react'

type Pt = { x: number; y: number }

/**
 * Draggable bend handles for a *selected* edge: drag a handle to move a bend,
 * drag a faint segment-midpoint dot to add one, double-click a handle to remove
 * it. The path follows live via a transient uiStore draft (no undo churn); the
 * final waypoints commit once on release, so the whole drag is a single undo.
 */
export function EdgeWaypoints({
  edgeId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  waypoints,
}: {
  edgeId: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  waypoints: Pt[]
}) {
  const presenting = useUiStore((s) => s.presenting)
  const previewing = useUiStore((s) => s.previewDelta !== null)
  const setDraft = useUiStore((s) => s.setEdgeWaypointDraft)
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData)
  const { screenToFlowPosition } = useReactFlow()

  const working = useRef<Pt[]>([])
  const dragIndex = useRef(-1)

  // No path editing while presenting or reviewing a suggestion preview.
  if (presenting || previewing) return null

  const full: Pt[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }]

  function beginDrag(e: ReactPointerEvent, initial: Pt[], index: number) {
    e.stopPropagation()
    e.preventDefault()
    working.current = initial
    dragIndex.current = index
    setDraft({ edgeId, waypoints: initial })

    const onMove = (ev: globalThis.PointerEvent) => {
      const flow = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      const next = working.current.slice()
      next[dragIndex.current] = { x: Math.round(flow.x), y: Math.round(flow.y) }
      working.current = next
      setDraft({ edgeId, waypoints: next })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      updateEdgeData(edgeId, { waypoints: working.current })
      setDraft(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function removeWaypoint(e: ReactMouseEvent, index: number) {
    e.stopPropagation()
    const next = waypoints.filter((_, i) => i !== index)
    updateEdgeData(edgeId, { waypoints: next.length ? next : undefined })
  }

  return (
    <g style={{ pointerEvents: 'all' }}>
      {/* Drag a segment midpoint to insert a new bend there. */}
      {full.slice(0, -1).map((p, s) => {
        const q = full[s + 1]
        if (!q) return null
        const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
            key={`add-${s}`}
            cx={mid.x}
            cy={mid.y}
            r={4}
            className="sm-wp-add"
            onPointerDown={(e) =>
              beginDrag(e, [...waypoints.slice(0, s), mid, ...waypoints.slice(s)], s)
            }
          />
        )
      })}

      {/* Existing bends — drag to move, double-click to remove. */}
      {waypoints.map((p, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: bends are positional
          key={`wp-${i}`}
          cx={p.x}
          cy={p.y}
          r={5}
          className="sm-wp"
          onPointerDown={(e) => beginDrag(e, waypoints, i)}
          onDoubleClick={(e) => removeWaypoint(e, i)}
        />
      ))}
    </g>
  )
}
