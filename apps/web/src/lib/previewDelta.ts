import type { SMEdge, SMNode } from '@/lib/flow'
import type { AiSuggestion, FlowType, NodeType } from '@system-map/shared'
import type { XYPosition } from '@xyflow/react'

/** Prefix for synthetic, never-persisted preview ids (nodes and edges). */
export const PREVIEW_PREFIX = '__preview_'

/**
 * A suggestion's change-set resolved against the live diagram: ghost nodes get
 * real positions, edges/removals/updates are resolved to actual ids. New nodes
 * carry a `tempId` (PREVIEW_PREFIX…) that ghost edges reference; applyPreview
 * swaps those for fresh ids at commit time.
 */
export type PreviewDelta = {
  title: string
  addNodes: { tempId: string; type: NodeType; label: string; position: XYPosition }[]
  addEdges: {
    tempId: string
    sourceRef: string
    targetRef: string
    flow: FlowType
    label?: string
  }[]
  removeNodeIds: string[]
  removeEdgeIds: string[]
  updateEdges: { id: string; newFlow: FlowType }[]
}

const norm = (s: string) => s.trim().toLowerCase()

/** True when a suggestion has any structural change worth previewing. */
export function hasPreview(s: AiSuggestion): boolean {
  const p = s.preview
  if (!p) return false
  return (
    p.addNodes.length +
      p.addEdges.length +
      p.removeNodes.length +
      p.removeEdges.length +
      p.updateEdges.length >
    0
  )
}

/** True when nothing resolved to an actual canvas change (labels didn't match). */
export function isPreviewDeltaEmpty(d: PreviewDelta): boolean {
  return (
    d.addNodes.length === 0 &&
    d.addEdges.length === 0 &&
    d.removeNodeIds.length === 0 &&
    d.removeEdgeIds.length === 0 &&
    d.updateEdges.length === 0
  )
}

/** A one-line "+2 nodes · +1 flow · −1 node" summary of a resolved delta. */
export function summarizeDelta(d: PreviewDelta): string {
  const parts: string[] = []
  if (d.addNodes.length) parts.push(`+${d.addNodes.length} node${d.addNodes.length > 1 ? 's' : ''}`)
  if (d.addEdges.length) parts.push(`+${d.addEdges.length} flow${d.addEdges.length > 1 ? 's' : ''}`)
  if (d.updateEdges.length)
    parts.push(`~${d.updateEdges.length} flow${d.updateEdges.length > 1 ? 's' : ''}`)
  if (d.removeNodeIds.length)
    parts.push(`−${d.removeNodeIds.length} node${d.removeNodeIds.length > 1 ? 's' : ''}`)
  if (d.removeEdgeIds.length)
    parts.push(`−${d.removeEdgeIds.length} flow${d.removeEdgeIds.length > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

/**
 * Resolve a suggestion's label-based change-set against the current graph.
 * Labels are matched case-insensitively; the first node with a given label wins.
 * Edges/removals that can't be resolved to real nodes are dropped (the model
 * occasionally references something that isn't on the map).
 */
export function buildPreviewDelta(s: AiSuggestion, nodes: SMNode[], edges: SMEdge[]): PreviewDelta {
  const p = s.preview
  if (!p)
    return {
      title: s.title,
      addNodes: [],
      addEdges: [],
      removeNodeIds: [],
      removeEdgeIds: [],
      updateEdges: [],
    }

  const idByLabel = new Map<string, string>()
  for (const n of nodes) {
    const k = norm(n.data.label)
    if (!idByLabel.has(k)) idByLabel.set(k, n.id)
  }
  const posById = new Map(nodes.map((n) => [n.id, n.position]))

  // New nodes → temp ids; remember label → tempId so addEdges can reference them.
  const tempIdByLabel = new Map<string, string>()
  const addNodes = p.addNodes.map((an, i) => {
    const tempId = `${PREVIEW_PREFIX}n_${i}`
    const k = norm(an.label)
    if (!tempIdByLabel.has(k)) tempIdByLabel.set(k, tempId)
    return { tempId, type: an.type, label: an.label, position: { x: 0, y: 0 } as XYPosition }
  })

  // A new node shadows an existing one with the same label (avoid self-loops).
  const resolveRef = (label: string): string | null =>
    tempIdByLabel.get(norm(label)) ?? idByLabel.get(norm(label)) ?? null

  const addEdges = p.addEdges.flatMap((ae, i) => {
    const sourceRef = resolveRef(ae.from)
    const targetRef = resolveRef(ae.to)
    if (!sourceRef || !targetRef || sourceRef === targetRef) return []
    return [
      {
        tempId: `${PREVIEW_PREFIX}e_${i}`,
        sourceRef,
        targetRef,
        flow: ae.flow,
        label: ae.label || undefined,
      },
    ]
  })

  // Place each new node just to the right of the existing nodes it connects to
  // (fallback: to the right of the whole map), stacking to avoid overlap.
  const centroidY = nodes.length ? nodes.reduce((a, n) => a + n.position.y, 0) / nodes.length : 80
  const maxX = nodes.length ? Math.max(...nodes.map((n) => n.position.x)) : 80
  addNodes.forEach((an, i) => {
    const anchors: XYPosition[] = []
    for (const e of addEdges) {
      const other =
        e.sourceRef === an.tempId ? e.targetRef : e.targetRef === an.tempId ? e.sourceRef : null
      const pos = other ? posById.get(other) : undefined
      if (pos) anchors.push(pos)
    }
    const base = anchors.length
      ? {
          x: Math.max(...anchors.map((a) => a.x)) + 240,
          y: anchors.reduce((a, pos) => a + pos.y, 0) / anchors.length,
        }
      : { x: maxX + 280, y: centroidY }
    an.position = { x: base.x, y: base.y + i * 96 }
  })

  const removeNodeIds = p.removeNodes.flatMap((lbl) => {
    const id = idByLabel.get(norm(lbl))
    return id ? [id] : []
  })

  const edgeIdByPair = (from: string, to: string): string | null => {
    const f = idByLabel.get(norm(from))
    const t = idByLabel.get(norm(to))
    if (!f || !t) return null
    // Prefer the stated direction; only fall back to the reverse so that a
    // bidirectional A↔B pair resolves deterministically to the A→B edge.
    const e =
      edges.find((e) => e.source === f && e.target === t) ??
      edges.find((e) => e.source === t && e.target === f)
    return e?.id ?? null
  }

  const removeEdgeIds = p.removeEdges.flatMap((re) => {
    const id = edgeIdByPair(re.from, re.to)
    return id ? [id] : []
  })

  const updateEdges = p.updateEdges.flatMap((ue) => {
    const id = edgeIdByPair(ue.from, ue.to)
    return id ? [{ id, newFlow: ue.newFlow }] : []
  })

  return { title: s.title, addNodes, addEdges, removeNodeIds, removeEdgeIds, updateEdges }
}
