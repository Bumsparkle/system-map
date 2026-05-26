import type { SMEdge, SMNode } from '@/lib/flow'
import type { Layer, View } from '@system-map/shared'
import type { Edge, Node } from '@xyflow/react'

// Layout constants for the groupBy:'category' render trick.
const CARD_W = 190
const CARD_H = 64
const GAP = 16
const COLS = 2
const PAD = 16
const HEADER = 34
const GROUP_GAP = 56

export type CategoryGroupData = { label: string; count: number }

function makeVisibilityPredicate(layers: Layer[], view: View | null) {
  const layerVisible = new Map(layers.map((l) => [l.id, l.visible]))
  const viewLayers = view ? new Set(view.filter.layerIds) : null
  const viewNodeTypes = view ? new Set(view.filter.nodeTypes) : null
  return (n: SMNode): boolean => {
    // The layer's own eye toggle always applies.
    if (layerVisible.get(n.data.layerId) === false) return false
    // An active view further filters by layer + node type.
    if (viewLayers && !viewLayers.has(n.data.layerId)) return false
    if (viewNodeTypes && n.type && !viewNodeTypes.has(n.type)) return false
    return true
  }
}

/**
 * Produces the nodes/edges actually rendered, applying (1) layer visibility,
 * (2) the active view's filters, and (3) the optional category grouping. The
 * canonical store graph is never mutated — this is a pure display transform.
 */
export function buildDisplayGraph(
  nodes: SMNode[],
  edges: SMEdge[],
  layers: Layer[],
  view: View | null,
): { nodes: Node[]; edges: Edge[] } {
  const isVisible = makeVisibilityPredicate(layers, view)
  const visibleIds = new Set(nodes.filter(isVisible).map((n) => n.id))
  const viewFlowTypes = view ? new Set(view.filter.flowTypes) : null

  const displayEdges: Edge[] = edges.map((e) => {
    // An edge hides if either endpoint is hidden, or its flow type is filtered out.
    let hidden = !visibleIds.has(e.source) || !visibleIds.has(e.target)
    if (!hidden && viewFlowTypes && e.type && !viewFlowTypes.has(e.type)) hidden = true
    return { ...e, hidden }
  })

  if (view?.filter.groupBy === 'category') {
    return { nodes: groupByCategory(nodes.filter(isVisible)), edges: displayEdges }
  }

  // Group containers render first so they sit behind the nodes placed over them.
  const displayNodes: Node[] = nodes
    .map((n) => ({ ...n, hidden: !isVisible(n) }))
    .sort((a, b) => Number(b.type === 'group') - Number(a.type === 'group'))
  return { nodes: displayNodes, edges: displayEdges }
}

function groupByCategory(visible: SMNode[]): Node[] {
  const buckets = new Map<string, SMNode[]>()
  for (const n of visible) {
    const cat = n.data.category?.trim() || 'Uncategorized'
    const list = buckets.get(cat) ?? []
    list.push(n)
    buckets.set(cat, list)
  }

  const out: Node[] = []
  let groupX = 0
  for (const [cat, items] of buckets) {
    const cols = Math.min(COLS, items.length) || 1
    const rows = Math.ceil(items.length / COLS)
    const groupW = 2 * PAD + cols * CARD_W + (cols - 1) * GAP
    const groupH = HEADER + rows * CARD_H + (rows - 1) * GAP + PAD
    const groupId = `__group_${cat}`

    out.push({
      id: groupId,
      type: 'categoryGroup',
      position: { x: groupX, y: 0 },
      data: { label: cat, count: items.length } satisfies CategoryGroupData,
      width: groupW,
      height: groupH,
      style: { width: groupW, height: groupH },
      selectable: false,
      draggable: false,
      hidden: false,
    })

    items.forEach((n, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      out.push({
        ...n,
        parentId: groupId,
        extent: 'parent',
        draggable: false,
        hidden: false,
        position: { x: PAD + col * (CARD_W + GAP), y: HEADER + row * (CARD_H + GAP) },
      })
    })

    groupX += groupW + GROUP_GAP
  }

  return out
}
