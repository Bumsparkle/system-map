import type { Node } from '@xyflow/react'

/** The four connection sides every node exposes (see BaseNode handles). */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left'

// Fallback footprint when a node hasn't been measured yet — only used to pick a
// side, so rough numbers are fine. Matches the auto-layout defaults.
const DEFAULT_W = 180
const DEFAULT_H = 52
const GROUP_W = 280
const GROUP_H = 180

/** Approximate canvas-space centre of a node (top-left position + half size). */
export function nodeCenter(n: Node): { x: number; y: number } {
  const w =
    n.measured?.width ??
    (typeof n.width === 'number' ? n.width : n.type === 'group' ? GROUP_W : DEFAULT_W)
  const h =
    n.measured?.height ??
    (typeof n.height === 'number' ? n.height : n.type === 'group' ? GROUP_H : DEFAULT_H)
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 }
}

/**
 * Pick the source/target handles that face each other, so an arrow leaves the
 * side of the source nearest the target and arrives on the facing side — no more
 * edges looping around because the handle was pinned to right→left. Horizontal
 * vs vertical is decided by whichever gap dominates (ties favour horizontal,
 * matching the left-to-right flow).
 */
export function facingHandles(
  source: { x: number; y: number },
  target: { x: number; y: number },
): { sourceHandle: HandleSide; targetHandle: HandleSide } {
  const dx = target.x - source.x
  const dy = target.y - source.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' }
}
